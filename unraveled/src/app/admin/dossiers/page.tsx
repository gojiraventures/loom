'use client';

/**
 * /admin/dossiers — Dossier list view (Phase 2 of admin rebuild).
 * Builds alongside the legacy /admin → content tab; does not retire it.
 * Calls the same endpoints as ContentTab: /api/admin/sessions + /api/admin/dossier.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar, type SidebarGroup } from '../_components/AdminSidebar';
import { StatusBadge } from '../_components/StatusBadge';

// ── Sidebar config for dossier pages ────────────────────────────────────────
// Non-dossier items link back to /admin (SPA); dossier items stay here.
const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command-center', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'sessions', label: 'Studio', href: '/admin' },
      { id: 'thread',   label: 'Discovery', href: '/admin' },
      { id: 'media',    label: 'Media Library', href: '/admin' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers',  label: 'Dossier Workshop' },
      { id: 'content',   label: 'Dossiers (Legacy)', href: '/admin' },
      { id: 'health',    label: 'Content Health', href: '/admin' },
      { id: 'editorial', label: 'Editorial', href: '/admin' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'people', label: 'Entities', href: '/admin' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'social',       label: 'Social Queue', href: '/admin' },
      { id: 'engage',       label: 'Replies', href: '/admin' },
      { id: 'intelligence', label: 'Performance', href: '/admin' },
      { id: 'promo',        label: 'Promo Codes', href: '/admin' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'agents',    label: 'Agents', href: '/admin' },
      { id: 'inbox',     label: 'Inbox', href: '/admin' },
      { id: 'analytics', label: 'Analytics', href: '/admin' },
      { id: 'services',  label: 'Service Health', href: '/admin/services' },
    ],
  },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface Dossier {
  topic: string;
  title: string;
  slug: string | null;
  published: boolean;
  featured: boolean;
  best_convergence_score: number;
  key_traditions: string[];
  summary: string | null;
  synthesized_output: Record<string, unknown> | null;
  last_researched_at: string | null;
  published_at: string | null;
  llm_perspectives: unknown[] | null;
  recommended_components: unknown[] | null;
  driving_question: string | null;
  overview_summary: string | null;
  session_id?: string;
}

// ── Readiness chips from dossier fields only ────────────────────────────────
// (Hero / Audio / Entities require extra fetches — shown in the workshop detail.)

interface ReadinessChip {
  label: string;
  pass: boolean | null; // null = unknown
}

function computeListReadiness(d: Dossier, pendingCount: number): ReadinessChip[] {
  return [
    { label: 'Synthesis',  pass: Boolean(d.synthesized_output) },
    { label: 'Slug',       pass: Boolean(d.slug) },
    { label: 'Driving Q',  pass: Boolean(d.driving_question) },
    { label: 'Overview',   pass: Boolean(d.overview_summary) },
    { label: 'Review',     pass: pendingCount === 0 ? null : false },
  ];
}

function ReadinessChips({ chips }: { chips: ReadinessChip[] }) {
  const failing = chips.filter((c) => c.pass === false).map((c) => c.label);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {chips.map((c) => (
        <span
          key={c.label}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            color: c.pass === true
              ? 'var(--status-complete)'
              : c.pass === false
                ? 'var(--status-failed)'
                : 'var(--color-text-tertiary)',
          }}
        >
          {c.pass === true ? '✓' : c.pass === false ? '✕' : '–'} {c.label}
        </span>
      ))}
      {failing.length > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-text-tertiary)' }}>
          · Needs: {failing.join(', ')}
        </span>
      )}
    </div>
  );
}

// ── List page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'published' | 'unpublished' | 'needs_review';
type SortBy = 'unpublished' | 'score' | 'title';

export default function DossiersListPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [pendingEnhancements, setPendingEnhancements] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('unpublished');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sessRes = await fetch('/api/admin/sessions');
      const sessData = await sessRes.json() as { sessions?: Array<{
        id: string; topic: string; status: string; session_type: string; created_at: string;
      }> };
      const allSessions = sessData.sessions ?? [];

      // Build pending enhancement map
      const enhMap: Record<string, number> = {};
      for (const s of allSessions) {
        if (s.session_type === 'enhancement' && s.status === 'pending_review') {
          enhMap[s.topic] = (enhMap[s.topic] ?? 0) + 1;
        }
      }
      setPendingEnhancements(enhMap);

      // Most-recent complete session per topic
      const sorted = [...allSessions]
        .filter((s) => s.status === 'complete')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const topicSessionMap: Record<string, string> = {};
      for (const s of sorted) {
        if (!topicSessionMap[s.topic]) topicSessionMap[s.topic] = s.id;
      }
      const topics = Object.keys(topicSessionMap);

      const results = await Promise.all(
        topics.map((t) =>
          fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`)
            .then((r) => r.json())
            .then((d: { dossier?: Dossier }) => {
              const dossier = d.dossier;
              if (dossier) dossier.session_id = topicSessionMap[t];
              return dossier ?? null;
            })
            .catch(() => null)
        )
      );
      setDossiers(results.filter((d): d is Dossier => d !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = dossiers
    .filter((d) => {
      if (filter === 'published')    return d.published;
      if (filter === 'unpublished')  return !d.published;
      if (filter === 'needs_review') return (pendingEnhancements[d.topic] ?? 0) > 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'unpublished') {
        if (a.published !== b.published) return a.published ? 1 : -1;
        return (b.best_convergence_score ?? 0) - (a.best_convergence_score ?? 0);
      }
      if (sortBy === 'score') return (b.best_convergence_score ?? 0) - (a.best_convergence_score ?? 0);
      return a.title.localeCompare(b.title);
    });

  const totalPending = Object.values(pendingEnhancements).reduce((a, b) => a + b, 0);

  return (
    <div data-theme="light">
      <AdminShell
        sidebar={
          <AdminSidebar
            groups={SIDEBAR_GROUPS}
            activeView="dossiers"
            onSelect={() => {/* no-op: all nav is href-based on this page */}}
          />
        }
      >
        <div className="px-6 py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                Content
              </div>
              <h1 className="font-serif text-2xl text-text-primary">Dossiers</h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {loading ? '…' : `${dossiers.length} dossiers`}
                {!loading && dossiers.filter((d) => d.published).length > 0 && (
                  <span style={{ color: 'var(--status-complete)', marginLeft: '6px' }}>
                    · {dossiers.filter((d) => d.published).length} published
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={load}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', padding: '5px 10px', background: 'transparent', cursor: 'pointer', borderRadius: '3px' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-gold)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-tertiary)'; }}
            >
              ↺ Refresh
            </button>
          </div>

          {/* Pending enhancements notice */}
          {totalPending > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--color-gold)', background: 'var(--color-gold-dim)', borderRadius: '3px', padding: '10px 14px', marginBottom: '20px' }}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-gold)' }}>
                {totalPending} enhancement {totalPending === 1 ? 'batch' : 'batches'} awaiting review
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-tertiary)' }}>
                → approve in Sessions tab
              </span>
            </div>
          )}

          {/* Filter + Sort bar */}
          {!loading && dossiers.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              {/* Filter pills */}
              <div className="flex border-b border-border">
                {([
                  ['all',          'All',          dossiers.length],
                  ['published',    'Published',    dossiers.filter((d) => d.published).length],
                  ['unpublished',  'Unpublished',  dossiers.filter((d) => !d.published).length],
                  ['needs_review', 'Needs Review', totalPending],
                ] as const).map(([f, label, count]) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '8px 14px',
                      borderBottom: '2px solid',
                      marginBottom: '-1px',
                      background: 'transparent',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      borderBottomColor: filter === f ? (f === 'needs_review' ? 'var(--status-running)' : 'var(--color-gold)') : 'transparent',
                      color: filter === f ? (f === 'needs_review' ? 'var(--status-running)' : 'var(--color-gold)') : 'var(--color-text-tertiary)',
                    }}
                  >
                    {label} <span style={{ opacity: 0.6, fontSize: '8px' }}>({count})</span>
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
                  Sort:
                </span>
                {([['unpublished', 'New First'], ['score', 'Score'], ['title', 'A–Z']] as const).map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setSortBy(val)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      border: '1px solid',
                      background: 'transparent',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                      borderColor: sortBy === val ? 'var(--color-gold)' : 'var(--color-border)',
                      color: sortBy === val ? 'var(--color-gold)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading / Error / Empty */}
          {loading && (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 rounded" style={{ background: 'var(--color-ground-light)' }} />
              ))}
            </div>
          )}
          {!loading && error && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--status-failed)' }}>{error}</p>
          )}
          {!loading && !error && dossiers.length === 0 && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '3px', padding: '48px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                No completed research yet. Launch a session from the Research Studio.
              </p>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && dossiers.length > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              No dossiers match this filter.
            </p>
          )}

          {/* Dossier cards */}
          {!loading && !error && (
            <div className="space-y-px">
              {filtered.map((d) => {
                const chips = computeListReadiness(d, pendingEnhancements[d.topic] ?? 0);
                const passCount = chips.filter((c) => c.pass === true).length;
                const failCount = chips.filter((c) => c.pass === false).length;
                const isReady = failCount === 0;
                const pendingCount = pendingEnhancements[d.topic] ?? 0;

                return (
                  <Link
                    key={d.topic}
                    href={`/admin/dossiers/${encodeURIComponent(d.topic)}`}
                    style={{
                      display: 'block',
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-ground-light)',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-ground-lighter)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-ground-light)'; }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Published indicator */}
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              flexShrink: 0,
                              background: d.published ? 'var(--status-complete)' : 'var(--color-text-tertiary)',
                              opacity: d.published ? 1 : 0.3,
                              display: 'inline-block',
                            }}
                          />
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                            {d.title}
                          </span>
                          {d.best_convergence_score > 0 && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-gold)' }}>
                              {d.best_convergence_score}
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <StatusBadge status="needs_review" label={`${pendingCount} pending review`} />
                          )}
                          {d.featured && (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--status-running)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>★ Featured</span>
                          )}
                        </div>
                        {/* Readiness chips */}
                        <ReadinessChips chips={chips} />
                        {/* Topic slug */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                          {d.topic}{d.slug && d.slug !== d.topic ? ` · /${d.slug}` : ''}
                        </div>
                      </div>

                      {/* Right: status + score ring */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {d.published ? (
                          <StatusBadge status="published" />
                        ) : (
                          <StatusBadge status="draft" />
                        )}
                        {/* Readiness fraction */}
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: isReady ? 'var(--status-complete)' : 'var(--status-failed)',
                          }}
                        >
                          {passCount}/{chips.filter((c) => c.pass !== null).length} ready
                        </span>
                        {d.published && d.published_at && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--color-text-tertiary)' }}>
                            {new Date(d.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {d.published && d.slug && (
                          <a
                            href={`/topics/${d.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--status-complete)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'; }}
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </AdminShell>
    </div>
  );
}
