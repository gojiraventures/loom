/**
 * fal.ai Image Generation Client
 *
 * Uses Flux Pro v1.1 via fal.ai queue API.
 * Returns the same ComfyUIResult shape so it's a drop-in swap.
 *
 * Auth: FAL_API_KEY env var
 * Model: FAL_MODEL env var (default: fal-ai/flux-pro/v1.1)
 *
 * Note: Flux architecture does not support negative prompts — compensate
 * by being more explicit in the positive prompt about what NOT to include.
 */

import type { ComfyUIResult } from './comfyui';

const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_MODEL = process.env.FAL_MODEL ?? 'fal-ai/flux-pro/v1.1';
const FAL_BASE = 'https://queue.fal.run';

export function isFalAvailable(): boolean {
  return !!FAL_API_KEY;
}

function falHeaders(): Record<string, string> {
  return {
    'Authorization': `Key ${FAL_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

interface FalResult {
  images: { url: string; width: number; height: number; content_type: string }[];
  seed: number;
  prompt: string;
}

export async function generateImageFalAI(
  prompt: string,
  width = 1024,
  height = 1024,
): Promise<ComfyUIResult> {
  if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not set');

  const seed = Math.floor(Math.random() * 2 ** 32);

  // Use sync endpoint — blocks until image is ready (simpler than queue polling)
  const res = await fetch(`https://fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers: falHeaders(),
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
      output_format: 'jpeg',
      seed,
      safety_tolerance: '6',  // max — we're generating editorial art
      enhance_prompt: false,  // we write precise prompts — don't let fal rewrite them
    }),
    signal: AbortSignal.timeout(3 * 60 * 1000), // 3 min
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`fal.ai error ${res.status}: ${text.slice(0, 300)}`);
  }

  const result = await res.json() as FalResult;
  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai returned no image URL');

  // Download image buffer
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) throw new Error(`fal.ai image download error ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const filename = `fal_${Date.now()}_${seed}.jpg`;

  console.log(`[falai] Done — ${filename} (${buffer.length} bytes)`);
  return { buffer, filename };
}
