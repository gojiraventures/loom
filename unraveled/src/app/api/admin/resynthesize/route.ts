import { NextRequest, NextResponse } from 'next/server';

import { getFindingsByTopic } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 120;

/**
 * POST /api/admin/resynthesize  { topic, title }
 *
 * Re-runs synthesis from ALL accumulated findings across every completed session
 * for this topic. Does NOT re-run research agents. Only updates the synthesized_output
 * in the dossier. Use after running multiple deep dives to get a unified synthesis.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, title } = body as Record<string, unknown>;
  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });

  const allFindings = await getFindingsByTopic(topic.trim()) as (AgentFinding & { id: string })[];
  if (allFindings.length === 0)
    return NextResponse.json({ error: 'No findings found for this topic' }, { status: 404 });

  // Get the most recent completed session to borrow its validations + debate
  const supabase = createServerSupabaseClient();
  const { data: sessions } = await supabase
    .from('research_sessions')
    .select('id')
    .eq('topic', topic.trim())
    .eq('status', 'complete')
    .order('completed_at', { ascending: false })
    .limit(1);

  const latestSessionId = sessions?.[0]?.id;
  if (!latestSessionId)
    return NextResponse.json({ error: 'No completed sessions found for this topic' }, { status: 404 });

  // Fetch most recent debate record
  const { getDebateBySession } = await import('@/lib/research/storage/debates');
  const debate = await getDebateBySession(latestSessionId);
  if (!debate)
    return NextResponse.json({ error: 'No debate record found — run at least one full session first' }, { status: 404 });

  const validations = await getValidationsBySession(latestSessionId);

  console.log(`[resynthesize] topic="${topic}" — ${allFindings.length} total findings from ${sessions?.length ?? 0} sessions`);

  const result = await runSynthesis(
    latestSessionId,
    topic.trim(),
    allFindings,
    validations,
    [], // no convergence analyses for re-synthesis — use findings directly
    debate,
  );

  if (result.error || !result.output)
    return NextResponse.json({ error: result.error ?? 'Synthesis failed' }, { status: 500 });

  await accumulateDossier({
    topic: topic.trim(),
    title: title.trim(),
    findings: allFindings,
    convergenceAnalyses: [],
    debate,
    output: result.output,
  });

  return NextResponse.json({
    ok: true,
    findingsUsed: allFindings.length,
    convergenceScore: result.output.convergence_score,
    jawDropLayers: result.output.jaw_drop_layers.length,
  });
}
