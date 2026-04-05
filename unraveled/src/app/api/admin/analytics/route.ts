import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const db = createServerSupabaseClient();

  const [
    { data: profiles },
    { data: recentProfiles },
    { data: ratings },
    { data: votes },
    { data: feedback },
    { data: dossiers },
    { data: backlog },
  ] = await Promise.all([
    // All profiles
    db.from('profiles').select('id, role, subscription_status, stripe_customer_id, created_at'),
    // Signups in last 30 days grouped by day
    db.from('profiles')
      .select('created_at, role')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true }),
    // Ratings with article_id
    db.from('article_ratings').select('article_id, rating, created_at'),
    // Votes
    db.from('topic_votes').select('backlog_id, created_at'),
    // Feedback submissions
    db.from('submissions')
      .select('article_id, category, created_at')
      .eq('submission_type', 'article_feedback'),
    // Published articles
    db.from('topic_dossiers')
      .select('slug, title, best_convergence_score, key_traditions, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false }),
    // Backlog vote counts
    db.from('research_backlog')
      .select('id, title, theme')
      .eq('status', 'pending'),
  ]);

  // ── User stats ──────────────────────────────────────────────────────────────
  const allProfiles = profiles ?? [];
  const totalUsers = allProfiles.length;
  const freeUsers = allProfiles.filter((p) => p.role === 'registered').length;
  const paidUsers = allProfiles.filter((p) => p.role === 'paid').length;
  const adminUsers = allProfiles.filter((p) => p.role === 'admin').length;

  // Paid breakdown by subscription_status
  const activeSubscribers = allProfiles.filter(
    (p) => p.role === 'paid' && p.subscription_status === 'active',
  ).length;
  const cancelledSubscribers = allProfiles.filter(
    (p) => p.subscription_status === 'cancelled',
  ).length;

  // Signups per day (last 30d)
  const signupsByDay: Record<string, number> = {};
  for (const p of recentProfiles ?? []) {
    const day = p.created_at.slice(0, 10);
    signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
  }

  // ── Article performance ─────────────────────────────────────────────────────
  const ratingsByArticle: Record<string, number[]> = {};
  for (const r of ratings ?? []) {
    if (!ratingsByArticle[r.article_id]) ratingsByArticle[r.article_id] = [];
    ratingsByArticle[r.article_id].push(r.rating);
  }

  const articleStats = (dossiers ?? []).map((d) => {
    const articleRatings = ratingsByArticle[d.slug ?? ''] ?? [];
    const avgRating = articleRatings.length
      ? Math.round((articleRatings.reduce((s, r) => s + r, 0) / articleRatings.length) * 10) / 10
      : null;
    return {
      slug: d.slug,
      title: d.title,
      score: d.best_convergence_score,
      traditions: (d.key_traditions ?? []).length,
      published_at: d.published_at,
      rating_count: articleRatings.length,
      avg_rating: avgRating,
    };
  });

  // Sort by rating_count desc for top articles
  const topRatedArticles = [...articleStats]
    .filter((a) => a.rating_count > 0)
    .sort((a, b) => b.rating_count - a.rating_count)
    .slice(0, 10);

  // ── Vote leaderboard ────────────────────────────────────────────────────────
  const votesByBacklog: Record<string, number> = {};
  for (const v of votes ?? []) {
    votesByBacklog[v.backlog_id] = (votesByBacklog[v.backlog_id] ?? 0) + 1;
  }

  const topVotedTopics = (backlog ?? [])
    .map((b) => ({ id: b.id, title: b.title, theme: b.theme, votes: votesByBacklog[b.id] ?? 0 }))
    .filter((b) => b.votes > 0)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10);

  // ── Tradition popularity (from all published articles) ──────────────────────
  const traditionCounts: Record<string, number> = {};
  for (const d of dossiers ?? []) {
    for (const t of d.key_traditions ?? []) {
      traditionCounts[t] = (traditionCounts[t] ?? 0) + 1;
    }
  }
  const topTraditions = Object.entries(traditionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));

  // ── Feedback by category ────────────────────────────────────────────────────
  const feedbackByCategory: Record<string, number> = {};
  for (const f of feedback ?? []) {
    const cat = f.category ?? 'uncategorized';
    feedbackByCategory[cat] = (feedbackByCategory[cat] ?? 0) + 1;
  }

  return NextResponse.json({
    users: {
      total: totalUsers,
      free: freeUsers,
      paid: paidUsers,
      admin: adminUsers,
      activeSubscribers,
      cancelledSubscribers,
      signupsByDay,
    },
    content: {
      published: (dossiers ?? []).length,
      totalRatings: (ratings ?? []).length,
      totalVotes: (votes ?? []).length,
      totalFeedback: (feedback ?? []).length,
      topRatedArticles,
      allArticles: articleStats,
    },
    research: {
      topVotedTopics,
      topTraditions,
    },
    engagement: {
      feedbackByCategory,
    },
  });
}
