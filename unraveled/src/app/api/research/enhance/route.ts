/**
 * POST /api/research/enhance
 *
 * Enhancement round on an existing topic — adds new research questions,
 * queues the full job DAG (same as v2), then sets status = 'pending_review'
 * instead of auto-merging to the dossier. Admin must approve before the new
 * findings are incorporated into the published article.
 *
 * Accepts up to 9 questions — automatically splits into batches of 3,
 * each running as a separate enhancement session in parallel.
 *
 * Accepts optional source material (description + source_urls) that agents
 * are required to cite directly in their findings.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createJobs } from '@/lib/research/storage/jobs';
import { assignRaci } from '@/lib/research/raci';
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

const BATCH_SIZE = 3;
const MAX_QUESTIONS = 9;

async function queueEnhancementBatch(
  supabase: ReturnType<typeof import('@/lib/supabase').createServerSupabaseClient>,
  topicStr: string,
  titleStr: string,
  questionsArr: string[],
  additionalContext: string | undefined,
): Promise<string> {
  // Create the enhancement session
  const insertData: Record<string, unknown> = {
    topic: topicStr,
    title: titleStr,
    research_questions: questionsArr,
    session_type: 'enhancement',
    status: 'pending',
  };
  if (additionalContext) {
    // Store raw parts for future re-use
    insertData.source_urls = additionalContext;
  }

  const { data: session, error: createErr } = await supabase
    .from('research_sessions')
    .insert(insertData)
    .select('id')
    .single();

  if (createErr || !session) throw new Error(createErr?.message ?? 'Failed to create session');

  const sessionId = session.id as string;

  // RACI assignment
  const raci = assignRaci(topicStr, questionsArr);

  const responsibleAgents = RESEARCH_AGENTS
    .filter((a) => raci.responsible.includes(a.id))
    .slice(0, 15);
  const responsibleIds = new Set(responsibleAgents.map((a) => a.id));

  const accountableAgents = RESEARCH_AGENTS
    .filter((a) => raci.accountable.includes(a.id) && !responsibleIds.has(a.id))
    .slice(0, 5);

  const combined = [...responsibleAgents, ...accountableAgents].slice(0, 20);
  const agentsToRun = combined.length >= 5
    ? combined
    : RESEARCH_AGENTS.slice(0, Math.max(5, combined.length));

  function agentPriority(agentId: string): number {
    if (raci.responsible.includes(agentId)) return 10;
    if (raci.accountable.includes(agentId)) return 20;
    return 30;
  }

  // ── Phase 1: Agent signal jobs ───────────────────────────────────────────────
  const agentJobs = await createJobs(
    agentsToRun.map((agent) => ({
      session_id: sessionId,
      topic: topicStr,
      job_type: 'agent_signal' as const,
      params: {
        agent_id: agent.id,
        topic: topicStr,
        research_questions: questionsArr,
        ...(additionalContext ? { additional_context: additionalContext } : {}),
      },
      priority: agentPriority(agent.id),
    })),
  );

  const agentJobIds = agentJobs.map((j) => j.id);

  // ── Phase 1b: Agent evaluation ───────────────────────────────────────────────
  const [agentEvalJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'agent_evaluation',
    params: {
      topic: topicStr,
      research_questions: questionsArr,
      initial_agent_ids: agentsToRun.map((a) => a.id),
    },
    priority: 38,
    run_after_job_ids: agentJobIds,
  }]);

  // ── Phase 2: Cross-validation ────────────────────────────────────────────────
  const [crossValJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'cross_validation',
    params: { topic: topicStr, research_questions: questionsArr },
    priority: 40,
    run_after_job_ids: [agentEvalJob.id],
  }]);

  // ── Phase 3: Convergence ─────────────────────────────────────────────────────
  const [convergenceJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'convergence_analysis',
    params: { topic: topicStr },
    priority: 50,
    run_after_job_ids: [crossValJob.id],
  }]);

  // ── Phase 4: Debate (admin gate) ─────────────────────────────────────────────
  const [debateJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'adversarial_debate',
    params: { topic: topicStr },
    priority: 60,
    run_after_job_ids: [convergenceJob.id],
    requires_approval: true,
  }]);

  // ── Phase 5: Synthesis outline (admin gate) ──────────────────────────────────
  const [outlineJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'synthesis_outline',
    params: { topic: topicStr, title: titleStr },
    priority: 70,
    run_after_job_ids: [debateJob.id],
    requires_approval: true,
  }]);

  // ── Phase 6: Synthesis sections (13 parallel) ────────────────────────────────
  const sectionJobs = await createJobs(
    SECTION_KEYS.map((section_key) => ({
      session_id: sessionId,
      topic: topicStr,
      job_type: 'synthesis_section' as const,
      params: { section_key, outline_job_id: outlineJob.id, is_enhancement: true },
      priority: 80,
      run_after_job_ids: [outlineJob.id],
    })),
  );

  // ── Phase 7: Assembly (admin gate) ───────────────────────────────────────────
  const [assemblyJob] = await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'synthesis_assembly',
    params: { topic: topicStr, title: titleStr },
    priority: 90,
    run_after_job_ids: sectionJobs.map((j) => j.id),
    requires_approval: true,
  }]);

  // ── Phase 8: Editor pass → sets session to pending_review ────────────────────
  await createJobs([{
    session_id: sessionId,
    topic: topicStr,
    job_type: 'editor_pass',
    params: { topic: topicStr, title: titleStr },
    priority: 100,
    run_after_job_ids: [assemblyJob.id],
    requires_approval: true,
  }]);

  return sessionId;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, description, source_urls } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions) || research_questions.length === 0)
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  if (research_questions.length > MAX_QUESTIONS)
    return NextResponse.json({ error: `Maximum ${MAX_QUESTIONS} questions per enhancement (auto-batched into groups of ${BATCH_SIZE}).` }, { status: 400 });

  const topicStr = topic.trim();
  const titleStr = title.trim();
  const questionsArr = research_questions.map(String);

  // Build additional context from user-provided source material
  const contextParts: string[] = [];
  if (typeof description === 'string' && description.trim())
    contextParts.push(`TOPIC CONTEXT:\n${description.trim()}`);
  if (typeof source_urls === 'string' && source_urls.trim())
    contextParts.push(`SOURCE MATERIAL:\n${source_urls.trim()}`);
  const additionalContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

  // Split questions into batches of BATCH_SIZE
  const batches: string[][] = [];
  for (let i = 0; i < questionsArr.length; i += BATCH_SIZE) {
    batches.push(questionsArr.slice(i, i + BATCH_SIZE));
  }

  const supabase = createServerSupabaseClient();
  const sessionIds: string[] = [];

  try {
    for (const batch of batches) {
      const sessionId = await queueEnhancementBatch(supabase, topicStr, titleStr, batch, additionalContext);
      sessionIds.push(sessionId);
    }

    return NextResponse.json({
      session_ids: sessionIds,
      session_id: sessionIds[0], // backwards compat
      batches: batches.length,
      total_questions: questionsArr.length,
      status: 'queued',
      message: `${batches.length} enhancement ${batches.length === 1 ? 'batch' : 'batches'} queued (${questionsArr.length} questions total). Results appear in Sessions tab when complete.`,
      has_source_material: !!additionalContext,
    }, { status: 202 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Mark any created sessions as failed
    for (const sessionId of sessionIds) {
      await supabase
        .from('research_sessions')
        .update({ status: 'failed', error_log: [message] })
        .eq('id', sessionId);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
