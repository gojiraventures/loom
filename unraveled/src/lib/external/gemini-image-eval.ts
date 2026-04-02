/**
 * Gemini Flash vision evaluation for Wikimedia Commons candidate images.
 *
 * Fetches thumbnails, sends batches to Gemini, and returns each image with:
 *   - An updated quality_score (blended with Gemini's relevance score)
 *   - A `gemini_rejected` flag for images that are junk
 *
 * Auto-reject criteria (score < 4 or relevant=false):
 *   blank book covers, library barcodes, catalog pages, white-background text-only
 *   images, administrative/archival items with no visual subject matter.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { WikimediaImage } from './wikimedia-images';

const BATCH_SIZE = 6;
const REJECT_THRESHOLD = 4; // out of 10

interface GeminiEval {
  index: number;
  relevant: boolean;
  score: number;
  reason: string;
}

export interface EvaluatedImage extends WikimediaImage {
  search_query?: string;
  gemini_score: number | null;
  gemini_reason: string | null;
  gemini_rejected: boolean;
}

async function fetchImageBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Unraveled/1.0 (https://unraveled.ai; contact@unraveled.ai)' },
      signal: AbortSignal.timeout(8000),
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
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1024, temperature: 0.1 },
  });

  // Fetch all thumbnails in parallel
  const imageData = await Promise.all(
    images.map((img) => fetchImageBase64(img.thumbnail_url ?? img.image_url))
  );

  const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  contentParts.push({
    text: `You are a photo editor for a serious research publication about "${title}" (topic: ${topic}).

Evaluate each numbered image for editorial suitability. Reject anything that is:
- A blank book/document cover with no visible subject matter
- A library barcode, catalog card, or archival sticker
- Pure text with no illustration
- An irrelevant administrative or bureaucratic item
- Too low-quality or generic to be useful

For each image return: index (0-based), relevant (bool), score (0-10), reason (one sentence).
Score 0-3 = junk/reject. Score 4-6 = marginal. Score 7-10 = good editorial image.

Return ONLY a JSON array: [{"index":0,"relevant":true,"score":8,"reason":"..."}, ...]`,
  });

  for (let i = 0; i < images.length; i++) {
    contentParts.push({ text: `Image ${i} — filename: ${images[i].title}:` });
    const data = imageData[i];
    if (data) {
      contentParts.push({ inlineData: { mimeType: data.mimeType, data: data.base64 } });
    } else {
      contentParts.push({ text: '[image failed to load — score 0, reject]' });
    }
  }

  let evals: GeminiEval[] = [];
  try {
    const result = await model.generateContent({ contents: [{ role: 'user', parts: contentParts as never }] });
    const text = result.response.text();
    // Extract JSON array (may be wrapped in markdown fences)
    const match = text.match(/\[[\s\S]*\]/);
    if (match) evals = JSON.parse(match[0]) as GeminiEval[];
  } catch {
    // If Gemini fails entirely, pass through all images (don't block the pipeline)
  }

  return images.map((img, i) => {
    const ev = evals.find((e) => e.index === i) ?? null;
    const geminiScore = ev ? ev.score : null;
    const relevant = ev ? ev.relevant : true; // benefit of the doubt on failure
    const rejected = ev ? (!relevant || ev.score < REJECT_THRESHOLD) : false;

    // Blend quality scores: wikimedia score contributes 40%, gemini 60%
    const blendedScore = geminiScore !== null
      ? img.quality_score * 0.4 + (geminiScore / 10) * 0.6
      : img.quality_score;

    return {
      ...img,
      quality_score: blendedScore,
      gemini_score: geminiScore,
      gemini_reason: ev?.reason ?? null,
      gemini_rejected: rejected,
    };
  });
}

/**
 * Evaluate a list of Wikimedia candidate images against the topic using Gemini vision.
 * Returns all images annotated with gemini_score, gemini_reason, gemini_rejected.
 * Images that fail to evaluate are passed through with gemini_rejected=false.
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
