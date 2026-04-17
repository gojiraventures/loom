/**
 * xAI Grok Image Generation Client
 *
 * OpenAI-compatible /v1/images/generations endpoint on api.x.ai.
 * Model: grok-2-image-1212 (configurable via GROK_IMAGE_MODEL)
 *
 * Auth: XAI_IMAGE_API_KEY env var (shared with hero-image generation)
 */

const XAI_IMAGE_API_KEY = process.env.XAI_IMAGE_API_KEY;
const GROK_IMAGE_MODEL  = process.env.GROK_IMAGE_MODEL ?? 'grok-imagine-image';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Single-image result — backward-compatible with existing hero generation callers */
export interface GrokImageResult {
  buffer:           Buffer;
  url:              string;
  revised_prompt?:  string;
}

/** Multi-variant result for social card design pipeline */
export interface GrokImageVariant {
  buffer:   Buffer;
  filename: string;
  index:    number;        // 0-based variant index
}

export function isGrokAvailable(): boolean {
  return !!XAI_IMAGE_API_KEY;
}

// ── Internal ───────────────────────────────────────────────────────────────────

interface XAIImagesResponse {
  data?: Array<{
    url?:             string;
    b64_json?:        string;
    revised_prompt?:  string;
  }>;
}

async function callGrokImages(prompt: string, n: number): Promise<XAIImagesResponse> {
  if (!XAI_IMAGE_API_KEY) throw new Error('XAI_IMAGE_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_IMAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:           GROK_IMAGE_MODEL,
      prompt,
      n,
      response_format: 'url',   // url is more reliable across model versions
    }),
    signal: AbortSignal.timeout(5 * 60 * 1000), // 5 min — 4 variants takes time
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`xAI image API ${res.status}: ${text.slice(0, 400)}`);
  }

  return res.json() as Promise<XAIImagesResponse>;
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to download Grok image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a single image — used by hero-image generation pipeline.
 */
export async function generateImage(prompt: string): Promise<GrokImageResult> {
  const data = await callGrokImages(prompt, 1);
  const item = data.data?.[0];
  if (!item) throw new Error('xAI returned empty data array');

  if (item.url) {
    const buffer = await downloadBuffer(item.url);
    return { buffer, url: item.url, revised_prompt: item.revised_prompt };
  }
  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, 'base64');
    return { buffer, url: '', revised_prompt: item.revised_prompt };
  }

  throw new Error('xAI returned no image data');
}

/**
 * Generate n variants (1–4) in a single API call — used by social card design pipeline.
 * Returns all variants as Buffers for upload and display.
 */
export async function generateImagesGrok(
  prompt: string,
  n: number = 4,
): Promise<GrokImageVariant[]> {
  const clampedN = Math.max(1, Math.min(4, n));
  const ts = Date.now();

  const data = await callGrokImages(prompt, clampedN);
  if (!data.data?.length) throw new Error('Grok returned no images');

  const variants: GrokImageVariant[] = [];

  for (let i = 0; i < data.data.length; i++) {
    const item = data.data[i];
    let buffer: Buffer;

    try {
      if (item.url) {
        buffer = await downloadBuffer(item.url);
      } else if (item.b64_json) {
        buffer = Buffer.from(item.b64_json, 'base64');
      } else {
        console.warn(`[grok] variant ${i} had no url or b64_json — skipping`);
        continue;
      }
    } catch (err) {
      console.warn(`[grok] variant ${i} download failed:`, err);
      continue;
    }

    variants.push({ buffer, filename: `grok_${ts}_v${i + 1}.png`, index: i });
  }

  if (!variants.length) throw new Error('Grok: all variants failed to decode');

  console.log(`[grok] Generated ${variants.length} variant(s) via ${GROK_IMAGE_MODEL}`);
  return variants;
}
