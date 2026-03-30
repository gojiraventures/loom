import { NextRequest, NextResponse } from 'next/server';
import { createSession, updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { getFindingsByTopic } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { runLayer1, buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

/**
 * POST /api/research/deep-dive
 *
 * Runs a targeted supplemental research session on an existing topic.
 * The `focus_areas` string is injected as additionalContext into every agent,
 * forcing them to investigate specific rabbit holes (people, books, events).
 * After the session completes, synthesis draws from ALL accumulated findings
 * across every session for the topic — not just this one.
 */
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

  const errors: string[] = [];

  // Build the additional context that gets injected into every agent's prompt
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

  try {
    // ── Phase 1: Layer 1 with focus context ──────────────────────────────────
    const { AGENT_REGISTRY } = await import('@/lib/research/agents/definitions');
    const { assignRaci, getActiveAgents, getReviewAgents } = await import('@/lib/research/raci');
    const { executeAgent } = await import('@/lib/research/agents/executor');
    const { setRaciAssignments } = await import('@/lib/research/storage/sessions');

    await updateSessionStatus(sessionId, 'researching');
    const raci = assignRaci(topic.trim(), research_questions.map(String));
    await setRaciAssignments(sessionId, raci);

    const activeAgentIds = getActiveAgents(raci);
    const execPromises = activeAgentIds.map((agentId) => {
      const def = AGENT_REGISTRY[agentId];
      if (!def) return Promise.resolve({
        agentId, findings: [], findingIds: [], inputTokens: 0,
        outputTokens: 0, durationMs: 0, error: `Agent not found: ${agentId}`,
      });
      return executeAgent(def, topic.trim(), research_questions.map(String), {
        sessionId,
        additionalContext,
      });
    });

    const settled = await Promise.allSettled(execPromises);
    const { getFindingsBySession } = await import('@/lib/research/storage/findings');
    const sessionFindings = await getFindingsBySession(sessionId);

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value.error) {
        errors.push(`[${r.value.agentId}] ${r.value.error}`);
        await logSessionError(sessionId, `Agent ${r.value.agentId}: ${r.value.error}`);
      }
    }

    if (sessionFindings.length === 0) {
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: 'Deep dive produced no findings' }, { status: 500 });
    }

    // ── Phase 2: Cross-validation ─────────────────────────────────────────────
    await updateSessionStatus(sessionId, 'cross_validating');
    const crossValPlan = buildCrossValidationPlan(sessionId, topic.trim(), research_questions.map(String), sessionFindings);
    const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
    await runAllCrossValidation(sessionId, topic.trim(), sessionFindings, reviewerIds);
    const sessionValidations = await getValidationsBySession(sessionId);

    // ── Phase 3: Convergence ──────────────────────────────────────────────────
    await updateSessionStatus(sessionId, 'converging');
    const convergenceResults = await runConvergenceLayer(sessionId, topic.trim(), sessionFindings);
    const convergenceAnalyses = convergenceResults.filter((r) => r.analysis !== null).map((r) => r.analysis!);

    // ── Phase 4: Debate ───────────────────────────────────────────────────────
    await updateSessionStatus(sessionId, 'debating');
    const debateResult = await runDebate(sessionId, topic.trim(), sessionFindings, convergenceAnalyses);
    if (debateResult.error || !debateResult.debate) {
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: `Debate failed: ${debateResult.error}` }, { status: 500 });
    }

    // ── Phase 5: Synthesize from ALL accumulated findings for this topic ──────
    await updateSessionStatus(sessionId, 'synthesizing');
    const allTopicFindings = await getFindingsByTopic(topic.trim()) as (AgentFinding & { id: string })[];

    console.log(`[deep-dive] Synthesizing from ${allTopicFindings.length} total findings across all sessions (this session: ${sessionFindings.length})`);

    const synthesisResult = await runSynthesis(
      sessionId,
      topic.trim(),
      allTopicFindings,
      sessionValidations,
      convergenceAnalyses,
      debateResult.debate,
    );

    if (synthesisResult.error || !synthesisResult.output) {
      await updateSessionStatus(sessionId, 'failed');
      return NextResponse.json({ error: `Synthesis failed: ${synthesisResult.error}` }, { status: 500 });
    }

    // ── Phase 6: Accumulate dossier ───────────────────────────────────────────
    await accumulateDossier({
      topic: topic.trim(),
      title: title.trim(),
      findings: allTopicFindings,
      convergenceAnalyses,
      debate: debateResult.debate,
      output: synthesisResult.output,
    });

    await updateSessionStatus(sessionId, 'complete');

    return NextResponse.json({
      sessionId,
      output: synthesisResult.output,
      stats: {
        sessionFindings: sessionFindings.length,
        totalTopicFindings: allTopicFindings.length,
        errors,
      },
    });
  } catch (err) {
    await updateSessionStatus(sessionId, 'failed').catch(() => null);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
