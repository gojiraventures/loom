/**
 * GET /api/cron/social-post
 *
 * Called by Vercel Cron every 15 minutes.
 * Handles ALL scheduled X posts:
 *   - launch_thread  → posted as a reply chain (thread)
 *   - everything else → posted as a single tweet (text_content or supplementary.posts[0])
 *
 * Instagram and Facebook are handled by Buffer directly.
 *
 * Auth: Bearer ${CRON_SECRET} (enforced only when CRON_SECRET is set)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { xApiAvailable, uploadMedia, postThread } from '@/lib/external/x-api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const now = new Date();

  // All scheduled X posts — threads and standalone
  const { data: duePieces, error } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('platform', 'x')
    .eq('status', 'scheduled')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now.toISOString())
    .order('scheduled_at');

  if (error) {
    console.error('[social-cron] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!duePieces || duePieces.length === 0) {
    return NextResponse.json({ ok: true, posted: 0 });
  }

  if (!xApiAvailable()) {
    return NextResponse.json({ error: 'X API not configured' }, { status: 503 });
  }

  const results: { id: string; ok: boolean; url?: string; error?: string }[] = [];

  for (const piece of duePieces) {
    try {
      const { data: variants } = await supabase
        .from('social_design_variants')
        .select('image_url')
        .eq('content_piece_id', piece.id)
        .eq('selected', true)
        .limit(1);
      const imageUrl: string | undefined = variants?.[0]?.image_url ?? undefined;

      const supplementary = piece.supplementary as { posts?: string[]; caption?: string } | null;
      const isThread = piece.content_type === 'launch_thread';

      // Build the post text(s)
      const rawPosts: string[] = isThread
        ? (supplementary?.posts ?? [])
        : [supplementary?.posts?.[0] ?? piece.text_content ?? ''];

      if (rawPosts.length === 0 || !rawPosts[0]) {
        results.push({ id: piece.id, ok: false, error: 'No post text found' });
        continue;
      }

      // Look up article URL and ensure it appears in the first tweet so
      // readers can tap through to the article right from the header card.
      const { data: dossier } = await supabase
        .from('topic_dossiers')
        .select('slug')
        .eq('topic', piece.topic)
        .single();
      const slug = dossier?.slug ?? piece.topic.toLowerCase().replace(/\s+/g, '-');
      const articleUrl = `https://www.unraveledtruth.com/topics/${slug}`;

      const threadPosts = rawPosts.map((text, i) => {
        if (i === 0 && !text.includes('unraveledtruth.com')) {
          return `${text}\n\n${articleUrl}`;
        }
        return text;
      });

      // Upload image (attached to first tweet only)
      let mediaId: string | undefined;
      if (imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            mediaId = await uploadMedia(buf, 'image/png');
          }
        } catch (err) {
          console.warn(`[social-cron] X media upload failed for ${piece.id}:`, String(err));
        }
      }

      const tweetResults = await postThread(threadPosts, mediaId);
      const tweetIds = tweetResults.map(t => t.id);
      const tweetUrl = `https://x.com/i/web/status/${tweetIds[0]}`;

      await supabase
        .from('social_content_pieces')
        .update({
          status: 'published',
          supplementary: { ...(supplementary ?? {}), published_tweet_ids: tweetIds, published_tweet_url: tweetUrl },
        })
        .eq('id', piece.id);

      results.push({ id: piece.id, ok: true, url: tweetUrl });
      console.log(`[social-cron] X ${isThread ? 'thread' : 'post'} published → ${tweetUrl}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[social-cron] Failed to post ${piece.id}:`, msg);
      results.push({ id: piece.id, ok: false, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    posted: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  });
}
