/**
 * POST /api/research/[sessionId]/continue
 *
 * Runs phases 2-4 (cross-validation, convergence, debate) in a single call.
 * After phase 4 completes, fires /synthesize as a separate request so that
 * phase 5 gets its own 300s Vercel budget (synthesis of 8k+ tokens takes time).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionStatus, logSessionError, claimSessionForContinue, releaseSessionLock } from '@/lib/research/storage/sessions';
import { requireAdmin } from '@/lib/auth';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { sessionId } = await params;

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (session.status === 'complete') {
    return NextResponse.json({ status: session.status });
  }
  // Only run if Phase 1 is done (researched) or we're resuming a stuck mid-pipeline session
  const resumableStatuses = ['researched', 'failed', 'cross_validating', 'converging', 'debating', 'synthesizing'];
  if (!resumableStatuses.includes(session.status)) {
    return NextResponse.json({ error: `Session not ready for continue (status: ${session.status})` }, { status: 400 });
  }

  // Atomic lock: claim pipeline_locked for ALL resumable states to prevent concurrent runs.
  // For 'researched', also flips status → 'cross_validating' in the same update.
  const claimed = await claimSessionForContinue(sessionId, session.status);
  if (!claimed) {
    console.log(`[continue:${sessionId}] duplicate call — pipeline already locked`);
    return NextResponse.json({ status: 'already_running' });
  }

  const topic = session.topic as string;
  const researchQuestions = (session.research_questions as string[]) ?? [];

  // Run phases 2-4 synchronously (~100-150s total), then hand off to /synthesize
  // which gets its own fresh 300s Vercel budget for the large synthesis call.
  try {
    const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];

    if (findings.length === 0) {
      await updateSessionStatus(sessionId, 'failed');
      await logSessionError(sessionId, 'No findings available for phases 2-5');
      return NextResponse.json({ error: 'No findings' }, { status: 500 });
    }

    // Phase 2: Cross-validation
    console.log(`[continue:${sessionId}] Phase 2: cross-validation`);
    const crossValPlan = buildCrossValidationPlan(sessionId, topic, researchQuestions, findings);
    const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
    await runAllCrossValidation(sessionId, topic, findings, reviewerIds);
    await updateSessionStatus(sessionId, 'converging');

    // Phase 3: Convergence
    console.log(`[continue:${sessionId}] Phase 3: convergence`);
    await runConvergenceLayer(sessionId, topic, findings);
    const convergenceAnalyses = await getConvergenceBySession(sessionId);
    await updateSessionStatus(sessionId, 'debating');

    // Phase 4: Debate
    console.log(`[continue:${sessionId}] Phase 4: debate`);
    const debateResult = await runDebate(sessionId, topic, findings, convergenceAnalyses);
    if (debateResult.error || !debateResult.debate) {
      const errMsg = debateResult.error ?? 'Debate produced no output';
      await logSessionError(sessionId, errMsg);
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
    await updateSessionStatus(sessionId, 'synthesizing');

    // Hand off phase 5 to /synthesize — fire-and-forget so it gets its own function budget.
    // Release the lock first so /synthesize can claim it.
    await releaseSessionLock(sessionId).catch(() => null);

    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/research/${sessionId}/synthesize`, { method: 'POST' }).catch((err) => {
      console.error(`[continue:${sessionId}] failed to fire /synthesize:`, err);
    });

    console.log(`[continue:${sessionId}] Phases 2-4 complete — /synthesize fired`);
    return NextResponse.json({ ok: true, status: 'synthesizing' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[continue:${sessionId}] error:`, message);
    await updateSessionStatus(sessionId, 'failed').catch(() => null);
    await logSessionError(sessionId, message).catch(() => null);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await releaseSessionLock(sessionId).catch(() => null);
  }
}
