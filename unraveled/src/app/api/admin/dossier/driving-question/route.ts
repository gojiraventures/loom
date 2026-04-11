/**
 * POST /api/admin/dossier/driving-question
 *
 * Generates a driving question for a topic using Claude, then saves it.
 * Body: { topic: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { queryClaude } from '@/lib/research/llm/claude';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { topic } = await req.json() as { topic?: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: dossier, error: dossierError } = await supabase
    .from('topic_dossiers')
    .select('title, summary, synthesized_output')
    .eq('topic', topic)
    .single();

  if (dossierError || !dossier) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  const title = (dossier.title as string | null) ?? topic;
  const synOutput = dossier.synthesized_output as Record<string, unknown> | null;
  const summary =
    (synOutput?.executive_summary as string | undefined) ??
    (synOutput?.synthesis as string | undefined) ??
    (dossier.summary as string | null) ??
    '';

  const response = await queryClaude({
    provider: 'claude',
    model: 'claude-sonnet-4-6',
    systemPrompt: `You write driving questions for UnraveledTruth.com — a premium editorial platform exploring cross-cultural patterns in myth, history, and evidence.

A driving question is the single question that sits above the article title on the published page. It must:
- Be a genuine, open question — not rhetorical, not answered by its own phrasing
- Use plain language (no jargon, no academic hedging)
- Be 15–35 words
- Capture the intellectual paradox or mystery at the heart of the topic
- Make a curious reader lean forward

Return ONLY the question, no quotes, no preamble, no explanation.`,
    userPrompt: `Article title: ${title}

Summary:
${summary.slice(0, 2000)}

Write the driving question.`,
    maxTokens: 100,
    temperature: 0.7,
  });

  const question = response.text.trim().replace(/^["']|["']$/g, '');

  // Save to dossier
  const { error: saveError } = await supabase
    .from('topic_dossiers')
    .update({ driving_question: question })
    .eq('topic', topic);

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, driving_question: question });
}
