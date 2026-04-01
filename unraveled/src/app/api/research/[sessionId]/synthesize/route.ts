/**
 * POST /api/research/[sessionId]/synthesize
 *
 * Phase 5 only: synthesis + dossier accumulation.
 * Separated from /continue so it gets its own 300s Vercel budget.
 * Called automatically by /continue after phases 2-4 complete.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  updateSessionStatus,
  logSessionError,
  claimSessionForContinue,
  releaseSessionLock,
} from '@/lib/research/storage/sessions';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
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
  if (session.status === 'complete') return NextResponse.json({ status: 'complete' });
  if (session.status !== 'synthesizing') {
    return NextResponse.json(
      { error: `Session not ready for synthesis (status: ${session.status})` },
      { status: 400 },
    );
  }

  const claimed = await claimSessionForContinue(sessionId, session.status);
  if (!claimed) {
    console.log(`[synthesize:${sessionId}] already locked — skipping`);
    return NextResponse.json({ status: 'already_running' });
  }

  try {
    const topic = session.topic as string;
    const title = session.title as string;

    const [findings, allValidations, convergenceAnalyses, debateResult] = await Promise.all([
      getFindingsBySession(sessionId) as Promise<(AgentFinding & { id: string })[]>,
      getValidationsBySession(sessionId),
      getConvergenceBySession(sessionId),
      getDebateBySession(sessionId),
    ]);

    if (!debateResult) {
      const msg = 'No debate record found for synthesis';
      await logSessionError(sessionId, msg);
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log(`[synthesize:${sessionId}] running synthesis`);
    const synthesisResult = await runSynthesis(
      sessionId, topic, findings, allValidations, convergenceAnalyses, debateResult,
    );

    if (synthesisResult.error || !synthesisResult.output) {
      const msg = synthesisResult.error ?? 'Synthesis produced no output';
      await logSessionError(sessionId, msg);
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    await accumulateDossier({
      topic, title, findings, convergenceAnalyses,
      debate: debateResult, output: synthesisResult.output,
    });
    await updateSessionStatus(sessionId, 'complete');
    console.log(`[synthesize:${sessionId}] Complete ✓`);

    return NextResponse.json({ ok: true, status: 'complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[synthesize:${sessionId}] error:`, message);
    await updateSessionStatus(sessionId, 'failed').catch(() => null);
    await logSessionError(sessionId, message).catch(() => null);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await releaseSessionLock(sessionId).catch(() => null);
  }
}
