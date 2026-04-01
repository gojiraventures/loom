import { getAgent } from '@/lib/research/agents/definitions';
import { executeAgent } from '@/lib/research/agents/executor';
import type { ResearchJob } from '@/lib/research/storage/jobs';

export interface AgentSignalPayload {
  agent_id: string;
  topic: string;
  research_questions: string[];
  additional_context?: string;
}

export async function handleAgentSignal(job: ResearchJob): Promise<Record<string, unknown>> {
  const payload = job.params as unknown as AgentSignalPayload;
  const { agent_id, topic, research_questions, additional_context } = payload;

  const agentDef = getAgent(agent_id);
  const result = await executeAgent(agentDef, topic, research_questions, {
    sessionId: job.session_id,
    additionalContext: additional_context,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    agent_id,
    finding_count: result.findings.length,
    finding_ids: result.findingIds,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    duration_ms: result.durationMs,
  };
}
