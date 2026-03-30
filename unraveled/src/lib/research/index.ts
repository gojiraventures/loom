import { createSession, updateSessionStatus, logSessionError } from './storage/sessions';
import { getFindingsBySession } from './storage/findings';
import { getValidationsBySession } from './storage/validations';
import { runLayer1, buildCrossValidationPlan } from './pipeline';
import { runAllCrossValidation } from './agents/cross-validator';
import { runConvergenceLayer } from './agents/convergence-runner';
import { runDebate } from './agents/debate-runner';
import { runSynthesis } from './agents/synthesizer';
import { accumulateDossier } from './dossier';
import type { AgentFinding, SynthesizedOutput } from './types';

export interface ResearchSessionResult {
  sessionId: string;
  output: SynthesizedOutput;
  stats: {
    findingCount: number;
    validationCount: number;
    convergenceAgents: number;
    debateRounds: number;
    errors: string[];
  };
}

/**
 * Master orchestrator — runs the full research pipeline:
 * Layer 1 (parallel research) → Cross-validation → Convergence → Adversarial debate → Synthesis → Dossier
 *
 * @param existingSessionId — if provided, skips session creation (fire-and-forget pattern)
 */
export async function runResearchSession(
  topic: string,
  title: string,
  researchQuestions: string[],
  additionalContext?: string,
  existingSessionId?: string,
): Promise<ResearchSessionResult> {
  const errors: string[] = [];

  // ── Phase 1: Create session (or reuse existing) ───────────────────────────
  let sessionId: string;
  if (existingSessionId) {
    sessionId = existingSessionId;
  } else {
    const session = await createSession({ topic, title, research_questions: researchQuestions });
    sessionId = session.id;
  }
  console.log(`[research] Session created: ${sessionId} — "${title}"`);

  try {
    // ── Phase 2: Layer 1 — parallel research agents ───────────────────────
    console.log('[research] Phase 2: Layer 1 research agents');
    const layer1 = await runLayer1(sessionId, topic, researchQuestions, additionalContext);
    errors.push(...layer1.errors.map((e) => `[${e.agentId}] ${e.error}`));
    console.log(`[research] Layer 1 complete: ${layer1.allFindings.length} findings`);

    if (layer1.allFindings.length === 0) {
      await updateSessionStatus(sessionId, 'failed');
      throw new Error('Layer 1 produced no findings — cannot continue');
    }

    const findings = layer1.allFindings as (AgentFinding & { id: string })[];

    // ── Phase 3: Cross-validation ─────────────────────────────────────────
    console.log('[research] Phase 3: Cross-validation');
    await updateSessionStatus(sessionId, 'cross_validating');

    const crossValPlan = buildCrossValidationPlan(sessionId, topic, researchQuestions, findings);
    const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];

    const crossValResults = await runAllCrossValidation(sessionId, topic, findings, reviewerIds);
    const validationErrors = crossValResults.filter((r) => r.error);
    errors.push(...validationErrors.map((r) => `[cross-val:${r.reviewerAgentId}] ${r.error}`));

    const allValidations = await getValidationsBySession(sessionId);
    console.log(`[research] Cross-validation complete: ${allValidations.length} validations`);

    // ── Phase 4: Convergence layer ────────────────────────────────────────
    console.log('[research] Phase 4: Convergence layer');
    await updateSessionStatus(sessionId, 'converging');

    const convergenceResults = await runConvergenceLayer(sessionId, topic, findings);
    const convergenceErrors = convergenceResults.filter((r) => r.error);
    errors.push(...convergenceErrors.map((r) => `[convergence:${r.agentId}] ${r.error}`));

    const convergenceAnalyses = convergenceResults
      .filter((r) => r.analysis !== null)
      .map((r) => r.analysis!);
    console.log(`[research] Convergence complete: ${convergenceAnalyses.length} analyses`);

    if (convergenceAnalyses.length === 0) {
      console.warn('[research] No convergence analyses — proceeding without them');
    }

    // ── Phase 5: Adversarial debate ───────────────────────────────────────
    console.log('[research] Phase 5: Adversarial debate');
    await updateSessionStatus(sessionId, 'debating');

    const debateResult = await runDebate(sessionId, topic, findings, convergenceAnalyses);
    if (debateResult.error || !debateResult.debate) {
      const errMsg = debateResult.error ?? 'Debate produced no output';
      errors.push(`[debate] ${errMsg}`);
      await logSessionError(sessionId, errMsg);
      await updateSessionStatus(sessionId, 'failed');
      throw new Error(`Debate failed: ${errMsg}`);
    }

    console.log(`[research] Debate complete: ${debateResult.debate.rounds} rounds`);

    // ── Phase 6: Synthesis ────────────────────────────────────────────────
    console.log('[research] Phase 6: Synthesis');
    await updateSessionStatus(sessionId, 'synthesizing');

    const synthesisResult = await runSynthesis(
      sessionId,
      topic,
      findings,
      allValidations,
      convergenceAnalyses,
      debateResult.debate,
    );

    if (synthesisResult.error || !synthesisResult.output) {
      const errMsg = synthesisResult.error ?? 'Synthesis produced no output';
      errors.push(`[synthesis] ${errMsg}`);
      await logSessionError(sessionId, errMsg);
      await updateSessionStatus(sessionId, 'failed');
      throw new Error(`Synthesis failed: ${errMsg}`);
    }

    console.log('[research] Synthesis complete');

    // ── Phase 7: Dossier accumulation ─────────────────────────────────────
    console.log('[research] Phase 7: Dossier accumulation');
    await accumulateDossier({
      topic,
      title,
      findings,
      convergenceAnalyses,
      debate: debateResult.debate,
      output: synthesisResult.output,
    });

    // ── Complete ──────────────────────────────────────────────────────────
    await updateSessionStatus(sessionId, 'complete');
    console.log(`[research] Session ${sessionId} complete`);

    return {
      sessionId,
      output: synthesisResult.output,
      stats: {
        findingCount: findings.length,
        validationCount: allValidations.length,
        convergenceAgents: convergenceAnalyses.length,
        debateRounds: debateResult.debate.rounds,
        errors,
      },
    };
  } catch (err) {
    // Only update to failed if not already done
    try {
      await updateSessionStatus(sessionId, 'failed');
    } catch {
      // ignore
    }
    throw err;
  }
}

// Re-export storage helpers for convenience
export { getSession } from './storage/sessions';
export { getFindingsBySession } from './storage/findings';
export { getDebateBySession } from './storage/debates';
export { getDossier } from './storage/dossiers';
