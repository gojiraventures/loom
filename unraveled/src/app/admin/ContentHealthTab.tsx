'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Action definitions ────────────────────────────────────────────────────────

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
      const n = (h.people.missing_born ?? 0);
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
      // people without bio sections = those with missing_born roughly indicates thin profiles
      const n = h.people.missing_born ?? 0;
      return n > 0 ? `${n} thin profiles` : null;
    },
    fast: false,
  },
] as const;

type ActionId = (typeof ACTIONS)[number]['id'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Bar({ value, max, color = 'bg-gold' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-ground-light/30 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[8px] text-text-tertiary w-8 text-right">{pct}%</span>
    </div>
  );
}

function Metric({ label, value, warn = false, good = false }: { label: string; value: number | string; warn?: boolean; good?: boolean }) {
  return (
    <div>
      <div className={`font-serif text-xl ${warn && +value > 0 ? 'text-amber-400' : good ? 'text-emerald-400' : 'text-text-primary'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">{label}</div>
    </div>
  );
}

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

// ── Action Card ───────────────────────────────────────────────────────────────

function ActionCard({
  action,
  state,
  lastRun,
  onRun,
}: {
  action: typeof ACTIONS[number];
  state: ActionState;
  lastRun?: RunRecord;
  onRun: (id: ActionId) => void;
}) {
  const isRunning = state.status === 'running';
  const justRan = state.status === 'complete' || state.status === 'failed';

  return (
    <div className={`border ${isRunning ? 'border-gold/40' : 'border-border'} bg-ground-light/10 p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-primary">{action.label}</span>
            {!action.fast && (
              <span className="font-mono text-[7px] uppercase tracking-widest border border-sky-400/30 text-sky-400 px-1.5 py-0.5">
                background
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
        <div className={`border ${state.status === 'complete' ? 'border-emerald-400/20 bg-emerald-400/3' : 'border-red-400/20 bg-red-400/3'} px-3 py-2 space-y-1`}>
          <p className={`font-mono text-[8px] uppercase tracking-widest ${state.status === 'complete' ? 'text-emerald-400' : 'text-red-400'}`}>
            {state.status === 'complete' ? '✓ Complete' : '✗ Failed'}
          </p>
          {state.summary && <SummaryPills summary={state.summary} />}
          {state.error && <p className="font-mono text-[8px] text-red-400">{state.error}</p>}
        </div>
      )}

      {isRunning && !action.fast && (
        <div className="border border-gold/20 bg-gold/3 px-3 py-2">
          <p className="font-mono text-[8px] text-gold/70">Running in background — results will appear when complete. Refresh stats to see changes.</p>
        </div>
      )}

      {/* Last run from DB */}
      {!justRan && lastRun && (
        <div className="border-t border-border/30 pt-2 flex items-center gap-3">
          <span className={`font-mono text-[7px] uppercase tracking-widest ${lastRun.status === 'complete' ? 'text-emerald-400' : lastRun.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
            Last: {lastRun.status}
          </span>
          <span className="font-mono text-[7px] text-text-tertiary">
            {lastRun.finished_at ? new Date(lastRun.finished_at).toLocaleString() : new Date(lastRun.started_at).toLocaleString()}
          </span>
          {lastRun.summary && <SummaryPills summary={lastRun.summary as Record<string, number>} />}
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function ContentHealthTab() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionStates, setActionStates] = useState<Record<ActionId, ActionState>>({
    'backfill-links': { status: 'idle' },
    'backfill-topics': { status: 'idle' },
    'backfill-facts': { status: 'idle' },
    'scan-entities': { status: 'idle' },
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

  useEffect(() => { loadStats(); }, [loadStats]);

  // Cleanup polling on unmount
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
        const data = await res.json();
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(interval);
          delete pollingRefs.current[actionId];
          setActionStates(prev => ({
            ...prev,
            [actionId]: {
              status: data.status,
              summary: data.summary ?? undefined,
              error: data.error ?? undefined,
            },
          }));
          loadStats(); // refresh health numbers
        }
      } catch {
        // ignore
      }
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
        setActionStates(prev => ({ ...prev, [actionId]: { status: 'complete', summary: result.summary } }));
        loadStats();
      } else if (result.status === 'running' && result.runId) {
        // Background job — poll for completion
        pollForCompletion(actionId, result.runId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setActionStates(prev => ({ ...prev, [actionId]: { status: 'failed', error: msg } }));
    }
  }

  const p = data?.people;
  const i = data?.institutions;
  const l = data?.locations;
  const d = data?.dossiers;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg text-text-primary">Content Health</h2>
          <p className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">
            Data completeness · entity coverage · maintenance operations
          </p>
        </div>
        <button
          onClick={loadStats}
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
          {/* ── Dossier Coverage ── */}
          <section className="space-y-3">
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border pb-2">
              Dossier Coverage
            </p>
            <div className="flex flex-wrap gap-6 border border-border bg-ground-light/20 px-4 py-3">
              <Metric label="Published" value={d?.total_published ?? 0} good />
              <Metric label="With People" value={d?.with_people ?? 0} />
              <Metric label="With Institutions" value={d?.with_institutions ?? 0} />
              <Metric label="With Editorial Review" value={d?.with_editorial ?? 0} />
              <Metric label="Total People Links" value={d?.total_people_links ?? 0} />
              <Metric label="Avg People/Dossier" value={d?.avg_people_per_dossier ?? 0} />
              <Metric label="Not Entity-Scanned" value={d?.not_entity_scanned ?? 0} warn />
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
                  <Metric label="Published" value={p?.published ?? 0} good />
                  <Metric label="Needs Review" value={p?.needs_review ?? 0} warn />
                  <Metric label="Draft" value={p?.draft ?? 0} warn />
                </div>
                <Bar value={p?.published ?? 0} max={p?.total ?? 1} color="bg-emerald-400/60" />
              </div>
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Data Completeness</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Has Photo', value: (p?.total ?? 0) - (p?.missing_photo ?? 0) },
                    { label: 'Has Birth Date', value: (p?.total ?? 0) - (p?.missing_born ?? 0) },
                    { label: 'Has Nationality', value: (p?.total ?? 0) - (p?.missing_nationality ?? 0) },
                    { label: 'Has Grokipedia', value: (p?.total ?? 0) - (p?.missing_grokipedia ?? 0) },
                    { label: 'Has Dossier Link', value: (p?.total ?? 0) - (p?.orphaned ?? 0) },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[120px_1fr] gap-2 items-center">
                      <span className="font-mono text-[8px] text-text-tertiary">{label}</span>
                      <Bar value={value} max={p?.total ?? 1} />
                    </div>
                  ))}
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
                  <Metric label="Published" value={i?.published ?? 0} good />
                  <Metric label="Needs Review" value={i?.needs_review ?? 0} warn />
                </div>
                <Bar value={i?.published ?? 0} max={i?.total ?? 1} color="bg-emerald-400/60" />
              </div>
              <div className="border border-border bg-ground-light/10 px-4 py-3 space-y-3">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Data Completeness</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Has Logo', value: (i?.total ?? 0) - (i?.missing_logo ?? 0) },
                    { label: 'Has Grokipedia', value: (i?.total ?? 0) - (i?.missing_grokipedia ?? 0) },
                    { label: 'Has Dossier Link', value: (i?.total ?? 0) - (i?.orphaned ?? 0) },
                  ].map(({ label, value }) => (
                    <div key={label} className="grid grid-cols-[120px_1fr] gap-2 items-center">
                      <span className="font-mono text-[8px] text-text-tertiary">{label}</span>
                      <Bar value={value} max={i?.total ?? 1} />
                    </div>
                  ))}
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
              <Metric label="Published" value={l?.published ?? 0} good />
              <Metric label="Needs Review" value={l?.needs_review ?? 0} warn />
              <Metric label="Missing Grokipedia" value={l?.missing_grokipedia ?? 0} warn />
            </div>
          </section>

          {/* ── Maintenance Actions ── */}
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
