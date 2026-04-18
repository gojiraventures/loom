/**
 * POST /api/admin/social/schedule
 * Body: { topic: string; start_date: string; hour_et: number }
 *
 * Computes optimal scheduled_at timestamps for all approved pieces of a topic
 * and persists them. The cron at /api/cron/social-post picks them up.
 *
 * Scheduling logic:
 *   - day_offset 0..6 → start_date + N days
 *   - Posting hour is in US Eastern time (ET)
 *   - Multiple pieces on the same day are spaced 90 min apart starting at hour_et
 *   - Thread posts (launch_thread) always go first on their day
 *   - Only approved pieces are scheduled; draft/rejected/published are skipped
 *
 * Returns the list of scheduled pieces with their computed times.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 30;

// Optimal posting hours by platform (ET, 24h) if caller doesn't specify
const PLATFORM_DEFAULT_HOUR_ET: Record<string, number> = {
  x:         9,   // 9am ET
  instagram: 11,  // 11am ET
  facebook:  13,  // 1pm ET
};

// Sort priority within a day — ensures thread goes first
const CONTENT_TYPE_PRIORITY: Record<string, number> = {
  launch_thread:              0,
  score_reveal:               1,
  standalone_surprise:        2,
  tradition_voice:            3,
  debate_post:                4,
  open_question:              5,
  primary_findings_carousel:  6,
  tradition_voices_carousel:  7,
  advocate_skeptic_carousel:  8,
  quote_card:                 9,
  summary_post:               10,
  discussion_prompt:          11,
  tradition_spotlight:        12,
  link_share:                 13,
};

/**
 * Convert a date string (YYYY-MM-DD) + hour (ET) to a UTC ISO timestamp.
 * Accounts for ET = UTC-5 (EST) or UTC-4 (EDT). We use a fixed offset of -5
 * (conservative) so posts go out on time even in EDT. For precision, callers
 * can adjust hour_et by 1 in summer.
 */
function toUtcIso(dateStr: string, hourEt: number, minuteOffset = 0): string {
  // ET is UTC-5 in EST, UTC-4 in EDT. Use -5 as the safe default.
  const etOffsetHours = 5;
  const utcHour = hourEt + etOffsetHours;
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCHours(utcHour, minuteOffset, 0, 0);
  return date.toISOString();
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { topic?: string; start_date?: string; hour_et?: number };

  if (!body.topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });
  if (!body.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
    return NextResponse.json({ error: 'start_date required (YYYY-MM-DD)' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Load all approved pieces for this topic (not already published)
  const { data: pieces, error } = await supabase
    .from('social_content_pieces')
    .select('id, platform, content_type, day_offset, sort_order, status')
    .eq('topic', body.topic)
    .eq('status', 'approved')
    .order('day_offset')
    .order('sort_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pieces || pieces.length === 0) {
    return NextResponse.json({ error: 'No approved pieces found for this topic' }, { status: 404 });
  }

  // Group by (platform, day_offset) to space out multiple posts per day
  const groups: Map<string, typeof pieces> = new Map();
  for (const p of pieces) {
    const key = `${p.platform}:${p.day_offset}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Assign scheduled_at for each piece
  const updates: { id: string; scheduled_at: string }[] = [];

  for (const [key, group] of groups) {
    const [platform, dayOffsetStr] = key.split(':');
    const dayOffset = parseInt(dayOffsetStr, 10);

    // Compute the base date: start_date + dayOffset days
    const baseDate = new Date(`${body.start_date}T00:00:00Z`);
    baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);
    const dateStr = baseDate.toISOString().slice(0, 10);

    const baseHour = body.hour_et ?? PLATFORM_DEFAULT_HOUR_ET[platform] ?? 9;

    // Sort by content type priority then sort_order
    const sorted = [...group].sort((a, b) => {
      const pa = CONTENT_TYPE_PRIORITY[a.content_type] ?? 99;
      const pb = CONTENT_TYPE_PRIORITY[b.content_type] ?? 99;
      return pa !== pb ? pa - pb : a.sort_order - b.sort_order;
    });

    // Space pieces 90 min apart within the day
    sorted.forEach((piece, i) => {
      const totalMinutes = i * 90;
      const hour = baseHour + Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      updates.push({ id: piece.id, scheduled_at: toUtcIso(dateStr, hour, minute) });
    });
  }

  // Persist scheduled_at for all pieces
  const results = await Promise.allSettled(
    updates.map(({ id, scheduled_at }) =>
      supabase
        .from('social_content_pieces')
        .update({ scheduled_at, status: 'scheduled' })
        .eq('id', id)
    )
  );

  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({
    ok: true,
    topic: body.topic,
    scheduled: updates.length,
    failed,
    schedule: updates.map(u => ({
      ...u,
      scheduled_et: new Date(u.scheduled_at).toLocaleString('en-US', { timeZone: 'America/New_York' }),
    })),
  });
}

/**
 * DELETE /api/admin/social/schedule
 * Body: { topic: string }
 * Clears all scheduled_at timestamps for approved pieces of a topic.
 */
export async function DELETE(req: NextRequest) {
  const body = await req.json() as { topic?: string };
  if (!body.topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('social_content_pieces')
    .update({ scheduled_at: null, status: 'approved' })
    .eq('topic', body.topic)
    .eq('status', 'scheduled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
