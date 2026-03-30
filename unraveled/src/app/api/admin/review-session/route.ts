/**
 * POST /api/admin/review-session  { sessionId, action: 'approve' | 'reject' }
 *
 * Approve: merges findings + synthesis from the enhancement session into the
 *          published dossier via accumulateDossier, then re-runs full synthesis
 *          across ALL findings for this topic, marks session complete.
 *
 * Reject:  marks the session as failed so it no longer appears in pending queue.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getFindingsBySession, getFindingsByTopic } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { accumulateDossier } from '@/lib/research/dossier';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { sessionId, action } = body as Record<string, unknown>;
  if (typeof sessionId !== 'string' || !sessionId.trim())
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  if (action !== 'approve' && action !== 'reject')
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from('research_sessions')
    .select('id, topic, title, status, session_type')
    .eq('id', sessionId.trim())
    .single();

  if (!session)
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status !== 'pending_review')
    return NextResponse.json({ error: `Session is not pending review (status: ${session.status})` }, { status: 400 });

  if (action === 'reject') {
    await supabase
      .from('research_sessions')
      .update({ status: 'failed', error_log: ['Rejected by admin'] })
      .eq('id', sessionId);
    return NextResponse.json({ ok: true, action: 'rejected' });
  }

  // ── Approve ──────────────────────────────────────────────────────────────────
  const topic = session.topic as string;
  const title = session.title as string;

  // Fetch all findings across all sessions for this topic (this session + prior)
  const allFindings = await getFindingsByTopic(topic) as (AgentFinding & { id: string })[];
  if (allFindings.length === 0)
    return NextResponse.json({ error: 'No findings found' }, { status: 404 });

  // Use debate from this session, or fall back to most recent completed session
  let debate = await getDebateBySession(sessionId);
  if (!debate) {
    const { data: priorSessions } = await supabase
      .from('research_sessions')
      .select('id')
      .eq('topic', topic)
      .eq('status', 'complete')
      .order('completed_at', { ascending: false })
      .limit(1);
    if (priorSessions?.[0]?.id) {
      debate = await getDebateBySession(priorSessions[0].id);
    }
  }
  if (!debate)
    return NextResponse.json({ error: 'No debate record found — cannot approve without debate' }, { status: 404 });

  const sessionFindings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
  const validations = await getValidationsBySession(sessionId);
  const convergenceAnalyses = await getConvergenceBySession(sessionId);

  console.log(`[review-session] Approving ${sessionId} — re-synthesizing ${allFindings.length} total findings`);

  // Re-synthesize across ALL accumulated findings
  const synthesisResult = await runSynthesis(
    sessionId,
    topic,
    allFindings,
    validations,
    convergenceAnalyses,
    debate,
  );

  if (synthesisResult.error || !synthesisResult.output)
    return NextResponse.json({ error: synthesisResult.error ?? 'Synthesis failed' }, { status: 500 });

  // Merge into dossier
  await accumulateDossier({
    topic,
    title,
    findings: sessionFindings,
    convergenceAnalyses,
    debate,
    output: synthesisResult.output,
  });

  // Mark session complete
  await supabase
    .from('research_sessions')
    .update({ status: 'complete', completed_at: new Date().toISOString() })
    .eq('id', sessionId);

  return NextResponse.json({
    ok: true,
    action: 'approved',
    findingsUsed: allFindings.length,
    convergenceScore: synthesisResult.output.convergence_score,
    jawDropLayers: synthesisResult.output.jaw_drop_layers.length,
  });
}
