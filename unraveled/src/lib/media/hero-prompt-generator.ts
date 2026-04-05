/**
 * Hero Image Prompt Generator
 *
 * Uses Grok (xAI) to generate 4 image prompts for a research article,
 * following the Unraveled Art Direction Style Guide v1.2.
 *
 * 4 variation types:
 *   Literal      — visual representation of the topic's primary evidence/subject
 *   Symbolic     — metaphorical image capturing the article's core paradox
 *   Environmental — setting/landscape that grounds the story geographically/temporally
 *   Detail       — close-up of artifact, inscription, texture, or physical fragment
 *
 * Each prompt follows the 5-part structure:
 *   Subject + Lighting + Composition + Color + Style Keywords
 *   + standard style suffix appended for consistency
 */

const STYLE_SUFFIX = [
  'cinematic documentary photography',
  'photorealistic',
  'editorial quality',
  'muted earth tones with deep ochre accents',
  'focal point in upper two-thirds of frame for text overlay compatibility',
  'lower third intentionally uncluttered or soft-focused',
  'historical gravitas',
  'shallow depth of field',
  'subtle film grain',
  '4K',
].join(', ');

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

  const systemPrompt = `You are an art director generating image generation prompts for a documentary-style research publication called Unraveled.

Each prompt must be a single flowing sentence combining:
[Subject: what is shown] + [Lighting: quality and direction] + [Composition: framing] + [Color: palette] + [Style: execution]

CRITICAL RULES:
- Focal point MUST be in the upper 60% of frame — lower third reserved for title overlay
- Mist and fog: allowed only as background atmosphere, never obscuring the main subject
- No text, watermarks, symbols, or graphics within the image
- No faces in close-up (documentary style: environments, objects, landscapes, not portraits)
- Be geographically and historically specific — avoid vague "ancient ruins" generics
- Each prompt must end verbatim with: ${STYLE_SUFFIX}

Return ONLY valid JSON (no markdown):
{
  "prompts": [
    { "type": "literal", "label": "Literal", "prompt": "..." },
    { "type": "symbolic", "label": "Symbolic", "prompt": "..." },
    { "type": "environmental", "label": "Environmental", "prompt": "..." },
    { "type": "detail", "label": "Detail", "prompt": "..." }
  ]
}`;

  const userPrompt = `Research article:
Topic: ${topic}
Title: ${title}
${drivingQuestion ? `Driving Question: ${drivingQuestion}` : ''}

Article Summary:
${articleSummary.slice(0, 3000)}

Generate 4 hero image prompts. Each must be a complete, self-contained prompt — the actual text to pass to an image model, not a description of what to show.

1. LITERAL — Represent the primary evidence or subject matter of this specific article. Show something concrete the article documents. Be specific.

2. SYMBOLIC — One powerful image that captures the article's central paradox or intellectual tension. A visual metaphor for the question being asked.

3. ENVIRONMENTAL — The geographic or archaeological setting where this story unfolds. Ground the viewer in a specific place and era.

4. DETAIL — Extreme close-up of a single artifact, inscription, texture, or physical fragment that embodies the article's central mystery. Maximum visual specificity.`;

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2048,
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
  const jsonStr = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(jsonStr) as { prompts?: HeroPrompt[] };
    return (parsed.prompts ?? []).filter((p) => p.type && p.prompt);
  } catch {
    // Try extracting first {...} block
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { prompts?: HeroPrompt[] };
      return (parsed.prompts ?? []).filter((p) => p.type && p.prompt);
    }
    throw new Error(`Grok returned unparseable response: ${content.slice(0, 200)}`);
  }
}
