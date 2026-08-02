/**
 * POST /api/admin/editorial/apply-fix   { dossierId, flagId }
 * POST /api/admin/editorial/apply-fix   { dossierId, flagId, action: 'dismiss' }
 *
 * Actually applies an editorial-review flag's suggested_fix to the dossier's
 * content — the review pass only ever wrote flags as text for a human to read;
 * nothing previously rewrote the article. This makes the fix real:
 *
 * 1. Locate the flagged field (executive_summary/advocate_case/skeptic_case
 *    are direct strings; key_findings/jaw_drop_layers are arrays — located by
 *    finding the array item whose text contains the flagged excerpt).
 * 2. A scoped Claude edit rewrites ONLY that field, applying exactly the
 *    suggested_fix, preserving everything else in the text.
 * 3. House-style dash sanitizer runs on the result (deterministic backstop,
 *    same as the main pipeline).
 * 4. The flag is marked resolved in editorial_review so it stops showing as
 *    outstanding.
 *
 * Fails closed: if the excerpt can no longer be found (content changed since
 * the review ran), returns an error instead of guessing which text to edit.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { queryClaude } from '@/lib/research/llm/claude';
import { stripTypographicDashes } from '@/lib/text-sanitize';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 60;

interface EditorialFlag {
  id: string;
  severity: string;
  type: string;
  section: string;
  excerpt: string;
  issue: string;
  suggested_fix: string;
  status?: string;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

async function rewriteField(currentText: string, flag: EditorialFlag): Promise<string> {
  const res = await queryClaude({
    provider: 'claude',
    systemPrompt: `You are a precise copy editor. You make the SMALLEST possible edit to resolve one specific issue in a piece of text. You never rewrite sentences that are not part of the problem. You never change facts, sources, or evidence. You never use em dashes (—) or en dashes (–) — use a comma, colon, parentheses, or hyphen instead. Return ONLY the corrected full text. No commentary, no quotes, no markdown.`,
    userPrompt: `CURRENT TEXT:\n${currentText}\n\nISSUE: ${flag.issue}\n\nPROBLEMATIC EXCERPT: "${flag.excerpt}"\n\nAPPLY THIS FIX: ${flag.suggested_fix}\n\nReturn the full corrected text with the fix applied and nothing else changed.`,
    maxTokens: Math.min(8192, Math.ceil(currentText.length / 2) + 1024),
    temperature: 0.2,
  });
  const out = (res.text ?? '').trim();
  return out ? stripTypographicDashes(out) : currentText;
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { dossierId, flagId, action } = (await req.json().catch(() => ({}))) as {
    dossierId?: string; flagId?: string; action?: 'fix' | 'dismiss';
  };
  if (!dossierId || !flagId) return NextResponse.json({ error: 'dossierId and flagId required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('id, synthesized_output, editorial_review')
    .eq('id', dossierId)
    .single();
  if (error || !dossier) return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });

  const review = dossier.editorial_review as { flags?: EditorialFlag[] } | null;
  const flags = review?.flags ?? [];
  const flagIndex = flags.findIndex((f) => f.id === flagId);
  if (flagIndex === -1) return NextResponse.json({ error: 'Flag not found' }, { status: 404 });
  const flag = flags[flagIndex];

  if (action === 'dismiss') {
    flags[flagIndex] = { ...flag, status: 'dismissed' };
    await supabase.from('topic_dossiers').update({ editorial_review: { ...review, flags } }).eq('id', dossierId);
    return NextResponse.json({ ok: true, flag: flags[flagIndex] });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;
  const excerptNorm = normalize(flag.excerpt);
  let updatedOutput: SynthesizedOutput = output;
  let located = false;

  try {
    if (['executive_summary', 'advocate_case', 'skeptic_case'].includes(flag.section)) {
      const key = flag.section as 'executive_summary' | 'advocate_case' | 'skeptic_case';
      const current = output[key] as string;
      if (normalize(current).includes(excerptNorm)) {
        const fixed = await rewriteField(current, flag);
        updatedOutput = { ...output, [key]: fixed };
        located = true;
      }
    } else if (flag.section === 'key_findings') {
      const idx = output.key_findings.findIndex((f) => normalize(f.finding).includes(excerptNorm));
      if (idx !== -1) {
        const fixed = await rewriteField(output.key_findings[idx].finding, flag);
        const key_findings = [...output.key_findings];
        key_findings[idx] = { ...key_findings[idx], finding: fixed };
        updatedOutput = { ...output, key_findings };
        located = true;
      }
    } else if (flag.section === 'jaw_drop_layers') {
      const idx = output.jaw_drop_layers.findIndex(
        (l) => normalize(l.content).includes(excerptNorm) || normalize(l.title).includes(excerptNorm),
      );
      if (idx !== -1) {
        const layer = output.jaw_drop_layers[idx];
        const onTitle = normalize(layer.title).includes(excerptNorm);
        const fixed = await rewriteField(onTitle ? layer.title : layer.content, flag);
        const jaw_drop_layers = [...output.jaw_drop_layers];
        jaw_drop_layers[idx] = onTitle ? { ...layer, title: fixed } : { ...layer, content: fixed };
        updatedOutput = { ...output, jaw_drop_layers };
        located = true;
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Fix generation failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }

  if (!located) {
    return NextResponse.json(
      { error: `Could not locate the flagged excerpt in "${flag.section}" — the content may have changed since this review ran. Re-run Editorial Review to refresh flags.` },
      { status: 409 },
    );
  }

  flags[flagIndex] = { ...flag, status: 'resolved' };
  const { error: updateError } = await supabase
    .from('topic_dossiers')
    .update({
      synthesized_output: updatedOutput,
      editorial_review: { ...review, flags },
      updated_at: new Date().toISOString(),
    })
    .eq('id', dossierId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, flag: flags[flagIndex] });
}
