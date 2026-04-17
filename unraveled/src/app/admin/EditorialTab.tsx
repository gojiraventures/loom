'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditorialFlag {
  id: string;
  severity: 'high' | 'medium' | 'low';
  type: string;
  section: string;
  excerpt: string;
  issue: string;
  suggested_fix: string;
  status: 'pending' | 'dismissed' | 'applied';
}

interface EditorialReview {
  reviewed_at: string;
  model: string;
  overall_quality: 'high' | 'medium' | 'low';
  editorial_summary: string;
  flags: EditorialFlag[];
  status: 'pending_review' | 'reviewed';
}

interface DossierRow {
  id: string;
  title: string;
  slug: string | null;
  editorial_review: EditorialReview | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  temporal_ambiguity: 'Temporal Ambiguity',
  missing_context: 'Missing Context',
  pronoun_ambiguity: 'Pronoun Ambiguity',
  unqualified_claim: 'Unqualified Claim',
  factual_gap: 'Factual Gap',
  missing_current_status: 'Missing Current Status',
};

const SEV_COLORS: Record<string, string> = {
  high: 'text-red-400 border-red-400/30 bg-red-400/5',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  low: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
};

const QUALITY_COLORS: Record<string, string> = {
  high: 'text-emerald-400',
  medium: 'text-amber-400',
  low: 'text-red-400',
};

// ── FlagCard ──────────────────────────────────────────────────────────────────

function FlagCard({ flag }: { flag: EditorialFlag }) {
  const [open, setOpen] = useState(false);
  if (flag.status === 'dismissed') return null;

  return (
    <div className={`border ${SEV_COLORS[flag.severity]} p-3 space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ${SEV_COLORS[flag.severity]}`}>
              {flag.severity}
            </span>
            <span className="font-mono text-[8px] text-text-tertiary uppercase tracking-widest">
              {TYPE_LABELS[flag.type] ?? flag.type}
            </span>
            <span className="font-mono text-[8px] text-text-tertiary">§ {flag.section}</span>
          </div>
          <p className="text-sm text-text-primary">{flag.issue}</p>
          {flag.excerpt && (
            <p className="font-mono text-[9px] text-text-tertiary italic border-l-2 border-border pl-2 mt-1">
              "{flag.excerpt}"
            </p>
          )}
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="font-mono text-[8px] text-text-tertiary hover:text-text-secondary shrink-0 border border-border px-2 py-1"
        >
          {open ? '▲ Fix' : '▼ Fix'}
        </button>
      </div>
      {open && (
        <div className="border border-border/50 bg-ground-light/30 p-3 space-y-2">
          <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Suggested fix</p>
          <p className="text-sm text-text-secondary">{flag.suggested_fix}</p>
        </div>
      )}
    </div>
  );
}

// ── DossierEditorialCard ──────────────────────────────────────────────────────

function DossierEditorialCard({
  dossier,
  onReview,
}: {
  dossier: DossierRow;
  onReview: (id: string) => Promise<void>;
}) {
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const review = dossier.editorial_review;

  const activeFlags = review?.flags.filter(f => f.status !== 'dismissed') ?? [];
  const highCount = activeFlags.filter(f => f.severity === 'high').length;

  async function handleRun() {
    setRunning(true);
    try {
      await onReview(dossier.id);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="border border-border bg-ground-light/10">
      {/* Row header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex-1 text-left min-w-0"
          disabled={!review}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[9px] text-text-secondary truncate max-w-xs">
              {dossier.title}
            </span>
            {review ? (
              <>
                <span className={`font-mono text-[8px] uppercase tracking-widest ${QUALITY_COLORS[review.overall_quality]}`}>
                  {review.overall_quality} quality
                </span>
                {activeFlags.length > 0 && (
                  <span className={`font-mono text-[8px] ${highCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {activeFlags.length} flag{activeFlags.length !== 1 ? 's' : ''}
                    {highCount > 0 ? ` · ${highCount} high` : ''}
                  </span>
                )}
                {activeFlags.length === 0 && (
                  <span className="font-mono text-[8px] text-emerald-400">✓ clean</span>
                )}
                <span className="font-mono text-[7px] text-text-tertiary">
                  reviewed {review.reviewed_at.slice(0, 10)}
                </span>
              </>
            ) : (
              <span className="font-mono text-[8px] text-text-tertiary">not reviewed</span>
            )}
          </div>
        </button>
        <button
          onClick={handleRun}
          disabled={running}
          className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-40 shrink-0"
        >
          {running ? 'Running…' : review ? '↺ Re-run' : '▶ Run'}
        </button>
      </div>

      {/* Expanded flags */}
      {open && review && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {review.editorial_summary && (
            <p className="text-sm text-text-secondary italic">{review.editorial_summary}</p>
          )}
          {activeFlags.length === 0 ? (
            <p className="font-mono text-[9px] text-emerald-400">No outstanding flags.</p>
          ) : (
            <div className="space-y-2">
              {activeFlags.map(flag => (
                <FlagCard key={flag.id} flag={flag} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function EditorialTab() {
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'flagged' | 'unreviewed'>('flagged');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/editorial/list');
      if (res.ok) setDossiers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReview(dossierId: string) {
    const res = await fetch('/api/admin/editorial/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossierId }),
    });
    if (res.ok) {
      const review = await res.json();
      setDossiers(prev => prev.map(d => d.id === dossierId ? { ...d, editorial_review: review } : d));
    }
  }

  const filtered = dossiers.filter(d => {
    if (filter === 'unreviewed') return !d.editorial_review;
    if (filter === 'flagged') {
      const flags = d.editorial_review?.flags.filter(f => f.status !== 'dismissed') ?? [];
      return flags.length > 0;
    }
    return true;
  });

  const totalFlags = dossiers.reduce((sum, d) => {
    return sum + (d.editorial_review?.flags.filter(f => f.status !== 'dismissed').length ?? 0);
  }, 0);
  const highFlags = dossiers.reduce((sum, d) => {
    return sum + (d.editorial_review?.flags.filter(f => f.severity === 'high' && f.status !== 'dismissed').length ?? 0);
  }, 0);
  const unreviewed = dossiers.filter(d => !d.editorial_review).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-lg text-text-primary">Editorial Review</h2>
          <p className="font-mono text-[9px] text-text-tertiary uppercase tracking-widest">
            Context gaps · ambiguous references · missing facts · temporal confusion
          </p>
        </div>
        <button
          onClick={load}
          className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Stats */}
      {!loading && dossiers.length > 0 && (
        <div className="flex flex-wrap gap-6 border border-border bg-ground-light/20 px-4 py-3">
          <div>
            <div className="font-serif text-xl text-red-400">{highFlags}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">High Severity</div>
          </div>
          <div>
            <div className="font-serif text-xl text-amber-400">{totalFlags}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Total Flags</div>
          </div>
          <div>
            <div className="font-serif text-xl text-text-tertiary">{unreviewed}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Not Reviewed</div>
          </div>
          <div>
            <div className="font-serif text-xl text-emerald-400">
              {dossiers.filter(d => d.editorial_review && (d.editorial_review.flags.filter(f => f.status !== 'dismissed').length === 0)).length}
            </div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Clean</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-0 border border-border w-fit">
        {(['flagged', 'unreviewed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[9px] uppercase tracking-widest px-4 py-2 transition-colors border-r border-border last:border-r-0 ${filter === f ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-ground-light/20 p-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            {filter === 'flagged' ? 'No flagged dossiers' : filter === 'unreviewed' ? 'All dossiers reviewed' : 'No dossiers found'}
          </p>
          {filter === 'unreviewed' && dossiers.length > 0 && (
            <p className="text-sm text-text-secondary mt-2">
              Run <code className="font-mono text-gold">node scripts/editorial-review.mjs</code> to review all at once.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered
            .sort((a, b) => {
              const aHigh = a.editorial_review?.flags.filter(f => f.severity === 'high' && f.status !== 'dismissed').length ?? 0;
              const bHigh = b.editorial_review?.flags.filter(f => f.severity === 'high' && f.status !== 'dismissed').length ?? 0;
              return bHigh - aHigh;
            })
            .map(d => (
              <DossierEditorialCard key={d.id} dossier={d} onReview={handleReview} />
            ))}
        </div>
      )}
    </div>
  );
}
