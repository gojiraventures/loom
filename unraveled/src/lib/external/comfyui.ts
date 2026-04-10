/**
 * ComfyUI — Local Image Generation Client
 *
 * Calls the ComfyUI API server at COMFYUI_URL (default http://192.168.86.249:8000)
 * Uses Flux.2 Klein 4B fp8 workflow for fast local generation.
 *
 * Flow: POST /prompt → poll GET /history/{promptId} → GET /view to download image
 */

const COMFYUI_URL = process.env.COMFYUI_URL ?? 'http://192.168.86.249:8000';

/** Returns true if the ComfyUI server is reachable. Used for graceful fallback. */
export async function checkAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/queue`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ComfyUIResult {
  buffer: Buffer;
  filename: string;
}

// Imported from the canonical source so all pipelines share the same negative prompt
import { COMFYUI_NEGATIVE_PROMPT } from '@/lib/media/hero-prompt-generator';

const DEFAULT_NEGATIVE = COMFYUI_NEGATIVE_PROMPT;

/** Build the API-format prompt payload for Flux.2 Klein 4B */
function buildPrompt(text: string, width = 1024, height = 1024, negative = DEFAULT_NEGATIVE): Record<string, unknown> {
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return {
    '9':     { class_type: 'SaveImage',                inputs: { filename_prefix: 'unraveled', images: ['75:65', 0] } },
    '76':    { class_type: 'PrimitiveStringMultiline',  inputs: { value: text } },
    '75:61': { class_type: 'KSamplerSelect',            inputs: { sampler_name: 'euler' } },
    '75:62': { class_type: 'Flux2Scheduler',            inputs: { steps: 20, width: ['75:68', 0], height: ['75:69', 0] } },
    '75:63': { class_type: 'CFGGuider',                 inputs: { cfg: 5, model: ['75:70', 0], positive: ['75:74', 0], negative: ['75:67', 0] } },
    '75:64': { class_type: 'SamplerCustomAdvanced',     inputs: { noise: ['75:73', 0], guider: ['75:63', 0], sampler: ['75:61', 0], sigmas: ['75:62', 0], latent_image: ['75:66', 0] } },
    '75:65': { class_type: 'VAEDecode',                 inputs: { samples: ['75:64', 0], vae: ['75:72', 0] } },
    '75:66': { class_type: 'EmptyFlux2LatentImage',     inputs: { width: ['75:68', 0], height: ['75:69', 0], batch_size: 1 } },
    '75:67': { class_type: 'CLIPTextEncode',            inputs: { text: negative, clip: ['75:71', 0] } },
    '75:68': { class_type: 'PrimitiveInt',              inputs: { value: width } },
    '75:69': { class_type: 'PrimitiveInt',              inputs: { value: height } },
    '75:70': { class_type: 'UNETLoader',                inputs: { unet_name: 'flux-2-klein-base-4b-fp8.safetensors', weight_dtype: 'default' } },
    '75:71': { class_type: 'CLIPLoader',                inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'flux2', device: 'default' } },
    '75:72': { class_type: 'VAELoader',                 inputs: { vae_name: 'flux2-vae.safetensors' } },
    '75:73': { class_type: 'RandomNoise',               inputs: { noise_seed: seed } },
    '75:74': { class_type: 'CLIPTextEncode',            inputs: { text: ['76', 0], clip: ['75:71', 0] } },
  };
}

export async function generateImageComfyUI(
  prompt: string,
  width = 1024,
  height = 1024,
): Promise<ComfyUIResult> {
  const clientId = crypto.randomUUID();

  // Submit prompt
  const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: buildPrompt(prompt, width, height), client_id: clientId }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => '');
    throw new Error(`ComfyUI /prompt error ${submitRes.status}: ${text.slice(0, 300)}`);
  }

  const { prompt_id } = await submitRes.json() as { prompt_id: string };
  if (!prompt_id) throw new Error('ComfyUI returned no prompt_id');

  // Poll history until complete (max 5 minutes)
  const deadline = Date.now() + 5 * 60 * 1000;
  let outputFilename: string | null = null;
  let subfolder = '';
  let outputType = 'output';

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));

    const histRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!histRes.ok) continue;

    const hist = await histRes.json() as Record<string, {
      status?: { completed?: boolean; status_str?: string };
      outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }>;
    }>;

    const entry = hist[prompt_id];
    if (!entry) continue;

    if (entry.status?.status_str === 'error') {
      throw new Error('ComfyUI generation failed');
    }

    if (entry.status?.completed && entry.outputs) {
      for (const nodeOutput of Object.values(entry.outputs)) {
        if (nodeOutput.images?.[0]) {
          outputFilename = nodeOutput.images[0].filename;
          subfolder = nodeOutput.images[0].subfolder;
          outputType = nodeOutput.images[0].type;
          break;
        }
      }
      if (outputFilename) break;
    }
  }

  if (!outputFilename) throw new Error('ComfyUI timed out or produced no output');

  // Download the image
  const viewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(outputFilename)}&subfolder=${encodeURIComponent(subfolder)}&type=${outputType}`;
  const imgRes = await fetch(viewUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) throw new Error(`ComfyUI /view error ${imgRes.status}`);

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  return { buffer, filename: outputFilename };
}

// ── Validated generation loop ─────────────────────────────────────────────────

export interface ValidationAttempt {
  attempt: number;
  filename: string;
  approved: boolean;
  identified_subject?: string;
  issues: string[];
  summary: string;
}

export interface ValidatedResult extends ComfyUIResult {
  attempts: number;
  history: ValidationAttempt[];
}

/**
 * Generates an image and validates it with Gemini 2.5 Pro.
 * If issues are found, appends corrective instructions and regenerates.
 * Returns the first approved result, or the last attempt if maxAttempts is reached.
 *
 * @param prompt       Full prompt (variable + tail block)
 * @param intent       Short plain-English description of what the image should look like
 *                     (used as the validation brief — distinct from the full prompt)
 * @param width        Image width in pixels
 * @param height       Image height in pixels
 * @param maxAttempts  Max generation cycles before returning best result (default 3)
 * @param generateFn   Image generation backend — defaults to ComfyUI. Pass generateImageFalAI to use fal.ai.
 */
export async function generateWithValidation(
  prompt: string,
  intent: string,
  width = 1024,
  height = 1024,
  maxAttempts = 3,
  generateFn: (p: string, w: number, h: number) => Promise<ComfyUIResult> = generateImageComfyUI,
): Promise<ValidatedResult> {
  const { validateImage, quickRejectCheck } = await import('@/lib/media/image-validator');

  const history: ValidationAttempt[] = [];
  let currentPrompt = prompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[comfyui] Attempt ${attempt}/${maxAttempts}...`);
    const result = await generateFn(currentPrompt, width, height);

    // Stage 1: cheap pixel-level check — catches black frames, blank outputs
    const quickCheck = await quickRejectCheck(result.buffer);
    if (quickCheck.reject) {
      console.warn(`[comfyui] Quick reject (attempt ${attempt}): ${quickCheck.reason}`);
      history.push({
        attempt,
        filename: result.filename,
        approved: false,
        issues: [quickCheck.reason],
        summary: `Pixel check failed: ${quickCheck.reason}`,
      });
      if (attempt < maxAttempts) continue; // regenerate without wasting a Gemini call
      // Last attempt — return the bad image (caller will handle)
      return { ...result, attempts: attempt, history };
    }

    // Stage 2: Gemini Flash visual inspection
    console.log(`[comfyui] Validating with Gemini Flash...`);
    const validation = await validateImage(result.buffer, intent, currentPrompt);

    history.push({
      attempt,
      filename: result.filename,
      approved: validation.approved,
      identified_subject: validation.identified_subject,
      issues: validation.issues,
      summary: validation.summary,
    });

    console.log(`[comfyui] Attempt ${attempt}: ${validation.approved ? 'APPROVED' : 'FAILED'} — ${validation.summary}${validation.identified_subject ? ` [Identified: ${validation.identified_subject}]` : ''}`);

    if (validation.approved || attempt === maxAttempts) {
      return { ...result, attempts: attempt, history };
    }

    // Build corrected prompt for next attempt — append Gemini's specific fixes
    if (validation.prompt_additions) {
      currentPrompt = `${currentPrompt} ${validation.prompt_additions}`;
      console.log(`[comfyui] Corrections appended. Prompt length: ${currentPrompt.length} chars`);
    }
  }

  // Unreachable — TypeScript requires it
  throw new Error('generateWithValidation: exceeded maxAttempts without returning');
}
