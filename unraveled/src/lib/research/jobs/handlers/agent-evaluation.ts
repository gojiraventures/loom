/**
 * agent_evaluation job handler
 *
 * Runs after the initial agent wave. Reads what the findings actually surfaced,
 * re-scores the unused agent pool against that content, and queues any agents
 * whose expertise is now clearly relevant.
 *
 * Also appends the new agent job IDs to cross_validation's dependency list so
 * cross-validation waits for the second wave before running.
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { createJobs, appendJobDeps } from '@/lib/research/storage/jobs';
import { RESEARCH_AGENTS } from '@/lib/research/agents/definitions';
import type { ResearchJob } from '@/lib/research/storage/jobs';

export interface AgentEvaluationPayload {
  topic: string;
  research_questions: string[];
  initial_agent_ids: string[];  // agents already run — don't re-queue
}

// Score an agent against a body of text using keyword overlap
function scoreAgentAgainstText(agentId: string, text: string): number {
  const agent = RESEARCH_AGENTS.find((a) => a.id === agentId);
  if (!agent) return 0;

  const lc = text.toLowerCase();
  let score = 0;
  for (const expertise of agent.primaryExpertise) {
    const e = expertise.toLowerCase();
    // Count how many words from the expertise appear in the findings
    const words = e.split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (lc.includes(word)) score += 2;
    }
  }
  for (const expertise of agent.secondaryExpertise) {
    const e = expertise.toLowerCase();
    const words = e.split(/\s+/).filter((w) => w.length > 3);
    for (const word of words) {
      if (lc.includes(word)) score += 1;
    }
  }
  return score;
}

export async function handleAgentEvaluation(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic, research_questions, initial_agent_ids } =
    job.params as unknown as AgentEvaluationPayload;

  // Get all findings written so far
  const findings = await getFindingsBySession(job.session_id);
  if (findings.length === 0) {
    return { expansion_agents: [], reason: 'No findings to evaluate against' };
  }

  // Build a text corpus from the findings
  const findingsText = findings
    .map((f) => [
      f.claim_text,
      f.traditions.join(' '),
      f.geographic_scope.join(' '),
      f.raw_excerpts.join(' '),
    ].join(' '))
    .join('\n');

  // Score all agents that weren't in the initial wave
  const initialSet = new Set(initial_agent_ids);
  const candidates = RESEARCH_AGENTS
    .filter((a) => !initialSet.has(a.id))
    .map((a) => ({ agent: a, score: scoreAgentAgainstText(a.id, findingsText) }))
    .filter((c) => c.score >= 6)  // Only activate if findings clearly surface their domain
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);  // Cap expansion at 10 additional agents

  if (candidates.length === 0) {
    return { expansion_agents: [], reason: 'No additional agents warranted by findings' };
  }

  // Create agent_signal jobs for the expansion agents
  const expansionJobs = await createJobs(
    candidates.map((c) => ({
      session_id: job.session_id,
      topic,
      job_type: 'agent_signal' as const,
      params: {
        agent_id: c.agent.id,
        topic,
        research_questions,
      },
      priority: 35,  // Between initial agents (10-30) and cross_validation (40)
      run_after_job_ids: [job.id],  // Wait for agent_evaluation to complete first
    })),
  );

  // Find the cross_validation job for this session and add the new agents as deps
  if (expansionJobs.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data: crossValJob } = await supabase
      .from('research_jobs')
      .select('id')
      .eq('session_id', job.session_id)
      .eq('job_type', 'cross_validation')
      .single();

    if (crossValJob?.id) {
      await appendJobDeps(crossValJob.id, expansionJobs.map((j) => j.id));
      console.log(
        `[agent-eval] Added ${expansionJobs.length} expansion agents as deps to cross_validation ${crossValJob.id}`,
      );
    }
  }

  return {
    expansion_agents: candidates.map((c) => ({ id: c.agent.id, score: c.score })),
    expansion_job_ids: expansionJobs.map((j) => j.id),
    findings_analyzed: findings.length,
  };
}
