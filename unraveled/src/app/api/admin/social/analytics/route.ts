/**
 * GET /api/admin/social/analytics
 * Aggregated engagement analytics for the intelligence dashboard.
 *
 * Query params:
 *   topic?    — filter to one article
 *   platform? — filter to one platform
 *   days?     — lookback window (default 30)
 *
 * Returns:
 *   by_content_type  — avg engagement per content_type
 *   by_platform      — totals per platform
 *   top_pieces       — top 10 by engagement score
 *   trend            — daily engagement totals for chart
 *   recycler_candidates — pieces > 90 days old with high engagement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

function engagementScore(row: {
  likes: number;
  reposts: number;
  replies: number;
  impressions: number;
  clicks: number;
  bookmarks: number;
}): number {
  // Weighted engagement score: reposts > bookmarks > replies > clicks > likes
  return (
    row.reposts * 6 +
    row.bookmarks * 4 +
    row.replies * 3 +
    row.clicks * 2 +
    row.likes * 1
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic');
  const platform = searchParams.get('platform');
  const days = parseInt(searchParams.get('days') ?? '30', 10);

  const supabase = createServerSupabaseClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Fetch snapshots in window — use latest snapshot per post to avoid double-counting
  let snapshotQuery = supabase
    .from('social_engagement_snapshots')
    .select('*')
    .gte('snapshot_at', since)
    .order('snapshot_at', { ascending: false });

  if (topic) snapshotQuery = snapshotQuery.eq('topic', topic);
  if (platform) snapshotQuery = snapshotQuery.eq('platform', platform);

  const { data: snapshots, error } = await snapshotQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = snapshots ?? [];

  // Deduplicate: latest snapshot per published_post_id
  const latestByPost = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    if (!latestByPost.has(row.published_post_id)) {
      latestByPost.set(row.published_post_id, row);
    }
  }
  const deduplicated = Array.from(latestByPost.values());

  // ── By content type ──────────────────────────────────────────────────────────
  const byContentType: Record<string, {
    content_type: string;
    count: number;
    avg_score: number;
    total_impressions: number;
    total_likes: number;
    total_reposts: number;
  }> = {};

  for (const row of deduplicated) {
    const ct = row.content_type;
    if (!byContentType[ct]) {
      byContentType[ct] = { content_type: ct, count: 0, avg_score: 0, total_impressions: 0, total_likes: 0, total_reposts: 0 };
    }
    const score = engagementScore(row);
    const entry = byContentType[ct];
    entry.avg_score = (entry.avg_score * entry.count + score) / (entry.count + 1);
    entry.total_impressions += row.impressions;
    entry.total_likes += row.likes;
    entry.total_reposts += row.reposts;
    entry.count += 1;
  }

  const byContentTypeSorted = Object.values(byContentType)
    .sort((a, b) => b.avg_score - a.avg_score);

  // ── By platform ──────────────────────────────────────────────────────────────
  const byPlatform: Record<string, {
    platform: string;
    posts: number;
    total_impressions: number;
    total_likes: number;
    total_reposts: number;
    total_replies: number;
    avg_score: number;
  }> = {};

  for (const row of deduplicated) {
    const p = row.platform;
    if (!byPlatform[p]) {
      byPlatform[p] = { platform: p, posts: 0, total_impressions: 0, total_likes: 0, total_reposts: 0, total_replies: 0, avg_score: 0 };
    }
    const score = engagementScore(row);
    const entry = byPlatform[p];
    entry.avg_score = (entry.avg_score * entry.posts + score) / (entry.posts + 1);
    entry.total_impressions += row.impressions;
    entry.total_likes += row.likes;
    entry.total_reposts += row.reposts;
    entry.total_replies += row.replies;
    entry.posts += 1;
  }

  // ── Top pieces (join published_posts for context) ────────────────────────────
  const topPieces = [...deduplicated]
    .map(row => ({ ...row, score: engagementScore(row) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Daily trend ──────────────────────────────────────────────────────────────
  const dailyMap: Record<string, { date: string; likes: number; reposts: number; impressions: number; score: number }> = {};
  for (const row of rows) { // use ALL snapshots (not deduplicated) for trend
    const date = row.snapshot_at.slice(0, 10);
    if (!dailyMap[date]) {
      dailyMap[date] = { date, likes: 0, reposts: 0, impressions: 0, score: 0 };
    }
    dailyMap[date].likes += row.likes;
    dailyMap[date].reposts += row.reposts;
    dailyMap[date].impressions += row.impressions;
    dailyMap[date].score += engagementScore(row);
  }
  const trend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // ── Recycler candidates: published posts > 90 days with high engagement ──────
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldPosts } = await supabase
    .from('social_published_posts')
    .select('id, topic, platform, content_piece_id, published_at, metrics')
    .lt('published_at', ninetyDaysAgo)
    .not('metrics', 'eq', '{}');

  // Score old posts and pick top candidates
  const recyclerCandidates = (oldPosts ?? [])
    .map(post => {
      const m = (post.metrics ?? {}) as {
        likes?: number; reposts?: number; replies?: number;
        impressions?: number; clicks?: number; bookmarks?: number;
      };
      const score = engagementScore({
        likes: m.likes ?? 0,
        reposts: m.reposts ?? 0,
        replies: m.replies ?? 0,
        impressions: m.impressions ?? 0,
        clicks: m.clicks ?? 0,
        bookmarks: m.bookmarks ?? 0,
      });
      return { ...post, engagement_score: score };
    })
    .filter(p => p.engagement_score > 0)
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, 10);

  return NextResponse.json({
    window_days: days,
    total_posts_analyzed: deduplicated.length,
    by_content_type: byContentTypeSorted,
    by_platform: Object.values(byPlatform),
    top_pieces: topPieces,
    trend,
    recycler_candidates: recyclerCandidates,
  });
}
