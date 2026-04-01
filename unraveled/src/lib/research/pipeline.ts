import { assignRaci, getActiveAgents, getReviewAgents } from './raci';
import { executeAgent } from './agents/executor';
import { getAgent, AGENT_REGISTRY, RESEARCH_AGENTS } from './agents/definitions';
import { updateSessionStatus, setRaciAssignments, logSessionError } from './storage/sessions';
import { getFindingsBySession } from './storage/findings';
import { IS_OLLAMA_MODE, OLLAMA_CONCURRENCY, runWithConcurrency } from './llm/concurrency';
import type { AgentExecutionResult } from './agents/executor';
import type { AgentFinding } from './types';

export interface Layer1Result {
  results: AgentExecutionResult[];
  allFindings: AgentFinding[];
  findingIds: string[];
  totalInputTokens: number;
  totalOutputTokens: number;
  errors: { agentId: string; error: string }[];
}

/**
 * Phase 1: Run all Responsible + Accountable agents in parallel.
 * Returns structured findings from all agents.
 */
export async function runLayer1(
  sessionId: string,
  topic: string,
  researchQuestions: string[],
  additionalContext?: string,
): Promise<Layer1Result> {
  await updateSessionStatus(sessionId, 'researching');

  // Assign RACI — include additionalContext (description) in keyword scoring
  const raci = assignRaci(topic, researchQuestions, undefined, additionalContext);
  await setRaciAssignments(sessionId, raci);

  // With no research questions, run ALL research agents for broad coverage.
  // With questions, use RACI scoring to focus on the most relevant agents.
  const activeAgentIds = researchQuestions.length === 0
    ? RESEARCH_AGENTS.map((a) => a.id)
    : getActiveAgents(raci);
  console.log(`[pipeline] Layer 1: running ${activeAgentIds.length} agents for "${topic}"`);
  console.log(`[pipeline] Responsible: ${raci.responsible.join(', ')}`);
  console.log(`[pipeline] Accountable: ${raci.accountable.join(', ')}`);

  const concurrency = IS_OLLAMA_MODE ? OLLAMA_CONCURRENCY : activeAgentIds.length;
  console.log(`[pipeline] Concurrency: ${IS_OLLAMA_MODE ? `Ollama mode (${concurrency} at a time)` : 'cloud mode (all parallel)'}`);

  const settled = await runWithConcurrency(activeAgentIds, concurrency, (agentId) => {
    const def = AGENT_REGISTRY[agentId];
    if (!def) {
      return Promise.resolve({
        agentId,
        findings: [],
        findingIds: [],
        inputTokens: 0,
        outputTokens: 0,
        durationMs: 0,
        error: `Agent definition not found: ${agentId}`,
      } as AgentExecutionResult);
    }
    return executeAgent(def, topic, researchQuestions, { sessionId, additionalContext });
  });

  const results: AgentExecutionResult[] = [];
  const errors: { agentId: string; error: string }[] = [];

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (result.value.error) {
        errors.push({ agentId: result.value.agentId, error: result.value.error });
        await logSessionError(sessionId, `Agent ${result.value.agentId}: ${result.value.error}`);
      }
    } else {
      const errMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push({ agentId: 'unknown', error: errMsg });
      await logSessionError(sessionId, `Parallel execution error: ${errMsg}`);
    }
  }

  // Reload findings from DB (includes generated IDs)
  const allFindings = await getFindingsBySession(sessionId);
  const findingIds = allFindings.map((f: AgentFinding & { id: string }) => (f as { id: string }).id);

  const totalInputTokens = results.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((s, r) => s + r.outputTokens, 0);

  console.log(`[pipeline] Layer 1 complete: ${allFindings.length} findings, ${errors.length} errors`);

  return {
    results,
    allFindings,
    findingIds,
    totalInputTokens,
    totalOutputTokens,
    errors,
  };
}

/**
 * Determines which agents should review findings from other agents.
 * Returns pairs of [reviewer, findings to review].
 */
export function buildCrossValidationPlan(
  sessionId: string,
  topic: string,
  researchQuestions: string[],
  findings: (AgentFinding & { id: string })[],
): { reviewerAgentId: string; findingIds: string[] }[] {
  const raci = assignRaci(topic, researchQuestions);
  const reviewerIds = getReviewAgents(raci);

  if (reviewerIds.length === 0) {
    // Fall back to having the accountable agent review if no consulted agents
    reviewerIds.push(...raci.accountable);
  }

  return reviewerIds.map((reviewerAgentId) => ({
    reviewerAgentId,
    // Each reviewer gets all findings NOT from themselves
    findingIds: findings
      .filter((f) => f.agent_id !== reviewerAgentId)
      .map((f) => f.id),
  }));
}
