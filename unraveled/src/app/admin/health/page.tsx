'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';

// ── Sidebar ────────────────────────────────────────────────────────────────────

const HEALTH_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio', label: 'Studio', href: '/admin/studio' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
      { id: 'health', label: 'Content Health', href: '/admin/health' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'knowledge', label: 'Knowledge Hub', href: '/admin/knowledge' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'distribution', label: 'Distribution Desk', href: '/admin/distribution' },
    ],
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface PeopleStats {
  total: number;
  published: number;
  needs_review: number;
  draft: number;
  missing_photo: number;
  missing_born: number;
  missing_nationality: number;
  missing_wikipedia: number;
  missing_grokipedia: number;
  orphaned: number;
}

interface InstitutionStats {
  total: number;
  published: number;
  needs_review: number;
  missing_logo: number;
  missing_wikipedia: number;
  missing_grokipedia: number;
  orphaned: number;
}

interface LocationStats {
  total: number;
  published: number;
  needs_review: number;
  missing_wikipedia: number;
  missing_grokipedia: number;
}

interface DossierStats {
  total_published: number;
  with_people: number;
  with_institutions: number;
  with_editorial: number;
  total_people_links: number;
  total_institution_links: number;
  avg_people_per_dossier: number;
  not_entity_scanned: number;
}

interface RunRecord {
  status: 'running' | 'complete' | 'failed';
  started_at: string;
  finished_at: string | null;
  summary: Record<string, number> | null;
  error: string | null;
}

interface HealthData {
  people: PeopleStats;
  institutions: InstitutionStats;
  locations: LocationStats;
  dossiers: DossierStats;
  lastRuns: Record<string, RunRecord>;
}

interface ActionState {
  status: 'idle' | 'running' | 'complete' | 'failed';
  runId?: string;
  summary?: Record<string, number>;
  error?: string;
}

interface CitationQueueItem {
  id: string;
  session_id: string;
  agent_id: string;
  claim_text: string;
  citation_raw: string;
  citation_type: string;
  resolution_status: string;
  resolved_title: string | null;
  similarity_score: number | null;
  error_detail: string | null;
  priority?: string | null;
  flag_type?: string | null;
  source_issue?: string | null;
  created_at: string;
}

// ── Action definitions ─────────────────────────────────────────────────────────

const ACTIONS = [
  {
    id: 'backfill-links',
    label: 'Backfill External Links',
    description: 'Populates missing Wikipedia and Grokipedia URLs for all people, institutions, and locations.',
    badge: (h: HealthData) => {
      const n = (h.people.missing_grokipedia ?? 0) + (h.institutions.missing_grokipedia ?? 0);
      return n > 0 ? `${n} missing` : null;
    },
    fast: true,
  },
  {
    id: 'backfill-topics',
    label: 'Backfill Entity-Dossier Links',
    description: 'Scans dossier text for name mentions and creates people_topics links. No AI — pure text match.',
    badge: (h: HealthData) => {
      const n = h.dossiers.not_entity_scanned ?? 0;
      return n > 0 ? `${n} unlinked dossiers` : null;
    },
    fast: true,
  },
  {
    id: 'backfill-facts',
    label: 'Backfill People Quick Facts',
    description: 'Uses Claude Haiku to populate born_date, nationality, current_role for people missing these fields. Processes up to 60 at a time.',
    badge: (h: HealthData) => {
      const n = h.people.missing_born ?? 0;
      return n > 0 ? `${n} missing facts` : null;
    },
    fast: false,
  },
  {
    id: 'scan-entities',
    label: 'Entity Gap Scan',
    description: 'Uses Claude Sonnet to extract all named entities from every published dossier. Creates stubs for missing people and institutions, and links them.',
    badge: (h: HealthData) => {
      const n = h.people.orphaned ?? 0;
      return n > 0 ? `${n} orphaned entities` : null;
    },
    fast: false,
  },
  {
    id: 'enrich-profiles',
    label: 'Enrich People Profiles',
    description: 'Uses Claude Sonnet to generate rich bio sections (overview, career, positions, controversies, research relevance) for people who lack them.',
    badge: (h: HealthData) => {
      const n = h.people.missing_born ?? 0;
      return n > 0 ? `${n} thin profiles` : null;
    },
    fast: false,
  },
] as const;

type ActionId = (typeof ACTIONS)[number]['id'];

// ── Coverage Donut ─────────────────────────────────────────────────────────────

const DONUT_R = 26;
const DONUT_C = 2 * Math.PI * DONUT_R; // ≈163.4

function CoverageDonut({
  label,
  value,
  total,
  color = '#d4af37',
}: {
  label: string;
  value: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const dash = pct * DONUT_C;
  const gap = DONUT_C - dash;
  const displayPct = Math.round(pct * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={72} height={72} viewBox="0 0 72 72">
        {/* track */}
        <circle
          cx={36} cy={36} r={DONUT_R}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-border"
        />
        {/* fill */}
        <circle
          cx={36} cy={36} r={DONUT_R}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={DONUT_C / 4} /* start at top */
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        <text
          x={36} y={36}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-text-primary"
          style={{ fontFamily: 'serif', fontSize: 14, fontWeight: 600 }}
        >
          {displayPct}%
        </text>
      </svg>
      <div className="text-center space-y-0.5">
        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</p>
        <p className="font-mono text-[8px] text-text-tertiary">
          {value.toLocaleString()} / {total.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Summary Pills ──────────────────────────────────────────────────────────────

function SummaryPills({ summary }: { summary: Record<string, number> }) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {Object.entries(summary).map(([k, v]) => (
        <span key={k} className="font-mono text-[8px] border border-border px-2 py-0.5 text-text-tertiary">
          {k.replace(/_/g, ' ')}: <span className="text-gold">{v}</span>
        </span>
      ))}
    </div>
  );
}

// ── Action Card ────────────────────────────────────────────────────────────────

function ActionCard({
  action,
  state,
  lastRun,
  healthData,
  onRun,
}: {
  action: (typeof ACTIONS)[number];
  state: ActionState;
  lastRun?: RunRecord;
  healthData: HealthData | null;
  onRun: (id: ActionId) => void;
}) {
  const isRunning = state.status === 'running';
  const justRan = state.status === 'complete' || state.status === 'failed';
  const badge = healthData ? action.badge(healthData) : null;

  return (
    <div className={`border ${isRunning ? 'border-gold/40' : 'border-border'} bg-ground-light/10 p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-primary">
              {action.label}
            </span>
            {!action.fast && (
              <span className="font-mono text-[7px] uppercase tracking-widest border border-sky-400/30 text-sky-400 px-1.5 py-0.5">
                background
              </span>
            )}
            {badge && (
              <span className="font-mono text-[7px] uppercase tracking-widest border border-amber-400/30 text-amber-400 px-1.5 py-0.5">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary">{action.description}</p>
        </div>
        <button
          onClick={() => onRun(action.id)}
          disabled={isRunning}
          className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-40 shrink-0"
        >
          {isRunning ? '⟳ Running…' : '▶ Run'}
        </button>
      </div>

      {/* Current run result */}
      {justRan && (
        <div
          className={`border px-3 py-2 space-y-1 ${
            state.status === 'complete'
              ? 'border-emerald-400/20 bg-emerald-400/5'
              : 'border-red-400/20 bg-red-400/5'
          }`}
        >
          <p
            className={`font-mono text-[8px] uppercase tracking-widest ${
              state.status === 'complete' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {state.status === 'complete' ? '✓ Complete' : '✗ Failed'}
          </p>
          {state.summary && <SummaryPills summary={state.summary} />}
          {state.error && <p className="font-mono text-[8px] text-red-400">{state.error}</p>}
        </div>
      )}

      {isRunning && !action.fast && (
        <div className="border border-gold/20 bg-gold/5 px-3 py-2">
          <p className="font-mono text-[8px] text-gold/70">
            Running in background — results will appear when complete.
          </p>
        </div>
      )}

      {/* Last run from DB */}
      {!justRan && lastRun && (
        <div className="border-t border-border/30 pt-2 flex items-center gap-3 flex-wrap">
          <span
            className={`font-mono text-[7px] uppercase tracking-widest ${
              lastRun.status === 'complete'
                ? 'text-emerald-400'
                : lastRun.status === 'failed'
                ? 'text-red-400'
                : 'text-amber-400'
            }`}
          >
            Last: {lastRun.status}
          </span>
          <span className="font-mono text-[7px] text-text-tertiary">
            {lastRun.finished_at
              ? new Date(lastRun.finished_at).toLocaleString()
              : new Date(lastRun.started_at).toLocaleString()}
          </span>
          {lastRun.summary && <SummaryPills summary={lastRun.summary as Record<string, number>} />}
        </div>
      )}
    </div>
  );
}

// ── Citation priority color ────────────────────────────────────────────────────

function priorityColor(p: string | null | undefined) {
  if (!p) return 'text-text-tertiary border-border';
  if (p === 'high') return 'text-red-400 border-red-400/30 bg-red-400/5';
  if (p === 'medium') return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
  return 'text-text-tertiary border-border';
}

function resolutionColor(s: string) {
  if (s === 'resolved') return 'text-emerald-400';
  if (s === 'unresolved' || s === 'failed') return 'text-red-400';
  if (s === 'needs_human') return 'text-amber-400';
  return 'text-text-tertiary';
}

// ── Main view ──────────────────────────────────────────────────────────────────

function ContentHealthView() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [citations, setCitations] = useState<CitationQueueItem[]>([]);
  const [actionStates, setActionStates] = useState<Record<ActionId, ActionState>>({
    'backfill-links':  { status: 'idle' },
    'backfill-topics': { status: 'idle' },
    'backfill-facts':  { status: 'idle' },
    'scan-entities':   { status: 'idle' },
    'enrich-profiles': { status: 'idle' },
  });
  const pollingRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health/stats');
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCitations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health/citations');
      if (res.ok) {
        const json = await res.json();
        setCitations(json.items ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadStats();
    loadCitations();
  }, [loadStats, loadCitations]);

  useEffect(() => {
    return () => {
      Object.values(pollingRefs.current).forEach(clearInterval);
    };
  }, []);

  function pollForCompletion(actionId: ActionId, runId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/health/run-status?runId=${runId}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.status === 'complete' || result.status === 'failed') {
          clearInterval(interval);
          delete pollingRefs.current[actionId];
          setActionStates(prev => ({
            ...prev,
            [actionId]: {
              status: result.status,
              summary: result.summary ?? undefined,
              error: result.error ?? undefined,
            },
          }));
          loadStats();
        }
      } catch { /* ignore */ }
    }, 4000);
    pollingRefs.current[actionId] = interval;
  }

  async function runAction(actionId: ActionId) {
    setActionStates(prev => ({ ...prev, [actionId]: { status: 'running' } }));
    try {
      const res = await fetch('/api/admin/health/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
      });
      const result = await res.json();

      if (!res.ok) {
        setActionStates(prev => ({ ...prev, [actionId]: { status: 'failed', error: result.error } }));
        return;
      }

      if (result.status === 'complete') {
        setActionStates(prev => ({
          ...prev,
          [actionId]: { status: 'complete', summary: result.summary },
        }));
        loadStats();
      } else if (result.status === 'running' && result.runId) {
        pollForCompletion(actionId, result.runId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setActionStates(prev => ({ ...prev, [actionId]: { status: 'failed', error: msg } }));
    }
  }

  async function dismissCitation(id: string) {
    await fetch('/api/admin/health/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setCitations(prev => prev.filter(c => c.id !== id));
  }

  const p = data?.people;
  const i = data?.institutions;
  const l = data?.locations;
  const d = data?.dossiers;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-text-primary">Content Health</h1>
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mt-1">
            Data completeness · entity coverage · maintenance operations
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); loadStats(); loadCitations(); }}
          className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : !data ? (
        <p className="font-mono text-sm text-red-400">Failed to load stats.</p>
      ) : (
        <>
          {/* ── Coverage Donuts ── */}
          <section className="space-y-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Coverage Overview
            </p>
            <div className="flex flex-wrap gap-8 border border-border bg-ground-light/10 px-6 py-5">
              <CoverageDonut
                label="Dossiers w/ People"
                value={d?.with_people ?? 0}
                total={d?.total_published ?? 1}
                color="#34d399"
              />
              <CoverageDonut
                label="People Published"
                value={p?.published ?? 0}
                total={p?.total ?? 1}
                color="#34d399"
              />
              <CoverageDonut
                label="Institutions Published"
                value={i?.published ?? 0}
                total={i?.total ?? 1}
                color="#60a5fa"
              />
              <CoverageDonut
                label="Locations Published"
                value={l?.published ?? 0}
                total={l?.total ?? 1}
                color="#a78bfa"
              />
            </div>
          </section>

          {/* ── Dossier Coverage stats ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Dossier Coverage
            </p>
            <div className="flex flex-wrap gap-6 border border-border bg-ground-light/10 px-4 py-3">
              {[
                { label: 'Published',         value: d?.total_published ?? 0, good: true },
                { label: 'With People',        value: d?.with_people ?? 0 },
                { label: 'With Institutions',  value: d?.with_institutions ?? 0 },
                { label: 'With Editorial',     value: d?.with_editorial ?? 0 },
                { label: 'People Links',       value: d?.total_people_links ?? 0 },
                { label: 'Avg People/Dossier', value: d?.avg_people_per_dossier ?? 0 },
                { label: 'Not Entity-Scanned', value: d?.not_entity_scanned ?? 0, warn: true },
              ].map(({ label, value, good, warn }) => (
                <div key={label}>
                  <div
                    className={`font-serif text-xl ${
                      warn && value > 0
                        ? 'text-amber-400'
                        : good
                        ? 'text-emerald-400'
                        : 'text-text-primary'
                    }`}
                  >
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── People ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              People — {p?.total ?? 0} total
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Status</p>
                <div className="flex gap-6">
                  {[
                    { label: 'Published',    value: p?.published ?? 0,    good: true  },
                    { label: 'Needs Review', value: p?.needs_review ?? 0, warn: true  },
                    { label: 'Draft',        value: p?.draft ?? 0,        warn: true  },
                  ].map(({ label, value, good, warn }) => (
                    <div key={label}>
                      <div className={`font-serif text-xl ${warn && value > 0 ? 'text-amber-400' : good ? 'text-emerald-400' : 'text-text-primary'}`}>
                        {value.toLocaleString()}
                      </div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="h-1 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/60 rounded-full"
                    style={{ width: `${p && p.total > 0 ? Math.round((p.published / p.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Data Completeness</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Has Photo',       value: (p?.total ?? 0) - (p?.missing_photo ?? 0) },
                    { label: 'Has Birth Date',  value: (p?.total ?? 0) - (p?.missing_born ?? 0) },
                    { label: 'Has Nationality', value: (p?.total ?? 0) - (p?.missing_nationality ?? 0) },
                    { label: 'Has Grokipedia',  value: (p?.total ?? 0) - (p?.missing_grokipedia ?? 0) },
                    { label: 'Has Dossier Link',value: (p?.total ?? 0) - (p?.orphaned ?? 0) },
                  ].map(({ label, value }) => {
                    const pct = p && p.total > 0 ? Math.round((value / p.total) * 100) : 0;
                    return (
                      <div key={label} className="grid grid-cols-[120px_1fr_32px] gap-2 items-center">
                        <span className="font-mono text-[8px] text-text-tertiary">{label}</span>
                        <div className="h-1 bg-border/30 rounded-full overflow-hidden">
                          <div className="h-full bg-gold/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-[8px] text-text-tertiary text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ── Institutions ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Institutions — {i?.total ?? 0} total
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Status</p>
                <div className="flex gap-6">
                  {[
                    { label: 'Published',    value: i?.published ?? 0,    good: true },
                    { label: 'Needs Review', value: i?.needs_review ?? 0, warn: true },
                  ].map(({ label, value, good, warn }) => (
                    <div key={label}>
                      <div className={`font-serif text-xl ${warn && value > 0 ? 'text-amber-400' : good ? 'text-emerald-400' : 'text-text-primary'}`}>
                        {value.toLocaleString()}
                      </div>
                      <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="h-1 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400/60 rounded-full"
                    style={{ width: `${i && i.total > 0 ? Math.round((i.published / i.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Data Completeness</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Has Logo',        value: (i?.total ?? 0) - (i?.missing_logo ?? 0) },
                    { label: 'Has Grokipedia',  value: (i?.total ?? 0) - (i?.missing_grokipedia ?? 0) },
                    { label: 'Has Dossier Link',value: (i?.total ?? 0) - (i?.orphaned ?? 0) },
                  ].map(({ label, value }) => {
                    const pct = i && i.total > 0 ? Math.round((value / i.total) * 100) : 0;
                    return (
                      <div key={label} className="grid grid-cols-[120px_1fr_32px] gap-2 items-center">
                        <span className="font-mono text-[8px] text-text-tertiary">{label}</span>
                        <div className="h-1 bg-border/30 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-mono text-[8px] text-text-tertiary text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* ── Locations ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Locations — {l?.total ?? 0} total
            </p>
            <div className="flex flex-wrap gap-6 border border-border bg-ground-light/10 px-4 py-3">
              {[
                { label: 'Published',          value: l?.published ?? 0,          good: true },
                { label: 'Needs Review',        value: l?.needs_review ?? 0,        warn: true },
                { label: 'Missing Grokipedia',  value: l?.missing_grokipedia ?? 0,  warn: true },
              ].map(({ label, value, good, warn }) => (
                <div key={label}>
                  <div className={`font-serif text-xl ${warn && value > 0 ? 'text-amber-400' : good ? 'text-emerald-400' : 'text-text-primary'}`}>
                    {value.toLocaleString()}
                  </div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Citation Review Queue ── */}
          {citations.length > 0 && (
            <section className="space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
                Citation Review Queue — {citations.length} pending
              </p>
              <div className="space-y-2">
                {citations.map(c => (
                  <div key={c.id} className="border border-amber-400/20 bg-amber-400/3 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Status row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono text-[8px] uppercase tracking-widest ${resolutionColor(c.resolution_status)}`}>
                            {c.resolution_status.replace(/_/g, ' ')}
                          </span>
                          {c.priority && (
                            <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 ${priorityColor(c.priority)}`}>
                              {c.priority}
                            </span>
                          )}
                          <span className="font-mono text-[7px] border border-border px-1.5 py-0.5 text-text-tertiary">
                            {c.citation_type}
                          </span>
                          {c.flag_type && (
                            <span className="font-mono text-[7px] border border-red-400/20 text-red-400 px-1.5 py-0.5">
                              {c.flag_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="font-mono text-[7px] text-text-tertiary">{c.agent_id}</span>
                        </div>
                        {/* Citation raw */}
                        <p className="font-mono text-[8px] text-text-primary break-all">{c.citation_raw}</p>
                        {/* Source issue */}
                        {c.source_issue && (
                          <p className="font-mono text-[7px] text-amber-400">{c.source_issue}</p>
                        )}
                        {/* Resolved title */}
                        {c.resolved_title && (
                          <p className="font-mono text-[7px] text-emerald-400">Resolved: {c.resolved_title}</p>
                        )}
                        {/* Claim */}
                        <p className="text-xs text-text-tertiary line-clamp-2">{c.claim_text}</p>
                        {/* Error */}
                        {c.error_detail && (
                          <p className="font-mono text-[7px] text-red-400">{c.error_detail}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => dismissCitation(c.id)}
                          className="font-mono text-[7px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors"
                        >
                          Dismiss
                        </button>
                        {c.resolution_status === 'needs_human' && (
                          <a
                            href={`/admin?view=sessions&session=${c.session_id}`}
                            className="font-mono text-[7px] uppercase tracking-widest px-2 py-1 border border-amber-400/30 text-amber-400 hover:border-amber-400/60 transition-colors text-center"
                          >
                            Review
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Maintenance Operations ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Maintenance Operations
            </p>
            <div className="space-y-3">
              {ACTIONS.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  state={actionStates[action.id]}
                  lastRun={data.lastRuns[action.id]}
                  healthData={data}
                  onRun={runAction}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HealthPage() {
  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={HEALTH_SIDEBAR_GROUPS}
          activeView="health"
          onSelect={() => {}}
          siteHref="/"
          feedbackHref="/admin/feedback"
        />
      }
    >
      <div className="px-6 py-8 max-w-4xl">
        <ContentHealthView />
      </div>
    </AdminShell>
  );
}
