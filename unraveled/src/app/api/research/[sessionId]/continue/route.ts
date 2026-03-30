/**
 * POST /api/research/[sessionId]/continue
 *
 * Self-chaining phase runner. Each call:
 *   1. Reads current session status from DB
 *   2. Runs ONE phase (cross-validation, convergence, debate, synthesis, or dossier)
 *   3. After completion fires itself again for the next phase
 *
 * This gives each phase its own fresh 300s Vercel timeout window.
 * Called internally by the research launch route after Layer 1 completes.
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

function getSiteUrl(req: NextRequest): string {
  // Use env var if set, otherwise derive from incoming request
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const siteUrl = getSiteUrl(req);

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Already terminal — nothing to do
  if (session.status === 'complete' || session.status === 'failed') {
    return NextResponse.json({ status: session.status });
  }

  const topic = session.topic as string;
  const title = session.title as string;
  const researchQuestions = (session.research_questions as string[]) ?? [];

  after(async () => {
    try {
      const status = session.status as string;

      if (status === 'cross_validating') {
        const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
        const crossValPlan = buildCrossValidationPlan(sessionId, topic, researchQuestions, findings);
        const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
        await runAllCrossValidation(sessionId, topic, findings, reviewerIds);
        await updateSessionStatus(sessionId, 'converging');
        console.log(`[continue:${sessionId}] cross_validating → converging`);
      }

      else if (status === 'converging') {
        const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
        await runConvergenceLayer(sessionId, topic, findings);
        await updateSessionStatus(sessionId, 'debating');
        console.log(`[continue:${sessionId}] converging → debating`);
      }

      else if (status === 'debating') {
        const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
        const convergenceAnalyses = await getConvergenceBySession(sessionId);
        const debateResult = await runDebate(sessionId, topic, findings, convergenceAnalyses);
        if (debateResult.error || !debateResult.debate) {
          const errMsg = debateResult.error ?? 'Debate produced no output';
          await logSessionError(sessionId, errMsg);
          await updateSessionStatus(sessionId, 'failed');
          console.error(`[continue:${sessionId}] debate failed:`, errMsg);
          return;
        }
        await updateSessionStatus(sessionId, 'synthesizing');
        console.log(`[continue:${sessionId}] debating → synthesizing`);
      }

      else if (status === 'synthesizing') {
        const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
        const allValidations = await getValidationsBySession(sessionId);
        const convergenceAnalyses = await getConvergenceBySession(sessionId);
        const debate = await getDebateBySession(sessionId);
        if (!debate) {
          await logSessionError(sessionId, 'No debate record found for synthesis');
          await updateSessionStatus(sessionId, 'failed');
          return;
        }
        const synthesisResult = await runSynthesis(sessionId, topic, findings, allValidations, convergenceAnalyses, debate);
        if (synthesisResult.error || !synthesisResult.output) {
          const errMsg = synthesisResult.error ?? 'Synthesis produced no output';
          await logSessionError(sessionId, errMsg);
          await updateSessionStatus(sessionId, 'failed');
          console.error(`[continue:${sessionId}] synthesis failed:`, errMsg);
          return;
        }
        await accumulateDossier({ topic, title, findings, convergenceAnalyses, debate, output: synthesisResult.output });
        await updateSessionStatus(sessionId, 'complete');
        console.log(`[continue:${sessionId}] complete ✓`);
        return; // done — no more chaining
      }

      else {
        console.warn(`[continue:${sessionId}] unexpected status: ${status}`);
        return;
      }

      // Fire next phase in a fresh request (new 300s timeout window)
      fetch(`${siteUrl}/api/research/${sessionId}/continue`, { method: 'POST' })
        .catch((e) => console.error(`[continue:${sessionId}] chain fire failed:`, e));

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[continue:${sessionId}] unhandled error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ ok: true, status: session.status });
}
