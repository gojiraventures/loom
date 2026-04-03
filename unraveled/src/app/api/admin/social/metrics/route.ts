/**
 * POST /api/admin/social/metrics
 * Called by n8n every 4h with engagement data for a published post.
 *
 * Body: {
 *   platform_post_id: string   — the platform's native post ID
 *   platform: string           — "x" | "instagram" | "facebook"
 *   likes?: number
 *   reposts?: number
 *   replies?: number
 *   impressions?: number
 *   clicks?: number
 *   bookmarks?: number
 *   raw_metrics?: object       — full platform API response for archival
 *   secret?: string            — SOCIAL_WEBHOOK_SECRET (optional)
 * }
 *
 * GET /api/admin/social/metrics?topic=&platform=&days=30
 * Returns latest snapshot per published post for the given filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    platform_post_id?: string;
    platform?: string;
    likes?: number;
    reposts?: number;
    replies?: number;
    impressions?: number;
    clicks?: number;
    bookmarks?: number;
    raw_metrics?: Record<string, unknown>;
    secret?: string;
  };

  const secret = process.env.SOCIAL_WEBHOOK_SECRET;
  if (secret && body.secret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!body.platform_post_id || !body.platform) {
    return NextResponse.json({ error: 'platform_post_id and platform required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Look up the published post
  const { data: post, error: postErr } = await supabase
    .from('social_published_posts')
    .select('id, topic, content_piece_id')
    .eq('platform_post_id', body.platform_post_id)
    .eq('platform', body.platform)
    .single();

  if (postErr || !post) {
    return NextResponse.json({ error: 'Published post not found' }, { status: 404 });
  }

  // Look up content_type from the piece
  const { data: piece } = await supabase
    .from('social_content_pieces')
    .select('content_type')
    .eq('id', post.content_piece_id)
    .single();

  // Insert snapshot
  const { error: snapErr } = await supabase
    .from('social_engagement_snapshots')
    .insert({
      published_post_id: post.id,
      platform: body.platform,
      topic: post.topic,
      content_type: piece?.content_type ?? 'unknown',
      likes: body.likes ?? 0,
      reposts: body.reposts ?? 0,
      replies: body.replies ?? 0,
      impressions: body.impressions ?? 0,
      clicks: body.clicks ?? 0,
      bookmarks: body.bookmarks ?? 0,
      raw_metrics: body.raw_metrics ?? {},
    });

  if (snapErr) {
    return NextResponse.json({ error: snapErr.message }, { status: 500 });
  }

  // Also update the latest metrics on the published post for quick access
  await supabase
    .from('social_published_posts')
    .update({
      metrics: {
        likes: body.likes ?? 0,
        reposts: body.reposts ?? 0,
        replies: body.replies ?? 0,
        impressions: body.impressions ?? 0,
        clicks: body.clicks ?? 0,
        bookmarks: body.bookmarks ?? 0,
        updated_at: new Date().toISOString(),
      },
    })
    .eq('id', post.id);

  return NextResponse.json({ ok: true, snapshot_recorded: true });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic');
  const platform = searchParams.get('platform');
  const days = parseInt(searchParams.get('days') ?? '30', 10);

  const supabase = createServerSupabaseClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('social_engagement_snapshots')
    .select('*')
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: false });

  if (topic) query = query.eq('topic', topic);
  if (platform) query = query.eq('platform', platform);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ snapshots: data ?? [] });
}
