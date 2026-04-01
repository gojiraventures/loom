/**
 * POST /api/research/[sessionId]/continue
 *
 * Runs ALL remaining pipeline phases in a single call (phases 2-5):
 *   cross-validation (~15s) → convergence (~10s) → debate (~25s) → synthesis+dossier (~20s)
 * Total ~70s — well within the 300s Vercel limit.
 *
 * Called once by the main research route after Layer 1 completes.
 * No self-chaining — simpler and more reliable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionStatus, logSessionError, claimSessionForContinue, releaseSessionLock } from '@/lib/research/storage/sessions';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
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
  const title = session.title as string;
  const researchQuestions = (session.research_questions as string[]) ?? [];

  // Run all remaining phases synchronously — total ~70s, well within 300s
  // Lock is released in finally regardless of outcome.
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

    // Phase 5: Synthesis + dossier
    console.log(`[continue:${sessionId}] Phase 5: synthesis`);
    const allValidations = await getValidationsBySession(sessionId);
    const synthesisResult = await runSynthesis(
      sessionId, topic, findings, allValidations, convergenceAnalyses, debateResult.debate,
    );
    if (synthesisResult.error || !synthesisResult.output) {
      const errMsg = synthesisResult.error ?? 'Synthesis produced no output';
      await logSessionError(sessionId, errMsg);
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    await accumulateDossier({
      topic, title, findings, convergenceAnalyses,
      debate: debateResult.debate, output: synthesisResult.output,
    });
    await updateSessionStatus(sessionId, 'complete');
    console.log(`[continue:${sessionId}] Complete ✓`);

    return NextResponse.json({ ok: true, status: 'complete' });
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
