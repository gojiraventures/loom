'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContentTypeRow {
  content_type: string;
  count: number;
  avg_score: number;
  total_impressions: number;
  total_likes: number;
  total_reposts: number;
}

interface PlatformRow {
  platform: string;
  posts: number;
  total_impressions: number;
  total_likes: number;
  total_reposts: number;
  total_replies: number;
  avg_score: number;
}

interface TopPiece {
  published_post_id: string;
  topic: string;
  platform: string;
  content_type: string;
  score: number;
  likes: number;
  reposts: number;
  replies: number;
  impressions: number;
  snapshot_at: string;
}

interface TrendPoint {
  date: string;
  likes: number;
  reposts: number;
  impressions: number;
  score: number;
}

interface RecyclerCandidate {
  id: string;
  topic: string;
  platform: string;
  content_piece_id: string;
  published_at: string;
  engagement_score: number;
  metrics: Record<string, number>;
}

interface AnalyticsData {
  window_days: number;
  total_posts_analyzed: number;
  by_content_type: ContentTypeRow[];
  by_platform: PlatformRow[];
  top_pieces: TopPiece[];
  trend: TrendPoint[];
  recycler_candidates: RecyclerCandidate[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  x: 'X / Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

const PLATFORM_COLORS: Record<string, string> = {
  x: 'text-sky-400',
  instagram: 'text-pink-400',
  facebook: 'text-blue-400',
  youtube: 'text-red-400',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  launch_thread: 'Launch Thread',
  standalone_surprise: 'Surprise Finding',
  tradition_voice: 'Tradition Voice',
  debate_post: 'Advocate vs Skeptic',
  open_question: 'Open Question',
  score_reveal: 'Score Reveal',
  primary_findings_carousel: 'Findings Carousel',
  tradition_voices_carousel: 'Voices Carousel',
  advocate_skeptic_carousel: 'Debate Carousel',
  quote_card: 'Quote Card',
  summary_post: 'Summary Post',
  discussion_prompt: 'Discussion Prompt',
  tradition_spotlight: 'Tradition Spotlight',
  link_share: 'Link Share',
};

const WINDOW_OPTIONS = [7, 14, 30, 90];

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ points, field }: { points: TrendPoint[]; field: 'score' | 'impressions' | 'reposts' }) {
  if (points.length < 2) return <span className="font-mono text-[9px] text-text-tertiary">—</span>;

  const values = points.map(p => p[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 80;
  const h = 24;
  const step = w / (values.length - 1);

  const pathD = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold/60" />
    </svg>
  );
}

// ── Stat Cell ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color = 'text-text-primary' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-right">
      <div className={`font-serif text-xl ${color}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border border-border bg-ground-light/20 p-12 text-center space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">No engagement data yet</p>
      <p className="text-sm text-text-secondary max-w-sm mx-auto">
        Once posts are published and n8n begins pushing metrics every 4 hours, analytics will appear here.
      </p>
      <div className="font-mono text-[9px] text-text-tertiary border border-border/50 inline-block px-3 py-2 mt-2">
        Endpoint: POST /api/admin/social/metrics
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function IntelligenceTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(30);
  const [recycling, setRecycling] = useState<Record<string, boolean>>({});
  const [recycledIds, setRecycledIds] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<'overview' | 'content_types' | 'top_posts' | 'recycler'>('overview');

  const load = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/social/analytics?days=${days}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(windowDays); }, [windowDays, load]);

  async function recycle(candidate: RecyclerCandidate) {
    setRecycling(prev => ({ ...prev, [candidate.id]: true }));
    try {
      const res = await fetch('/api/admin/social/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published_post_id: candidate.id }),
      });
      if (res.ok) {
        setRecycledIds(prev => new Set([...prev, candidate.id]));
      }
    } finally {
      setRecycling(prev => ({ ...prev, [candidate.id]: false }));
    }
  }

  const hasData = data && data.total_posts_analyzed > 0;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-lg text-text-primary">Intelligence Loop</h2>
          <p className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">Engagement analytics · content performance · recycler</p>
        </div>
        <div className="ml-auto flex gap-0 border border-border">
          {WINDOW_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setWindowDays(d)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${windowDays === d ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading analytics…</p>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Summary stats */}
          <div className="flex flex-wrap gap-4 border border-border bg-ground-light/20 px-4 py-3">
            <Stat label="Posts Analyzed" value={data.total_posts_analyzed} color="text-gold" />
            {data.by_platform.map(p => (
              <Stat
                key={p.platform}
                label={PLATFORM_LABELS[p.platform] ?? p.platform}
                value={p.posts}
                color={PLATFORM_COLORS[p.platform] ?? 'text-text-primary'}
              />
            ))}
            <Stat
              label="Total Impressions"
              value={data.by_platform.reduce((s, p) => s + p.total_impressions, 0)}
            />
            <Stat
              label="Total Reposts"
              value={data.by_platform.reduce((s, p) => s + p.total_reposts, 0)}
              color="text-emerald-400"
            />
            {data.recycler_candidates.length > 0 && (
              <Stat label="Recyclable" value={data.recycler_candidates.length} color="text-amber-400" />
            )}
          </div>

          {/* Section nav */}
          <div className="flex gap-0 border border-border w-fit">
            {(['overview', 'content_types', 'top_posts', 'recycler'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`font-mono text-[9px] uppercase tracking-widest px-4 py-2 transition-colors border-r border-border last:border-r-0 ${activeSection === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}
              >
                {s === 'content_types' ? 'Content Types' : s === 'top_posts' ? 'Top Posts' : s.charAt(0).toUpperCase() + s.slice(1)}
                {s === 'recycler' && data.recycler_candidates.length > 0 && (
                  <span className="ml-1 text-amber-400">({data.recycler_candidates.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Overview ── */}
          {activeSection === 'overview' && (
            <div className="space-y-4">
              {/* Platform breakdown */}
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">By Platform</p>
                <div className="space-y-2">
                  {data.by_platform.sort((a, b) => b.avg_score - a.avg_score).map(p => (
                    <div key={p.platform} className="border border-border bg-ground-light/10 px-4 py-3 grid grid-cols-[120px_1fr_auto] gap-4 items-center">
                      <span className={`font-mono text-[10px] uppercase tracking-widest ${PLATFORM_COLORS[p.platform] ?? 'text-text-primary'}`}>
                        {PLATFORM_LABELS[p.platform] ?? p.platform}
                      </span>
                      <div className="grid grid-cols-4 gap-4 text-right">
                        <div>
                          <div className="font-serif text-base text-text-primary">{p.total_impressions.toLocaleString()}</div>
                          <div className="font-mono text-[7px] text-text-tertiary uppercase">Impressions</div>
                        </div>
                        <div>
                          <div className="font-serif text-base text-text-primary">{p.total_likes.toLocaleString()}</div>
                          <div className="font-mono text-[7px] text-text-tertiary uppercase">Likes</div>
                        </div>
                        <div>
                          <div className="font-serif text-base text-emerald-400">{p.total_reposts.toLocaleString()}</div>
                          <div className="font-mono text-[7px] text-text-tertiary uppercase">Reposts</div>
                        </div>
                        <div>
                          <div className="font-serif text-base text-text-primary">{p.total_replies.toLocaleString()}</div>
                          <div className="font-mono text-[7px] text-text-tertiary uppercase">Replies</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-serif text-base text-gold">{Math.round(p.avg_score)}</div>
                        <div className="font-mono text-[7px] text-text-tertiary uppercase">Avg Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engagement trend */}
              {data.trend.length > 1 && (
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Engagement Trend ({windowDays}d)</p>
                  <div className="border border-border bg-ground-light/10 px-4 py-3">
                    <div className="flex items-end gap-1 h-16">
                      {data.trend.map((point, i) => {
                        const maxScore = Math.max(...data.trend.map(p => p.score), 1);
                        const height = Math.max(2, (point.score / maxScore) * 100);
                        return (
                          <div
                            key={i}
                            title={`${point.date}: score ${Math.round(point.score)}, ${point.impressions.toLocaleString()} impressions`}
                            className="flex-1 bg-gold/30 hover:bg-gold/60 transition-colors cursor-default"
                            style={{ height: `${height}%` }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[8px] text-text-tertiary">{data.trend[0]?.date}</span>
                      <span className="font-mono text-[8px] text-text-tertiary">{data.trend[data.trend.length - 1]?.date}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Content Types ── */}
          {activeSection === 'content_types' && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Performance by Content Type (sorted by avg engagement score)</p>
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_80px_100px_100px_80px] gap-3 px-4 py-2 font-mono text-[8px] uppercase tracking-widest text-text-tertiary border-b border-border">
                  <span>Type</span>
                  <span className="text-right">Posts</span>
                  <span className="text-right">Impressions</span>
                  <span className="text-right">Reposts</span>
                  <span className="text-right">Avg Score</span>
                </div>
                {data.by_content_type.map((row, i) => {
                  const maxScore = data.by_content_type[0]?.avg_score || 1;
                  const barWidth = (row.avg_score / maxScore) * 100;
                  return (
                    <div key={row.content_type} className={`relative grid grid-cols-[1fr_80px_100px_100px_80px] gap-3 px-4 py-2.5 border border-border ${i === 0 ? 'border-gold/20 bg-gold/3' : 'bg-ground-light/10'}`}>
                      <div
                        className="absolute inset-y-0 left-0 bg-gold/5"
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="relative font-mono text-[9px] text-text-secondary">
                        {CONTENT_TYPE_LABELS[row.content_type] ?? row.content_type}
                        {i === 0 && <span className="ml-2 text-gold text-[7px]">↑ best</span>}
                      </span>
                      <span className="relative text-right font-mono text-[9px] text-text-tertiary">{row.count}</span>
                      <span className="relative text-right font-mono text-[9px] text-text-tertiary">{row.total_impressions.toLocaleString()}</span>
                      <span className="relative text-right font-mono text-[9px] text-emerald-400">{row.total_reposts.toLocaleString()}</span>
                      <span className="relative text-right font-mono text-[9px] text-gold">{Math.round(row.avg_score)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Top Posts ── */}
          {activeSection === 'top_posts' && (
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Top 10 Performing Posts</p>
              <div className="space-y-1">
                {data.top_pieces.map((piece, i) => (
                  <div key={piece.published_post_id} className={`border border-border px-4 py-3 grid grid-cols-[24px_1fr_120px_80px_80px_80px_80px] gap-3 items-center ${i === 0 ? 'border-gold/30 bg-gold/3' : 'bg-ground-light/10'}`}>
                    <span className="font-serif text-sm text-text-tertiary">{i + 1}</span>
                    <div>
                      <p className="font-mono text-[9px] text-text-secondary truncate">{piece.topic}</p>
                      <p className="font-mono text-[8px] text-text-tertiary">{CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}</p>
                    </div>
                    <span className={`font-mono text-[9px] ${PLATFORM_COLORS[piece.platform] ?? 'text-text-tertiary'}`}>
                      {PLATFORM_LABELS[piece.platform] ?? piece.platform}
                    </span>
                    <span className="text-right font-mono text-[9px] text-text-tertiary">{piece.impressions.toLocaleString()}<br /><span className="text-[7px]">impr</span></span>
                    <span className="text-right font-mono text-[9px] text-text-tertiary">{piece.likes.toLocaleString()}<br /><span className="text-[7px]">likes</span></span>
                    <span className="text-right font-mono text-[9px] text-emerald-400">{piece.reposts.toLocaleString()}<br /><span className="text-[7px] text-text-tertiary">rp</span></span>
                    <span className="text-right font-serif text-base text-gold">{Math.round(piece.score)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recycler ── */}
          {activeSection === 'recycler' && (
            <div className="space-y-3">
              <div className="border border-amber-400/20 bg-amber-400/3 px-4 py-3">
                <p className="font-mono text-[9px] text-amber-400 uppercase tracking-widest mb-1">Archive Recycler</p>
                <p className="text-sm text-text-secondary">
                  High-performing posts older than 90 days. Re-queue as draft to refresh and reschedule.
                </p>
              </div>

              {data.recycler_candidates.length === 0 ? (
                <p className="text-sm text-text-tertiary">No recyclable content found. Posts need to be &gt;90 days old with engagement data.</p>
              ) : (
                <div className="space-y-2">
                  {data.recycler_candidates.map(c => {
                    const recycled = recycledIds.has(c.id);
                    const isRecycling = recycling[c.id];
                    const m = c.metrics as Record<string, number>;
                    return (
                      <div key={c.id} className={`border border-border px-4 py-3 flex items-center gap-4 ${recycled ? 'opacity-50' : 'bg-ground-light/10'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[9px] text-text-secondary truncate">{c.topic}</p>
                          <p className="font-mono text-[8px] text-text-tertiary">
                            {PLATFORM_LABELS[c.platform] ?? c.platform} · published {c.published_at.slice(0, 10)}
                          </p>
                        </div>
                        <div className="flex gap-4 shrink-0">
                          {m.impressions > 0 && (
                            <div className="text-right">
                              <div className="font-serif text-sm text-text-secondary">{m.impressions.toLocaleString()}</div>
                              <div className="font-mono text-[7px] text-text-tertiary uppercase">Impr</div>
                            </div>
                          )}
                          {m.reposts > 0 && (
                            <div className="text-right">
                              <div className="font-serif text-sm text-emerald-400">{m.reposts.toLocaleString()}</div>
                              <div className="font-mono text-[7px] text-text-tertiary uppercase">Rp</div>
                            </div>
                          )}
                          <div className="text-right">
                            <div className="font-serif text-sm text-gold">{Math.round(c.engagement_score)}</div>
                            <div className="font-mono text-[7px] text-text-tertiary uppercase">Score</div>
                          </div>
                        </div>
                        <button
                          onClick={() => recycle(c)}
                          disabled={isRecycling || recycled}
                          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {recycled ? '✓ Queued' : isRecycling ? 'Recycling…' : '↺ Re-queue'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
