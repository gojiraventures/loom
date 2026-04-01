import { route } from '../llm/router';
import { parseJsonResponse } from '../llm/parse';
import { ValidationResultsSchema } from '../schemas';
import { buildValidationPrompt } from '../prompt-builder';
import { insertValidations } from '../storage/validations';
import { getAgent } from './definitions';
import { IS_OLLAMA_MODE, OLLAMA_CONCURRENCY, runWithConcurrency } from '../llm/concurrency';
import type { AgentFinding, ValidationResult } from '../types';

export interface CrossValidationResult {
  reviewerAgentId: string;
  validations: ValidationResult[];
  error?: string;
}

export async function runCrossValidation(
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
  reviewerAgentId: string,
): Promise<CrossValidationResult> {
  const reviewerDef = getAgent(reviewerAgentId);

  // Only review findings from OTHER agents
  const toReview = findings
    .filter((f) => f.agent_id !== reviewerAgentId)
    .slice(0, 20); // Cap at 20 per reviewer to manage token cost

  if (toReview.length === 0) {
    return { reviewerAgentId, validations: [] };
  }

  const { systemPrompt, userPrompt } = buildValidationPrompt(
    reviewerDef,
    toReview.map((f) => ({
      id: (f as { id: string }).id,
      agent_id: f.agent_id,
      claim_text: f.claim_text,
      evidence_type: f.evidence_type,
      sources: f.sources,
    })),
    topic,
  );

  let response;
  try {
    response = await route(
      {
        provider: 'gemini-flash', // Use Flash for cross-validation — cheaper
        skipOllamaOverride: true, // Phases 2-5 always use cloud; Ollama is Layer 1 only
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: 4096,
        temperature: 0.3,
        sessionId,
      },
      reviewerAgentId,
    );
  } catch (err) {
    return {
      reviewerAgentId,
      validations: [],
      error: `LLM error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let validations: ValidationResult[] = [];
  try {
    const raw = parseJsonResponse(response);
    const parsed = ValidationResultsSchema.parse(raw);
    validations = parsed.validations;
  } catch (err) {
    return {
      reviewerAgentId,
      validations: [],
      error: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await insertValidations(sessionId, validations);

  return { reviewerAgentId, validations };
}

export async function runAllCrossValidation(
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
  reviewerAgentIds: string[],
): Promise<CrossValidationResult[]> {
  const concurrency = IS_OLLAMA_MODE ? OLLAMA_CONCURRENCY : reviewerAgentIds.length;
  const settled = await runWithConcurrency(reviewerAgentIds, concurrency, (id) =>
    runCrossValidation(sessionId, topic, findings, id),
  );

  return settled.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { reviewerAgentId: 'unknown', validations: [], error: String(r.reason) },
  );
}
