/**
 * POST /api/admin/social/recycle
 * Re-queues a high-performing old content piece as a new draft.
 *
 * Body: {
 *   published_post_id: string   — the original published post to recycle
 *   day_offset?: number         — which day to schedule (default 0)
 * }
 *
 * Clones the content piece with status=draft and an "archive" note,
 * so the human can edit before re-approving.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    published_post_id?: string;
    day_offset?: number;
  };

  if (!body.published_post_id) {
    return NextResponse.json({ error: 'published_post_id required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Load the published post and its source content piece
  const { data: post, error: postErr } = await supabase
    .from('social_published_posts')
    .select('id, topic, platform, content_piece_id, published_at, metrics')
    .eq('id', body.published_post_id)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: 'Published post not found' }, { status: 404 });
  }

  const { data: original, error: pieceErr } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('id', post.content_piece_id)
    .single();

  if (pieceErr || !original) {
    return NextResponse.json({ error: 'Source content piece not found' }, { status: 404 });
  }

  // Clone as a new draft — strip id/timestamps, mark as archive recycle
  const now = new Date().toISOString();
  const { data: cloned, error: cloneErr } = await supabase
    .from('social_content_pieces')
    .insert({
      topic: original.topic,
      platform: original.platform,
      content_type: original.content_type,
      voice_profile: original.voice_profile,
      text_content: original.text_content,
      supplementary: {
        ...(original.supplementary ?? {}),
        _recycled_from: post.id,
        _original_published_at: post.published_at,
      },
      day_offset: body.day_offset ?? 0,
      sort_order: original.sort_order,
      status: 'draft',
      scheduled_at: null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (cloneErr || !cloned) {
    return NextResponse.json({ error: cloneErr?.message ?? 'Clone failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    piece: cloned,
    note: 'Cloned as draft — edit and approve before scheduling',
  });
}
