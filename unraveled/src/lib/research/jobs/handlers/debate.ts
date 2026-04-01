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

  const d = result.debate;
  return {
    advocate_confidence: d.advocate_confidence,
    skeptic_confidence: d.skeptic_confidence,
    rounds: d.rounds,
    agreed_facts_count: d.agreed_facts.length,
    unresolved_tensions_count: d.unresolved_tensions.length,
    // Human-readable content for the approval UI
    advocate_case_excerpt: d.advocate_case.slice(0, 600),
    skeptic_case_excerpt: d.skeptic_case.slice(0, 600),
    advocate_strongest_points: d.advocate_strongest_points,
    skeptic_strongest_points: d.skeptic_strongest_points,
    unresolved_tensions: d.unresolved_tensions,
    agreed_facts: d.agreed_facts,
  };
}
