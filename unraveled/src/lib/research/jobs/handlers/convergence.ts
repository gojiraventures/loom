import { getFindingsBySession } from '@/lib/research/storage/findings';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import type { ResearchJob } from '@/lib/research/storage/jobs';

export interface ConvergencePayload {
  topic: string;
}

export async function handleConvergence(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic } = job.params as unknown as ConvergencePayload;

  const findings = await getFindingsBySession(job.session_id);
  if (findings.length === 0) throw new Error('No findings available for convergence analysis');

  const results = await runConvergenceLayer(job.session_id, topic, findings);
  const successCount = results.filter((r) => r.analysis !== null).length;
  const errors = results.filter((r) => r.error).map((r) => `${r.agentId}: ${r.error}`);

  if (successCount === 0) {
    throw new Error(`All convergence agents failed: ${errors.join('; ')}`);
  }

  return { agent_count: results.length, success_count: successCount, errors };
}
