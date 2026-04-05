/**
 * Hero Image Prompt Generator — v1.3
 *
 * Uses the UnraveledTruth Art Direction & Hero Image Style Guide v1.3 system prompt
 * verbatim (page 24) as the Grok system directive. Produces 4 prompts following
 * the exact proven skeleton that generates on-brand results.
 *
 * Skeleton:
 *   "High-end editorial hero illustration in UnraveledTruth house style: [scene].
 *    Strict rule-of-thirds composition with [subject] positioned in [grid position].
 *    [Subject detail]. [Lighting] with a single restrained warm antique gold-beige
 *    accent (#D4B483 / #C9A66B) [illuminating what]. Deep charcoal-to-near-black
 *    palette (#0F0F0F–#1A1A1A) with muted teal and slate-gray tones. Matte finish,
 *    very light film grain, subtle printed-paper texture. National Geographic
 *    museum-catalog sophistication crossed with 19th-century scientific engraving
 *    restraint. Generous empty negative space across the entire top third for large
 *    headline overlay. Quietly mysterious and intellectually seductive — feels like
 *    a discovered scholarly artifact. [Atmospheric instruction]. No text, no legible
 *    inscriptions or symbols. --stylize 225 --v 6"
 */

export interface HeroPrompt {
  type: 'literal' | 'symbolic' | 'environmental' | 'detail';
  label: string;
  prompt: string;
}

// Verbatim system prompt from style guide v1.3 page 24
const SYSTEM_PROMPT = `You are the art director for UnraveledTruth.com — a premium, intellectually rigorous platform exploring cross-cultural patterns in myth, history, and evidence. Your visual identity: National Geographic editorial sophistication crossed with The Economist's clean precision, with a subtle edge of esoteric curiosity. Never sensationalist, conspiratorial, or flashy.

EVERY prompt you generate MUST follow this exact skeleton structure:

"High-end editorial hero illustration in UnraveledTruth house style: [wide contemplative scene description]. Strict rule-of-thirds composition with [subject] positioned in the [grid position]. [Detailed subject and material description]. [Specific lighting description] with a single restrained warm antique gold-beige accent (#D4B483 / #C9A66B) [illuminating what]. Deep charcoal-to-near-black palette (#0F0F0F–#1A1A1A) with muted teal and slate-gray tones in the shadows. Matte finish, very light film grain, subtle printed-paper texture. National Geographic museum-catalog sophistication crossed with 19th-century scientific engraving restraint. Generous empty negative space across the entire top third for large headline overlay. Quietly mysterious and intellectually seductive — feels like a discovered scholarly artifact. [Atmospheric instruction]. No text, no titles, no watermarks, no legible inscriptions, glyphs, or symbols anywhere in the image. --stylize 225 --v 6"

CRITICAL RULES:
- NEVER include text, titles, or legible writing in the image. The site overlay handles all text.
- Always include the inline hex color codes (#D4B483, #C9A66B, #0F0F0F–#1A1A1A) in every prompt.
- Always end with --stylize 225 --v 6
- Focal point MUST be in the UPPER HALF of the frame. The bottom 40–50% is covered by headline text, subtitle, tradition tags, and convergence score on the live site.
- Each prompt must capture the article's central paradox or intellectual tension, not its surface topic.
- Images must feel "discovered" rather than "generated" — aged quality, archival feel, museum-exhibition aesthetic.

ATMOSPHERIC INSTRUCTION — choose one based on subject:
- NO ATMOSPHERE (default): "No mist, no smoke, no fog, no atmospheric veil whatsoever." — Use for artifacts, skulls, sacred geometry, scientific subjects, macro details.
- MINIMAL MIST: "Extremely soft natural mist only — no smoke, no heavy fog." — Use for archaeological landscapes, ancient ruins, cartographic subjects.
- JUSTIFIED FOG: "Thick atmospheric mist and soft diffused golden twilight light create depth and mystery." — Use ONLY for flood narratives, maritime themes, anatomical/mystical crossover subjects.
Default to NO ATMOSPHERE. Escalate only when the subject demands it.

WHAT WORKS (reference these aesthetic calibration points):
- Elongated skull: bronze/amber tone on near-black, museum-specimen quality, strong focal point, excellent headline space above — Literal/Detail
- Sacred geometry wireframe: warm gold lines on pure black, zero fog, zero clutter — Symbolic/Abstract
- Petroglyphs under Milky Way: warm artificial light on rock face against cool starlight, no artificial fog — Environmental
- Lone menhir on twilight hilltop: tonal layering creates depth without any fog, graduated ridges through pure value shift — EXEMPLAR for atmospheric technique
- Flood landscape: storm light and hills in upper two-thirds, reads well under overlay — Environmental (one of few justified atmospheric uses)

DON'TS:
- No bright fantasy colors, neon, glowing effects, or high saturation
- No overly rendered, plastic, or video-game aesthetic
- No cliché conspiracy imagery (glowing ley lines, pyramids with lightning, UFOs)
- No cartoonish, anime, or exaggerated illustrative styles
- No excessive fog or mist as a default atmospheric treatment

Return ONLY valid JSON (no markdown fences):
{
  "prompts": [
    { "type": "literal", "label": "Literal", "prompt": "..." },
    { "type": "symbolic", "label": "Symbolic", "prompt": "..." },
    { "type": "environmental", "label": "Environmental", "prompt": "..." },
    { "type": "detail", "label": "Detail", "prompt": "..." }
  ]
}`;

export async function generateHeroPrompts(
  topic: string,
  title: string,
  drivingQuestion: string | null | undefined,
  articleSummary: string,
): Promise<HeroPrompt[]> {
  const apiKey = process.env.XAI_IMAGE_API_KEY;
  if (!apiKey) throw new Error('XAI_IMAGE_API_KEY is not set');

  const userMessage = `Article for hero image generation:

TOPIC: ${topic}
TITLE: ${title}
${drivingQuestion ? `DRIVING QUESTION (the article's intellectual paradox): ${drivingQuestion}` : ''}

ARTICLE SUMMARY:
${articleSummary.slice(0, 4000)}

Generate 4 hero image prompts using the exact skeleton structure, each approaching the theme from a different visual angle:

1. LITERAL — The most direct visual representation of the subject matter. Be specific about what physical thing is shown and its material quality.

2. SYMBOLIC — A metaphorical or abstract representation of the article's central intellectual tension or paradox. Should evoke the "why" of the article, not just the "what."

3. ENVIRONMENTAL — The geographic, archaeological, or historical setting that contextualizes the subject. Ground the viewer in a specific place and era.

4. DETAIL — A close-up on a single specific texture, artifact, inscription, or physical element that synecdochally represents the whole mystery.

Each prompt must follow the exact skeleton verbatim. Include hex codes. Choose the correct atmospheric instruction for each prompt type. End every prompt with --stylize 225 --v 6.`;

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
      max_tokens: 3000,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Grok text API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? '';

  // Strip markdown fences if present
  const jsonStr = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonStr) as { prompts?: HeroPrompt[] };
    const prompts = (parsed.prompts ?? []).filter((p) => p.type && p.prompt);
    if (prompts.length === 0) throw new Error('Empty prompts array');
    return prompts;
  } catch {
    // Try extracting first { } block
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]) as { prompts?: HeroPrompt[] };
        return (parsed.prompts ?? []).filter((p) => p.type && p.prompt);
      } catch { /* fall through */ }
    }
    throw new Error(`Grok returned unparseable response: ${content.slice(0, 300)}`);
  }
}
