import { NextRequest, NextResponse } from 'next/server';
import { gatherTopicIntelligence, getStoredIntelligence, getTopicMedia, approveMedia } from '@/lib/research/intelligence/gatherer';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { topic } = body as Record<string, unknown>;
  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });

  try {
    const intelligence = await gatherTopicIntelligence(topic.trim());
    return NextResponse.json({ intelligence });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic param required' }, { status: 400 });

  const [intelligence, media] = await Promise.all([
    getStoredIntelligence(topic),
    getTopicMedia(topic),
  ]);

  return NextResponse.json({ intelligence, media });
}

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { mediaId, featured } = body as Record<string, unknown>;
  if (typeof mediaId !== 'string') return NextResponse.json({ error: 'mediaId required' }, { status: 400 });

  await approveMedia(mediaId, featured === true);
  return NextResponse.json({ ok: true });
}
