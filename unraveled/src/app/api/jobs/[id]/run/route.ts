/**
 * POST /api/jobs/[id]/run
 *
 * Runs a single job. Called fire-and-forget by /api/jobs/tick.
 * Each invocation gets its own 300s Vercel budget.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getJob,
  completeJob,
  awaitApproval,
  failJob,
} from '@/lib/research/storage/jobs';
import { dispatch } from '@/lib/research/jobs/dispatcher';

export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: jobId } = await params;

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Only run if still in running status (lock was claimed by tick)
  if (job.status !== 'running') {
    return NextResponse.json({ error: `Job not in running state (status: ${job.status})` }, { status: 409 });
  }

  try {
    console.log(`[job:${jobId}] Running ${job.job_type} for session ${job.session_id}`);
    const outputData = await dispatch(job);

    if (job.requires_approval) {
      await awaitApproval(jobId, outputData);
      console.log(`[job:${jobId}] ${job.job_type} awaiting approval`);
    } else {
      await completeJob(jobId, outputData);
      console.log(`[job:${jobId}] ${job.job_type} complete`);
    }

    return NextResponse.json({ ok: true, status: job.requires_approval ? 'awaiting_approval' : 'complete' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[job:${jobId}] ${job.job_type} failed:`, message);
    await failJob(jobId, message).catch(() => null);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
