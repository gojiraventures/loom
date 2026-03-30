import { route } from '../llm/router';
import { AgentFindingsSchema } from '../schemas';
import { buildAgentPrompt } from '../prompt-builder';
import { insertFindings } from '../storage/findings';
import type { AgentDefinition, AgentFinding } from '../types';

export interface ExecuteAgentOptions {
  sessionId: string;
  additionalContext?: string;
  dryRun?: boolean; // Skip storage, just return findings
}

export interface AgentExecutionResult {
  agentId: string;
  findings: AgentFinding[];
  findingIds: string[];
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  error?: string;
}

export async function executeAgent(
  def: AgentDefinition,
  topic: string,
  researchQuestions: string[],
  options: ExecuteAgentOptions,
): Promise<AgentExecutionResult> {
  const { systemPrompt, userPrompt } = buildAgentPrompt(
    def,
    topic,
    researchQuestions,
    options.additionalContext,
  );

  let llmResponse;
  try {
    llmResponse = await route(
      {
        provider: def.llm.provider,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: def.llm.maxTokens,
        temperature: def.llm.temperature,
        sessionId: options.sessionId,
      },
      def.id,
    );
  } catch (err) {
    return {
      agentId: def.id,
      findings: [],
      findingIds: [],
      inputTokens: 0,
      outputTokens: 0,
      durationMs: 0,
      error: `LLM call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Parse and validate via Zod
  let findings: AgentFinding[] = [];
  try {
    const raw = llmResponse.parsed ?? JSON.parse(llmResponse.text);
    const validated = AgentFindingsSchema.parse(raw);
    findings = validated.findings.map((f) => ({
      ...f,
      agent_id: def.id, // ensure agent_id is always correct
    }));
  } catch (err) {
    return {
      agentId: def.id,
      findings: [],
      findingIds: [],
      inputTokens: llmResponse.inputTokens,
      outputTokens: llmResponse.outputTokens,
      durationMs: llmResponse.durationMs,
      error: `Schema validation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let findingIds: string[] = [];
  if (!options.dryRun && findings.length > 0) {
    try {
      findingIds = await insertFindings(options.sessionId, findings, llmResponse.model, {
        input: llmResponse.inputTokens,
        output: llmResponse.outputTokens,
      });
    } catch (err) {
      console.error(`[executor] Failed to store findings for ${def.id}:`, err);
      // Non-fatal — return findings even if storage fails
    }
  }

  return {
    agentId: def.id,
    findings,
    findingIds,
    inputTokens: llmResponse.inputTokens,
    outputTokens: llmResponse.outputTokens,
    durationMs: llmResponse.durationMs,
  };
}
