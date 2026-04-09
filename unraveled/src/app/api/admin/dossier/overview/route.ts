/**
 * POST /api/admin/dossier/overview
 * Generates plain-language Overview content for a topic using Claude.
 * Writes to: overview_summary, overview_advocate_summary, overview_skeptic_summary
 *
 * Body: { topic: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 120;

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a content editor rewriting academic research summaries into accessible, plain-language Overview pages for a general audience.

Your output will be read on a phone by someone who just discovered this topic on a podcast. They are curious and smart, but they are not academics. They have never heard terms like "cross-disciplinary analysis" or "yields a conclusion."

Voice target: Smart friend explaining it at a bar. They know the material cold, they're talking to someone new to it.

RULES — apply these without exception:

OVERVIEW SUMMARY (3 short paragraphs, ~100-120 words total):
- First sentence = the question in plain English, using "we" voice. Start with what the reader is wondering.
  BAD: "A systematic cross-disciplinary analysis of flood narratives from 29 cultural traditions..."
  GOOD: "Dozens of cultures that never met each other all remember a world-ending flood. We wanted to know why."
- Second paragraph = the punchline. The most surprising finding, stated plainly. No hedging.
  BAD: "yields a conclusion that is both more modest and more significant..."
  GOOD: "There was no single global flood. The geology is clear on that. But the real story is stranger."
- Third paragraph (optional) = one or two sentences teasing the most compelling unresolved tension.
- Max sentence length: 20 words. Break every compound sentence into two simple ones.
- BANNED: "systematic analysis", "yields a conclusion", "it should be noted", "the evidence suggests", "cross-disciplinary", sentences with more than one em dash, hedging chains.

ADVOCATE TEASER (2-3 sentences only):
- State the single strongest claim for the convergence/significance being real.
- End with impact — the reader should feel the weight of the argument.
- Do NOT build a full argument. Create tension.
- Example format: "[Strongest claim]. [Why it matters or what it implies]. [The part that's hardest to explain away]."

SKEPTIC TEASER (2-3 sentences only):
- State the single strongest objection or alternative explanation.
- End with the doubt that lingers.
- Do NOT build a full counter-argument. Create doubt.
- Example format: "[The core problem with the advocate position]. [What actually explains this]. [What hasn't been proven]."

Both teasers together should leave the reader feeling: both sides have a point, I need to read the full debate.`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { topic?: string };
  if (!body.topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('title, synthesized_output, quick_brief')
    .eq('topic', body.topic)
    .single();

  if (error || !dossier) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;
  if (!output) return NextResponse.json({ error: 'No synthesized output' }, { status: 422 });

  const top3Layers = output.jaw_drop_layers.slice(0, 3);

  const userPrompt = `Topic: "${dossier.title}"

DEEP DIVE RESEARCH SUMMARY (source material — rewrite, don't copy):
${output.executive_summary}

QUICK BRIEF (may overlap with summary):
${(dossier.quick_brief as string | null) ?? '(none)'}

ADVOCATE CASE (full version — extract the single strongest claim only):
${output.advocate_case}

SKEPTIC CASE (full version — extract the single strongest objection only):
${output.skeptic_case}

TOP 3 EVIDENCE FINDINGS (for each, write a plain-language 2-3 sentence explanation):
${top3Layers.map((l, i) => `Finding ${i + 1}: "${l.title}"\nFull content: ${l.content}`).join('\n\n')}

---

Write all sections below. Return ONLY valid JSON, no markdown:

{
  "overview_summary": "3 paragraphs separated by \\n\\n. 120-180 words total. Paragraph 1: the question in plain language, 'we' voice (2-3 sentences). Paragraph 2: the surprising answer, most counterintuitive finding stated plainly (3-4 sentences). Paragraph 3: the 'wait, what?' hook — the single most compelling piece of evidence (1-2 sentences). No sentence over 20 words. No academic voice.",
  "overview_advocate_summary": "2-3 sentences max. The single strongest claim for significance. Ends with impact, not hedging.",
  "overview_skeptic_summary": "2-3 sentences max. The single strongest objection. Ends with a doubt that lingers.",
  "overview_findings": ["Plain-language explanation for Finding 1 (2-3 sentences, ~40-60 words)", "Plain-language explanation for Finding 2 (2-3 sentences, ~40-60 words)", "Plain-language explanation for Finding 3 (2-3 sentences, ~40-60 words)"]
}`;

  let rawText = '';
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  } catch (err) {
    return NextResponse.json({ error: `Claude failed: ${String(err)}` }, { status: 500 });
  }

  let parsed: {
    overview_summary: string;
    overview_advocate_summary: string;
    overview_skeptic_summary: string;
    overview_findings: string[];
  };

  try {
    const cleaned = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: rawText }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from('topic_dossiers')
    .update({
      overview_summary: parsed.overview_summary,
      overview_advocate_summary: parsed.overview_advocate_summary,
      overview_skeptic_summary: parsed.overview_skeptic_summary,
      overview_findings: parsed.overview_findings ?? null,
    })
    .eq('topic', body.topic);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    topic: body.topic,
    overview_summary: parsed.overview_summary,
    overview_advocate_summary: parsed.overview_advocate_summary,
    overview_skeptic_summary: parsed.overview_skeptic_summary,
    overview_findings: parsed.overview_findings ?? [],
  });
}
