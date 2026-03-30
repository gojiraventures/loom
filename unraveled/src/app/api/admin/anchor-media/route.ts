import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { syncAnchorsForTopic, syncAllAnchors } from '@/lib/media/anchor-sync';
import { ANCHOR_MEDIA } from '@/lib/media/anchor-seed';

// GET /api/admin/anchor-media?topic=xxx  — list media for a topic (or all seeds)
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  const mode = req.nextUrl.searchParams.get('mode'); // 'seeds' | 'db'

  if (mode === 'seeds') {
    // Return raw seed registry
    const filtered = topic
      ? ANCHOR_MEDIA.filter((a) => a.topics.includes(topic) || a.tags.some((t) => topic.toLowerCase().includes(t)))
      : ANCHOR_MEDIA;
    return NextResponse.json({ seeds: filtered });
  }

  // Default: return from DB
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('topic_media')
    .select()
    .eq('is_anchor', true)
    .order('sort_order', { ascending: true });
  if (topic) query = query.eq('topic', topic);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ media: data });
}

// POST /api/admin/anchor-media  — sync anchors for a topic, or sync all
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, sync_all } = body as Record<string, unknown>;

  if (sync_all) {
    const result = await syncAllAnchors();
    return NextResponse.json(result);
  }

  if (typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'topic required' }, { status: 400 });
  }

  const count = await syncAnchorsForTopic(topic.trim());
  return NextResponse.json({ synced: count, topic });
}

// PATCH /api/admin/anchor-media  — approve/feature/sort a media item
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, approved, featured, sort_order } = body as Record<string, unknown>;
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof approved === 'boolean') update.approved = approved;
  if (typeof featured === 'boolean') update.featured = featured;
  if (typeof sort_order === 'number') update.sort_order = sort_order;

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('topic_media').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/anchor-media  — remove a media item from a topic
export async function DELETE(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id } = body as Record<string, unknown>;
  if (typeof id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('topic_media').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
