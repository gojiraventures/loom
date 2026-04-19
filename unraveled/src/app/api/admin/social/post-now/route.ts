/**
 * POST /api/admin/social/post-now
 *
 * Posts specific social_content_pieces immediately via Buffer (Instagram/Facebook)
 * or the X API (X/Twitter). Designed for targeted testing without scheduling
 * the full content backlog.
 *
 * Body: { piece_ids: string[] }
 *
 * Returns per-piece result: posted to Buffer/X, and marks piece as 'published' in DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { postViaBuffer, bufferAvailable, type BufferPlatform } from '@/lib/external/buffer-api';
import { xApiAvailable, postThread } from '@/lib/external/x-api';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { piece_ids } = await req.json() as { piece_ids?: string[] };

  if (!piece_ids?.length) {
    return NextResponse.json({ error: 'piece_ids required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: pieces, error } = await supabase
    .from('social_content_pieces')
    .select('id, topic, platform, content_type, text_content, supplementary')
    .in('id', piece_ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pieces?.length) return NextResponse.json({ error: 'No pieces found for given IDs' }, { status: 404 });

  const results: { id: string; platform: string; ok: boolean; ref?: string; error?: string }[] = [];

  for (const piece of pieces) {
    const sup = piece.supplementary as { posts?: string[]; caption?: string } | null;

    // Resolve article URL
    const { data: dossier } = await supabase
      .from('topic_dossiers')
      .select('slug')
      .eq('topic', piece.topic)
      .single();
    const slug = dossier?.slug ?? piece.topic.toLowerCase().replace(/\s+/g, '-');
    const articleUrl = `https://www.unraveledtruth.com/topics/${slug}`;

    // Fetch selected design variant image
    const { data: variants } = await supabase
      .from('social_design_variants')
      .select('image_url')
      .eq('content_piece_id', piece.id)
      .eq('selected', true)
      .limit(1);
    const imageUrl: string | undefined = variants?.[0]?.image_url ?? undefined;

    try {
      if (piece.platform === 'instagram' || piece.platform === 'facebook') {
        if (!bufferAvailable(piece.platform as BufferPlatform)) {
          throw new Error(`Buffer not available for ${piece.platform} — check env vars`);
        }

        let text = sup?.caption ?? sup?.posts?.[0] ?? piece.text_content ?? '';
        if (!text.includes('unraveledtruth.com') && piece.platform === 'facebook') {
          text = `${text}\n\n${articleUrl}`;
        }

        // shareNow — no scheduledAt
        const bufferId = await postViaBuffer(piece.platform as BufferPlatform, text, imageUrl);

        await supabase
          .from('social_content_pieces')
          .update({ status: 'published', supplementary: { ...(sup ?? {}), buffer_post_id: bufferId, published_at: new Date().toISOString() } })
          .eq('id', piece.id);

        results.push({ id: piece.id, platform: piece.platform, ok: true, ref: bufferId });

      } else if (piece.platform === 'x') {
        if (!xApiAvailable()) throw new Error('X API not configured');

        const posts = sup?.posts ?? [piece.text_content ?? ''];
        const postsWithUrl = posts.map((t, i) =>
          i === 0 && !t.includes('unraveledtruth.com') ? `${t}\n\n${articleUrl}` : t
        );

        const tweetResults = await postThread(postsWithUrl);
        const tweetUrl = `https://x.com/i/web/status/${tweetResults[0].id}`;

        await supabase
          .from('social_content_pieces')
          .update({ status: 'published', supplementary: { ...(sup ?? {}), published_tweet_url: tweetUrl } })
          .eq('id', piece.id);

        results.push({ id: piece.id, platform: piece.platform, ok: true, ref: tweetUrl });

      } else {
        throw new Error(`Unknown platform: ${piece.platform}`);
      }

    } catch (err) {
      results.push({ id: piece.id, platform: piece.platform, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({
    ok: results.every(r => r.ok),
    results,
  });
}
