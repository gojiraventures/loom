/**
 * POST /api/admin/social/schedule/global
 *
 * Global cross-article scheduler. Takes ALL approved X pieces across every
 * topic and distributes them into time slots, interleaving articles so
 * consecutive posts are never from the same topic.
 *
 * Body: {
 *   start_date:    string   — YYYY-MM-DD, first posting day
 *   slots_per_day: number   — how many posts per day (1–3, default 2)
 *   slot_hours_et: number[] — ET hours for each slot (e.g. [9, 17])
 * }
 *
 * Algorithm:
 *   1. Load all approved, non-published X pieces, grouped by topic
 *   2. Sort each topic's pieces by day_offset then sort_order (preserves
 *      the intended narrative sequence within a topic)
 *   3. Round-robin across topics to fill each slot — no two consecutive
 *      slots are from the same topic
 *   4. Assign scheduled_at: start_date + floor(slotIndex / slotsPerDay) days
 *      at slot_hours_et[slotIndex % slotsPerDay]
 *
 * DELETE /api/admin/social/schedule/global
 * Clears all scheduled_at timestamps on approved pieces across all topics.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 30;

// ET = UTC-5 (we use fixed offset; callers can add 1h in EDT season)
const ET_OFFSET_HOURS = 5;

function toUtcIso(dateStr: string, hourEt: number): string {
  const utcHour = hourEt + ET_OFFSET_HOURS;
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCHours(utcHour, 0, 0, 0);
  return date.toISOString();
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Content type priority — ensures threads go before standalone posts within a topic
const TYPE_PRIORITY: Record<string, number> = {
  launch_thread:       0,
  score_reveal:        1,
  standalone_surprise: 2,
  tradition_voice:     3,
  debate_post:         4,
  open_question:       5,
};

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    start_date?: string;
    slots_per_day?: number;
    slot_hours_et?: number[];
  };

  if (!body.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
    return NextResponse.json({ error: 'start_date required (YYYY-MM-DD)' }, { status: 400 });
  }

  const slotsPerDay = Math.min(Math.max(body.slots_per_day ?? 2, 1), 3);
  const slotHours = body.slot_hours_et ?? (
    slotsPerDay === 1 ? [9] :
    slotsPerDay === 2 ? [9, 17] :
                       [9, 13, 18]
  );

  const supabase = createServerSupabaseClient();

  // Load all approved X pieces that aren't published
  const { data: pieces, error } = await supabase
    .from('social_content_pieces')
    .select('id, topic, content_type, day_offset, sort_order')
    .eq('platform', 'x')
    .eq('status', 'approved')
    .neq('status', 'published');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pieces || pieces.length === 0) {
    return NextResponse.json({ error: 'No approved X pieces found across any topic' }, { status: 404 });
  }

  // Group by topic, sort each group by narrative sequence
  const byTopic = new Map<string, typeof pieces>();
  for (const p of pieces) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(p);
  }
  for (const [, group] of byTopic) {
    group.sort((a, b) => {
      const pa = TYPE_PRIORITY[a.content_type] ?? 9;
      const pb = TYPE_PRIORITY[b.content_type] ?? 9;
      if (a.day_offset !== b.day_offset) return a.day_offset - b.day_offset;
      if (pa !== pb) return pa - pb;
      return a.sort_order - b.sort_order;
    });
  }

  // Round-robin interleave across topics
  const topics = Array.from(byTopic.keys());
  const cursors: Record<string, number> = {};
  for (const t of topics) cursors[t] = 0;

  const ordered: { id: string; topic: string }[] = [];
  let lastTopic = '';
  let safety = 0;

  while (ordered.length < pieces.length && safety < pieces.length * topics.length * 2) {
    safety++;
    // Pick next topic that still has pieces, preferring not to repeat last topic
    const available = topics.filter(t => cursors[t] < byTopic.get(t)!.length);
    if (available.length === 0) break;

    // Prefer a different topic than last; fall back if only one topic left
    const candidates = available.length > 1 ? available.filter(t => t !== lastTopic) : available;
    const topic = candidates[0];

    const piece = byTopic.get(topic)![cursors[topic]];
    ordered.push({ id: piece.id, topic });
    cursors[topic]++;
    lastTopic = topic;
  }

  // Assign scheduled_at to each slot
  const updates: { id: string; scheduled_at: string; topic: string; slot: number }[] = [];
  ordered.forEach((item, i) => {
    const dayIndex = Math.floor(i / slotsPerDay);
    const slotIndex = i % slotsPerDay;
    const date = addDays(body.start_date!, dayIndex);
    const hourEt = slotHours[slotIndex] ?? slotHours[slotHours.length - 1];
    updates.push({ id: item.id, scheduled_at: toUtcIso(date, hourEt), topic: item.topic, slot: i });
  });

  // Clear existing scheduled_at for all affected pieces first
  await supabase
    .from('social_content_pieces')
    .update({ scheduled_at: null })
    .eq('platform', 'x')
    .eq('status', 'approved')
    .not('scheduled_at', 'is', null);

  // Persist new schedule
  const results = await Promise.allSettled(
    updates.map(({ id, scheduled_at }) =>
      supabase.from('social_content_pieces').update({ scheduled_at }).eq('id', id)
    )
  );
  const failed = results.filter(r => r.status === 'rejected').length;

  // Build calendar preview grouped by date
  const calendar: Record<string, { topic: string; id: string; time_et: string }[]> = {};
  for (const u of updates) {
    const date = u.scheduled_at.slice(0, 10);
    if (!calendar[date]) calendar[date] = [];
    calendar[date].push({
      topic: u.topic,
      id: u.id,
      time_et: new Date(u.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
    });
  }

  return NextResponse.json({
    ok: true,
    total_scheduled: updates.length - failed,
    failed,
    topics: topics.length,
    days_needed: Math.ceil(updates.length / slotsPerDay),
    calendar,
  });
}

export async function DELETE(_req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('social_content_pieces')
    .update({ scheduled_at: null })
    .eq('status', 'approved')
    .not('scheduled_at', 'is', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
