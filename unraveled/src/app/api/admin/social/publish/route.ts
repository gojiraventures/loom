/**
 * POST /api/admin/social/publish
 * Body: { piece_id: string }
 *
 * Publishes an approved X content piece to X.com:
 *   1. Loads the piece + any selected design variant
 *   2. If a design image exists, uploads it to X media API
 *   3. Posts text as a single tweet or thread (supplementary.posts)
 *   4. Updates piece status → 'published', stores tweet IDs in supplementary
 *
 * Only platform='x' is supported here.
 * Requires X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { xApiAvailable, uploadMedia, postTweet, postThread } from '@/lib/external/x-api';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as { piece_id?: string };
  if (!body.piece_id) {
    return NextResponse.json({ error: 'piece_id required' }, { status: 400 });
  }

  if (!xApiAvailable()) {
    return NextResponse.json(
      { error: 'X API credentials not configured. Add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET to .env.local' },
      { status: 503 },
    );
  }

  const supabase = createServerSupabaseClient();

  // Load the piece
  const { data: piece, error: pieceErr } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('id', body.piece_id)
    .single();

  if (pieceErr || !piece) {
    return NextResponse.json({ error: 'Piece not found' }, { status: 404 });
  }

  if (piece.platform !== 'x') {
    return NextResponse.json({ error: 'Only platform=x is supported by this endpoint' }, { status: 400 });
  }

  if (piece.status === 'published') {
    return NextResponse.json({ error: 'Piece already published' }, { status: 409 });
  }

  // Load selected design variant (if any)
  const { data: variants } = await supabase
    .from('social_design_variants')
    .select('image_url, width, height')
    .eq('content_piece_id', body.piece_id)
    .eq('selected', true)
    .limit(1);

  const selectedVariant = variants?.[0] ?? null;

  // Upload design image to X media if available
  let mediaId: string | undefined;
  if (selectedVariant?.image_url) {
    try {
      const imgRes = await fetch(selectedVariant.image_url);
      if (imgRes.ok) {
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        mediaId = await uploadMedia(imgBuffer, 'image/png');
      }
    } catch (err) {
      // Non-fatal — post without image if upload fails
      console.warn('[publish] Media upload failed, posting without image:', String(err));
    }
  }

  // Determine posts to send
  const supplementary = piece.supplementary as { posts?: string[]; caption?: string } | null;
  const threadPosts: string[] = supplementary?.posts ?? [];
  const hasThread = threadPosts.length > 1;

  let tweetResults: { id: string; text: string }[];

  try {
    if (hasThread) {
      tweetResults = await postThread(threadPosts, mediaId);
    } else {
      // Single tweet — use text_content or first thread post
      const text = threadPosts[0] ?? piece.text_content ?? '';
      const result = await postTweet(text, mediaId ? { mediaIds: [mediaId] } : {});
      tweetResults = [result];
    }
  } catch (err) {
    return NextResponse.json(
      { error: `X post failed: ${String(err)}` },
      { status: 502 },
    );
  }

  // Persist: status → published, store tweet IDs
  const tweetIds = tweetResults.map(t => t.id);
  const firstTweetUrl = `https://x.com/i/web/status/${tweetIds[0]}`;

  const updatedSupplementary = {
    ...(supplementary ?? {}),
    published_tweet_ids: tweetIds,
    published_tweet_url: firstTweetUrl,
  };

  await supabase
    .from('social_content_pieces')
    .update({
      status: 'published',
      supplementary: updatedSupplementary,
      scheduled_at: new Date().toISOString(),
    })
    .eq('id', body.piece_id);

  return NextResponse.json({
    ok: true,
    tweet_count: tweetResults.length,
    tweet_ids: tweetIds,
    tweet_url: firstTweetUrl,
    had_image: !!mediaId,
  });
}
