/**
 * Image generation test with Gemini 2.5 Pro validation loop.
 * Supports ComfyUI (local) and fal.ai backends.
 *
 * Run:
 *   node scripts/test-comfyui-art-direction.mjs                  # ComfyUI (default)
 *   IMAGE_BACKEND=falai node scripts/test-comfyui-art-direction.mjs  # fal.ai
 *
 * Requires: GOOGLE_AI_API_KEY (validator), FAL_API_KEY (if using fal.ai)
 */

// Load .env.local so API keys are available when running outside Next.js
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dir, '../.env.local');
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no .env.local — rely on shell environment */ }

const IMAGE_BACKEND = process.env.IMAGE_BACKEND ?? 'comfyui'; // 'comfyui' | 'falai'
const COMFYUI_URL = process.env.COMFYUI_URL ?? 'http://192.168.86.249:8000';
const FAL_API_KEY = process.env.FAL_API_KEY;
const FAL_MODEL = process.env.FAL_MODEL ?? 'fal-ai/flux-pro/v1.1';
const FAL_QUEUE_BASE = 'https://queue.fal.run';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const MAX_ATTEMPTS = 3;

console.log(`Backend: ${IMAGE_BACKEND.toUpperCase()} | Model: ${IMAGE_BACKEND === 'falai' ? FAL_MODEL : 'flux-2-klein-base-4b-fp8'}`);

// Synced with src/lib/media/hero-prompt-generator.ts COMFYUI_TAIL_BLOCK
const COMFYUI_TAIL_BLOCK =
  'Deep charcoal-to-near-black palette (#0F0F0F–#1A1A1A) with muted teal and slate-gray tones in the shadows. Photorealistic. Shot on medium-format film. Matte finish, analog grain, micro-surface detail — aged bone shows actual mineral staining, hairline fractures, and uneven erosion. Atmospheric haze and mist used purposefully for cinematic depth — never theatrical columns of light or broad god rays. Generous empty negative space across the entire top third for large headline overlay. Quietly mysterious and intellectually seductive — feels like a discovered scholarly artifact. No text, no titles, no watermarks, no legible inscriptions, glyphs, or symbols anywhere in the image. Square 1:1 format.';

const NEGATIVE_PROMPT =
  '3D render, CGI, cartoon, animation, illustration, painting, smooth plastic surfaces, video game asset, fantasy art, oversaturated colors, god rays, theatrical light beams, lens flare, hard spotlight, watermark, text, signature, colossal scale, mythological proportions, giant, monumental, oversized, building-scale creature, monster teeth, predator skull, fang teeth, unrealistic anatomy, horse skull, equine skull, deer skull, bovine skull, upright display mount, museum mount, scattered ice cubes, ice blocks, bright background, teal glow, uniform lighting';

const VARIABLE_PART =
  'High-end editorial hero illustration in UnraveledTruth house style: a Coelodonta antiquitatis woolly rhinoceros fossil skull — bare yellowed mineralized bone, absolutely no skin, no fur, no flesh, no living tissue — lying on its side at a 40-degree angle, half-buried in dark Siberian permafrost soil, excavated at night. The skull is unmistakably rhinoceros: the massive bony horn boss protrudes from the nasal bone above the nasal aperture — this is the dominant feature of the entire image. Wide flat orbital sockets positioned on the sides, not the front. No canine teeth — flat worn herbivore molars only. The skull is approximately 70cm long, heavy and robust, too dense to confuse with any equine or bovine specimen. Strict rule-of-thirds, skull filling upper-right quadrant, nasal horn boss in center-right. Ground: dark frozen permafrost earth, almost black soil with faint frost crystals — no ice cubes. Lighting: 95% of the frame in deep shadow — a single razor-thin rim of warm antique gold-beige (#D4B483) catches only the uppermost crest of the cranium and the tip of the horn boss from far upper right. Shot on medium-format film — fossil bone surface: deep mineral staining, calcium deposits, hairline fractures, aged ivory-yellow patina.';

// Short plain-English brief for the Gemini validator (separate from the full prompt)
const INTENT =
  'A Coelodonta antiquitatis (woolly rhinoceros) fossil skull — bare bone, no living tissue — half-buried in dark Siberian permafrost at night. Cinematic near-total darkness with a single narrow warm rim light on the horn boss. Photorealistic, not CGI.';

const BASE_PROMPT = `${VARIABLE_PART} ${COMFYUI_TAIL_BLOCK}`;

console.log('Base prompt length:', BASE_PROMPT.length, 'chars');
console.log('Intent:', INTENT);
console.log('Max attempts:', MAX_ATTEMPTS);
console.log('Submitting to ComfyUI at', COMFYUI_URL);

function buildPrompt(text, width = 1024, height = 1024) {
  const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  return {
    '9':     { class_type: 'SaveImage',               inputs: { filename_prefix: 'unraveled', images: ['75:65', 0] } },
    '76':    { class_type: 'PrimitiveStringMultiline', inputs: { value: text } },
    '75:61': { class_type: 'KSamplerSelect',           inputs: { sampler_name: 'euler' } },
    '75:62': { class_type: 'Flux2Scheduler',           inputs: { steps: 20, width: ['75:68', 0], height: ['75:69', 0] } },
    '75:63': { class_type: 'CFGGuider',                inputs: { cfg: 5, model: ['75:70', 0], positive: ['75:74', 0], negative: ['75:67', 0] } },
    '75:64': { class_type: 'SamplerCustomAdvanced',    inputs: { noise: ['75:73', 0], guider: ['75:63', 0], sampler: ['75:61', 0], sigmas: ['75:62', 0], latent_image: ['75:66', 0] } },
    '75:65': { class_type: 'VAEDecode',                inputs: { samples: ['75:64', 0], vae: ['75:72', 0] } },
    '75:66': { class_type: 'EmptyFlux2LatentImage',    inputs: { width: ['75:68', 0], height: ['75:69', 0], batch_size: 1 } },
    '75:67': { class_type: 'CLIPTextEncode',           inputs: { text: NEGATIVE_PROMPT, clip: ['75:71', 0] } },
    '75:68': { class_type: 'PrimitiveInt',             inputs: { value: width } },
    '75:69': { class_type: 'PrimitiveInt',             inputs: { value: height } },
    '75:70': { class_type: 'UNETLoader',               inputs: { unet_name: 'flux-2-klein-base-4b-fp8.safetensors', weight_dtype: 'default' } },
    '75:71': { class_type: 'CLIPLoader',               inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'flux2', device: 'default' } },
    '75:72': { class_type: 'VAELoader',                inputs: { vae_name: 'flux2-vae.safetensors' } },
    '75:73': { class_type: 'RandomNoise',              inputs: { noise_seed: seed } },
    '75:74': { class_type: 'CLIPTextEncode',           inputs: { text: ['76', 0], clip: ['75:71', 0] } },
  };
}

// ── fal.ai backend (sync endpoint — returns result directly, no polling) ──────
async function generateOnceFal(promptText) {
  if (!FAL_API_KEY) throw new Error('FAL_API_KEY is not set');
  const seed = Math.floor(Math.random() * 2 ** 32);
  const headers = { 'Authorization': `Key ${FAL_API_KEY}`, 'Content-Type': 'application/json' };

  process.stdout.write(`  Generating via fal.ai (${FAL_MODEL})... `);

  // Use sync endpoint: POST https://fal.run/{model} — blocks until image is ready
  const res = await fetch(`https://fal.run/${FAL_MODEL}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: promptText,
      image_size: { width: 1024, height: 1024 },
      num_images: 1,
      output_format: 'jpeg',
      seed,
      safety_tolerance: '6',
      enhance_prompt: false,
    }),
    signal: AbortSignal.timeout(3 * 60 * 1000), // 3 min timeout
  });

  if (!res.ok) throw new Error(`fal.ai error ${res.status}: ${await res.text()}`);
  const result = await res.json();
  process.stdout.write('done\n');

  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) {
    console.error('  [fal] Response:', JSON.stringify(result).slice(0, 300));
    throw new Error('fal.ai returned no image URL');
  }

  console.log('  Image URL:', imageUrl);
  const imgRes = await fetch(imageUrl);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const filename = `fal_${Date.now()}_${seed}.jpg`;
  return { filename, viewUrl: imageUrl, buffer };
}

// ── ComfyUI backend ───────────────────────────────────────────────────────────
async function generateOnce(promptText) {
  const clientId = crypto.randomUUID();
  const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: buildPrompt(promptText), client_id: clientId }),
  });

  if (!submitRes.ok) throw new Error(`Submit failed: ${submitRes.status} ${await submitRes.text()}`);

  const { prompt_id } = await submitRes.json();
  process.stdout.write(`  prompt_id: ${prompt_id} polling`);

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));
    process.stdout.write('.');

    const histRes = await fetch(`${COMFYUI_URL}/history/${prompt_id}`);
    if (!histRes.ok) continue;
    const hist = await histRes.json();
    const entry = hist[prompt_id];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') throw new Error('ComfyUI generation error');

    if (entry.status?.completed && entry.outputs) {
      for (const nodeOutput of Object.values(entry.outputs)) {
        if (nodeOutput.images?.[0]) {
          const { filename, subfolder, type } = nodeOutput.images[0];
          process.stdout.write('\n');
          const viewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
          const imgRes = await fetch(viewUrl);
          if (!imgRes.ok) throw new Error(`/view error ${imgRes.status}`);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          return { filename, viewUrl, buffer };
        }
      }
    }
  }
  throw new Error('ComfyUI timed out');
}

// ── Gemini 2.5 Pro validator ──────────────────────────────────────────────────
async function validateWithGemini(imageBuffer, intent, fullPrompt) {
  if (!GOOGLE_AI_API_KEY) {
    console.warn('  [validator] GOOGLE_AI_API_KEY not set — skipping validation, marking approved');
    return { approved: true, issues: [], prompt_additions: '', summary: 'Validation skipped (no API key)' };
  }

  const systemAndPrompt = `You are a visual art director for UnraveledTruth, reviewing AI-generated images.

INTENT (what this image was supposed to show):
${intent}

FULL PROMPT USED:
${fullPrompt}

Evaluate the image. Check:
1. SUBJECT ACCURACY: Does it show the correct subject with correct morphology?
   For woolly rhino skull (Coelodonta antiquitatis): the massive bony horn boss on the nasal bone
   must be the dominant feature. Wide flat herbivore orbital sockets on the sides of the skull.
   No canine/fang teeth — flat molars only. Must NOT look like a horse/equine skull.
   Bone only — no skin, fur, flesh, or living tissue.
2. LIGHTING: Is it 90-95% shadow with a single narrow rim light? Or is it too bright/evenly lit?
3. COMPOSITION: Subject in upper half? Not a centered display-mount pose?
4. PHOTOREALISM: Does it look like a real photograph or CGI?
5. NO TEXT/SYMBOLS: Any visible numbers, labels, or characters?

Return ONLY valid JSON:
{
  "approved": true | false,
  "issues": ["specific issue 1"],
  "prompt_additions": "Corrective imperatives for the next generation attempt. Be specific.",
  "summary": "One sentence assessment"
}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { text: systemAndPrompt },
        { inline_data: { mime_type: 'image/png', data: imageBuffer.toString('base64') } },
      ],
    }],
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );

  if (!res.ok) {
    console.warn(`  [validator] Gemini error ${res.status} — skipping, marking approved`);
    return { approved: true, issues: [], prompt_additions: '', summary: `Gemini error ${res.status}` };
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.warn('  [validator] Could not parse Gemini response — marking approved');
    return { approved: true, issues: [], prompt_additions: '', summary: 'Parse failed' };
  }
}

// ── Main validation loop ──────────────────────────────────────────────────────
let currentPrompt = BASE_PROMPT;
let finalResult = null;

const generateBackend = IMAGE_BACKEND === 'falai' ? generateOnceFal : generateOnce;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(`\n── Attempt ${attempt}/${MAX_ATTEMPTS} ─────────────────────────`);
  const result = await generateBackend(currentPrompt);
  console.log(`  Generated: ${result.filename}`);
  console.log(`  View: ${result.viewUrl}`);

  console.log('  Validating with Gemini 2.5 Pro...');
  const validation = await validateWithGemini(result.buffer, INTENT, currentPrompt);

  console.log(`  Result: ${validation.approved ? '✅ APPROVED' : '❌ FAILED'}`);
  console.log(`  Summary: ${validation.summary}`);
  if (validation.issues.length) {
    console.log('  Issues:');
    validation.issues.forEach((i) => console.log(`    • ${i}`));
  }

  finalResult = result;

  if (validation.approved || attempt === MAX_ATTEMPTS) {
    if (!validation.approved) console.log(`\n  Max attempts reached — using last generation.`);
    break;
  }

  if (validation.prompt_additions) {
    console.log(`\n  Corrections: ${validation.prompt_additions.slice(0, 200)}...`);
    currentPrompt = `${currentPrompt} ${validation.prompt_additions}`;
    console.log(`  New prompt length: ${currentPrompt.length} chars`);
  }
}

console.log(`\n══ Final result ══════════════════════════════════════`);
console.log('File:', finalResult.filename);
console.log('View:', finalResult.viewUrl);
