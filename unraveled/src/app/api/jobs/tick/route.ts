/**
 * POST /api/jobs/tick
 *
 * Job runner tick — called by Vercel Cron every 60s.
 * 1. Reset stale locks
 * 2. Get runnable pending jobs
 * 3. Claim each job atomically
 * 4. Fire /api/jobs/[id]/run for each claimed job (fire-and-forget)
 *
 * Each run invocation gets its own 300s Vercel function budget.
 */
import { NextRequest, NextResponse } from 'next/server';
import { resetStaleJobLocks, getRunnableJobs, claimJob } from '@/lib/research/storage/jobs';
import crypto from 'crypto';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Vercel Cron sends Authorization header; allow direct calls for manual triggers too
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

  const origin = new URL(req.url).origin;
  const workerId = crypto.randomUUID();
  const fired: string[] = [];

  for (const job of jobs) {
    const claimed = await claimJob(job.id, workerId).catch(() => false);
    if (!claimed) continue;

    // Fire-and-forget — each run gets its own Vercel function budget
    fetch(`${origin}/api/jobs/${job.id}/run`, { method: 'POST' }).catch((err) => {
      console.error(`[tick] failed to fire job ${job.id}:`, err);
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

// Also support GET for Vercel Cron (Vercel sends GET to cron endpoints)
export async function GET(req: NextRequest) {
  return POST(req);
}
