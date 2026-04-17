/**
 * POST /api/admin/social/replies/respond
 * Body: { id: string; text: string }
 *
 * Posts a reply to the original tweet on X, then marks the queue item as posted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { postTweet } from '@/lib/external/x-api';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const body = await req.json() as { id?: string; text?: string };
  if (!body.id || !body.text) {
    return NextResponse.json({ error: 'id and text required' }, { status: 400 });
  }
  if (body.text.length > 280) {
    return NextResponse.json({ error: `Reply is ${body.text.length} chars — must be under 280` }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: item, error: fetchErr } = await supabase
    .from('social_reply_queue')
    .select('tweet_id, reply_status')
    .eq('id', body.id)
    .single();

  if (fetchErr || !item) return NextResponse.json({ error: 'Reply not found' }, { status: 404 });
  if (item.reply_status === 'posted') return NextResponse.json({ error: 'Already posted' }, { status: 409 });

  let result: { id: string; text: string };
  try {
    result = await postTweet(body.text, { replyToId: item.tweet_id });
  } catch (err) {
    return NextResponse.json({ error: `X post failed: ${String(err)}` }, { status: 502 });
  }

  await supabase
    .from('social_reply_queue')
    .update({
      reply_status: 'posted',
      posted_reply_id: result.id,
      posted_reply_text: body.text,
      posted_at: new Date().toISOString(),
    })
    .eq('id', body.id);

  return NextResponse.json({ ok: true, tweet_id: result.id });
}
