/**
 * POST /api/research/deep-dive
 *
 * Targeted supplemental session on an existing topic.
 * Runs the ENTIRE pipeline inside after() — no HTTP self-calls, no chaining.
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { runLayer1, buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, focus_areas } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions) || research_questions.length === 0)
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  if (typeof focus_areas !== 'string' || !focus_areas.trim())
    return NextResponse.json({ error: 'focus_areas is required — specify what rabbit holes to dig into' }, { status: 400 });

  const additionalContext = `## DEEP DIVE FOCUS — MANDATORY

You MUST specifically investigate the following areas, people, books, and claims in addition to your standard domain research. These are the specific rabbit holes this session is targeting:

${focus_areas.trim()}

Do not give these topics a surface-level mention. Go deep. If you know of specific evidence, claims, counter-claims, or documented actions related to these named individuals, books, or institutions, surface them now with full citation detail. If these topics are outside your primary domain, still apply your domain's analytical framework to them.`;

  const session = await createSession({
    topic: topic.trim(),
    title: title.trim(),
    research_questions: research_questions.map(String),
  });
  const sessionId = session.id;
  const topicStr = topic.trim();
  const titleStr = title.trim();
  const questionsArr = research_questions.map(String);

  after(async () => {
    try {
      // Phase 1: Layer 1 research agents (with deep-dive focus context)
      console.log(`[deep-dive:${sessionId}] Phase 1: layer 1 agents`);
      const layer1 = await runLayer1(sessionId, topicStr, questionsArr, additionalContext);
      console.log(`[deep-dive:${sessionId}] Phase 1 complete: ${layer1.allFindings.length} findings`);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Deep dive Layer 1 produced no findings');
        return;
      }

      const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];

      // Phase 2: Cross-validation
      console.log(`[deep-dive:${sessionId}] Phase 2: cross-validation`);
      await updateSessionStatus(sessionId, 'cross_validating');
      const crossValPlan = buildCrossValidationPlan(sessionId, topicStr, questionsArr, findings);
      const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
      await runAllCrossValidation(sessionId, topicStr, findings, reviewerIds);

      // Phase 3: Convergence
      console.log(`[deep-dive:${sessionId}] Phase 3: convergence`);
      await updateSessionStatus(sessionId, 'converging');
      await runConvergenceLayer(sessionId, topicStr, findings);
      const convergenceAnalyses = await getConvergenceBySession(sessionId);

      // Phase 4: Debate
      console.log(`[deep-dive:${sessionId}] Phase 4: debate`);
      await updateSessionStatus(sessionId, 'debating');
      const debateResult = await runDebate(sessionId, topicStr, findings, convergenceAnalyses);
      if (debateResult.error || !debateResult.debate) {
        const errMsg = debateResult.error ?? 'Debate produced no output';
        await logSessionError(sessionId, errMsg);
        await updateSessionStatus(sessionId, 'failed');
        return;
      }

      // Phase 5: Synthesis + dossier
      console.log(`[deep-dive:${sessionId}] Phase 5: synthesis`);
      await updateSessionStatus(sessionId, 'synthesizing');
      const allValidations = await getValidationsBySession(sessionId);
      const synthesisResult = await runSynthesis(
        sessionId, topicStr, findings, allValidations, convergenceAnalyses, debateResult.debate,
      );
      if (synthesisResult.error || !synthesisResult.output) {
        const errMsg = synthesisResult.error ?? 'Synthesis produced no output';
        await logSessionError(sessionId, errMsg);
        await updateSessionStatus(sessionId, 'failed');
        return;
      }

      await accumulateDossier({
        topic: topicStr, title: titleStr, findings, convergenceAnalyses,
        debate: debateResult.debate, output: synthesisResult.output,
      });
      await updateSessionStatus(sessionId, 'complete');
      console.log(`[deep-dive:${sessionId}] Complete ✓`);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[deep-dive:${sessionId}] pipeline error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ session_id: sessionId, status: 'queued' }, { status: 202 });
}
