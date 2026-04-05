/**
 * POST /api/jobs/[id]/approve   — admin approves a job awaiting review
 * POST /api/jobs/[id]/reject    — admin rejects with notes (requeues)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getJob, approveJob, rejectJob } from '@/lib/research/storage/jobs';
import { requireAdmin } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { id: jobId } = await params;
  const url = new URL(req.url);
  const action = url.searchParams.get('action') ?? 'approve';

  const job = await getJob(jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  if (job.status !== 'awaiting_approval') {
    return NextResponse.json(
      { error: `Job is not awaiting approval (status: ${job.status})` },
      { status: 409 },
    );
  }

  if (action === 'reject') {
    let notes = '';
    try {
      const body = await req.json();
      notes = typeof body?.notes === 'string' ? body.notes : '';
    } catch { /* no body */ }
    await rejectJob(jobId, notes);
    return NextResponse.json({ ok: true, status: 'pending' });
  }

  await approveJob(jobId);
  return NextResponse.json({ ok: true, status: 'complete' });
}
