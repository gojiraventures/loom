/**
 * xAI Grok Imagine — Image Generation Client
 *
 * OpenAI-compatible API at https://api.x.ai/v1/images/generations
 * Model: grok-2-image-1212
 *
 * Returns base64-encoded PNG data for each generated image.
 */

export interface GrokImageResult {
  b64_json: string;
  revised_prompt?: string;
}

export async function generateImage(prompt: string): Promise<GrokImageResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not set');

  const res = await fetch('https://api.x.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-2-image-1212',
      prompt,
      n: 1,
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: { b64_json?: string; revised_prompt?: string }[] };
  const item = data.data?.[0];
  if (!item?.b64_json) throw new Error('No image data returned from xAI');

  return { b64_json: item.b64_json, revised_prompt: item.revised_prompt };
}
