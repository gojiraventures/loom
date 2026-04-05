/**
 * xAI Grok Imagine — Image Generation Client
 *
 * OpenAI-compatible API at https://api.x.ai/v1/images/generations
 * Model: grok-2-image-1212
 *
 * Returns the image as a Buffer (downloaded from the xAI-hosted URL).
 */

export interface GrokImageResult {
  buffer: Buffer;
  url: string;
  revised_prompt?: string;
}

export async function generateImage(prompt: string): Promise<GrokImageResult> {
  const apiKey = process.env.XAI_IMAGE_API_KEY;
  if (!apiKey) throw new Error('XAI_IMAGE_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image',
      prompt,
      n: 1,
      response_format: 'url',
      size: '1792x1024',
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`xAI image API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json() as { data?: { url?: string; b64_json?: string; revised_prompt?: string }[] };
  const item = data.data?.[0];

  if (!item) throw new Error('xAI returned empty data array');

  // Handle URL response (primary)
  if (item.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!imgRes.ok) throw new Error(`Failed to download image from xAI URL: ${imgRes.status}`);
    const arrayBuffer = await imgRes.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), url: item.url, revised_prompt: item.revised_prompt };
  }

  // Handle b64_json fallback
  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, 'base64');
    return { buffer, url: '', revised_prompt: item.revised_prompt };
  }

  throw new Error(`xAI returned no image data. Full response: ${JSON.stringify(data).slice(0, 300)}`);
}
