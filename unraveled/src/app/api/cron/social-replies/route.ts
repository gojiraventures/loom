/**
 * GET /api/cron/social-replies
 * Called by Vercel Cron hourly. Fetches new replies + classifies them.
 * Auth: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delegate to the replies POST handler
  const host = req.headers.get('host') ?? 'localhost:3000';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const res = await fetch(`${proto}://${host}/api/admin/social/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  return NextResponse.json({ ok: true, ...data });
}
