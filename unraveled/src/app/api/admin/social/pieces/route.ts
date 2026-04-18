/**
 * GET  /api/admin/social/pieces?topic=...&platform=...&status=...
 * PATCH /api/admin/social/pieces
 *   Body: { id, status?, text_content?, supplementary?, scheduled_at? }
 *
 * When a piece is moved to status='scheduled', Instagram, Facebook, and
 * single X posts are immediately queued in Buffer with customScheduled.
 * X threads (launch_thread) are left for the social-post cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { bufferAvailable, postViaBuffer, type BufferPlatform } from '@/lib/external/buffer-api';

// Platforms routed through Buffer (not the direct X API)
const BUFFER_PLATFORMS = new Set(['instagram', 'facebook']);
// X single posts also go through Buffer; threads stay on direct API
const THREAD_CONTENT_TYPES = new Set(['launch_thread']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic    = searchParams.get('topic');
  const platform = searchParams.get('platform');
  const status   = searchParams.get('status');

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('social_content_pieces')
    .select('*')
    .order('day_offset', { ascending: true })
    .order('sort_order', { ascending: true });

  if (topic)    query = query.eq('topic', topic);
  if (platform) query = query.eq('platform', platform);
  if (status)   query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pieces: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as {
    id: string;
    status?: string;
    text_content?: string;
    supplementary?: Record<string, unknown>;
    scheduled_at?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // When scheduling, push to Buffer for eligible platforms
  let bufferPostId: string | undefined;

  if (body.status === 'scheduled' && body.scheduled_at) {
    // Fetch the current piece to know platform and content_type
    const { data: piece } = await supabase
      .from('social_content_pieces')
      .select('platform, content_type, text_content, supplementary, topic')
      .eq('id', body.id)
      .single();

    if (piece) {
      const platform = piece.platform as string;
      const useBuffer = BUFFER_PLATFORMS.has(platform);

      if (useBuffer && bufferAvailable(platform as BufferPlatform)) {
        // Get selected design image
        const { data: variants } = await supabase
          .from('social_design_variants')
          .select('image_url')
          .eq('content_piece_id', body.id)
          .eq('selected', true)
          .limit(1);
        const imageUrl: string | undefined = variants?.[0]?.image_url ?? undefined;

        // Build post text — for X single posts, append article URL if missing
        const supplementary = piece.supplementary as { posts?: string[]; caption?: string } | null;
        let text = supplementary?.caption ?? supplementary?.posts?.[0] ?? piece.text_content ?? '';

        if (platform === 'x' || platform === 'facebook' || platform === 'instagram') {
          const { data: dossier } = await supabase
            .from('topic_dossiers')
            .select('slug')
            .eq('topic', piece.topic)
            .single();
          const slug = dossier?.slug ?? piece.topic.toLowerCase().replace(/\s+/g, '-');
          const articleUrl = `https://unraveledtruth.com/topics/${slug}`;
          if (!text.includes('unraveledtruth.com')) {
            text = `${text}\n\n${articleUrl}`;
          }
        }

        try {
          bufferPostId = await postViaBuffer(
            platform as BufferPlatform,
            text,
            imageUrl,
            body.scheduled_at,
          );
          console.log(`[pieces] Queued ${platform} piece ${body.id} in Buffer → ${bufferPostId}`);
        } catch (err) {
          console.error(`[pieces] Buffer queue failed for ${body.id}:`, err);
          // Don't block the scheduling — log and continue without Buffer ID
        }
      }
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status       !== undefined) update.status       = body.status;
  if (body.text_content !== undefined) update.text_content = body.text_content;
  if (body.supplementary !== undefined) update.supplementary = body.supplementary;
  if (body.scheduled_at !== undefined) update.scheduled_at = body.scheduled_at;

  // Merge Buffer post ID into supplementary if we got one
  if (bufferPostId) {
    const { data: current } = await supabase
      .from('social_content_pieces')
      .select('supplementary')
      .eq('id', body.id)
      .single();
    update.supplementary = {
      ...((current?.supplementary as Record<string, unknown>) ?? {}),
      ...(update.supplementary as Record<string, unknown> ?? {}),
      buffer_post_id: bufferPostId,
    };
  }

  const { data, error } = await supabase
    .from('social_content_pieces')
    .update(update)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ piece: data, buffer_post_id: bufferPostId ?? null });
}
