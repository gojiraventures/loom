import { getFindingsBySession } from '@/lib/research/storage/findings';
import { buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import type { ResearchJob } from '@/lib/research/storage/jobs';

export interface CrossValidationPayload {
  topic: string;
  research_questions: string[];
}

export async function handleCrossValidation(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic, research_questions } = job.params as unknown as CrossValidationPayload;

  const findings = await getFindingsBySession(job.session_id);
  if (findings.length === 0) throw new Error('No findings available for cross-validation');

  const crossValPlan = buildCrossValidationPlan(job.session_id, topic, research_questions, findings);
  const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
  await runAllCrossValidation(job.session_id, topic, findings, reviewerIds);

  return { validation_count: crossValPlan.length, reviewer_count: reviewerIds.length };
}
