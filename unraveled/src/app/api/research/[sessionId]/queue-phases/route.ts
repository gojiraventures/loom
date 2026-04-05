/**
 * POST /api/research/[sessionId]/queue-phases
 *
 * Queues the downstream pipeline phases (convergence → debate → synthesis outline
 * → synthesis sections → synthesis assembly) for a session that already has
 * completed agent_signal and cross_validation jobs but lacks the later stages.
 *
 * Idempotent: skips any phase whose jobs already exist for this session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/research/storage/sessions';
import { getJobsForSession, createJobs } from '@/lib/research/storage/jobs';
import type { SectionKey } from '@/lib/research/jobs/section-prompts';
import { requireAdmin } from '@/lib/auth';

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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { sessionId } = await params;

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  const topic = session.topic as string;
  const title = session.title as string;
  const researchQuestions = (session.research_questions as string[]) ?? [];

  const existingJobs = await getJobsForSession(sessionId);
  const existingTypes = new Set(existingJobs.map((j) => j.job_type));

  // Find the completed cross_val job to use as an anchor dependency
  const crossValJob = existingJobs.find((j) => j.job_type === 'cross_validation');
  const crossValDep = crossValJob ? [crossValJob.id] : [];

  const queued: string[] = [];

  // ── Convergence ────────────────────────────────────────────────────────────
  let convergenceJobId: string | null = null;
  if (!existingTypes.has('convergence_analysis')) {
    const [job] = await createJobs([{
      session_id: sessionId,
      topic,
      job_type: 'convergence_analysis',
      params: { topic },
      priority: 50,
      run_after_job_ids: crossValDep,
    }]);
    convergenceJobId = job.id;
    queued.push('convergence_analysis');
  } else {
    convergenceJobId = existingJobs.find((j) => j.job_type === 'convergence_analysis')?.id ?? null;
  }

  const convergenceDep = convergenceJobId ? [convergenceJobId] : [];

  // ── Debate (admin gate) ────────────────────────────────────────────────────
  let debateJobId: string | null = null;
  if (!existingTypes.has('adversarial_debate')) {
    const [job] = await createJobs([{
      session_id: sessionId,
      topic,
      job_type: 'adversarial_debate',
      params: { topic },
      priority: 60,
      run_after_job_ids: convergenceDep,
      requires_approval: true,
    }]);
    debateJobId = job.id;
    queued.push('adversarial_debate');
  } else {
    debateJobId = existingJobs.find((j) => j.job_type === 'adversarial_debate')?.id ?? null;
  }

  const debateDep = debateJobId ? [debateJobId] : [];

  // ── Synthesis outline (admin gate) ─────────────────────────────────────────
  let outlineJobId: string | null = null;
  if (!existingTypes.has('synthesis_outline')) {
    const [job] = await createJobs([{
      session_id: sessionId,
      topic,
      job_type: 'synthesis_outline',
      params: { topic, title },
      priority: 70,
      run_after_job_ids: debateDep,
      requires_approval: true,
    }]);
    outlineJobId = job.id;
    queued.push('synthesis_outline');
  } else {
    outlineJobId = existingJobs.find((j) => j.job_type === 'synthesis_outline')?.id ?? null;
  }

  const outlineDep = outlineJobId ? [outlineJobId] : [];

  // ── Synthesis sections (admin gate, 13 parallel) ───────────────────────────
  let sectionJobIds: string[] = [];
  if (!existingTypes.has('synthesis_section')) {
    const sectionJobs = await createJobs(
      SECTION_KEYS.map((section_key) => ({
        session_id: sessionId,
        topic,
        job_type: 'synthesis_section' as const,
        params: { section_key, outline_job_id: outlineJobId },
        priority: 80,
        run_after_job_ids: outlineDep,
      })),
    );
    sectionJobIds = sectionJobs.map((j) => j.id);
    queued.push('synthesis_section (×13)');
  } else {
    sectionJobIds = existingJobs
      .filter((j) => j.job_type === 'synthesis_section')
      .map((j) => j.id);
  }

  // ── Assembly (admin gate) ──────────────────────────────────────────────────
  let assemblyJobId: string | null = null;
  if (!existingTypes.has('synthesis_assembly')) {
    const [job] = await createJobs([{
      session_id: sessionId,
      topic,
      job_type: 'synthesis_assembly',
      params: { topic, title },
      priority: 90,
      run_after_job_ids: sectionJobIds,
      requires_approval: true,
    }]);
    assemblyJobId = job.id;
    queued.push('synthesis_assembly');
  } else {
    assemblyJobId = existingJobs.find((j) => j.job_type === 'synthesis_assembly')?.id ?? null;
  }

  // ── Editor pass (admin gate) ───────────────────────────────────────────────
  const assemblyDep = assemblyJobId ? [assemblyJobId] : [];
  if (!existingTypes.has('editor_pass')) {
    await createJobs([{
      session_id: sessionId,
      topic,
      job_type: 'editor_pass',
      params: { topic, title },
      priority: 100,
      run_after_job_ids: assemblyDep,
      requires_approval: true,
    }]);
    queued.push('editor_pass');
  }

  if (queued.length === 0) {
    return NextResponse.json({ ok: true, message: 'All phases already exist', queued: [] });
  }

  return NextResponse.json({ ok: true, queued, total: queued.length });
}
