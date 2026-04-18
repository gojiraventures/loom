/**
 * POST /api/admin/social/schedule/global
 *
 * Global cross-article scheduler. Takes ALL approved pieces across every
 * topic and distributes them into time slots using per-platform round-robin.
 *
 * Body: {
 *   start_date:    string   — YYYY-MM-DD, first posting day
 *   slots_per_day: number   — posts per platform per day (1–3, default 2)
 *   slot_hours_et: number[] — base ET hours for each slot (e.g. [9, 17])
 *   platforms?:    string[] — which platforms to schedule (default all)
 * }
 *
 * Algorithm (per platform):
 *   1. Load approved pieces for that platform, grouped by topic
 *   2. Sort each topic's pieces by day_offset then type priority then sort_order
 *   3. Round-robin across topics — no two consecutive slots from the same topic
 *   4. Assign scheduled_at: start_date + floor(slotIndex / slotsPerDay) days
 *      at (slot_hours_et[slot % slotsPerDay] + platformHourOffset) ET
 *
 * Platform hour offsets keep posts from different platforms from colliding:
 *   X: +0h, Instagram: +1h, Facebook: +2h
 *
 * DELETE /api/admin/social/schedule/global
 * Clears all scheduled_at timestamps on approved/scheduled pieces.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { bufferAvailable, postViaBuffer, type BufferPlatform } from '@/lib/external/buffer-api';

// Only Instagram and Facebook go through Buffer — X posts use the direct X API / cron
const BUFFER_PLATFORMS = new Set(['instagram', 'facebook']);

export const maxDuration = 300;

// ET = UTC-5 (fixed offset; callers can add 1h in EDT season)
const ET_OFFSET_HOURS = 5;

// Per-platform hour offset so posts on the same day don't collide
const PLATFORM_HOUR_OFFSET: Record<string, number> = {
  x:         0,
  instagram: 1,
  facebook:  2,
};

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

// Content type priority — threads first within a topic
const TYPE_PRIORITY: Record<string, number> = {
  launch_thread:       0,
  score_reveal:        1,
  standalone_surprise: 2,
  tradition_voice:     3,
  debate_post:         4,
  open_question:       5,
};

type Piece = {
  id: string;
  topic: string;
  platform: string;
  content_type: string;
  text_content: string | null;
  supplementary: Record<string, unknown> | null;
  day_offset: number;
  sort_order: number;
};

/**
 * Round-robin interleave a set of pieces grouped by topic.
 * No two consecutive slots come from the same topic.
 */
function roundRobin(pieces: Piece[]): Piece[] {
  const byTopic = new Map<string, Piece[]>();
  for (const p of pieces) {
    if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
    byTopic.get(p.topic)!.push(p);
  }

  // Sort each topic's pieces in narrative order
  for (const group of byTopic.values()) {
    group.sort((a, b) => {
      if (a.day_offset !== b.day_offset) return a.day_offset - b.day_offset;
      const pa = TYPE_PRIORITY[a.content_type] ?? 9;
      const pb = TYPE_PRIORITY[b.content_type] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.sort_order - b.sort_order;
    });
  }

  const topics = Array.from(byTopic.keys());
  const cursors: Record<string, number> = {};
  for (const t of topics) cursors[t] = 0;

  const ordered: Piece[] = [];
  let lastTopic = '';
  let safety = 0;
  const maxIter = pieces.length * topics.length * 2;

  while (ordered.length < pieces.length && safety < maxIter) {
    safety++;
    const available = topics.filter(t => cursors[t] < byTopic.get(t)!.length);
    if (available.length === 0) break;
    const candidates = available.length > 1 ? available.filter(t => t !== lastTopic) : available;
    const topic = candidates[0];
    const piece = byTopic.get(topic)![cursors[topic]];
    ordered.push(piece);
    cursors[topic]++;
    lastTopic = topic;
  }

  return ordered;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    start_date?: string;
    slots_per_day?: number;
    slot_hours_et?: number[];
    platforms?: string[];
  };

  if (!body.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
    return NextResponse.json({ error: 'start_date required (YYYY-MM-DD)' }, { status: 400 });
  }

  const activePlatforms = body.platforms?.length ? body.platforms : ['x', 'instagram', 'facebook'];
  const slotsPerDay = Math.min(Math.max(body.slots_per_day ?? 2, 1), 3);
  const baseSlotHours = body.slot_hours_et ?? (
    slotsPerDay === 1 ? [9] :
    slotsPerDay === 2 ? [9, 17] :
                       [9, 13, 18]
  );

  const supabase = createServerSupabaseClient();

  // Clear existing schedule for selected platforms
  await supabase
    .from('social_content_pieces')
    .update({ scheduled_at: null, status: 'approved' })
    .in('platform', activePlatforms)
    .eq('status', 'scheduled');

  // Load all approved pieces for selected platforms
  const { data: allPieces, error } = await supabase
    .from('social_content_pieces')
    .select('id, topic, platform, content_type, text_content, supplementary, day_offset, sort_order')
    .in('platform', activePlatforms)
    .eq('status', 'approved');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!allPieces || allPieces.length === 0) {
    return NextResponse.json({ error: 'No approved pieces found across any topic' }, { status: 404 });
  }

  // Run per-platform independent round-robins and assign timestamps
  const updates: (Piece & { scheduled_at: string })[] = [];

  for (const platform of activePlatforms) {
    const platformPieces = (allPieces as Piece[]).filter(p => p.platform === platform);
    if (platformPieces.length === 0) continue;

    const hourOffset = PLATFORM_HOUR_OFFSET[platform] ?? 0;
    const ordered = roundRobin(platformPieces);

    ordered.forEach((piece, i) => {
      const dayIndex  = Math.floor(i / slotsPerDay);
      const slotIndex = i % slotsPerDay;
      const date      = addDays(body.start_date!, dayIndex);
      const hourEt    = (baseSlotHours[slotIndex] ?? baseSlotHours[baseSlotHours.length - 1]) + hourOffset;
      updates.push({ ...piece, scheduled_at: toUtcIso(date, hourEt) });
    });
  }

  // Pre-fetch all dossier slugs in one query to avoid N+1
  const topicList = [...new Set(updates.map(u => u.topic))];
  const { data: dossiers } = await supabase
    .from('topic_dossiers')
    .select('topic, slug')
    .in('topic', topicList);
  const slugMap: Record<string, string> = {};
  for (const d of dossiers ?? []) {
    slugMap[d.topic] = d.slug ?? d.topic.toLowerCase().replace(/\s+/g, '-');
  }

  // Persist new schedule — sequential to respect Buffer rate limits
  let totalScheduled = 0;
  let failed = 0;
  const pieceResults: { id: string; platform: string; buffer?: string; bufferError?: string; dbError?: string }[] = [];

  for (const { id, scheduled_at, platform, text_content, supplementary, topic } of updates) {
    const useBuffer = BUFFER_PLATFORMS.has(platform);
    const result: { id: string; platform: string; buffer?: string; bufferError?: string; dbError?: string } = { id, platform };

    let bufferPostId: string | undefined;

    if (useBuffer) {
      if (!bufferAvailable(platform as BufferPlatform)) {
        result.bufferError = `bufferAvailable=false (token or channel ID missing for ${platform})`;
      } else {
        try {
          const { data: variants } = await supabase
            .from('social_design_variants')
            .select('image_url')
            .eq('content_piece_id', id)
            .eq('selected', true)
            .limit(1);
          const imageUrl: string | undefined = variants?.[0]?.image_url ?? undefined;

          const sup = supplementary as { posts?: string[]; caption?: string } | null;
          let text = sup?.caption ?? sup?.posts?.[0] ?? text_content ?? '';
          const slug = slugMap[topic] ?? topic.toLowerCase().replace(/\s+/g, '-');
          const articleUrl = `https://www.unraveledtruth.com/topics/${slug}`;
          if (!text.includes('unraveledtruth.com')) {
            text = `${text}\n\n${articleUrl}`;
          }

          bufferPostId = await postViaBuffer(platform as BufferPlatform, text, imageUrl, scheduled_at);
          result.buffer = bufferPostId;
          console.log(`[global-schedule] Queued ${platform} piece ${id} in Buffer → ${bufferPostId}`);
        } catch (err) {
          result.bufferError = String(err);
          console.error(`[global-schedule] Buffer queue failed for ${id}:`, err);
        } finally {
          // Always delay between Buffer calls — rate limit applies to failures too
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    const { error: updateErr } = await supabase
      .from('social_content_pieces')
      .update({
        scheduled_at,
        status: 'scheduled',
        ...(bufferPostId ? { supplementary: { ...(supplementary ?? {}), buffer_post_id: bufferPostId } } : {}),
      })
      .eq('id', id);

    if (updateErr) { failed++; result.dbError = updateErr.message; } else { totalScheduled++; }
    pieceResults.push(result);
  }

  // Build calendar preview grouped by date
  const calendar: Record<string, { topic: string; platform: string; id: string; time_et: string }[]> = {};
  for (const u of updates) {
    const date = u.scheduled_at.slice(0, 10);
    if (!calendar[date]) calendar[date] = [];
    calendar[date].push({
      topic: u.topic,
      platform: u.platform,
      id: u.id,
      time_et: new Date(u.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }),
    });
  }

  const uniqueTopics = new Set(updates.map(u => u.topic)).size;
  const bufferErrors = pieceResults.filter(r => r.bufferError);

  // Per-platform summary
  const byPlatform: Record<string, number> = {};
  for (const u of updates) byPlatform[u.platform] = (byPlatform[u.platform] ?? 0) + 1;

  return NextResponse.json({
    ok: true,
    total_scheduled: totalScheduled,
    failed,
    topics: uniqueTopics,
    by_platform: byPlatform,
    days_needed: Math.ceil(Math.max(...activePlatforms.map(p => (allPieces as Piece[]).filter(x => x.platform === p).length)) / slotsPerDay),
    calendar,
    buffer_queued: pieceResults.filter(r => r.buffer).length,
    buffer_errors: bufferErrors.length > 0 ? bufferErrors : undefined,
  });
}

export async function DELETE(_req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('social_content_pieces')
    .update({ scheduled_at: null, status: 'approved' })
    .eq('status', 'scheduled');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
