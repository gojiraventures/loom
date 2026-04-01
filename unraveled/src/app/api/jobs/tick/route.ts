/**
 * POST /api/jobs/tick
 *
 * Job runner tick — called by Vercel Cron every 60s.
 * 1. Reset stale locks
 * 2. Get runnable pending jobs
 * 3. Claim each job atomically
 * 4. Fire /api/jobs/[id]/run for each claimed job via after()
 *
 * Uses after() so the run fetches are guaranteed to complete even after
 * this route's response is sent (works in both local dev and Vercel prod).
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { resetStaleJobLocks, getRunnableJobs, claimJob } from '@/lib/research/storage/jobs';
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

  const origin = new URL(req.url).origin;
  const workerId = crypto.randomUUID();
  const fired: string[] = [];

  for (const job of jobs) {
    const claimed = await claimJob(job.id, workerId).catch(() => false);
    if (!claimed) continue;

    const jobId = job.id;
    const runUrl = `${origin}/api/jobs/${jobId}/run`;

    // after() guarantees the fetch outlives this response — critical for local dev.
    // In Vercel prod this also works: each fetch triggers a separate function invocation.
    after(async () => {
      try {
        const res = await fetch(runUrl, { method: 'POST' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          console.error(`[tick] /run ${jobId} responded ${res.status}: ${body.slice(0, 200)}`);
        }
      } catch (err) {
        console.error(`[tick] failed to fire job ${jobId}:`, err);
      }
    });

    fired.push(jobId);
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
