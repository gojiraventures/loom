/**
 * Gemini image generation — hero images for dossiers.
 *
 * Uses gemini-3-pro-image (override with GEMINI_IMAGE_MODEL). Text-to-image, and
 * image+text when a reference image is supplied — the reference guides
 * composition/subject while the house-style prompt keeps art direction.
 *
 * Auth: GOOGLE_AI_API_KEY (same key as research Gemini).
 */

const API_KEY = process.env.GOOGLE_AI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3-pro-image';

export interface GeminiImageResult {
  buffer: Buffer;
  mimeType: string;
}

/** A reference image passed as guidance (base64 payload + its mime type). */
export interface ReferenceImage {
  base64: string;   // raw base64 (no data: prefix)
  mimeType: string; // e.g. image/jpeg, image/png
}

export function isGeminiImageAvailable(): boolean {
  return !!API_KEY;
}

export async function generateGeminiImage(
  prompt: string,
  reference?: ReferenceImage | null,
): Promise<GeminiImageResult> {
  if (!API_KEY) throw new Error('GOOGLE_AI_API_KEY is not set');

  const parts: Array<Record<string, unknown>> = [];
  if (reference?.base64) {
    parts.push({ inlineData: { mimeType: reference.mimeType || 'image/jpeg', data: reference.base64 } });
  }
  parts.push({ text: prompt });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: ctrl.signal,
      },
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try { msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg; } catch { /* keep raw */ }
    throw new Error(`Gemini image API ${res.status}: ${msg}`);
  }

  const data = JSON.parse(text) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
  };
  const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!imgPart?.inlineData?.data) {
    throw new Error('Gemini returned no image data (possibly refused or safety-blocked)');
  }

  return {
    buffer: Buffer.from(imgPart.inlineData.data, 'base64'),
    mimeType: imgPart.inlineData.mimeType ?? 'image/jpeg',
  };
}
