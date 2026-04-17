/**
 * GET /api/cron/social-post
 *
 * Called by Vercel Cron every 15 minutes.
 * Finds approved pieces (X, Facebook, Instagram) with scheduled_at <= now and posts them.
 *
 * Auth: Bearer ${CRON_SECRET} (enforced only when CRON_SECRET is set)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { xApiAvailable, uploadMedia, postTweet, postThread } from '@/lib/external/x-api';
import { metaApiAvailable, postFacebookPhoto, postFacebookLink, postInstagramPhoto } from '@/lib/external/meta-api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Find all approved pieces whose scheduled time has passed.
  // No lower-bound window — status='approved' prevents double-posting.
  const now = new Date();

  const { data: duePieces, error } = await supabase
    .from('social_content_pieces')
    .select('*')
    .in('platform', ['x', 'facebook', 'instagram'])
    .eq('status', 'approved')
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

  const results: { id: string; platform: string; ok: boolean; url?: string; error?: string }[] = [];

  for (const piece of duePieces) {
    try {
      // Load selected design variant image
      const { data: variants } = await supabase
        .from('social_design_variants')
        .select('image_url')
        .eq('content_piece_id', piece.id)
        .eq('selected', true)
        .limit(1);
      const imageUrl: string | undefined = variants?.[0]?.image_url ?? undefined;

      // Article URL for link appending
      const { data: dossier } = await supabase
        .from('topic_dossiers')
        .select('slug')
        .eq('topic', piece.topic)
        .single();
      const slug = dossier?.slug ?? piece.topic.toLowerCase().replace(/\s+/g, '-');
      const articleUrl = `https://unraveledtruth.com/topics/${slug}`;

      const supplementary = piece.supplementary as { posts?: string[]; caption?: string } | null;

      // ── X ───────────────────────────────────────────────────────────────────
      if (piece.platform === 'x') {
        if (!xApiAvailable()) {
          results.push({ id: piece.id, platform: 'x', ok: false, error: 'X API not configured' });
          continue;
        }

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

        const threadPosts: string[] = supplementary?.posts ?? [];
        const hasThread = threadPosts.length > 1;
        let tweetResults: { id: string; text: string }[];

        if (hasThread) {
          tweetResults = await postThread(threadPosts, mediaId);
        } else {
          let text = threadPosts[0] ?? piece.text_content ?? '';
          if (!text.includes(articleUrl)) text = `${text}\n\n${articleUrl}`;
          tweetResults = [await postTweet(text, mediaId ? { mediaIds: [mediaId] } : {})];
        }

        const tweetIds = tweetResults.map(t => t.id);
        const tweetUrl = `https://x.com/i/web/status/${tweetIds[0]}`;

        await supabase
          .from('social_content_pieces')
          .update({
            status: 'published',
            supplementary: { ...(supplementary ?? {}), published_tweet_ids: tweetIds, published_tweet_url: tweetUrl },
          })
          .eq('id', piece.id);

        results.push({ id: piece.id, platform: 'x', ok: true, url: tweetUrl });
        console.log(`[social-cron] X posted ${piece.content_type} → ${tweetUrl}`);

      // ── Facebook ─────────────────────────────────────────────────────────────
      } else if (piece.platform === 'facebook') {
        if (!metaApiAvailable()) {
          results.push({ id: piece.id, platform: 'facebook', ok: false, error: 'Meta API not configured' });
          continue;
        }

        const text = piece.text_content ?? '';
        let postId: string;

        if (imageUrl) {
          const caption = `${text}\n\n${articleUrl}`;
          postId = await postFacebookPhoto(imageUrl, caption);
        } else {
          postId = await postFacebookLink(text, articleUrl);
        }

        const postUrl = `https://www.facebook.com/${postId}`;
        await supabase
          .from('social_content_pieces')
          .update({
            status: 'published',
            supplementary: { ...(supplementary ?? {}), published_post_id: postId, published_post_url: postUrl },
          })
          .eq('id', piece.id);

        results.push({ id: piece.id, platform: 'facebook', ok: true, url: postUrl });
        console.log(`[social-cron] Facebook posted ${piece.content_type} → ${postUrl}`);

      // ── Instagram ────────────────────────────────────────────────────────────
      } else if (piece.platform === 'instagram') {
        if (!metaApiAvailable()) {
          results.push({ id: piece.id, platform: 'instagram', ok: false, error: 'Meta API not configured' });
          continue;
        }
        if (!imageUrl) {
          results.push({ id: piece.id, platform: 'instagram', ok: false, error: 'No image — Instagram requires an image' });
          continue;
        }

        // Instagram captions can include hashtags but no clickable links — append URL as plain text
        const caption = supplementary?.caption ?? piece.text_content ?? '';
        const fullCaption = caption.includes('unraveledtruth.com') ? caption : `${caption}\n\nunraveledtruth.com/topics/${slug}`;

        const mediaId = await postInstagramPhoto(imageUrl, fullCaption);
        const igUrl = `https://www.instagram.com/p/${mediaId}/`;

        await supabase
          .from('social_content_pieces')
          .update({
            status: 'published',
            supplementary: { ...(supplementary ?? {}), published_ig_media_id: mediaId, published_ig_url: igUrl },
          })
          .eq('id', piece.id);

        results.push({ id: piece.id, platform: 'instagram', ok: true, url: igUrl });
        console.log(`[social-cron] Instagram posted ${piece.content_type} → ${igUrl}`);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[social-cron] Failed to post ${piece.id} (${piece.platform}):`, msg);
      results.push({ id: piece.id, platform: piece.platform, ok: false, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    posted: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  });
}
