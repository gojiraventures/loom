'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  topic: string;
  title: string;
  status: string;
  pipeline_locked: boolean;
  completed_at: string | null;
  synthesized_output: Record<string, unknown> | null;
  error_log: string[];
  created_at: string;
}

interface HealthData {
  people: {
    total: number;
    published: number;
    needs_review: number;
    draft: number;
    missing_born: number;
    missing_photo: number;
    orphaned: number;
    missing_grokipedia: number;
  };
  institutions: {
    total: number;
    published: number;
    needs_review: number;
    orphaned: number;
    missing_grokipedia: number;
  };
  dossiers: {
    total_published: number;
    with_people: number;
    not_entity_scanned: number;
  };
}

interface EditorialFlag {
  severity: 'high' | 'medium' | 'low';
  type: string;
  section?: string;
  issue: string;
  status?: string;
}

interface EditorialReview {
  quality_level?: string;
  reviewed_at?: string;
  flags?: EditorialFlag[];
}

interface EditorialItem {
  id: string;
  title: string;
  slug: string | null;
  editorial_review: EditorialReview | null;
}

interface SocialPiece {
  id: string;
  topic: string;
  platform: string;
  content_type: string;
  status: string;
  text_content: string | null;
  scheduled_at: string | null;
}

interface QueueItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface CCData {
  sessions: Session[];
  health: HealthData | null;
  editorial: EditorialItem[];
  citationCount: number;
  replyCount: number;
  approvedPieces: SocialPiece[];
  queueItems: QueueItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function sessionStatusColor(s: string): string {
  if (s === 'running') return 'text-sky-600';
  if (s === 'awaiting_approval') return 'text-amber-600';
  if (s === 'failed') return 'text-red-600';
  if (s === 'complete') return 'text-emerald-600';
  return 'text-text-tertiary';
}

function sessionStatusLabel(s: string): string {
  if (s === 'awaiting_approval') return 'Needs Approval';
  if (s === 'complete') return 'Complete';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function platformLabel(p: string): string {
  if (p === 'x') return 'X';
  if (p === 'instagram') return 'IG';
  if (p === 'facebook') return 'FB';
  return p.toUpperCase();
}

function platformColor(p: string): string {
  if (p === 'x') return 'text-text-primary border-border';
  if (p === 'instagram') return 'text-pink-600 border-pink-200';
  if (p === 'facebook') return 'text-blue-600 border-blue-200';
  return 'text-text-tertiary border-border';
}

// ── KPI Tile ───────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  href,
  warn,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href: string;
  warn?: boolean;
}) {
  return (
    <a
      href={href}
      className="flex-1 min-w-[140px] border border-border bg-ground-light/20 px-5 py-4 hover:border-gold/30 hover:bg-gold/3 transition-colors group"
    >
      <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-2">{label}</p>
      <p
        className={`font-serif text-3xl leading-none ${
          warn && +value > 0 ? 'text-amber-700' : 'text-text-primary'
        } group-hover:text-gold transition-colors`}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary mt-1.5">{sub}</p>
      )}
    </a>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHead({
  title,
  href,
  linkLabel = '→ View all',
}: {
  title: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
      <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary">{title}</p>
      <a
        href={href}
        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
      >
        {linkLabel}
      </a>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────────────

export function CommandCenterView() {
  const [data, setData] = useState<CCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      fetch('/api/admin/sessions').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/health/stats').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/editorial/list').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/health/citations').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/social/replies?status=pending&priority=respond').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/social/pieces?status=approved').then(r => (r.ok ? r.json() : null)),
      fetch('/api/admin/research-queue').then(r => (r.ok ? r.json() : null)),
    ]);

    function val<T>(r: PromiseSettledResult<T | null>): T | null {
      return r.status === 'fulfilled' ? r.value : null;
    }

    const sessionsJson = val(results[0]);
    const healthJson = val(results[1]);
    const editorialJson = val(results[2]);
    const citationsJson = val(results[3]);
    const repliesJson = val(results[4]);
    const piecesJson = val(results[5]);
    const queueJson = val(results[6]);

    setData({
      sessions: (sessionsJson as { sessions?: Session[] })?.sessions ?? [],
      health: healthJson as HealthData | null,
      editorial: Array.isArray(editorialJson) ? (editorialJson as EditorialItem[]) : [],
      citationCount: (citationsJson as { total?: number })?.total ?? 0,
      replyCount: (repliesJson as { replies?: unknown[] })?.replies?.length ?? 0,
      approvedPieces: (piecesJson as { pieces?: SocialPiece[] })?.pieces ?? [],
      queueItems: (queueJson as { items?: QueueItem[] })?.items ?? [],
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const sessions = data?.sessions ?? [];
  const activeSessions = sessions.filter(s => !['complete', 'failed'].includes(s.status));
  const runningCount = sessions.filter(s => s.status === 'running').length;
  const awaitingCount = sessions.filter(s => s.status === 'awaiting_approval').length;
  const failedCount = sessions.filter(s => s.status === 'failed').length;
  const completeCount = sessions.filter(s => s.status === 'complete').length;

  const queueItems = data?.queueItems ?? [];
  const queuePending = queueItems.filter(q => q.status === 'pending').length;
  const queueRunning = queueItems.filter(q => q.status === 'running').length;

  const approvedPieces = data?.approvedPieces ?? [];

  // Editorial: parse flags, filter to dossiers with active (non-resolved) flags
  const flaggedDossiers = (data?.editorial ?? [])
    .map(d => {
      const review = d.editorial_review;
      if (!review) return null;
      const allFlags = review.flags ?? [];
      const activeFlags = allFlags.filter(f => f.status !== 'resolved');
      if (activeFlags.length === 0) return null;
      const highCount = activeFlags.filter(f => f.severity === 'high').length;
      const mediumCount = activeFlags.filter(f => f.severity === 'medium').length;
      return { ...d, activeFlags, flagCount: activeFlags.length, highCount, mediumCount };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .sort((a, b) => b.highCount - a.highCount || b.flagCount - a.flagCount)
    .slice(0, 6);

  const health = data?.health ?? null;
  const dossiersPublished = health?.dossiers.total_published ?? 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-1">
            Command Center
          </p>
          <h1 className="font-serif text-3xl text-text-primary leading-none">Archive Room</h1>
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mt-2">
            Overview of research, editorial, and distribution operations.
          </p>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{dateStr}</p>
          <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">
            Last updated{' '}
            {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
          <button
            onClick={() => load()}
            disabled={loading}
            className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-40"
          >
            {loading ? '⟳ Loading…' : '↺ Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Tiles ── */}
      <div className="flex flex-wrap gap-3">
        <KpiTile
          label="Research Active"
          value={activeSessions.length}
          sub={runningCount > 0 ? `${runningCount} running` : 'none running'}
          href="/admin/studio"
        />
        <KpiTile
          label="Dossiers Published"
          value={dossiersPublished}
          sub={`${health?.dossiers.not_entity_scanned ?? '—'} not entity-scanned`}
          href="/admin/dossiers"
          warn={false}
        />
        <KpiTile
          label="Citations Pending"
          value={data?.citationCount ?? '—'}
          sub="in review queue"
          href="/admin/health"
          warn={(data?.citationCount ?? 0) > 0}
        />
        <KpiTile
          label="Replies Pending"
          value={data?.replyCount ?? '—'}
          sub="priority: respond"
          href="/admin/distribution"
          warn={(data?.replyCount ?? 0) > 0}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-ground-light/20 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left column (3/5) ── */}
          <div className="lg:col-span-3 space-y-8">

            {/* Research Pipeline */}
            <section>
              <SectionHead title="Research Pipeline" href="/admin/studio" linkLabel="→ Open Studio" />
              <div className="space-y-3">
                {/* Session status summary */}
                <div className="border border-border bg-ground-light/10 px-4 py-3">
                  <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-3">
                    Sessions (last 50)
                  </p>
                  <div className="flex flex-wrap gap-6">
                    {[
                      { label: 'Running',      value: runningCount,  color: 'text-sky-600' },
                      { label: 'Needs Approval', value: awaitingCount, color: 'text-amber-600' },
                      { label: 'Failed',        value: failedCount,   color: 'text-red-600' },
                      { label: 'Complete',      value: completeCount, color: 'text-emerald-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className={`font-serif text-2xl ${value > 0 ? color : 'text-text-tertiary'}`}>
                          {value}
                        </div>
                        <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto Queue status */}
                <div className="border border-border bg-ground-light/10 px-4 py-3">
                  <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-3">
                    Auto Queue
                  </p>
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <div className={`font-serif text-2xl ${queueRunning > 0 ? 'text-sky-600' : 'text-text-tertiary'}`}>
                        {queueRunning}
                      </div>
                      <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Running</div>
                    </div>
                    <div>
                      <div className={`font-serif text-2xl ${queuePending > 0 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                        {queuePending}
                      </div>
                      <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Queued</div>
                    </div>
                  </div>
                </div>

                {/* Active sessions list */}
                {activeSessions.length > 0 && (
                  <div className="space-y-1">
                    {activeSessions.slice(0, 5).map(s => (
                      <a
                        key={s.id}
                        href="/admin/studio"
                        className="flex items-center justify-between gap-3 border border-border bg-ground-light/5 px-3 py-2 hover:border-gold/30 hover:bg-gold/3 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-[var(--admin-label-sm)] text-text-primary truncate group-hover:text-gold transition-colors">
                            {s.title || s.topic}
                          </p>
                          {s.error_log?.length > 0 && (
                            <p className="font-mono text-[var(--admin-label-xs)] text-red-600 truncate">
                              {s.error_log[s.error_log.length - 1]}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest ${sessionStatusColor(s.status)}`}>
                            {sessionStatusLabel(s.status)}
                          </span>
                          <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">
                            {timeAgo(s.created_at)}
                          </span>
                        </div>
                      </a>
                    ))}
                    {activeSessions.length > 5 && (
                      <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary px-1">
                        +{activeSessions.length - 5} more active
                      </p>
                    )}
                  </div>
                )}

                {activeSessions.length === 0 && (
                  <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary px-1">No active sessions.</p>
                )}
              </div>
            </section>

            {/* Social Snapshot */}
            <section>
              <SectionHead
                title="Social Queue"
                href="/admin/distribution"
                linkLabel="→ Distribution Desk"
              />
              {approvedPieces.length === 0 ? (
                <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">No approved pieces awaiting scheduling.</p>
              ) : (
                <div className="space-y-1">
                  <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary mb-2">
                    {approvedPieces.length} piece{approvedPieces.length !== 1 ? 's' : ''} approved — ready to schedule
                  </p>
                  {approvedPieces.slice(0, 5).map(p => (
                    <a
                      key={p.id}
                      href="/admin/distribution"
                      className="flex items-center gap-3 border border-border bg-ground-light/5 px-3 py-2 hover:border-gold/30 hover:bg-gold/3 transition-colors group"
                    >
                      <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 ${platformColor(p.platform)}`}>
                        {platformLabel(p.platform)}
                      </span>
                      <p className="font-mono text-[var(--admin-label-sm)] text-text-primary flex-1 truncate group-hover:text-gold transition-colors">
                        {p.text_content?.slice(0, 80) ?? p.topic}
                      </p>
                      <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary shrink-0">
                        {p.content_type?.replace(/_/g, ' ')}
                      </span>
                    </a>
                  ))}
                  {approvedPieces.length > 5 && (
                    <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary px-1">
                      +{approvedPieces.length - 5} more
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ── Right column (2/5) ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Editorial Attention */}
            <section>
              <SectionHead
                title="Editorial Attention"
                href="/admin"
                linkLabel="→ Editorial"
              />
              {flaggedDossiers.length === 0 ? (
                <div className="border border-emerald-400/20 bg-emerald-400/5 px-3 py-3">
                  <p className="font-mono text-[var(--admin-label-sm)] text-emerald-700">No active editorial flags.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {flaggedDossiers.map(d => (
                    <a
                      key={d.id}
                      href="/admin"
                      className="flex items-start justify-between gap-2 border border-border bg-ground-light/5 px-3 py-2.5 hover:border-gold/30 hover:bg-gold/3 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[var(--admin-label-sm)] text-text-primary truncate group-hover:text-gold transition-colors">
                          {d.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {d.highCount > 0 && (
                            <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-red-600">
                              {d.highCount} high
                            </span>
                          )}
                          {d.mediumCount > 0 && (
                            <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-amber-600">
                              {d.mediumCount} med
                            </span>
                          )}
                          <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">
                            {d.flagCount} flag{d.flagCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Content Health mini */}
            <section>
              <SectionHead
                title="Content Health"
                href="/admin/health"
                linkLabel="→ Health"
              />
              {!health ? (
                <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Loading health data…</p>
              ) : (
                <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-2">
                  {[
                    {
                      label: 'People – Needs Review',
                      value: health.people.needs_review,
                      warn: true,
                    },
                    {
                      label: 'People – Missing Facts',
                      value: health.people.missing_born,
                      warn: true,
                    },
                    {
                      label: 'Institutions – Needs Review',
                      value: health.institutions.needs_review,
                      warn: true,
                    },
                    {
                      label: 'Dossiers – Not Entity-Scanned',
                      value: health.dossiers.not_entity_scanned,
                      warn: true,
                    },
                    {
                      label: 'Citations Pending',
                      value: data?.citationCount ?? 0,
                      warn: true,
                    },
                  ].map(({ label, value, warn }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">{label}</span>
                      <span
                        className={`font-mono text-[var(--admin-label-sm)] font-medium ${
                          warn && value > 0 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      )}
    </div>
  );
}
