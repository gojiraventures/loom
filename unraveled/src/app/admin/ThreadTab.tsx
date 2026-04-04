'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SetiStats {
  candidates: { total: number; pending_tier2: number };
  suggestions: { total: number; pending_review: number; approved: number };
  leads: { total: number; new: number };
  ghost_nodes: Array<{ name: string; count: number }>;
  last_scan_at: string | null;
  top_lead: { title: string; research_potential_score: number } | null;
}

interface Interestingness {
  surprise_score: number;
  bridge_score: number;
  covert_signal_score: number;
  temporal_anomaly_score: number;
  research_potential_score: number;
  anomaly_flags: string[];
}

interface Suggestion {
  id: string;
  entity_a_type: string;
  entity_a_name: string;
  entity_b_type: string;
  entity_b_name: string;
  suggested_relationship_type: string;
  suggested_strength: number;
  confidence_score: number;
  llm_reasoning: string | null;
  evidence_summary: string | null;
  suggested_new_entities: string[];
  anomaly_notes: string | null;
  status: string;
  created_at: string;
  discovery_interestingness: Interestingness | null;
}

interface Lead {
  id: string;
  title: string;
  pitch_summary: string | null;
  evidence_chain: Array<{ entity: string; connection: string; year?: string }>;
  suggested_entities_to_add: string[];
  suggested_lenses: string[];
  estimated_research_depth: string | null;
  research_potential_score: number;
  status: string;
  created_at: string;
  deep_research_output: Record<string, unknown> | null;
  discovery_suggestions: {
    entity_a_name: string;
    entity_a_type: string;
    entity_b_name: string;
    entity_b_type: string;
    suggested_relationship_type: string;
    confidence_score: number;
    anomaly_notes: string | null;
  } | null;
  discovery_interestingness: Interestingness | null;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function pct(score: number) {
  return `${Math.round(score * 100)}%`;
}

function ScoreBar({ label, score, color = 'bg-gold' }: { label: string; score: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score * 100}%` }} />
      </div>
      <span className="font-mono text-[9px] text-text-tertiary w-7 text-right">{pct(score)}</span>
    </div>
  );
}

function DepthBadge({ depth }: { depth: string | null }) {
  const map: Record<string, string> = {
    quick_article: 'text-emerald-400 border-emerald-400/30',
    full_dossier: 'text-amber-400 border-amber-400/30',
    investigation: 'text-red-400 border-red-400/30',
  };
  const label: Record<string, string> = {
    quick_article: 'Quick Article',
    full_dossier: 'Full Dossier',
    investigation: 'Investigation',
  };
  const key = depth ?? 'full_dossier';
  return (
    <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ${map[key] ?? 'text-text-tertiary border-border'}`}>
      {label[key] ?? key}
    </span>
  );
}

function EntityPill({ type, name }: { type: string; name: string }) {
  const color = type === 'person' ? 'text-sky-400' : 'text-amber-400';
  return (
    <span className={`font-mono text-[9px] ${color}`}>{name}</span>
  );
}

// ── THREAD Pulse (stats + controls) ─────────────────────────────────────────────

function PulseSection() {
  const [stats, setStats] = useState<SetiStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichingInst, setEnrichingInst] = useState(false);
  const [running, setRunning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<string | null>(null);
  const [enrichInstResult, setEnrichInstResult] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<Array<{ text: string; type: 'info' | 'ok' | 'error' }>>([]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/admin/thread/stats');
      if (res.ok) setStats(await res.json());
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/admin/thread/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_scan: true }),
      });
      const data = await res.json();
      setScanResult(`Found ${data.candidates_found} candidates (${data.candidates_inserted} new) across ${data.entities_scanned} entities`);
      await loadStats();
    } catch {
      setScanResult('Scan failed — check console');
    } finally {
      setScanning(false);
    }
  }

  async function runEnrich() {
    setEnriching(true);
    setEnrichResult(null);
    try {
      const res = await fetch('/api/admin/thread/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Enrichment failed');
      setEnrichResult(
        `Enriched ${data.enriched} people — +${data.total_institutions_added} institutions, +${data.total_connections_added} connections${data.new_ghost_nodes?.length ? `, ${data.new_ghost_nodes.length} ghost nodes flagged` : ''}`
      );
      await loadStats();
    } catch (e) {
      setEnrichResult(e instanceof Error ? e.message : 'Enrichment failed — check console');
    } finally {
      setEnriching(false);
    }
  }

  async function runEnrichInstitutions() {
    setEnrichingInst(true);
    setEnrichInstResult(null);
    try {
      const res = await fetch('/api/admin/thread/enrich-institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Enrichment failed');
      setEnrichInstResult(
        `Enriched ${data.enriched} institutions — +${data.total_sections} sections, +${data.total_events} events, +${data.total_personnel_linked} personnel links, +${data.total_connections} connections`
      );
    } catch (e) {
      setEnrichInstResult(e instanceof Error ? e.message : 'Enrichment failed — check console');
    } finally {
      setEnrichingInst(false);
    }
  }

  async function runTier2() {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await fetch('/api/admin/thread/tier2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_size: 20 }),
      });
      const data = await res.json();
      setProcessResult(
        `Processed ${data.processed} candidates → ${data.suggestions_created} suggestions, ${data.leads_created} new leads`
      );
      await loadStats();
    } catch {
      setProcessResult('Processing failed — check console');
    } finally {
      setProcessing(false);
    }
  }

  async function runFullPipeline() {
    setRunning(true);
    setPipelineLog([]);
    const log = (text: string, type: 'info' | 'ok' | 'error' = 'info') =>
      setPipelineLog((prev) => [...prev, { text, type }]);

    try {
      // Step 1 — Tier 1 SQL scan
      log('⊙ Tier 1: scanning entities for connections…');
      let scanData: { candidates_found?: number; candidates_inserted?: number; entities_scanned?: number; error?: string } = {};
      try {
        const res = await fetch('/api/admin/thread/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_scan: true }),
        });
        scanData = await res.json();
        if (!res.ok) throw new Error(scanData.error ?? 'Scan failed');
        log(
          `✓ Tier 1 done — ${scanData.candidates_found} candidates found (${scanData.candidates_inserted} new) across ${scanData.entities_scanned} entities`,
          'ok',
        );
      } catch (e) {
        log(`✗ Tier 1 failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
        // Don't abort — still process any existing queue
      }

      // Step 2 — Tier 2/3 + Lead Gen (only if there's something to process)
      await loadStats();
      const statsRes = await fetch('/api/admin/thread/stats');
      const freshStats: SetiStats | null = statsRes.ok ? await statsRes.json() : null;
      const pending = freshStats?.candidates.pending_tier2 ?? 0;

      if (pending === 0) {
        log('— Queue empty, no Tier 2 work to do', 'info');
      } else {
        log(`⊙ Tier 2/3: processing ${pending} candidates (Ollama inference + scoring + lead gen)…`);
        try {
          const res = await fetch('/api/admin/thread/tier2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch_size: 50 }),
          });
          const data: { processed?: number; suggestions_created?: number; leads_created?: number; errors?: number; error?: string } = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'Tier 2 failed');
          const errNote = (data.errors ?? 0) > 0 ? ` (${data.errors} errors — check Ollama)` : '';
          log(
            `✓ Tier 2/3 done — ${data.processed} processed → ${data.suggestions_created} suggestions, ${data.leads_created} new leads${errNote}`,
            (data.errors ?? 0) > 0 ? 'error' : 'ok',
          );
        } catch (e) {
          log(`✗ Tier 2/3 failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
        }
      }

      // Step 3 — Enrich bios (Perplexity + Claude, ~$0.05-0.10/person)
      log('⊙ Enriching bios — Perplexity + Claude (may take a minute)…');
      try {
        const res = await fetch('/api/admin/thread/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 10 }),
        });
        const data: { enriched?: number; total_institutions_added?: number; total_connections_added?: number; new_ghost_nodes?: string[]; error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Enrich failed');
        const ghostNote = (data.new_ghost_nodes?.length ?? 0) > 0 ? `, ${data.new_ghost_nodes!.length} ghost nodes flagged` : '';
        log(
          `✓ Bios enriched — ${data.enriched} people, +${data.total_institutions_added} institutions, +${data.total_connections_added} connections${ghostNote}`,
          'ok',
        );
      } catch (e) {
        log(`✗ Bio enrichment failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
      }

      // Step 4 — Enrich institutions (Perplexity + Claude, ~$0.05-0.10/institution)
      log('⊙ Enriching institutions — Perplexity + Claude (may take a minute)…');
      try {
        const res = await fetch('/api/admin/thread/enrich-institutions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 5 }),
        });
        const data: { enriched?: number; total_sections?: number; total_events?: number; total_personnel_linked?: number; total_connections?: number; error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Enrich failed');
        log(
          `✓ Institutions enriched — ${data.enriched} orgs, +${data.total_sections} sections, +${data.total_events} events, +${data.total_personnel_linked} personnel links, +${data.total_connections} connections`,
          'ok',
        );
      } catch (e) {
        log(`✗ Institution enrichment failed: ${e instanceof Error ? e.message : 'unknown error'}`, 'error');
      }

      await loadStats();
      log('Pipeline complete.', 'ok');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif text-lg text-text-primary">THREAD Pulse</h2>
        <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
          Automated connection discovery — always scanning, always looking for the signal
        </p>
      </div>

      {/* Stats grid */}
      {loadingStats ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border bg-ground-light/20 px-4 py-3 space-y-1">
            <div className="font-serif text-2xl text-gold">{stats.candidates.total.toLocaleString()}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Total Candidates</div>
            <div className="font-mono text-[9px] text-amber-400">{stats.candidates.pending_tier2} awaiting Tier 2</div>
          </div>
          <div className="border border-border bg-ground-light/20 px-4 py-3 space-y-1">
            <div className="font-serif text-2xl text-gold">{stats.suggestions.total.toLocaleString()}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Suggestions Generated</div>
            <div className="font-mono text-[9px] text-amber-400">{stats.suggestions.pending_review} pending review</div>
            <div className="font-mono text-[9px] text-emerald-400">{stats.suggestions.approved} approved</div>
          </div>
          <div className="border border-border bg-ground-light/20 px-4 py-3 space-y-1">
            <div className="font-serif text-2xl text-gold">{stats.leads.total.toLocaleString()}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Research Leads</div>
            <div className="font-mono text-[9px] text-amber-400">{stats.leads.new} new</div>
          </div>
        </div>
      ) : null}

      {/* Last scan */}
      {stats?.last_scan_at && (
        <p className="font-mono text-[9px] text-text-tertiary">
          Last scan: {new Date(stats.last_scan_at).toLocaleString()}
        </p>
      )}

      {/* Top lead callout */}
      {stats?.top_lead && (
        <div className="border border-gold/20 bg-gold/3 px-4 py-3">
          <p className="font-mono text-[8px] uppercase tracking-widest text-gold mb-1">
            Highest scoring lead — {pct(stats.top_lead.research_potential_score)} potential
          </p>
          <p className="text-sm text-text-secondary">{stats.top_lead.title}</p>
        </div>
      )}

      {/* Auto-run full pipeline */}
      <div className="border border-gold/30 bg-gold/3 px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-gold">Full Auto Pipeline</p>
            <p className="font-mono text-[8px] text-text-tertiary mt-0.5">
              Scan → Tier 2/3 → Lead Gen → Enrich Bios (10) → Enrich Institutions (5). Runs daily at 1–2 AM UTC automatically.
            </p>
          </div>
          <button
            onClick={runFullPipeline}
            disabled={running || scanning || processing}
            className="font-mono text-[9px] uppercase tracking-widest px-5 py-2 border border-gold/60 text-gold hover:bg-gold/10 transition-colors disabled:opacity-40 shrink-0"
          >
            {running ? '⊙ Running…' : '⊙ Run Now'}
          </button>
        </div>
        {pipelineLog.length > 0 && (
          <div className="space-y-0.5 border-t border-border/30 pt-2">
            {pipelineLog.map((entry, i) => (
              <p
                key={i}
                className={`font-mono text-[9px] ${
                  entry.type === 'ok' ? 'text-emerald-400' : entry.type === 'error' ? 'text-red-400' : 'text-text-tertiary'
                }`}
              >
                {entry.text}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Manual stage controls */}
      <div className="flex gap-3 flex-wrap">
        <div className="space-y-1">
          <button
            onClick={runScan}
            disabled={scanning || running}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 transition-colors disabled:opacity-40"
          >
            {scanning ? '⊙ Scanning…' : '⊙ Tier 1 Scan'}
          </button>
          <p className="font-mono text-[8px] text-text-tertiary">Pure SQL — zero LLM cost</p>
          {scanResult && <p className="font-mono text-[9px] text-emerald-400">{scanResult}</p>}
        </div>

        <div className="space-y-1">
          <button
            onClick={runTier2}
            disabled={processing || running || !stats || stats.candidates.pending_tier2 === 0}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-violet-400/40 text-violet-400 hover:bg-violet-400/10 transition-colors disabled:opacity-40"
          >
            {processing ? '⊙ Processing…' : `⊙ Process Queue (${stats?.candidates.pending_tier2 ?? 0})`}
          </button>
          <p className="font-mono text-[8px] text-text-tertiary">Ollama scan + scoring + lead gen</p>
          {processResult && <p className="font-mono text-[9px] text-emerald-400">{processResult}</p>}
        </div>

        <div className="space-y-1">
          <button
            onClick={runEnrich}
            disabled={enriching || running}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
          >
            {enriching ? '⊙ Enriching… (slow)' : '⊙ Enrich Bios (10)'}
          </button>
          <p className="font-mono text-[8px] text-text-tertiary">Perplexity + Claude — fills institutions &amp; connections</p>
          {enrichResult && <p className="font-mono text-[9px] text-emerald-400">{enrichResult}</p>}
        </div>

        <div className="space-y-1">
          <button
            onClick={runEnrichInstitutions}
            disabled={enrichingInst || running}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-teal-400/40 text-teal-400 hover:bg-teal-400/10 transition-colors disabled:opacity-40"
          >
            {enrichingInst ? '⊙ Enriching… (slow)' : '⊙ Enrich Institutions (5)'}
          </button>
          <p className="font-mono text-[8px] text-text-tertiary">Perplexity + Claude — fills bio, events, departments, personnel</p>
          {enrichInstResult && <p className="font-mono text-[9px] text-emerald-400">{enrichInstResult}</p>}
        </div>
      </div>

      {/* How it works */}
      <div className="border border-border/40 px-4 py-3 space-y-2">
        <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Pipeline</p>
        {[
          { tier: 'Tier 1', label: 'Lightweight Scan', cost: '$0', desc: 'Pure SQL: shared institutions, date overlaps, name mentions in bios' },
          { tier: 'Tier 2', label: 'Ollama Deep Scan', cost: '$0 (local)', desc: 'LLM reads entity profiles, infers relationship type and confidence' },
          { tier: 'Tier 3', label: 'Interestingness Engine', cost: '$0', desc: 'Algorithmic scoring: surprise, bridge, covert signal, temporal anomaly' },
          { tier: 'Leads', label: 'Auto Pitch Generation', cost: '$0 (local)', desc: 'Ollama writes editorial pitches for score ≥ 0.7' },
          { tier: 'Deep Research', label: 'Claude Opus Analysis', cost: '~$1-2/lead', desc: 'Full investigation outline — admin-triggered only' },
        ].map((step) => (
          <div key={step.tier} className="flex items-start gap-3">
            <span className="font-mono text-[8px] uppercase tracking-widest text-gold w-16 shrink-0 pt-0.5">{step.tier}</span>
            <div className="flex-1">
              <span className="font-mono text-[9px] text-text-primary">{step.label}</span>
              <span className="font-mono text-[8px] text-text-tertiary ml-2">— {step.desc}</span>
            </div>
            <span className="font-mono text-[8px] text-emerald-400 shrink-0">{step.cost}</span>
          </div>
        ))}
      </div>

      {/* Ghost nodes */}
      {stats && stats.ghost_nodes.length > 0 && (
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">
            Ghost Nodes — names Ollama flagged as missing from the system
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.ghost_nodes.map((g) => (
              <span
                key={g.name}
                className="font-mono text-[9px] border border-border px-2 py-1 text-text-secondary"
              >
                {g.name}
                <span className="ml-1.5 text-text-tertiary">×{g.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review Queue ──────────────────────────────────────────────────────────────

function ReviewQueueSection() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/thread/suggestions?status=${status}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(statusFilter); }, [statusFilter, load]);

  async function review(id: string, status: 'approved' | 'rejected' | 'needs_research') {
    setReviewing((r) => ({ ...r, [id]: true }));
    try {
      await fetch('/api/admin/thread/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setReviewing((r) => ({ ...r, [id]: false }));
    }
  }

  const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="font-serif text-lg text-text-primary">Review Queue</h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
            Ollama-inferred connections awaiting human review
          </p>
        </div>
        <div className="ml-auto flex border border-border">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${
                statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : suggestions.length === 0 ? (
        <div className="border border-border bg-ground-light/20 px-6 py-10 text-center space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            {statusFilter === 'pending' ? 'No pending suggestions' : `No ${statusFilter} suggestions`}
          </p>
          <p className="text-sm text-text-secondary">
            {statusFilter === 'pending' ? 'Run Tier 1 scan and then process the queue to generate suggestions.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((s) => {
            const expanded = expandedId === s.id;
            const interest = s.discovery_interestingness;
            const isReviewing = reviewing[s.id];

            return (
              <div key={s.id} className="border border-border bg-ground-light/10">
                {/* Main row */}
                <div className="px-4 py-3 flex items-start gap-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    className="font-mono text-[9px] text-text-tertiary mt-0.5 shrink-0"
                  >
                    {expanded ? '▼' : '▶'}
                  </button>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <EntityPill type={s.entity_a_type} name={s.entity_a_name} />
                      <span className="font-mono text-[9px] text-text-tertiary">
                        ↔ {s.suggested_relationship_type} ↔
                      </span>
                      <EntityPill type={s.entity_b_type} name={s.entity_b_name} />
                      <span className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5">
                        strength {s.suggested_strength}/5
                      </span>
                    </div>

                    {s.evidence_summary && (
                      <p className="text-sm text-text-secondary line-clamp-2">{s.evidence_summary}</p>
                    )}

                    {interest && (
                      <div className="flex gap-3 flex-wrap">
                        {interest.research_potential_score > 0 && (
                          <span className="font-mono text-[8px] text-gold">
                            ◆ {pct(interest.research_potential_score)} potential
                          </span>
                        )}
                        {interest.anomaly_flags.length > 0 && (
                          <span className="font-mono text-[8px] text-amber-400">
                            ⚑ {interest.anomaly_flags[0]}
                          </span>
                        )}
                        {s.anomaly_notes && (
                          <span className="font-mono text-[8px] text-red-400/80">
                            ⚠ {s.anomaly_notes.slice(0, 80)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-gold font-bold">
                      {pct(s.confidence_score)}
                    </span>

                    {s.status === 'pending' && (
                      <>
                        <button
                          onClick={() => review(s.id, 'approved')}
                          disabled={isReviewing}
                          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
                        >
                          {isReviewing ? '…' : '✓ Approve'}
                        </button>
                        <button
                          onClick={() => review(s.id, 'needs_research')}
                          disabled={isReviewing}
                          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
                        >
                          {isReviewing ? '…' : '? Research'}
                        </button>
                        <button
                          onClick={() => review(s.id, 'rejected')}
                          disabled={isReviewing}
                          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-red-400/20 text-red-400/60 hover:bg-red-400/5 transition-colors disabled:opacity-40"
                        >
                          ✗
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-border/50 px-4 py-3 space-y-3 bg-ground-light/5">
                    {s.llm_reasoning && (
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Reasoning</p>
                        <p className="text-sm text-text-secondary">{s.llm_reasoning}</p>
                      </div>
                    )}

                    {interest && (
                      <div className="space-y-1.5">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Scores</p>
                        <ScoreBar label="Surprise" score={interest.surprise_score} color="bg-sky-400" />
                        <ScoreBar label="Bridge" score={interest.bridge_score} color="bg-violet-400" />
                        <ScoreBar label="Covert" score={interest.covert_signal_score} color="bg-red-400" />
                        <ScoreBar label="Temporal" score={interest.temporal_anomaly_score} color="bg-amber-400" />
                        <ScoreBar label="Potential" score={interest.research_potential_score} />
                      </div>
                    )}

                    {s.suggested_new_entities.length > 0 && (
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Suggested Entities to Add</p>
                        <div className="flex flex-wrap gap-1">
                          {s.suggested_new_entities.map((name) => (
                            <span key={name} className="font-mono text-[9px] border border-border px-1.5 py-0.5 text-text-secondary">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="font-mono text-[8px] text-text-tertiary">
                      Generated {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Research Leads ────────────────────────────────────────────────────────────

function LeadsSection() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'new' | 'queued' | 'in_progress' | 'all'>('new');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deepResearching, setDeepResearching] = useState<Record<string, boolean>>({});
  const [updatingStatus, setUpdatingStatus] = useState<Record<string, boolean>>({});

  const load = useCallback(async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/thread/leads?status=${status}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(statusFilter); }, [statusFilter, load]);

  async function updateStatus(id: string, status: string) {
    setUpdatingStatus((u) => ({ ...u, [id]: true }));
    try {
      await fetch(`/api/admin/thread/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } finally {
      setUpdatingStatus((u) => ({ ...u, [id]: false }));
    }
  }

  async function launchDeepResearch(id: string) {
    setDeepResearching((d) => ({ ...d, [id]: true }));
    try {
      const res = await fetch(`/api/admin/thread/leads/${id}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLeads((prev) => prev.map((l) =>
          l.id === id ? { ...l, deep_research_output: data.deep_research, status: 'in_progress' } : l
        ));
      }
    } finally {
      setDeepResearching((d) => ({ ...d, [id]: false }));
    }
  }

  const STATUS_TABS = ['new', 'queued', 'in_progress', 'all'] as const;

  const LENS_COLORS: Record<string, string> = {
    'Archaeological Record': 'text-amber-400',
    'Indigenous Oral Traditions': 'text-emerald-400',
    'Peer-Reviewed Science': 'text-sky-400',
    'Institutional Analysis': 'text-violet-400',
    'Whistleblower & Declassified': 'text-red-400',
    'Cross-Cultural Pattern Analysis': 'text-pink-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="font-serif text-lg text-text-primary">Research Leads</h2>
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
            Auto-generated pitches from high-scoring discoveries (≥ 70% potential)
          </p>
        </div>
        <div className="ml-auto flex border border-border">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${
                statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : leads.length === 0 ? (
        <div className="border border-border bg-ground-light/20 px-6 py-10 text-center space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">No leads yet</p>
          <p className="text-sm text-text-secondary">
            Leads are auto-generated when a discovery scores ≥ 70% research potential.
            Run the queue processor to generate leads from existing candidates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const expanded = expandedId === lead.id;
            const sugg = lead.discovery_suggestions;
            const interest = lead.discovery_interestingness;
            const isDeepResearching = deepResearching[lead.id];
            const isUpdating = updatingStatus[lead.id];

            return (
              <div key={lead.id} className="border border-border bg-ground-light/10">
                {/* Lead header */}
                <div className="px-4 py-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setExpandedId(expanded ? null : lead.id)}
                      className="font-mono text-[9px] text-text-tertiary mt-1 shrink-0"
                    >
                      {expanded ? '▼' : '▶'}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-base text-text-primary leading-snug">{lead.title}</h3>
                      {sugg && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <EntityPill type={sugg.entity_a_type} name={sugg.entity_a_name} />
                          <span className="font-mono text-[8px] text-text-tertiary">↔ {sugg.suggested_relationship_type} ↔</span>
                          <EntityPill type={sugg.entity_b_type} name={sugg.entity_b_name} />
                          <span className="font-mono text-[8px] text-text-tertiary border border-border px-1 py-0.5">
                            {pct(sugg.confidence_score)} confidence
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="font-serif text-lg text-gold">{pct(lead.research_potential_score)}</div>
                        <div className="font-mono text-[7px] text-text-tertiary uppercase">Potential</div>
                      </div>
                      <DepthBadge depth={lead.estimated_research_depth} />
                    </div>
                  </div>

                  {/* Pitch summary */}
                  {lead.pitch_summary && (
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 ml-5">
                      {lead.pitch_summary}
                    </p>
                  )}

                  {/* Lenses + anomaly flags */}
                  <div className="flex flex-wrap gap-2 ml-5">
                    {lead.suggested_lenses.map((lens) => (
                      <span key={lens} className={`font-mono text-[8px] ${LENS_COLORS[lens] ?? 'text-text-tertiary'}`}>
                        ◆ {lens}
                      </span>
                    ))}
                    {interest?.anomaly_flags.slice(0, 2).map((flag) => (
                      <span key={flag} className="font-mono text-[8px] text-amber-400">⚑ {flag}</span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap ml-5">
                    {lead.status === 'new' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'queued')}
                        disabled={isUpdating}
                        className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-gold/30 text-gold hover:bg-gold/5 transition-colors disabled:opacity-40"
                      >
                        + Add to Editorial Queue
                      </button>
                    )}
                    <button
                      onClick={() => launchDeepResearch(lead.id)}
                      disabled={isDeepResearching || !!lead.deep_research_output}
                      className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-violet-400/40 text-violet-400 hover:bg-violet-400/10 transition-colors disabled:opacity-40"
                    >
                      {isDeepResearching ? '⊙ Researching…' : lead.deep_research_output ? '✓ Deep Research Done' : '⊙ Launch Deep Research'}
                    </button>
                    {lead.status !== 'dismissed' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'dismissed')}
                        disabled={isUpdating}
                        className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-red-400/20 text-red-400/50 hover:bg-red-400/5 transition-colors disabled:opacity-40"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-border/50 px-4 py-4 ml-5 space-y-4">
                    {/* Scores */}
                    {interest && (
                      <div className="space-y-1.5">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Interestingness Scores</p>
                        <ScoreBar label="Surprise" score={interest.surprise_score} color="bg-sky-400" />
                        <ScoreBar label="Bridge" score={interest.bridge_score} color="bg-violet-400" />
                        <ScoreBar label="Covert" score={interest.covert_signal_score} color="bg-red-400" />
                        <ScoreBar label="Temporal" score={interest.temporal_anomaly_score} color="bg-amber-400" />
                        <ScoreBar label="Potential" score={interest.research_potential_score} />
                      </div>
                    )}

                    {/* Evidence chain */}
                    {lead.evidence_chain.length > 0 && (
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-2">Evidence Chain</p>
                        <div className="space-y-1">
                          {lead.evidence_chain.map((step, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="font-mono text-[8px] text-text-tertiary mt-0.5">{i + 1}.</span>
                              <div>
                                <span className="font-mono text-[9px] text-sky-400">{step.entity}</span>
                                <span className="font-mono text-[9px] text-text-secondary"> — {step.connection}</span>
                                {step.year && <span className="font-mono text-[8px] text-text-tertiary ml-1">({step.year})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested entities */}
                    {lead.suggested_entities_to_add.length > 0 && (
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Entities to Add</p>
                        <div className="flex flex-wrap gap-1">
                          {lead.suggested_entities_to_add.map((name) => (
                            <span key={name} className="font-mono text-[9px] border border-border px-1.5 py-0.5 text-text-secondary">{name}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Deep research output */}
                    {lead.deep_research_output && (
                      <div className="border border-violet-400/20 bg-violet-400/3 px-3 py-3 space-y-2">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-violet-400 mb-2">Deep Research — Claude Opus</p>

                        {(lead.deep_research_output.refined_title as string) && (
                          <div>
                            <p className="font-mono text-[8px] text-text-tertiary">Refined Title</p>
                            <p className="text-sm text-text-primary">{lead.deep_research_output.refined_title as string}</p>
                          </div>
                        )}

                        {(lead.deep_research_output.executive_summary as string) && (
                          <div>
                            <p className="font-mono text-[8px] text-text-tertiary">Executive Summary</p>
                            <p className="text-sm text-text-secondary">{lead.deep_research_output.executive_summary as string}</p>
                          </div>
                        )}

                        {Array.isArray(lead.deep_research_output.article_outline) && (
                          <div>
                            <p className="font-mono text-[8px] text-text-tertiary mb-1">Article Outline</p>
                            {(lead.deep_research_output.article_outline as Array<{ section: string; key_points: string[] }>).map((section, i) => (
                              <div key={i} className="ml-2 mb-1">
                                <p className="font-mono text-[9px] text-text-primary">{section.section}</p>
                                {section.key_points?.map((pt, j) => (
                                  <p key={j} className="font-mono text-[8px] text-text-tertiary ml-3">• {pt}</p>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        {(lead.deep_research_output.confidence_assessment as string) && (
                          <div>
                            <p className="font-mono text-[8px] text-text-tertiary">Confidence Assessment</p>
                            <p className="text-sm text-text-secondary italic">{lead.deep_research_output.confidence_assessment as string}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="font-mono text-[8px] text-text-tertiary">Generated {new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main THREAD Tab ─────────────────────────────────────────────────────────────

type THREADSection = 'pulse' | 'review' | 'leads';

export function ThreadTab() {
  const [section, setSection] = useState<THREADSection>('pulse');

  const SECTIONS: Array<{ id: THREADSection; label: string }> = [
    { id: 'pulse', label: 'THREAD Pulse' },
    { id: 'review', label: 'Review Queue' },
    { id: 'leads', label: 'Research Leads' },
  ];

  return (
    <div className="space-y-6">
      {/* Section nav */}
      <div className="flex gap-0 border border-border w-fit">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors border-r border-border last:border-r-0 ${
              section === s.id ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'pulse' && <PulseSection />}
      {section === 'review' && <ReviewQueueSection />}
      {section === 'leads' && <LeadsSection />}
    </div>
  );
}
