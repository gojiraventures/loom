/**
 * Hero Image Prompt Generator — v1.5
 *
 * Grok generates ONLY the variable part of each prompt (opener + scene + subject +
 * lighting/accent) — kept under ~600 chars so the fixed tail block always fits.
 *
 * The TAIL_BLOCK is appended verbatim by code, never by Grok. This guarantees the
 * style DNA (palette, finish, texture, aesthetic references, negative space, mood
 * phrase, atmospheric rules, no-text rule) is never compressed, paraphrased, or truncated.
 *
 * v1.5: Aesthetic updated from "museum engraving" to cinematic digital matte painting.
 * Warm accent is now a luminous atmospheric band / god rays, never a hard spotlight.
 * Based on approved reference images (coastal night, ruined statue, petroglyph cliff,
 * horned skull, river delta storm, curtained library, standing stone at dusk).
 */

// Verbatim fixed tail — appended to every Grok hero prompt in code.
export const TAIL_BLOCK =
  'Near-black sky and upper field (#080808–#181818) bleeding into deep teal-slate shadow tones (#1A3040–#2A4045). Warm antique gold-beige (#D4B483 / #C9A66B) used exclusively as a diffuse luminous atmospheric glow — a horizon band, volumetric god rays, or light filtered through an aperture — never as a hard spotlight or point-source accent. Multiple receding planes of layered volumetric haze create cinematic atmospheric depth. Hyper-real surface and material micro-detail rendered with VFX-grade precision — visible bone fractures, mineral staining, stone erosion, oxidized patina. Subtle analog film grain. Generous empty negative space across the entire top third for large headline overlay. Quietly mysterious and intellectually seductive. No text, no titles, no watermarks, no legible inscriptions, glyphs, or symbols anywhere in the image. Landscape 16:9 widescreen format.';

// ComfyUI/Flux variant — same DNA, square format, with Flux-specific realism anchors.
// NOTE: Keep atmospheric/lighting language minimal — Flux over-applies god rays and glow
// instructions. Let the variable prompt handle all lighting specifics.
export const COMFYUI_TAIL_BLOCK =
  'Deep charcoal-to-near-black palette (#0F0F0F–#1A1A1A) with muted teal and slate-gray tones in the shadows. Photorealistic. Shot on medium-format film. Matte finish, analog grain, micro-surface detail — aged stone shows actual mineral staining, hairline fractures, and uneven erosion. Atmospheric haze and mist used purposefully for cinematic depth — never theatrical columns of light or broad god rays. Generous empty negative space across the entire top third for large headline overlay. Quietly mysterious and intellectually seductive — feels like a discovered scholarly artifact. No text, no titles, no watermarks, no legible inscriptions, glyphs, or symbols anywhere in the image. Square 1:1 format.';

// Negative prompt used for every ComfyUI generation.
export const COMFYUI_NEGATIVE_PROMPT =
  '3D render, CGI, cartoon, animation, illustration, painting, smooth plastic surfaces, video game asset, fantasy art, oversaturated colors, god rays, theatrical light beams, lens flare, hard spotlight, watermark, text, signature, colossal scale, mythological proportions, giant, monumental, oversized, building-scale creature, monster teeth, predator skull, fang teeth, unrealistic anatomy';

/**
 * FLUX IMAGE RULES — shared prompt-writing guide for any agent generating
 * ComfyUI/Flux image prompts (Art Director, Visual Strategy, Hero Generator).
 *
 * Embed this block verbatim into the system prompt of any LLM that writes
 * image_prompt fields destined for ComfyUI/Flux generation.
 */
export const FLUX_IMAGE_RULES = `
═══════════════════════════════════════════════════════════
FLUX / COMFYUI IMAGE PROMPT RULES (UnraveledTruth house style)
═══════════════════════════════════════════════════════════

These rules apply to every image prompt you write for ComfyUI/Flux generation.
Flux is a photorealistic model — treat it like directing a medium-format film photographer,
not prompting a render engine.

── PALETTE ─────────────────────────────────────────────────
Deep charcoal to near-black (#0F0F0F–#1A1A1A) with muted teal and slate-gray in the
shadows. The only warm color is a restrained antique gold-beige (#D4B483 / #C9A66B) used
as a single narrow rim light, edge catch, or distant horizon glow — never a broad wash.

For tradition-specific cards, the image tone should reflect the tradition accent color:
  Biblical/Christian (#C9A66B): warm amber rim, candlelight edge catch
  Sumerian/Mesopotamian (#2A5C5E): cool teal atmospheric haze, clay-tablet warmth only on edges
  Hindu/Vedic (#C47A6E): dusty terracotta warmth, deep shadow, incense haze
  Greek/Roman (#8B7EC8): cool blue-slate moonlight, marble highlights only
  Mesoamerican/Mayan/Aztec (#5A8F6A): jungle mist, moss-green undertones, deep shadow
  Egyptian (#C4A44E): sand-gold edge catch, desert night sky, deep ochre shadows
  Norse (#6E7E90): slate-blue cold atmosphere, northern light quality
  Chinese/Buddhist/Taoist (#9D6A8B): deep indigo-violet dusk, lacquer-red edge catch only

── LIGHTING — SUBJECT ALWAYS EMERGES FROM DARKNESS ─────────
The subject must emerge from near-total darkness. Never generate in daylight.

Choose one of these setups:
  • Deep chiaroscuro — 90% shadow, single narrow rim of warm light from far upper right
  • Single volumetric shaft cutting through darkness from above
  • Moody twilight with impenetrable deep shadows
  • Theatrical museum-display lighting: single controlled source, void-black background
  • Dusk exterior: dim horizon glow only, rest near-black

BANNED LIGHTING: clear sky, direct sunlight, midday sun, morning light, dawn, bright,
well-lit, daylight, under [any weather] sky, broad god rays, theatrical light columns,
flanking light beams, multiple fill lights. One light source maximum.

── SCALE & ANATOMY — NEVER EXAGGERATE ──────────────────────
Flux scales subjects to mythological proportions unless you anchor them explicitly.

MANDATORY for every subject:
  1. State real-world dimensions: "skull approximately 65cm long", "artifact fits in two hands",
     "stone block 1.2m tall"
  2. State that it is NOT monumental: "human-sized, not monumental", "fits on a desktop"
  3. For biological specimens: name the exact species morphology and key anatomical features.
     Do NOT just write "rhino skull" — write "Coelodonta antiquitatis: elongated herbivore
     cranium, single horn boss on nasal bone, wide shallow orbital sockets, flat worn molars"
  4. For fossils/skeletal subjects: ALWAYS write "bare mineralized bone only — no skin,
     no soft tissue, no eyes, no fur, no living tissue whatsoever"
  5. For human-scale reference: a gloved hand, a tool, a field marker — never a field tag
     with a number (Flux renders the number as visible text in the image)

BANNED SCALE WORDS: colossal, towering, monumental, mythological, titanic, enormous,
vast (for objects), building-scale, creature-scale, overwhelming. These cause drift.

── COMPOSITION & SCRIM AWARENESS ───────────────────────────
The final card composites a Satori text overlay (headline + branding) over the image.
The scrim gradient covers the BOTTOM 62% of the image. Therefore:

  ✓ Place all key visual detail in the TOP 40–50% of the frame
  ✓ The bottom half may fade into near-black — this is correct and expected
  ✓ Top third: empty negative space for large headline overlay
  ✓ Upper-center to upper-right: primary subject
  ✓ Strong subject silhouette readable against the dark background

SUBJECTS THAT WORK BEHIND A SCRIM:
  ✓ Single isolated object on dark ground (skull, artifact, stone, instrument)
  ✓ Lone architectural fragment against dark sky
  ✓ Landscape horizon with subject silhouetted above the midline
  ✓ Close-up surface detail (texture, erosion, inscription)

SUBJECTS THAT FIGHT THE SCRIM (avoid):
  ✗ Faces with important expression detail in lower half
  ✗ Dense foliage / busy landscape filling the whole frame
  ✗ Maps or diagrams with labels
  ✗ Multiple figures interacting across the full height

── PHOTOREALISM ANCHORS ─────────────────────────────────────
Always include: "shot on medium-format film, photorealistic, matte finish, analog grain"
Always include surface specificity: "hairline fractures, mineral staining, calcium deposits,
uneven erosion, oxidized patina, aged ivory-yellow" — whichever fits the subject material.

── WHAT NEVER APPEARS IN A FLUX PROMPT ─────────────────────
  ✗ Midjourney flags (--stylize, --v, --ar, --chaos — these are ignored and confuse Flux)
  ✗ "God rays" or "volumetric light beams" (Flux renders theatrical columns of light)
  ✗ Any text, symbols, numerals, field tags, inscriptions, labels, glyphs
  ✗ Conceptual/narrative instructions ("to represent the paradox of X" — Flux ignores these)
  ✗ Multiple competing light sources
  ✗ "Ancient wisdom" aesthetics, conspiracy imagery, UFOs, glowing ley lines
`;


const SYSTEM_PROMPT = `You are the art director for UnraveledTruth.com — a premium editorial platform exploring cross-cultural patterns in myth, history, and evidence.

You will generate ONLY the variable portion of each image prompt. A fixed style tail will be appended by the system after your output — do NOT include it.

The variable portion you generate must follow this exact structure and stay UNDER 600 characters:
"High-end editorial hero illustration in UnraveledTruth house style: [scene description, 1–2 sentences max]. Strict rule-of-thirds composition with [subject] positioned in the [grid position — e.g. upper-center third]. [Material/subject detail, 1 sentence]. [Specific lighting direction] with a single restrained warm antique gold-beige accent (#D4B483 / #C9A66B) [illuminating what specifically]."

CRITICAL RULES:
- The fixed tail appended after your output handles: palette, finish, texture, aesthetic references, negative space, mood, atmospheric rules, no-text rule, and format. Do NOT include any of those in your output.
- SPATIAL AND MATERIAL INSTRUCTIONS ONLY. No narrative explanation of why you chose a composition. No sentences like "to represent the paradox of..." — Grok Imagine ignores conceptual logic and needs tonal/spatial/material instructions only.
- Be specific about materials: "weathered limestone," "oxidized bronze," "fired clay," not "ancient stone."
- Focal point must be in the UPPER HALF — bottom 40–50% is covered by overlay on the live site.
- Include the hex codes (#D4B483 / #C9A66B) in the lighting line of every prompt.
- Each prompt captures the article's intellectual paradox through visual specifics — not its surface topic.

SCALE AND ANATOMY — NEVER EXAGGERATE SIZE OR DISTORT BIOLOGY:
- Always include an explicit real-world scale anchor: "skull approximately 65cm long — human-sized, not monumental," "artifact fits in two hands," "stone block 1.2m tall."
- Dramatic settings cause models to render subjects at mythological scale. Counter this by stating the actual dimensions AND a human reference: "a gloved researcher's hand rests on the skull, which reaches only to a standing person's waist."
- For biological specimens, name the exact species morphology. A woolly rhinoceros skull (Coelodonta antiquitatis) has: elongated herbivore cranium, a single large horn boss on the nasal bone, wide shallow orbital sockets, NO visible canine or fang teeth (herbivore), heavy nasal septum. State these specifics — do not just write "rhinoceros skull."
- For fossil or skeletal subjects, explicitly state "bare mineralized bone only — no skin, no soft tissue, no eyes, no fur — fossilized cranium and jaw only." Without this, models render the living animal instead of the fossil.
- NEVER use scale-exaggerating adjectives: "colossal," "towering," "monumental," "mythological," "titanic," "enormous." These cause unrealistic proportions.
- If including a human figure for scale, they must be the correct size relative to the subject — not dwarfed by it unless the subject is genuinely building-scale.

LIGHTING RULES — THE SUBJECT ALWAYS EMERGES FROM DARKNESS, NEVER SITS IN DAYLIGHT:
Every scene description MUST use one of these lighting setups (choose whichever fits the subject):
  • "dramatic chiaroscuro lighting with deep shadows"
  • "single volumetric shaft of warm light cutting through darkness"
  • "soft god rays from upper right illuminating [subject] against near-black surroundings"
  • "moody twilight atmosphere with deep impenetrable shadows"
  • "theatrical museum-display lighting against void-black background"

If the scene is outdoors, it is dusk or night. If indoors, it is a near-dark chamber with one controlled light source. The deep charcoal-to-black palette in the tail block cannot do its job if the scene description asks for a sunlit environment.

BANNED LIGHTING WORDS — never use any of these:
  ✗ "clear sky"
  ✗ "harsh sun" / "direct sunlight" / "midday sun"
  ✗ "morning light" / "dawn light" / "bright"
  ✗ "under a [any weather] sky"
  ✗ "daylight"
  ✗ "well-lit"

Return ONLY valid JSON:
{
  "prompts": [
    { "type": "literal", "label": "Literal", "variable": "..." },
    { "type": "symbolic", "label": "Symbolic", "variable": "..." },
    { "type": "environmental", "label": "Environmental", "variable": "..." },
    { "type": "detail", "label": "Detail", "variable": "..." }
  ]
}`;

export interface HeroPrompt {
  type: 'literal' | 'symbolic' | 'environmental' | 'detail';
  label: string;
  prompt: string;
}

export async function generateHeroPrompts(
  topic: string,
  title: string,
  drivingQuestion: string | null | undefined,
  articleSummary: string,
): Promise<HeroPrompt[]> {
  const apiKey = process.env.XAI_IMAGE_API_KEY;
  if (!apiKey) throw new Error('XAI_IMAGE_API_KEY is not set');

  const userMessage = `Article:
TITLE: ${title}
${drivingQuestion ? `DRIVING QUESTION (the intellectual paradox): ${drivingQuestion}` : ''}

SUMMARY:
${articleSummary.slice(0, 3000)}

Generate the variable portion of 4 hero image prompts. Each must stay under 600 characters. Spatial/material/tonal instructions only — no narrative explanation.

1. LITERAL — Direct visual representation of the primary subject. Specific object, material, and state.
2. SYMBOLIC — Visual metaphor for the article's central paradox. Abstract or surreal but described spatially/materially, not conceptually.
3. ENVIRONMENTAL — Geographic or archaeological setting grounding the story in place and era.
4. DETAIL — Extreme close-up of a single artifact, surface, or physical fragment.`;

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.6,
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grok text API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';

  const jsonStr = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  interface RawPrompt { type: string; label: string; variable: string }

  const parse = (str: string): HeroPrompt[] => {
    const parsed = JSON.parse(str) as { prompts?: RawPrompt[] };
    return (parsed.prompts ?? [])
      .filter((p) => p.type && p.variable)
      .map((p) => ({
        type: p.type as HeroPrompt['type'],
        label: p.label,
        // Append the fixed tail block — this is where the style DNA lives
        prompt: `${p.variable.trimEnd()} ${TAIL_BLOCK}`,
      }));
  };

  try {
    const prompts = parse(jsonStr);
    if (prompts.length === 0) throw new Error('Empty prompts array');
    return prompts;
  } catch {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try { return parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error(`Grok returned unparseable response: ${content.slice(0, 300)}`);
  }
}
