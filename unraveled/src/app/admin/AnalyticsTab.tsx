'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  users: {
    total: number;
    free: number;
    paid: number;
    admin: number;
    activeSubscribers: number;
    cancelledSubscribers: number;
    signupsByDay: Record<string, number>;
  };
  content: {
    published: number;
    totalRatings: number;
    totalVotes: number;
    totalFeedback: number;
    topRatedArticles: ArticleStat[];
    allArticles: ArticleStat[];
  };
  research: {
    topVotedTopics: { id: string; title: string; theme: string | null; votes: number }[];
    topTraditions: { name: string; count: number }[];
  };
  engagement: {
    feedbackByCategory: Record<string, number>;
  };
}

interface ArticleStat {
  slug: string | null;
  title: string;
  score: number;
  traditions: number;
  published_at: string | null;
  rating_count: number;
  avg_rating: number | null;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-border bg-ground-light/20 px-5 py-4">
      <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
      {sub && <p className="font-mono text-[9px] text-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/40 last:border-b-0">
      <span className="text-xs text-text-secondary truncate flex-1 min-w-0">{label}</span>
      <div className="w-24 h-1 bg-border shrink-0">
        <div className="h-full bg-gold/60" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-text-tertiary w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

function SignupSparkline({ byDay }: { byDay: Record<string, number> }) {
  const entries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <p className="text-xs text-text-tertiary">No signups in last 30 days</p>;

  const max = Math.max(...entries.map(([, v]) => v), 1);
  const H = 40;

  return (
    <div className="flex items-end gap-px h-10">
      {entries.map(([day, count]) => (
        <div
          key={day}
          title={`${day}: ${count} signup${count !== 1 ? 's' : ''}`}
          className="flex-1 bg-gold/50 hover:bg-gold transition-colors cursor-default"
          style={{ height: `${Math.max(2, (count / max) * H)}px` }}
        />
      ))}
    </div>
  );
}

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d as AnalyticsData); setLoading(false); })
      .catch(() => { setError('Failed to load analytics'); setLoading(false); });
  }, []);

  if (loading) return <p className="font-mono text-[10px] text-text-tertiary">Loading analytics…</p>;
  if (error || !data) return <p className="font-mono text-[10px] text-red-400">{error || 'No data'}</p>;

  const { users, content, research, engagement } = data;
  const maxTradition = Math.max(...research.topTraditions.map((t) => t.count), 1);
  const maxVotes = Math.max(...research.topVotedTopics.map((t) => t.votes), 1);
  const maxFeedback = Math.max(...Object.values(engagement.feedbackByCategory), 1);

  return (
    <div className="space-y-10">

      {/* ── Users ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Total users" value={users.total} />
          <Stat label="Free accounts" value={users.free} />
          <Stat label="Paid members" value={users.paid} sub={`${users.activeSubscribers} active · ${users.cancelledSubscribers} cancelled`} />
          <Stat label="Conversion" value={users.total > 0 ? `${Math.round((users.paid / users.total) * 100)}%` : '—'} sub="free → paid" />
        </div>

        <div className="border border-border bg-ground-light/10 px-5 py-4">
          <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-3">
            Signups — last 30 days
          </p>
          <SignupSparkline byDay={users.signupsByDay} />
          <p className="font-mono text-[8px] text-text-tertiary mt-2">
            {Object.values(users.signupsByDay).reduce((s, n) => s + n, 0)} signups this period
          </p>
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Content</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Published articles" value={content.published} />
          <Stat label="Total ratings" value={content.totalRatings} />
          <Stat label="Topic votes" value={content.totalVotes} />
          <Stat label="Feedback items" value={content.totalFeedback} />
        </div>

        {/* All articles table */}
        <div className="border border-border">
          <div className="px-4 py-2 border-b border-border bg-ground-light/20 flex gap-3">
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary flex-1">Article</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary w-16 text-center">Score</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary w-16 text-center">Ratings</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary w-16 text-center">Avg ★</span>
          </div>
          <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
            {content.allArticles
              .sort((a, b) => b.rating_count - a.rating_count || b.score - a.score)
              .map((a) => (
                <div key={a.slug} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ground-light/10 transition-colors">
                  <a
                    href={`/topics/${a.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs text-text-secondary hover:text-gold truncate transition-colors"
                  >
                    {a.title}
                  </a>
                  <span className="font-mono text-[10px] text-text-tertiary w-16 text-center">{a.score}</span>
                  <span className="font-mono text-[10px] text-text-tertiary w-16 text-center">{a.rating_count}</span>
                  <span className={`font-mono text-[10px] w-16 text-center ${a.avg_rating ? 'text-gold' : 'text-text-tertiary'}`}>
                    {a.avg_rating ?? '—'}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* ── Research demand ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Research Demand</h2>
        <div className="grid sm:grid-cols-2 gap-6">

          <div className="border border-border px-5 py-4">
            <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-3">
              Top voted topics
            </p>
            {research.topVotedTopics.length === 0 ? (
              <p className="text-xs text-text-tertiary">No votes yet</p>
            ) : (
              <div>
                {research.topVotedTopics.map((t) => (
                  <MiniBar key={t.id} label={t.title} value={t.votes} max={maxVotes} />
                ))}
              </div>
            )}
          </div>

          <div className="border border-border px-5 py-4">
            <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-3">
              Most covered traditions
            </p>
            <div>
              {research.topTraditions.map((t) => (
                <MiniBar key={t.name} label={t.name} value={t.count} max={maxTradition} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Engagement ──────────────────────────────────────────────────── */}
      {Object.keys(engagement.feedbackByCategory).length > 0 && (
        <section>
          <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Feedback by Category</h2>
          <div className="border border-border px-5 py-4 max-w-sm">
            {Object.entries(engagement.feedbackByCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <MiniBar key={cat} label={cat} value={count} max={maxFeedback} />
              ))}
          </div>
        </section>
      )}

    </div>
  );
}
