/**
 * ComfyUI — Local Image Generation Client
 *
 * Calls the ComfyUI API server at COMFYUI_URL (default http://192.168.86.249:8000)
 * Uses Flux.2 Klein 4B fp8 workflow for fast local generation.
 *
 * Flow: POST /prompt → poll GET /history/{promptId} → GET /view to download image
 */

const COMFYUI_URL = process.env.COMFYUI_URL ?? 'http://192.168.86.249:8000';

export interface ComfyUIResult {
  buffer: Buffer;
  filename: string;
}

/** Build the API-format prompt payload for Flux.2 Klein 4B */
function buildPrompt(text: string, width = 1024, height = 1024): Record<string, unknown> {
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
    '75:67': { class_type: 'CLIPTextEncode',            inputs: { text: '', clip: ['75:71', 0] } },
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
