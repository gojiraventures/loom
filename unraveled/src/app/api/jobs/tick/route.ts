/**
 * POST /api/jobs/tick
 *
 * Job runner tick — called by Vercel Cron every 60s (or manually via Run Tick).
 * 1. Reset stale locks
 * 2. Get runnable pending jobs
 * 3. Claim each job atomically
 * 4. Run each job directly via dispatch() inside after() — no HTTP hop.
 *
 * after() guarantees each job runs to completion even after this route's
 * response is sent, in both local dev and Vercel prod.
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  resetStaleJobLocks,
  getRunnableJobs,
  claimJob,
  completeJob,
  awaitApproval,
  failJob,
} from '@/lib/research/storage/jobs';
import { dispatch } from '@/lib/research/jobs/dispatcher';
import crypto from 'crypto';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const staleReset = await resetStaleJobLocks().catch((err: unknown) => {
    console.error('[tick] resetStaleJobLocks failed:', err);
    return 0;
  });

  const jobs = await getRunnableJobs(10).catch((err: unknown) => {
    console.error('[tick] getRunnableJobs failed:', err);
    return [];
  });

  const workerId = crypto.randomUUID();
  const fired: string[] = [];

  for (const job of jobs) {
    const claimed = await claimJob(job.id, workerId).catch(() => false);
    if (!claimed) continue;

    const claimedJob = job;

    after(async () => {
      console.log(`[tick] running ${claimedJob.job_type} job ${claimedJob.id}`);
      try {
        const outputData = await dispatch(claimedJob);

        if (claimedJob.requires_approval) {
          await awaitApproval(claimedJob.id, outputData);
          console.log(`[tick] ${claimedJob.job_type} ${claimedJob.id} → awaiting_approval`);
        } else {
          await completeJob(claimedJob.id, outputData);
          console.log(`[tick] ${claimedJob.job_type} ${claimedJob.id} → complete`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[tick] ${claimedJob.job_type} ${claimedJob.id} failed:`, message);
        await failJob(claimedJob.id, message).catch(() => null);
      }
    });

    fired.push(job.id);
  }

  return NextResponse.json({
    ok: true,
    stale_reset: staleReset,
    jobs_found: jobs.length,
    jobs_fired: fired.length,
    job_ids: fired,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
