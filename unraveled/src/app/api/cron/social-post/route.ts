/**
 * GET /api/cron/social-post
 *
 * Called by Vercel Cron every 15 minutes.
 * Finds approved X pieces with scheduled_at <= now and posts them.
 *
 * Auth: Bearer ${CRON_SECRET}
 * Only platform=x is posted automatically (Instagram/Facebook require manual publish).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { xApiAvailable, uploadMedia, postTweet, postThread } from '@/lib/external/x-api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!xApiAvailable()) {
    return NextResponse.json({ ok: true, skipped: 'X API not configured' });
  }

  const supabase = createServerSupabaseClient();

  // Find approved X pieces due to post right now (scheduled_at <= now, within a 20-min window
  // to handle cron jitter without double-posting)
  const now = new Date();
  const windowStart = new Date(now.getTime() - 20 * 60 * 1000); // 20 min ago

  const { data: duePieces, error } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('platform', 'x')
    .eq('status', 'approved')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', now.toISOString())
    .gte('scheduled_at', windowStart.toISOString())
    .order('scheduled_at');

  if (error) {
    console.error('[social-cron] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!duePieces || duePieces.length === 0) {
    return NextResponse.json({ ok: true, posted: 0 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const piece of duePieces) {
    try {
      // Load selected design variant (if any)
      const { data: variants } = await supabase
        .from('social_design_variants')
        .select('image_url')
        .eq('content_piece_id', piece.id)
        .eq('selected', true)
        .limit(1);

      let mediaId: string | undefined;
      const imageUrl = variants?.[0]?.image_url;
      if (imageUrl) {
        try {
          const imgRes = await fetch(imageUrl);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            mediaId = await uploadMedia(buf, 'image/png');
          }
        } catch (err) {
          console.warn(`[social-cron] Media upload failed for ${piece.id}:`, String(err));
        }
      }

      // Look up article URL for safety-net link appending
      const { data: dossier } = await supabase
        .from('topic_dossiers')
        .select('slug')
        .eq('topic', piece.topic)
        .single();
      const slug = dossier?.slug ?? piece.topic.toLowerCase().replace(/\s+/g, '-');
      const articleUrl = `https://unraveledtruth.com/topics/${slug}`;

      const supplementary = piece.supplementary as { posts?: string[] } | null;
      const threadPosts: string[] = supplementary?.posts ?? [];
      const hasThread = threadPosts.length > 1;

      let tweetResults: { id: string; text: string }[];

      if (hasThread) {
        tweetResults = await postThread(threadPosts, mediaId);
      } else {
        let text = threadPosts[0] ?? piece.text_content ?? '';
        if (!text.includes(articleUrl)) text = `${text}\n\n${articleUrl}`;
        const result = await postTweet(text, mediaId ? { mediaIds: [mediaId] } : {});
        tweetResults = [result];
      }

      const tweetIds = tweetResults.map(t => t.id);
      const tweetUrl = `https://x.com/i/web/status/${tweetIds[0]}`;

      await supabase
        .from('social_content_pieces')
        .update({
          status: 'published',
          supplementary: {
            ...(supplementary ?? {}),
            published_tweet_ids: tweetIds,
            published_tweet_url: tweetUrl,
          },
        })
        .eq('id', piece.id);

      results.push({ id: piece.id, ok: true });
      console.log(`[social-cron] Posted ${piece.content_type} → ${tweetUrl}`);
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
