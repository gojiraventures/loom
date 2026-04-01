/**
 * POST /api/research/v2
 *
 * Pipeline v2 research launcher.
 * Creates a session and queues the full job DAG:
 *   1. N × agent_signal jobs (one per active agent, based on RACI)
 *   2. cross_validation job (depends on all agent_signal jobs)
 *   3. convergence job (depends on cross_validation)
 *   4. debate job (depends on convergence) — requires_approval
 *   5. synthesis_outline job (depends on debate) — requires_approval
 *   6. 13 × synthesis_section jobs (depends on synthesis_outline)
 *   7. synthesis_assembly job (depends on all 13 sections) — requires_approval
 *
 * The tick cron (/api/jobs/tick) picks these up automatically.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/research/storage/sessions';
import { createJobs } from '@/lib/research/storage/jobs';
import { assignRaci, getActiveAgents } from '@/lib/research/raci';
import { RESEARCH_AGENTS } from '@/lib/research/agents/definitions';
import type { SectionKey } from '@/lib/research/jobs/section-prompts';

const SECTION_KEYS: SectionKey[] = [
  'executive_summary',
  'key_findings',
  'traditions_analysis',
  'convergence_deep_dive',
  'advocate_case',
  'skeptic_case',
  'jaw_drop_layers',
  'faith_perspectives',
  'legendary_patterns',
  'circumstantial_convergence',
  'open_questions',
  'how_cultures_describe',
  'sources',
];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, description, source_urls } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions))
    return NextResponse.json({ error: 'research_questions must be an array' }, { status: 400 });

  const topicStr = topic.trim();
  const titleStr = title.trim();
  const questionsArr = research_questions.map(String);

  const contextParts: string[] = [];
  if (typeof description === 'string' && description.trim())
    contextParts.push(`TOPIC DESCRIPTION:\n${description.trim()}`);
  if (typeof source_urls === 'string' && source_urls.trim())
    contextParts.push(`SUPPLEMENTARY SOURCES:\n${source_urls.trim()}`);
  const additionalContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

  // Create session
  let session: { id: string };
  try {
    session = await createSession({ topic: topicStr, title: titleStr, research_questions: questionsArr });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sessionId = session.id;

  // RACI assignment — determines which agents run
  const raci = assignRaci(topicStr, questionsArr, undefined, additionalContext);
  const activeAgentIds = getActiveAgents(raci);

  // Find active agent definitions
  const activeAgents = RESEARCH_AGENTS.filter((a) => activeAgentIds.includes(a.id));
  // Always run at least 5 agents
  const agentsToRun = activeAgents.length >= 5
    ? activeAgents
    : RESEARCH_AGENTS.slice(0, Math.max(5, activeAgents.length));

  // Priority: responsible=10, accountable=20
  function agentPriority(agentId: string): number {
    if (raci.responsible.includes(agentId)) return 10;
    if (raci.accountable.includes(agentId)) return 20;
    return 30;
  }

  try {
    // ── Phase 1: Agent signal jobs ─────────────────────────────────────────────
    const agentJobs = await createJobs(
      agentsToRun.map((agent) => ({
        session_id: sessionId,
        topic: topicStr,
        job_type: 'agent_signal' as const,
        params: {
          agent_id: agent.id,
          topic: topicStr,
          research_questions: questionsArr,
          additional_context: additionalContext,
        },
        priority: agentPriority(agent.id),
      })),
    );

    const agentJobIds = agentJobs.map((j) => j.id);

    // ── Phase 2: Cross-validation ──────────────────────────────────────────────
    const [crossValJob] = await createJobs([{
      session_id: sessionId,
      topic: topicStr,
      job_type: 'cross_validation',
      params: { topic: topicStr, research_questions: questionsArr },
      priority: 40,
      run_after_job_ids: agentJobIds,
    }]);

    // ── Phase 3: Convergence ───────────────────────────────────────────────────
    const [convergenceJob] = await createJobs([{
      session_id: sessionId,
      topic: topicStr,
      job_type: 'convergence_analysis',
      params: { topic: topicStr },
      priority: 50,
      run_after_job_ids: [crossValJob.id],
    }]);

    // ── Phase 4: Debate (admin gate) ───────────────────────────────────────────
    const [debateJob] = await createJobs([{
      session_id: sessionId,
      topic: topicStr,
      job_type: 'adversarial_debate',
      params: { topic: topicStr },
      priority: 60,
      run_after_job_ids: [convergenceJob.id],
      requires_approval: true,
    }]);

    // ── Phase 5: Synthesis outline (admin gate) ────────────────────────────────
    const [outlineJob] = await createJobs([{
      session_id: sessionId,
      topic: topicStr,
      job_type: 'synthesis_outline',
      params: { topic: topicStr, title: titleStr },
      priority: 70,
      run_after_job_ids: [debateJob.id],
      requires_approval: true,
    }]);

    // ── Phase 6: Section synthesis (13 parallel) ──────────────────────────────
    const sectionJobs = await createJobs(
      SECTION_KEYS.map((section_key) => ({
        session_id: sessionId,
        topic: topicStr,
        job_type: 'synthesis_section' as const,
        params: { section_key, outline_job_id: outlineJob.id },
        priority: 80,
        run_after_job_ids: [outlineJob.id],
        requires_approval: true,
      })),
    );

    // ── Phase 7: Assembly (admin gate) ────────────────────────────────────────
    await createJobs([{
      session_id: sessionId,
      topic: topicStr,
      job_type: 'synthesis_assembly',
      params: { topic: topicStr, title: titleStr },
      priority: 90,
      run_after_job_ids: sectionJobs.map((j) => j.id),
      requires_approval: true,
    }]);

    const totalJobs = 1 + agentJobs.length + 1 + 1 + 1 + 1 + sectionJobs.length + 1;

    return NextResponse.json({
      session_id: sessionId,
      status: 'queued',
      agent_count: agentsToRun.length,
      total_jobs: totalJobs,
    }, { status: 202 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[research/v2] Failed to create jobs for session ${sessionId}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
