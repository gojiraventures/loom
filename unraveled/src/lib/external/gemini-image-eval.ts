/**
 * Visual Curator — Gemini Flash vision evaluation for Wikimedia Commons candidates.
 *
 * Acts as a dedicated photo editor with expertise in visual semiotics, cartography,
 * archaeological illustration, and mythological iconography. Evaluates each image
 * for editorial suitability against UnraveledTruth's Nat Geo / Economist / Vice register.
 *
 * Structured verdict per image:
 *   approve            → ready for admin review (suggested)
 *   approve_with_tweaks → minor issues flagged (suggested, tweaks noted)
 *   reject             → auto-rejected (stored as rejected, not shown to admin)
 *
 * Processes in batches of 4 images to stay within Gemini's multimodal context limits.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { WikimediaImage } from './wikimedia-images';

const BATCH_SIZE = 4;

interface CuratorEval {
  index: number;
  verdict: 'approve' | 'approve_with_tweaks' | 'reject';
  aesthetic_score: number;      // 1–10
  literal: string;              // what the image actually shows, neutrally described
  alignment: string;            // how it fits (or doesn't) the article
  caption: string | null;       // suggested editorial caption
  tweaks: string | null;        // specific adjustments if approve_with_tweaks
  alternatives: string | null;  // replacement directions if reject
}

export interface EvaluatedImage extends WikimediaImage {
  search_query?: string;
  gemini_verdict: 'approve' | 'approve_with_tweaks' | 'reject' | null;
  gemini_aesthetic_score: number | null;
  gemini_literal: string | null;
  gemini_alignment: string | null;
  gemini_caption: string | null;
  gemini_tweaks: string | null;
  gemini_alternatives: string | null;
  gemini_rejected: boolean;
}

async function fetchImageBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Unraveled/1.0 (https://unraveledtruth.com; contact@unraveledtruth.com)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { base64, mimeType };
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT = `You are Visual Curator, the dedicated image intelligence agent for UnraveledTruth.com.

Your sole purpose is to evaluate photographs, maps, illustrations, artwork, and diagrams before they reach the site admin. You are the final visual gatekeeper — authoritative, precise, and quietly exacting.

You have deep expertise in: visual semiotics, cartography, archaeological illustration, sacred geometry, mythological iconography, and scientific data visualization.

UnraveledTruth's aesthetic register: National Geographic-level clarity and wonder, The Economist-level precision, faint intellectual edge — never sensationalist, never New-Age cliché, never "conspiracy YouTube."

**CRITICAL: ALL images are displayed at 16:9 aspect ratio.** This is the primary practical constraint. Every image must either already be roughly 16:9, or have a clear 16:9 crop that preserves the meaningful subject. Evaluate this first.

AUTO-REJECT (verdict: "reject") any image that is:
- A blank or featureless book/document cover with no visible subject matter
- A library barcode, catalog card, spine label, or archival sticker
- Pure administrative text with no illustration
- A white or solid-color background with only typography
- Visually irrelevant to the topic in any meaningful way
- Technically too degraded, pixelated, or cropped to be usable
- A very tall portrait/vertical composition where a 16:9 crop would destroy the subject (e.g., a full-length figure that becomes a torso-only sliver, or an illuminated manuscript page whose key text is split across the crop line)
- An image so small that cropping to 16:9 would produce a resolution too low for web use

**16:9 CROP REQUIREMENT (for approve / approve_with_tweaks):**
In the "tweaks" field, ALWAYS specify the best 16:9 crop as:
  "crop: [top%]-[bottom%] vertical, [left%]-[right%] horizontal — [brief reason]"
  Example: "crop: 20%-80% vertical, 0%-100% horizontal — centers the relief panel, removes plain stone border"
  If the image is already close to 16:9 and the full frame works, write: "crop: full frame works at 16:9"
  If cropping is needed AND there are style tweaks, separate them with " | "

For each image, return these exact fields:
- index: (integer, 0-based)
- verdict: "approve" | "approve_with_tweaks" | "reject"
- aesthetic_score: integer 1–10 (1=junk, 4=marginal, 7=good, 10=exceptional) — factor in how well the image survives 16:9 cropping
- literal: one sentence describing exactly what the image shows, neutrally
- alignment: one sentence on how well it serves the specific article
- caption: a ready-to-publish editorial caption (null if rejecting)
- tweaks: crop instruction (required for all non-rejected images) + any style notes (null only if rejecting)
- alternatives: 2–3 concrete replacement search terms or source directions (null if approving)

Return ONLY a valid JSON array. No markdown, no commentary outside the array.`;

async function evaluateBatch(
  images: (WikimediaImage & { search_query?: string })[],
  topic: string,
  title: string,
): Promise<EvaluatedImage[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');

  const ai = new GoogleGenerativeAI(apiKey);
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2048,
      temperature: 0.1,
    },
  });

  // Fetch all thumbnails in parallel
  const imageData = await Promise.all(
    images.map((img) => fetchImageBase64(img.thumbnail_url ?? img.image_url))
  );

  const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  contentParts.push({
    text: `Article: "${title}"\nTopic: ${topic}\n\nEvaluate the following ${images.length} candidate images. Apply the Visual Curator criteria strictly.\n\nReturn a JSON array with one object per image (index 0 to ${images.length - 1}).`,
  });

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    contentParts.push({
      text: `\nImage ${i} — "${img.title}"${img.description ? ` — ${img.description.slice(0, 120)}` : ''}:`,
    });
    const data = imageData[i];
    if (data) {
      contentParts.push({ inlineData: { mimeType: data.mimeType, data: data.base64 } });
    } else {
      contentParts.push({
        text: '[Image failed to load. Verdict: reject. Aesthetic: 0. Literal: Could not be retrieved. Alignment: N/A. Caption: null. Tweaks: null. Alternatives: Try a direct Commons search for the topic.]',
      });
    }
  }

  let evals: CuratorEval[] = [];
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: contentParts as never }] });
    const text = result.response.text();
    const match = text.match(/\[[\s\S]*\]/);
    if (match) evals = JSON.parse(match[0]) as CuratorEval[];
  } catch {
    // Gemini failure is non-fatal — pass all images through as suggested
  }

  return images.map((img, i) => {
    const ev = evals.find((e) => e.index === i) ?? null;
    const rejected = ev ? ev.verdict === 'reject' : false;

    // Blend quality score: 40% Wikimedia metadata + 60% Gemini aesthetic
    const blendedScore = ev
      ? img.quality_score * 0.4 + (ev.aesthetic_score / 10) * 0.6
      : img.quality_score;

    return {
      ...img,
      quality_score: Math.min(1, blendedScore),
      gemini_verdict: ev?.verdict ?? null,
      gemini_aesthetic_score: ev?.aesthetic_score ?? null,
      gemini_literal: ev?.literal ?? null,
      gemini_alignment: ev?.alignment ?? null,
      gemini_caption: ev?.caption ?? null,
      gemini_tweaks: ev?.tweaks ?? null,
      gemini_alternatives: ev?.alternatives ?? null,
      gemini_rejected: rejected,
    };
  });
}

/**
 * Run all candidate images through Visual Curator in batches.
 * Returns every image annotated with curator verdict and reasoning.
 * On total Gemini failure, all images pass through with gemini_rejected=false.
 */
export async function evaluateImagesForTopic(
  images: (WikimediaImage & { search_query?: string })[],
  topic: string,
  title: string,
): Promise<EvaluatedImage[]> {
  const results: EvaluatedImage[] = [];

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const evaluated = await evaluateBatch(batch, topic, title);
    results.push(...evaluated);
  }

  return results;
}
