/**
 * Hero Image Prompt Generator — v1.3
 *
 * Grok generates ONLY the variable part of each prompt (opener + scene + subject +
 * lighting/accent) — kept under ~600 chars so the fixed tail block always fits.
 *
 * The TAIL_BLOCK is appended verbatim by code, never by Grok. This guarantees the
 * style DNA (palette, finish, texture, aesthetic references, negative space, mood
 * phrase, atmospheric rule, no-text rule, and --stylize params) is never compressed,
 * paraphrased, or truncated.
 */

// Verbatim fixed tail — appended to every prompt in code. ~750 chars. Never modify.
const TAIL_BLOCK =
  'Deep charcoal-to-near-black palette (#0F0F0F–#1A1A1A) with muted teal and slate-gray tones in the shadows. Matte finish, very light film grain, subtle printed-paper texture. National Geographic museum-catalog sophistication crossed with 19th-century scientific engraving restraint. Generous empty negative space across the entire top third for large headline overlay. Quietly mysterious and intellectually seductive — feels like a discovered scholarly artifact. No mist, no smoke, no fog, no atmospheric veil whatsoever. No text, no titles, no watermarks, no legible inscriptions, glyphs, or symbols anywhere in the image. --stylize 225 --v 6';

const SYSTEM_PROMPT = `You are the art director for UnraveledTruth.com — a premium editorial platform exploring cross-cultural patterns in myth, history, and evidence.

You will generate ONLY the variable portion of each image prompt. A fixed style tail will be appended by the system after your output — do NOT include it.

The variable portion you generate must follow this exact structure and stay UNDER 600 characters:
"High-end editorial hero illustration in UnraveledTruth house style: [scene description, 1–2 sentences max]. Strict rule-of-thirds composition with [subject] positioned in the [grid position — e.g. upper-center third]. [Material/subject detail, 1 sentence]. [Specific lighting direction] with a single restrained warm antique gold-beige accent (#D4B483 / #C9A66B) [illuminating what specifically]."

CRITICAL RULES:
- The fixed tail appended after your output handles: palette, finish, texture, aesthetic references, negative space, mood, no-fog rule, no-text rule, and --stylize params. Do NOT include any of those in your output.
- SPATIAL AND MATERIAL INSTRUCTIONS ONLY. No narrative explanation of why you chose a composition. No sentences like "to represent the paradox of..." — Grok Imagine ignores conceptual logic and needs tonal/spatial/material instructions only.
- Be specific about materials: "weathered limestone," "oxidized bronze," "fired clay," not "ancient stone."
- Be specific about lighting: "low raking sidelight from the right," "single overhead shaft of warm light," not "dramatic lighting."
- Focal point must be in the UPPER HALF — bottom 40–50% is covered by overlay on the live site.
- Include the hex codes (#D4B483 / #C9A66B) in the lighting line of every prompt.
- Each prompt captures the article's intellectual paradox through visual specifics — not its surface topic.

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
