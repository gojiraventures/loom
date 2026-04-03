/**
 * POST /api/admin/visual-strategy
 *
 * Generates (or regenerates) the Visual Strategy Agent output for a topic
 * and saves it to synthesized_output.visual_strategy.
 *
 * Body: { topic: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryGemini } from '@/lib/research/llm/gemini';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 60;

// ── Copied from editor-pass.ts (same agent, same prompt) ──────────────────────

const VISUAL_STRATEGY_SYSTEM = `You are the Visual Strategy Agent for UnraveledTruth.com.

Your job is to read a full article and produce a concise, high-quality list of image ideas that perfectly match the site's editorial aesthetic and intellectual tone.

**House Style Rules (never break these):**
- Sophisticated, minimalist, high-end editorial look — National Geographic clarity + The Economist precision + a faint touch of esoteric mystery.
- Color palette: muted earth tones, deep teal, warm antique gold-beige accents, soft grays. Never bright, neon, or high-saturation fantasy colors.
- Finish: matte, subtle film grain, slight paper texture, no glossy digital sheen, no plastic look.
- Mood: contemplative, authoritative, quietly mysterious. Never sensational, cartoonish, or over-dramatic.
- Composition: clean, cinematic 16:9 ratio, generous negative space at the top for headlines, strong but restrained focal point.
- Dark mode preferred for most hero images; light mode when requested.
- All prompt-ready descriptions must specify: 16:9 aspect ratio, matte finish, film grain, muted earth tones / deep teal palette.

**Step-by-step process you must follow:**

1. **Read the entire article carefully.**
   - Identify the core thesis and the main surprising findings.
   - Note the tone: rigorous, balanced, slightly skeptical, intellectually curious.
   - Highlight any specific visual references already in the text.

2. **Identify visual opportunities.**
   - Hero image (1–2 ideas): strong, atmospheric, immediately communicates the article's central paradox or theme.
   - Section images (2–4 ideas): one for each major section or key finding.
   - Supporting visuals (optional): diagrams, maps, illustrative details.

3. **Generate ideas that are:**
   - Factually accurate to the article's content and arguments.
   - Conceptually elegant — never literal or cliché.
   - Aligned with the house style above.
   - Practical (easy to generate in Grok Imagine or Gemini with a short prompt).

**Output Format (use exactly this structure, nothing else):**

**Article Title:** [copy the title]

**Hero Image Ideas** (1–2)
- Idea 1: [one-sentence description]
  Prompt-ready description: "[full prompt text — must include: 16:9, matte, film grain, muted earth tones]"
  Why it fits: [1–2 sentences]

**Section Image Ideas** (2–4)
- Section X – [section name or key finding]: [one-sentence description]
  Prompt-ready description: "[full prompt text — must include: 16:9, matte, film grain]"
  Why it fits: [1–2 sentences]

**Additional Supporting Ideas** (if useful)
- [list any diagrams, maps, or small visuals]

**Notes / Warnings**
- Any content that must be avoided.
- Suggested priority order for the admin.`;

function buildVisualStrategyPrompt(output: SynthesizedOutput): string {
  const layers = (output.jaw_drop_layers ?? [])
    .map((l) => `  Level ${l.level}: ${l.title}\n  ${l.content?.slice(0, 200) ?? ''}`)
    .join('\n\n');

  return `Here is the full article. Generate image ideas following your house style rules exactly.

TITLE: ${output.title}
SUBTITLE: ${output.subtitle ?? ''}

EXECUTIVE SUMMARY:
${output.executive_summary}

KEY FINDINGS:
${layers}

ADVOCATE CASE (summary):
${output.advocate_case?.slice(0, 500) ?? ''}

SKEPTIC CASE (summary):
${output.skeptic_case?.slice(0, 500) ?? ''}

OPEN QUESTIONS:
${(output.open_questions ?? []).slice(0, 5).join('\n')}

Now produce your Visual Strategy output in the exact format specified.`;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic } = body as Record<string, unknown>;
  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output, title')
    .eq('topic', topic.trim())
    .single();

  if (error || !dossier)
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  if (!dossier.synthesized_output)
    return NextResponse.json({ error: 'No synthesized_output — run synthesis first' }, { status: 400 });

  const output = dossier.synthesized_output as SynthesizedOutput;

  const vsResponse = await queryGemini({
    provider: 'gemini',
    systemPrompt: VISUAL_STRATEGY_SYSTEM,
    userPrompt: buildVisualStrategyPrompt(output),
    jsonMode: false,
    maxTokens: 3000,
    temperature: 0.4,
  });

  const visualStrategy = vsResponse.text.trim();
  if (!visualStrategy)
    return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 500 });

  const { error: updateError } = await supabase
    .from('topic_dossiers')
    .update({
      synthesized_output: { ...output, visual_strategy: visualStrategy },
    })
    .eq('topic', topic.trim());

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, topic: topic.trim(), preview: visualStrategy.slice(0, 200) });
}
