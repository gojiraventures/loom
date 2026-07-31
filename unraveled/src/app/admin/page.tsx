'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllAgents } from '@/lib/research/agents/definitions';
import type { AgentDefinition } from '@/lib/research/types';
import { ThreadTab } from './ThreadTab';
import { AnalyticsTab } from './AnalyticsTab';
import { PromoCodesTab } from './PromoCodesTab';
import { EditorialTab } from './EditorialTab';
import { ContentHealthTab } from './ContentHealthTab';
import { AdminShell } from './_components/AdminShell';
import { AdminSidebar } from './_components/AdminSidebar';
import type { SidebarGroup } from './_components/AdminSidebar';
import { CommandCenterView } from './_components/CommandCenterView';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LAYER_COLORS: Record<string, string> = {
  research: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  convergence: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  adversarial: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  governance: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
  output: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  synthesis: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
};


function OceanBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase text-text-tertiary w-12 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-gold/60 rounded-full" style={{ width: `${value * 100}%` }} />
      </div>
      <span className="font-mono text-[9px] text-text-tertiary w-6 text-right">{Math.round(value * 100)}</span>
    </div>
  );
}

// ── Agents Tab ────────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentDefinition }) {
  const [open, setOpen] = useState(false);
  const [showAllExpertise, setShowAllExpertise] = useState(false);
  const layerClass = LAYER_COLORS[agent.layer] ?? 'text-text-tertiary border-border';

  return (
    <div className="border border-border bg-ground-light/40">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-4 hover:bg-ground-light/80 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-text-primary font-medium">{agent.name}</span>
            <span className={`font-mono text-[9px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${layerClass}`}>
              {agent.layer}
            </span>
            <span className="font-mono text-[9px] text-text-tertiary">{agent.llm.provider} · {agent.llm.model.replace('claude-', '').replace('gemini-', '')}</span>
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">{agent.domain}</p>
        </div>
        <span className="text-text-tertiary text-sm mt-0.5 shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border space-y-4">
          <p className="text-sm text-text-secondary mt-3 leading-relaxed">{agent.description}</p>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">OCEAN Profile</div>
              <div className="space-y-1.5">
                <OceanBar label="Open" value={agent.ocean.openness} />
                <OceanBar label="Cons" value={agent.ocean.conscientiousness} />
                <OceanBar label="Extr" value={agent.ocean.extraversion} />
                <OceanBar label="Agre" value={agent.ocean.agreeableness} />
                <OceanBar label="Neur" value={agent.ocean.neuroticism} />
              </div>
            </div>
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Calibration</div>
              <div className="space-y-1.5">
                <OceanBar label="Spec" value={agent.calibration.speculative_vs_conservative} />
                <OceanBar label="Dept" value={agent.calibration.detail_depth} />
                <OceanBar label="Cite" value={agent.calibration.citation_strictness} />
                <OceanBar label="Idsc" value={agent.calibration.interdisciplinary_reach} />
                <OceanBar label="Conf" value={agent.calibration.confidence_threshold} />
                <OceanBar label="Cont" value={agent.calibration.contrarian_tendency} />
              </div>
            </div>
          </div>

          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">
              Primary Expertise ({agent.primaryExpertise.length})
            </div>
            <ul className="space-y-0.5">
              {(showAllExpertise ? agent.primaryExpertise : agent.primaryExpertise.slice(0, 8)).map((e, i) => (
                <li key={i} className="text-xs text-text-secondary flex gap-2">
                  <span className="text-gold/50 shrink-0">·</span>
                  <span>{e}</span>
                </li>
              ))}
              {agent.primaryExpertise.length > 8 && (
                <li>
                  <button
                    onClick={() => setShowAllExpertise((s) => !s)}
                    className="text-xs text-sky-400 hover:text-sky-300 pl-4 transition-colors"
                  >
                    {showAllExpertise ? '▲ show less' : `+${agent.primaryExpertise.length - 8} more`}
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div className="flex gap-4 text-xs text-text-tertiary font-mono">
            <span>RACI default: <span className="text-text-secondary">{agent.defaultRaciRole}</span></span>
            <span>Temp: <span className="text-text-secondary">{agent.llm.temperature}</span></span>
            <span>Tokens: <span className="text-text-secondary">{agent.llm.maxTokens.toLocaleString()}</span></span>
          </div>

          {agent.canEscalateTo.length > 0 && (
            <div className="text-xs text-text-tertiary">
              Escalates to: {agent.canEscalateTo.join(', ')}
            </div>
          )}
          {agent.requiresReviewFrom.length > 0 && (
            <div className="text-xs text-text-tertiary">
              Review required from: {agent.requiresReviewFrom.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgentsTab() {
  const agents = getAllAgents();
  const [layerFilter, setLayerFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const layers = ['all', ...Array.from(new Set(agents.map((a) => a.layer)))];

  const filtered = agents.filter((a) => {
    if (layerFilter !== 'all' && a.layer !== layerFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.domain.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl mb-1">Agent Registry</h2>
        <p className="text-sm text-text-secondary">{agents.length} agents across {layers.length - 1} layers</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          className="bg-ground-light border border-border px-3 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded w-56"
          placeholder="Search agents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
          {layers.map((l) => (
            <button
              key={l}
              onClick={() => setLayerFilter(l)}
              className={`font-mono text-[9px] uppercase tracking-widest px-2 py-1 border rounded transition-colors ${
                layerFilter === l
                  ? 'border-gold/50 text-gold bg-gold/10'
                  : 'border-border text-text-tertiary hover:border-gold/30 hover:text-text-secondary'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-px">
        {filtered.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-text-tertiary py-8 text-center">No agents match filter</div>
        )}
      </div>
    </div>
  );
}

// ── Media Tab ─────────────────────────────────────────────────────────────────

interface MediaRow {
  id: string;
  topic: string;
  type: string;
  title: string;
  channel_name: string | null;
  url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  approved: boolean;
  featured: boolean;
  is_anchor: boolean;
  sort_order: number;
  quality_score: number;
  anchor_key: string | null;
}

function MediaTab() {
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{ checked: number; removed: number; dead: { id: string; title: string; url: string; reason: string }[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterTopic.trim()
      ? `/api/admin/anchor-media?topic=${encodeURIComponent(filterTopic.trim())}`
      : '/api/admin/anchor-media';
    const res = await fetch(url);
    const data = await res.json();
    setMedia(data.media ?? []);
    setLoading(false);
  }, [filterTopic]);

  useEffect(() => { load(); }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    setSyncResult('');
    const res = await fetch('/api/admin/anchor-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync_all: true }),
    });
    const data = await res.json();
    setSyncResult(`Synced ${data.synced} items across ${data.topics?.length ?? 0} topics`);
    setSyncing(false);
    load();
  };

  const validateLinks = async () => {
    if (!confirm('This will check all approved media URLs and delete any that are dead. Continue?')) return;
    setValidating(true);
    setValidateResult(null);
    const res = await fetch('/api/admin/media/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: filterTopic.trim() || undefined }),
    });
    const data = await res.json();
    setValidateResult(data);
    setValidating(false);
    load();
  };

  const toggle = async (id: string, field: 'approved' | 'featured', current: boolean) => {
    await fetch('/api/admin/anchor-media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: !current }),
    });
    setMedia((m) => m.map((r) => r.id === id ? { ...r, [field]: !current } : r));
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this media item?')) return;
    await fetch('/api/admin/anchor-media', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setMedia((m) => m.filter((r) => r.id !== id));
  };

  const typeColor = (type: string) =>
    type === 'youtube' ? 'text-red-400 border-red-400/30' : 'text-sky-400 border-sky-400/30';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl mb-1">Media Library</h2>
          <p className="text-sm text-text-secondary">
            Anchor media (curated) + discovered media (YouTube/podcast API). Approve items to show on topic pages.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={syncAll}
            disabled={syncing}
            className="font-mono text-[10px] uppercase tracking-widest border border-gold/40 text-gold px-3 py-2 hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync All Anchors'}
          </button>
          <button
            onClick={validateLinks}
            disabled={validating}
            className="font-mono text-[10px] uppercase tracking-widest border border-red-400/40 text-red-400 px-3 py-2 hover:bg-red-400/10 transition-colors disabled:opacity-50"
          >
            {validating ? 'Checking…' : 'Validate & Purge Dead Links'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="font-mono text-[10px] uppercase tracking-widest border border-border text-text-tertiary px-3 py-2 hover:border-gold/30 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="border border-emerald-400/30 bg-emerald-400/5 px-4 py-2 font-mono text-[11px] text-emerald-400">
          {syncResult}
        </div>
      )}

      {validateResult && (
        <div className={`border px-4 py-3 font-mono text-[11px] space-y-1 ${validateResult.removed > 0 ? 'border-red-400/30 bg-red-400/5' : 'border-emerald-400/30 bg-emerald-400/5'}`}>
          <div className={validateResult.removed > 0 ? 'text-red-400' : 'text-emerald-400'}>
            Checked {validateResult.checked} · Removed {validateResult.removed} dead links · {validateResult.checked - validateResult.removed} healthy
          </div>
          {validateResult.dead.map((d) => (
            <div key={d.id} className="text-text-tertiary pl-2 border-l border-red-400/20">
              {d.title || d.url} — <span className="text-red-400/70">{d.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <input
          className="bg-ground-light border border-border px-3 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded w-72"
          placeholder="Filter by topic key…"
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button
          onClick={load}
          className="font-mono text-[10px] uppercase tracking-widest border border-border text-text-tertiary px-3 py-1.5 hover:border-gold/30 transition-colors"
        >
          Filter
        </button>
      </div>

      {loading && <p className="text-sm text-text-tertiary font-mono">Loading…</p>}

      {!loading && media.length === 0 && (
        <div className="border border-border p-8 text-center">
          <p className="text-text-tertiary text-sm mb-3">No media found. Click Sync All Anchors to populate from the seed registry.</p>
        </div>
      )}

      <div className="space-y-px">
        {media.map((item) => (
          <div key={item.id} className={`border p-4 ${item.is_anchor ? 'border-gold/20 bg-gold/3' : 'border-border'}`}>
            <div className="flex gap-3">
              {/* Thumb */}
              {item.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.thumbnail_url} alt={item.title} className="w-16 h-10 object-cover shrink-0 rounded" />
              ) : (
                <div className="w-16 h-10 bg-ground-light border border-border/50 rounded shrink-0 flex items-center justify-center text-text-tertiary text-lg">
                  {item.type === 'youtube' ? '▶' : '🎧'}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {item.is_anchor && (
                        <span className="font-mono text-[8px] uppercase tracking-widest border border-gold/50 text-gold bg-gold/10 px-1">Anchor</span>
                      )}
                      {item.featured && (
                        <span className="font-mono text-[8px] uppercase tracking-widest border border-amber-400/50 text-amber-400 px-1">Featured</span>
                      )}
                      <span className={`font-mono text-[8px] uppercase tracking-widest border px-1 ${typeColor(item.type)}`}>
                        {item.type}
                      </span>
                      <span className="font-mono text-[8px] text-text-tertiary border border-border px-1">{item.topic}</span>
                    </div>
                    <p className="text-sm text-text-primary leading-snug line-clamp-1">{item.title}</p>
                    {item.channel_name && (
                      <p className="font-mono text-[9px] text-text-tertiary mt-0.5">{item.channel_name}</p>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggle(item.id, 'approved', item.approved)}
                      className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${
                        item.approved
                          ? 'border-emerald-400/50 text-emerald-400 bg-emerald-400/10'
                          : 'border-border text-text-tertiary hover:border-emerald-400/30'
                      }`}
                    >
                      {item.approved ? '✓ Live' : 'Approve'}
                    </button>
                    <button
                      onClick={() => toggle(item.id, 'featured', item.featured)}
                      className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${
                        item.featured
                          ? 'border-gold/50 text-gold bg-gold/10'
                          : 'border-border text-text-tertiary hover:border-gold/30'
                      }`}
                    >
                      ★
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[8px] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1 rounded transition-colors"
                    >
                      ↗
                    </a>
                    <button
                      onClick={() => remove(item.id)}
                      className="font-mono text-[8px] uppercase tracking-widest border border-border text-text-tertiary hover:text-red-400 hover:border-red-400/30 px-2 py-1 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ollama Status Banner ──────────────────────────────────────────────────────

function OllamaBanner() {
  const [status, setStatus] = useState<{ enabled: boolean; online?: boolean; url?: string } | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ollama-status');
      if (res.ok) setStatus(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [check]);

  if (!status?.enabled || status.online !== false) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/5">
      <div className="max-w-5xl mx-auto px-6 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-xs">⚠</span>
          <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest">Ollama offline</span>
          <span className="text-[11px] text-text-tertiary">
            — {status.url} is unreachable. Research agents will fall back to cloud providers (costs apply).
          </span>
        </div>
        <button
          onClick={check}
          className="font-mono text-[9px] uppercase tracking-widest text-amber-400/60 hover:text-amber-400 transition-colors shrink-0"
        >
          Re-check
        </button>
      </div>
    </div>
  );
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────

type SubmissionStatus = 'pending' | 'backlogged' | 'actioned' | 'dismissed';
type SubmissionType = 'person' | 'institution' | 'research';

interface Submission {
  id: string;
  submission_type: SubmissionType;
  content: string | null;
  description: string | null;
  email: string | null;
  status: SubmissionStatus;
  notes: string | null;
  reviewer_notes: string | null;
  moderation_status: 'clean' | 'flagged';
  moderation_reason: string | null;
  created_at: string;
  actioned_at: string | null;
}

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, { label: string; color: string }> = {
  person:      { label: 'Person',      color: 'text-sky-400 border-sky-400/30' },
  institution: { label: 'Institution', color: 'text-violet-400 border-violet-400/30' },
  research:    { label: 'Research',    color: 'text-amber-400 border-amber-400/30' },
};

const INBOX_FILTER_LABELS: Record<SubmissionStatus | 'all' | 'flagged', string> = {
  all:        'All',
  pending:    'Pending',
  backlogged: 'Backlogged',
  actioned:   'Actioned',
  dismissed:  'Dismissed',
  flagged:    '⚑ Flagged',
};

function InboxTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SubmissionStatus | 'all' | 'flagged'>('pending');
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions?status=${filter}`);
      const data = await res.json() as { submissions: Submission[] };
      setSubmissions(data.submissions ?? []);
    } catch { /* empty */ } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: SubmissionStatus) => {
    setActionStatus((s) => ({ ...s, [id]: status }));
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const saveNote = async (id: string) => {
    await fetch('/api/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes: noteValues[id] ?? '' }),
    });
    setEditingNote(null);
    load();
  };

  const del = async (id: string) => {
    await fetch(`/api/submissions?id=${id}`, { method: 'DELETE' });
    load();
  };

  const pending = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-secondary">
            Community Submissions
          </h2>
          {pending > 0 && filter !== 'pending' && (
            <span className="font-mono text-[9px] bg-gold/20 text-gold border border-gold/30 px-1.5 py-0.5 rounded">
              {pending} pending
            </span>
          )}
        </div>
        <button
          onClick={load}
          className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary border border-border px-2 py-1 rounded transition-colors"
        >
          ↺ Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {(Object.entries(INBOX_FILTER_LABELS) as [SubmissionStatus | 'all' | 'flagged', string][]).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border-b-2 transition-colors ${
              filter === f
                ? 'border-gold text-gold'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-mono text-[9px] text-text-tertiary animate-pulse">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="font-mono text-[9px] text-text-tertiary">
          {filter === 'pending' ? 'No pending submissions.' : `No ${filter} submissions.`}
        </p>
      ) : (
        <div className="space-y-px">
          {submissions.map((s) => {
            const typeConfig = SUBMISSION_TYPE_LABELS[s.submission_type];
            const isEditingNote = editingNote === s.id;
            return (
              <div key={s.id} className="border border-border bg-ground-light/20 p-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className="font-mono text-[8px] text-text-tertiary">
                      {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {s.email && (
                      <span className="font-mono text-[8px] text-text-tertiary">· {s.email}</span>
                    )}
                  </div>
                  <button
                    onClick={() => del(s.id)}
                    className="font-mono text-[8px] text-red-400/50 hover:text-red-400 transition-colors shrink-0"
                  >
                    Delete
                  </button>
                </div>

                {/* Moderation flag */}
                {s.moderation_status === 'flagged' && (
                  <div className="mb-3 flex items-start gap-2 px-3 py-2 border border-red-400/30 bg-red-400/5">
                    <span className="font-mono text-[8px] uppercase text-red-400 shrink-0 mt-0.5">⚑ Flagged</span>
                    <p className="font-mono text-[9px] text-red-400/80">{s.moderation_reason ?? 'Content policy violation'}</p>
                  </div>
                )}

                {/* Content */}
                <p className="text-sm text-text-secondary leading-relaxed mb-3">{s.content ?? s.description}</p>

                {/* Note */}
                {isEditingNote ? (
                  <div className="mb-3 flex gap-2">
                    <input
                      type="text"
                      value={noteValues[s.id] ?? s.notes ?? s.reviewer_notes ?? ''}
                      onChange={(e) => setNoteValues((n) => ({ ...n, [s.id]: e.target.value }))}
                      placeholder="Add a note…"
                      className="flex-1 bg-ground border border-border px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-gold/40"
                      autoFocus
                    />
                    <button
                      onClick={() => saveNote(s.id)}
                      className="font-mono text-[8px] uppercase text-gold border border-gold/30 px-2 py-1 hover:bg-gold/5"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingNote(null)}
                      className="font-mono text-[8px] uppercase text-text-tertiary border border-border px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : s.notes ? (
                  <p
                    className="font-mono text-[9px] text-text-tertiary italic mb-3 cursor-pointer hover:text-text-secondary"
                    onClick={() => { setEditingNote(s.id); setNoteValues((n) => ({ ...n, [s.id]: s.notes ?? '' })); }}
                  >
                    Note: {s.notes}
                  </p>
                ) : null}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {s.status !== 'actioned' && (
                    <button
                      onClick={() => setStatus(s.id, 'actioned')}
                      className="font-mono text-[8px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 px-2 py-1 transition-colors"
                    >
                      ✓ Actioned
                    </button>
                  )}
                  {s.status !== 'backlogged' && (
                    <button
                      onClick={() => setStatus(s.id, 'backlogged')}
                      className="font-mono text-[8px] uppercase tracking-widest text-amber-400 border border-amber-400/30 hover:bg-amber-400/10 px-2 py-1 transition-colors"
                    >
                      → Backlog
                    </button>
                  )}
                  {s.status !== 'dismissed' && (
                    <button
                      onClick={() => setStatus(s.id, 'dismissed')}
                      className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border hover:border-red-400/30 hover:text-red-400 px-2 py-1 transition-colors"
                    >
                      Dismiss
                    </button>
                  )}
                  {s.status !== 'pending' && (
                    <button
                      onClick={() => setStatus(s.id, 'pending')}
                      className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border hover:text-text-secondary px-2 py-1 transition-colors"
                    >
                      ↺ Reopen
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingNote(s.id); setNoteValues((n) => ({ ...n, [s.id]: s.notes ?? '' })); }}
                    className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border hover:text-text-secondary px-2 py-1 transition-colors"
                  >
                    + Note
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Admin Page ────────────────────────────────────────────────────────────────

// TabId used by inline components above.
const TABS = [
  { id: 'analytics' }, { id: 'inbox' }, { id: 'media' },
  { id: 'agents' }, { id: 'thread' }, { id: 'health' }, { id: 'editorial' }, { id: 'promo' },
] as const;

type TabId = typeof TABS[number]['id'];
type ActiveView = TabId | 'command-center';

// ── Grouped sidebar navigation ────────────────────────────────────────────────
const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [
      { id: 'command-center', label: 'Command Center', href: '/admin/command-center' },
    ],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio-kanban', label: 'Studio', href: '/admin/studio' },
      { id: 'thread', label: 'Discovery' },
      { id: 'media',  label: 'Media Library' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers',  label: 'Dossier Workshop', href: '/admin/dossiers' },
      { id: 'health',    label: 'Content Health', href: '/admin/health' },
      { id: 'editorial', label: 'Editorial' },
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
      { id: 'distribution-desk', label: 'Distribution Desk', href: '/admin/distribution' },
      { id: 'promo', label: 'Promo Codes' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'agents',    label: 'Agents' },
      { id: 'inbox',     label: 'Inbox' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'services',  label: 'Service Health', href: '/admin/services' },
    ],
  },
];


export default function AdminPage() {
  const [view, setView] = useState<ActiveView>('command-center');

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={SIDEBAR_GROUPS}
          activeView={view}
          onSelect={(v) => setView(v as ActiveView)}
        />
      }
    >
      <OllamaBanner />

      <div className="px-6 py-8 max-w-5xl">
        {view === 'command-center' && <CommandCenterView />}
        {view === 'analytics'    && <AnalyticsTab />}
        {view === 'inbox'        && <InboxTab />}
        {view === 'media'        && <MediaTab />}
        {view === 'agents'       && <AgentsTab />}
        {view === 'thread'       && <ThreadTab />}
        {view === 'health'       && <ContentHealthTab />}
        {view === 'editorial'    && <EditorialTab />}
        {view === 'promo'        && <PromoCodesTab />}
      </div>
    </AdminShell>
  );
}
