import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { runDebate } from '@/lib/research/agents/debate-runner';
import type { ResearchJob } from '@/lib/research/storage/jobs';

export interface DebatePayload {
  topic: string;
}

export async function handleDebate(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic } = job.params as unknown as DebatePayload;

  const [findings, convergenceAnalyses] = await Promise.all([
    getFindingsBySession(job.session_id),
    getConvergenceBySession(job.session_id),
  ]);

  if (findings.length === 0) throw new Error('No findings available for debate');

  const result = await runDebate(job.session_id, topic, findings, convergenceAnalyses);

  if (result.error || !result.debate) {
    throw new Error(result.error ?? 'Debate produced no output');
  }

  return {
    advocate_confidence: result.debate.advocate_confidence,
    skeptic_confidence: result.debate.skeptic_confidence,
    unresolved_tensions: result.debate.unresolved_tensions.length,
    agreed_facts: result.debate.agreed_facts.length,
  };
}
