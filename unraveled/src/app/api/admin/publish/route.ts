import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { syncAnchorsForTopic } from '@/lib/media/anchor-sync';

// POST /api/admin/publish  { topic, slug }
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { topic, slug } = body as Record<string, unknown>;
  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof slug !== 'string' || !slug.trim())
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });

  // Validate slug format
  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug)
    return NextResponse.json({ error: 'slug is invalid' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('topic_dossiers')
    .update({ slug: cleanSlug, published: true, published_at: now, updated_at: now })
    .eq('topic', topic.trim());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-attach anchor media for this topic
  try {
    await syncAnchorsForTopic(topic.trim());
  } catch (err) {
    console.warn('[publish] anchor sync failed (non-fatal):', err);
  }

  return NextResponse.json({ slug: cleanSlug, url: `/topics/${cleanSlug}` });
}

// POST /api/admin/publish  { topic, published: false } → unpublish
export async function DELETE(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { topic } = body as Record<string, unknown>;
  if (typeof topic !== 'string') return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('topic_dossiers')
    .update({ published: false, updated_at: new Date().toISOString() })
    .eq('topic', topic.trim());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
