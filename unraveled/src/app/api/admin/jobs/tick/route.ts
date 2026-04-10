/**
 * POST /api/admin/jobs/tick
 *
 * Admin-facing wrapper for the job runner tick.
 * No Bearer token required — protected by the admin layout like all other
 * /api/admin/* routes.  The cron version at /api/jobs/tick still requires
 * the CRON_SECRET header.
 */
import { after } from 'next/server';
import { NextResponse } from 'next/server';
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

export async function POST() {
  const staleReset = await resetStaleJobLocks().catch((err: unknown) => {
    console.error('[admin/tick] resetStaleJobLocks failed:', err);
    return 0;
  });

  const jobs = await getRunnableJobs(10).catch((err: unknown) => {
    console.error('[admin/tick] getRunnableJobs failed:', err);
    return [];
  });

  const workerId = crypto.randomUUID();
  const fired: string[] = [];

  for (const job of jobs) {
    const claimed = await claimJob(job.id, workerId).catch(() => false);
    if (!claimed) continue;

    const claimedJob = job;

    after(async () => {
      console.log(`[admin/tick] running ${claimedJob.job_type} job ${claimedJob.id}`);
      try {
        const outputData = await dispatch(claimedJob);

        if (claimedJob.requires_approval) {
          await awaitApproval(claimedJob.id, outputData);
          console.log(`[admin/tick] ${claimedJob.job_type} ${claimedJob.id} → awaiting_approval`);
        } else {
          await completeJob(claimedJob.id, outputData);
          console.log(`[admin/tick] ${claimedJob.job_type} ${claimedJob.id} → complete`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[admin/tick] ${claimedJob.job_type} ${claimedJob.id} failed:`, message);
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
