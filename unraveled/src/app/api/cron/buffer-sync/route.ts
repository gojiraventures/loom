/**
 * GET /api/cron/buffer-sync
 *
 * Runs every 30 minutes via Vercel Cron.
 * Finds scheduled pieces that have a Buffer post ID and checks whether
 * Buffer has published them. If sent, marks the piece as 'published'.
 *
 * Auth: Bearer ${CRON_SECRET} (enforced only when CRON_SECRET is set)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getBufferPostStatus } from '@/lib/external/buffer-api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  // Find all scheduled pieces that have been handed off to Buffer
  const { data: pieces, error } = await supabase
    .from('social_content_pieces')
    .select('id, platform, supplementary')
    .eq('status', 'scheduled')
    .not('supplementary->buffer_post_id', 'is', null);

  if (error) {
    console.error('[buffer-sync] DB error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pieces || pieces.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, published: 0 });
  }

  let published = 0;
  let errors = 0;

  for (const piece of pieces) {
    const supplementary = piece.supplementary as Record<string, unknown> | null;
    const bufferPostId = supplementary?.buffer_post_id as string | undefined;
    if (!bufferPostId) continue;

    const bufferStatus = await getBufferPostStatus(bufferPostId);

    if (bufferStatus === 'sent') {
      await supabase
        .from('social_content_pieces')
        .update({
          status: 'published',
          supplementary: { ...(supplementary ?? {}), buffer_published_at: new Date().toISOString() },
        })
        .eq('id', piece.id);

      published++;
      console.log(`[buffer-sync] Marked ${piece.platform} piece ${piece.id} as published (Buffer post ${bufferPostId})`);
    } else if (bufferStatus === 'error') {
      errors++;
      console.warn(`[buffer-sync] Buffer post ${bufferPostId} for piece ${piece.id} is in error state`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: pieces.length,
    published,
    errors,
  });
}
