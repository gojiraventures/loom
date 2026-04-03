/**
 * POST /api/admin/social/webhook
 * Called by n8n when a new report is published.
 * Body: { topic: string, secret: string }
 *
 * Triggers content generation for the topic.
 * Set SOCIAL_WEBHOOK_SECRET in env to secure the endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json() as { topic?: string; secret?: string };

  const secret = process.env.SOCIAL_WEBHOOK_SECRET;
  if (secret && body.secret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body.topic) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 });
  }

  // Call generate endpoint internally
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/admin/social/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic: body.topic }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data.error ?? 'Generation failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...data });
}
