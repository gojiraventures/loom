'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllAgents } from '@/lib/research/agents/definitions';
import type { AgentDefinition } from '@/lib/research/types';
import { SocialTab } from './SocialTab';
import { IntelligenceTab } from './IntelligenceTab';
import { ThreadTab } from './ThreadTab';
import { AnalyticsTab } from './AnalyticsTab';
import { PromoCodesTab } from './PromoCodesTab';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (res.status === 504 || res.status === 502 || res.status === 503 || res.status === 408) {
      throw new Error(
        `Request timed out (${res.status}). The pipeline runs for 3–5 minutes — try again or check Vercel logs.`
      );
    }
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComponentRecord {
  id:      string;
  label:   string;
  reason:  string;
  enabled: boolean;
  data:    unknown;
}

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
  recommended_components: ComponentRecord[] | null;
  selected_components: ComponentRecord[] | null;
  driving_question?: string | null;
  session_id?: string;
}

interface Session {
  id: string;
  topic: string;
  title: string;
  status: string;
  session_type: string;
  research_questions: string[];
  synthesized_output: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_log: string[];
  pipeline_locked: boolean;
}

interface BacklogItem {
  id: string;
  title: string;
  topic: string;
  angle: string | null;
  research_questions: string[];
  key_sources: string[];
  status: 'pending' | 'launched' | 'archived';
  launched_at: string | null;
  launched_session_id: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LAYER_COLORS: Record<string, string> = {
  research: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  convergence: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  adversarial: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  governance: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
  output: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  synthesis: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
};

const STATUS_COLORS: Record<string, string> = {
  complete: 'text-emerald-400',
  failed: 'text-red-400',
  pending: 'text-text-tertiary',
  researching: 'text-sky-400',
  researched: 'text-sky-400',
  cross_validating: 'text-sky-400',
  converging: 'text-amber-400',
  debating: 'text-orange-400',
  synthesizing: 'text-violet-400',
  pending_review: 'text-gold',
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

// ── Launch Tab ────────────────────────────────────────────────────────────────

const SESSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  researching: 'Layer 1 — Research agents',
  researched: 'Layer 1 complete — launching analysis',
  cross_validating: 'Layer 2 — Cross-validation',
  converging: 'Layer 3 — Convergence analysis',
  debating: 'Layer 4 — Adversarial debate',
  synthesizing: 'Layer 5 — Synthesis',
  complete: 'Complete',
  failed: 'Failed',
  pending_review: 'Awaiting Review',
};

const MAX_FOUNDATION_QUESTIONS = 5;
const MAX_ENHANCE_QUESTIONS = 9;

function LaunchTab() {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [sources, setSources] = useState('');
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'queuing' | 'done' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const addQuestion = () => {
    if (questions.length < MAX_FOUNDATION_QUESTIONS) setQuestions((q) => [...q, '']);
  };
  const removeQuestion = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, val: string) =>
    setQuestions((q) => q.map((qv, idx) => (idx === i ? val : qv)));

  const launch = async () => {
    const validQuestions = questions.filter((q) => q.trim());
    if (!topic.trim() || !title.trim()) return;

    setLaunchStatus('queuing');
    setSessionId(null);
    setPipelineStatus('pending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/research/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: title.trim(),
          research_questions: validQuestions,
          description: description.trim() || undefined,
          source_urls: sources.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');

      const id = data.session_id as string;
      setSessionId(id);
      setLaunchStatus('done');
      setPipelineStatus(`${data.total_jobs ?? '?'} jobs queued — monitor in the Jobs tab`);
    } catch (err) {
      setLaunchStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const isRunning = launchStatus === 'queuing';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl mb-1">Launch Research Session</h2>
        <p className="text-sm text-text-secondary">
          Fires the full 65-agent pipeline. You can close this tab — the pipeline runs on the server.
        </p>
      </div>

      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            Topic (internal key)
          </label>
          <input
            className="w-full bg-ground-light border border-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded"
            placeholder="e.g. the-great-flood"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            Display Title
          </label>
          <input
            className="w-full bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
            placeholder="e.g. The Great Flood"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            Research Questions <span className="normal-case tracking-normal opacity-60">(optional — agents research broadly without them)</span>
          </label>
          <p className="text-[10px] text-text-tertiary mb-2 font-mono">
            Max {MAX_FOUNDATION_QUESTIONS} per run. Add more later via Enhance on the Content tab.
          </p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                  placeholder={`Question ${i + 1}`}
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                />
                <button
                  onClick={() => removeQuestion(i)}
                  className="px-2 text-text-tertiary hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {questions.length < MAX_FOUNDATION_QUESTIONS ? (
            <button
              onClick={addQuestion}
              className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
            >
              + Add question
            </button>
          ) : (
            <p className="mt-2 font-mono text-[10px] text-gold/60">
              Maximum {MAX_FOUNDATION_QUESTIONS} questions reached — use Enhance to add more after publishing.
            </p>
          )}
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            Topic Description <span className="normal-case tracking-normal opacity-60">(optional — helps agents understand scope)</span>
          </label>
          <textarea
            className="w-full bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
            rows={3}
            placeholder="e.g. This covers ancient flood myths across world religions and their possible geological origins. Focus on pre-Holocene evidence..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
            Key Sources / URLs <span className="normal-case tracking-normal opacity-60">(optional — one per line, supplementary hints for agents)</span>
          </label>
          <textarea
            className="w-full bg-ground-light border border-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
            rows={3}
            placeholder={"https://example.com/paper\nGraham Hancock – Fingerprints of the Gods\nhttps://ncbi.nlm.nih.gov/..."}
            value={sources}
            onChange={(e) => setSources(e.target.value)}
          />
          <p className="mt-1 font-mono text-[9px] text-text-tertiary">Agents will use these as starting hints but will independently verify and find better sources.</p>
        </div>

        <button
          onClick={launch}
          disabled={isRunning}
          className="font-mono text-sm tracking-wide px-6 py-3 border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {launchStatus === 'queuing' ? 'Starting…' : 'Launch →'}
        </button>
      </div>

      {launchStatus !== 'idle' && (
        <div className="max-w-2xl space-y-3">
          {/* Status header */}
          <div className={`font-mono text-[10px] uppercase tracking-widest ${
            launchStatus === 'error' ? 'text-red-400' : launchStatus === 'done' ? 'text-emerald-400' : 'text-sky-400'
          }`}>
            {launchStatus === 'queuing' ? 'Queuing jobs…'
              : launchStatus === 'done' ? 'Jobs queued — switch to the Jobs tab to monitor'
              : 'Failed'}
          </div>

          {/* Job count summary */}
          {launchStatus === 'done' && pipelineStatus && (
            <p className="font-mono text-[10px] text-text-tertiary">{pipelineStatus}</p>
          )}

          {/* Session ID for manual tracking */}
          {sessionId && (
            <div className="font-mono text-[10px] text-text-tertiary">
              Session: <span className="text-text-secondary">{sessionId}</span>
              <span className="ml-3 opacity-60">— safe to close this tab</span>
            </div>
          )}

          {/* Error details */}
          {launchStatus === 'error' && errorMsg && (
            <pre className="bg-ground-light border border-red-400/20 rounded p-3 text-[11px] font-mono text-red-400 overflow-auto max-h-40 whitespace-pre-wrap">
              {errorMsg}
            </pre>
          )}
        </div>
      )}
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

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rerunStatus, setRerunStatus] = useState<Record<string, string>>({});
  const [rerunSessionId, setRerunSessionId] = useState<Record<string, string>>({});
  const [continueStatus, setContinueStatus] = useState<Record<string, string>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, string>>({});
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const pollRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // Prevent duplicate /continue calls for rerun sessions

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sessions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { Object.values(pollRefs.current).forEach(clearInterval); }, []);

  const rerun = async (s: Session) => {
    setRerunStatus((r) => ({ ...r, [s.id]: 'queuing…' }));
    try {
      const res = await fetch('/api/research/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: s.topic,
          title: s.title,
          research_questions: s.research_questions ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      const newId = data.session_id as string;
      setRerunSessionId((r) => ({ ...r, [s.id]: newId }));
      setRerunStatus((r) => ({ ...r, [s.id]: `${data.total_jobs ?? '?'} jobs queued — see Jobs tab` }));
    } catch (err) {
      setRerunStatus((r) => ({ ...r, [s.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const continueSession = async (s: Session) => {
    setContinueStatus((r) => ({ ...r, [s.id]: 'continuing…' }));
    try {
      const res = await fetch(`/api/research/${s.id}/continue`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setContinueStatus((r) => ({ ...r, [s.id]: `error: ${(err as { error?: string }).error ?? res.statusText}` }));
        return;
      }
      pollRefs.current[`continue_${s.id}`] = setInterval(async () => {
        try {
          const pr = await fetch(`/api/research/${s.id}`);
          if (!pr.ok) return;
          const pd = await pr.json();
          const st = pd?.session?.status ?? 'pending';
          if (st === 'complete') {
            clearInterval(pollRefs.current[`continue_${s.id}`]);
            setContinueStatus((r) => ({ ...r, [s.id]: 'complete ✓' }));
            load();
          } else if (st === 'failed') {
            clearInterval(pollRefs.current[`continue_${s.id}`]);
            setContinueStatus((r) => ({ ...r, [s.id]: 'failed' }));
          } else {
            setContinueStatus((r) => ({ ...r, [s.id]: `${SESSION_STATUS_LABELS[st] ?? st}…` }));
          }
        } catch { /* blip */ }
      }, 8000);
    } catch (err) {
      setContinueStatus((r) => ({ ...r, [s.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const canContinue = (s: Session) =>
    ['researched', 'failed', 'cross_validating', 'converging', 'debating', 'synthesizing'].includes(s.status) &&
    !s.pipeline_locked;
  const canRerun = (status: string) => ['failed', 'researched', 'cross_validating', 'converging', 'debating', 'synthesizing'].includes(status);

  const reviewSession = async (s: Session, action: 'approve' | 'reject') => {
    setReviewStatus((r) => ({ ...r, [s.id]: action === 'approve' ? 'approving…' : 'rejecting…' }));
    try {
      const res = await fetch('/api/admin/review-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: s.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      if (action === 'approve') {
        setReviewStatus((r) => ({ ...r, [s.id]: `approved ✓ — ${data.findingsUsed} findings, score ${data.convergenceScore}` }));
      } else {
        setReviewStatus((r) => ({ ...r, [s.id]: 'rejected' }));
      }
      load();
    } catch (err) {
      setReviewStatus((r) => ({ ...r, [s.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl mb-1">Research Sessions</h2>
          <p className="text-sm text-text-secondary">Last 50 sessions from Supabase</p>
        </div>
        <button
          onClick={load}
          className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors border border-border px-3 py-1.5 rounded"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm text-text-tertiary">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="text-sm text-text-tertiary border border-border rounded p-8 text-center">
          No sessions yet. Launch one from the Launch tab.
        </div>
      )}

      {/* Pending Review queue */}
      {sessions.some((s) => s.status === 'pending_review') && (
        <div className="space-y-px">
          <div className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">
            Pending Review — Enhancement Rounds
          </div>
          {sessions.filter((s) => s.status === 'pending_review').map((s) => (
            <div key={s.id} className="border border-gold/30 bg-gold/5 px-4 py-3 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-text-primary font-medium">{s.title}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gold">Enhancement</span>
                    <span className="font-mono text-[9px] text-text-tertiary">{s.research_questions?.length ?? 0} questions</span>
                  </div>
                  <div className="text-xs text-text-tertiary mt-0.5 font-mono">{s.topic}</div>
                  <ul className="mt-1 space-y-0.5">
                    {s.research_questions?.map((q, i) => (
                      <li key={i} className="text-[10px] text-text-secondary flex gap-2">
                        <span className="text-gold/40 shrink-0">·</span><span>{q}</span>
                      </li>
                    ))}
                  </ul>
                  {reviewStatus[s.id] && (
                    <div className={`mt-1.5 font-mono text-[9px] ${reviewStatus[s.id].startsWith('error') ? 'text-red-400' : reviewStatus[s.id].startsWith('approved') ? 'text-emerald-400' : reviewStatus[s.id] === 'rejected' ? 'text-red-400' : 'text-text-tertiary'}`}>
                      {reviewStatus[s.id]}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="font-mono text-[9px] text-text-tertiary">
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}
                  </div>
                  {!reviewStatus[s.id] && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => reviewSession(s, 'approve')}
                        className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10 px-2 py-1 rounded transition-colors"
                      >
                        Approve →
                      </button>
                      <button
                        onClick={() => reviewSession(s, 'reject')}
                        className="font-mono text-[9px] uppercase tracking-widest text-red-400 border border-red-400/30 hover:bg-red-400/10 px-2 py-1 rounded transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Preview synthesis if available */}
              {s.synthesized_output && (
                <div>
                  <button
                    onClick={() => setExpandedPreview(expandedPreview === s.id ? null : s.id)}
                    className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
                  >
                    {expandedPreview === s.id ? '▲ Hide preview' : '▼ Preview synthesis'}
                  </button>
                  {expandedPreview === s.id && (
                    <div className="mt-2 space-y-2 border-t border-gold/20 pt-2">
                      {s.synthesized_output?.executive_summary != null && (
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {String(s.synthesized_output.executive_summary).slice(0, 500)}…
                        </p>
                      )}
                      {Array.isArray(s.synthesized_output?.jaw_drop_layers) && (s.synthesized_output.jaw_drop_layers as unknown[]).length > 0 && (
                        <div className="font-mono text-[9px] text-gold">
                          {(s.synthesized_output.jaw_drop_layers as unknown[]).length} jaw-drop layers · score {s.synthesized_output.convergence_score as number}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="font-mono text-[9px] text-text-tertiary">{s.id}</div>
            </div>
          ))}
        </div>
      )}

      {/* All sessions */}
      <div className="space-y-px">
        {sessions.filter((s) => s.status !== 'pending_review').map((s) => (
          <div key={s.id} className="border border-border bg-ground-light/40 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-primary font-medium">{s.title}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${STATUS_COLORS[s.status] ?? 'text-text-tertiary'}`}>
                    {s.status}
                  </span>
                  {s.session_type === 'enhancement' && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gold/60 border border-gold/20 px-1 rounded">
                      enhancement
                    </span>
                  )}
                </div>
                <div className="text-xs text-text-tertiary mt-0.5 font-mono">{s.topic}</div>
                {s.error_log?.length > 0 && (
                  <div className="text-xs text-red-400 mt-1">{s.error_log[s.error_log.length - 1]}</div>
                )}
                {rerunStatus[s.id] && (
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className={`font-mono text-[9px] ${rerunStatus[s.id].startsWith('error') || rerunStatus[s.id] === 'failed' ? 'text-red-400' : rerunStatus[s.id] === 'complete ✓' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {rerunStatus[s.id]}
                    </span>
                    {rerunSessionId[s.id] && rerunStatus[s.id] !== 'complete ✓' && rerunStatus[s.id] !== 'failed' && (
                      <div className="flex gap-0.5">
                        {['researching','cross_validating','converging','debating','synthesizing','complete'].map((phase) => {
                          const phases = ['researching','cross_validating','converging','debating','synthesizing','complete'];
                          const currentPhase = Object.entries(SESSION_STATUS_LABELS).find(([,v]) => rerunStatus[s.id].startsWith(v.split(' ')[0]))?.[0] ?? '';
                          const done = phases.indexOf(currentPhase) > phases.indexOf(phase);
                          const active = currentPhase === phase;
                          return <div key={phase} className={`w-6 h-0.5 rounded-full transition-colors ${done ? 'bg-emerald-500' : active ? 'bg-sky-400 animate-pulse' : 'bg-border'}`} />;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-right">
                  <div className="font-mono text-[9px] text-text-tertiary">
                    {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}
                  </div>
                  {s.completed_at && s.started_at && (
                    <div className="font-mono text-[9px] text-text-tertiary mt-0.5">
                      {Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000)}s
                    </div>
                  )}
                </div>
                {s.pipeline_locked && !continueStatus[s.id] && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-sky-400 animate-pulse">
                    running…
                  </span>
                )}
                {canContinue(s) && !rerunStatus[s.id] && !continueStatus[s.id] && (
                  <button
                    onClick={() => continueSession(s)}
                    className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border border-sky-400/30 bg-sky-400/5 hover:bg-sky-400/10 px-2 py-1 rounded transition-colors"
                  >
                    Continue →
                  </button>
                )}
                {continueStatus[s.id] && (
                  <span className={`font-mono text-[9px] ${continueStatus[s.id].startsWith('error') || continueStatus[s.id] === 'failed' ? 'text-red-400' : continueStatus[s.id] === 'complete ✓' ? 'text-emerald-400' : 'text-sky-400'}`}>
                    {continueStatus[s.id]}
                  </span>
                )}
                {canRerun(s.status) && !rerunStatus[s.id] && (
                  <button
                    onClick={() => rerun(s)}
                    className="font-mono text-[9px] uppercase tracking-widest text-gold border border-gold/30 bg-gold/5 hover:bg-gold/10 px-2 py-1 rounded transition-colors"
                  >
                    Re-run →
                  </button>
                )}
                <button
                  onClick={async () => {
                    const isActive = !['complete', 'failed'].includes(s.status);
                    const msg = isActive
                      ? `Stop & delete this in-progress session?\n\nAll pending and running jobs will be cancelled. This cannot be undone.`
                      : s.status === 'complete'
                        ? `Delete this session? The published dossier is safe, but raw findings from this session will be removed.`
                        : `Delete this failed session and its partial data?`;
                    if (!confirm(msg)) return;
                    const res = await fetch(`/api/admin/sessions?id=${s.id}`, { method: 'DELETE' });
                    if (!res.ok) { alert(`Delete failed: ${(await res.json()).error}`); return; }
                    setSessions((prev) => prev.filter((x) => x.id !== s.id));
                  }}
                  className={`font-mono text-[9px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${
                    !['complete', 'failed'].includes(s.status)
                      ? 'text-red-400 border-red-400/40 bg-red-400/5 hover:bg-red-400/15'
                      : 'text-text-tertiary hover:text-red-400 border-border hover:border-red-400/30'
                  }`}
                >
                  {!['complete', 'failed'].includes(s.status) ? 'Stop & Delete' : 'Delete'}
                </button>
              </div>
            </div>
            <div className="mt-1">
              <span className="font-mono text-[9px] text-text-tertiary">{s.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [pendingEnhancements, setPendingEnhancements] = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'unpublished' | 'needs_review'>('all');
  const [sortBy, setSortBy] = useState<'unpublished' | 'score' | 'title'>('unpublished');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});
  const [publishStatus, setPublishStatus] = useState<Record<string, string>>({});
  const [enhanceOpen, setEnhanceOpen] = useState<string | null>(null);
  const [enhanceQuestions, setEnhanceQuestions] = useState<Record<string, string[]>>({});
  const [enhanceSources, setEnhanceSources] = useState<Record<string, string>>({});
  const [enhanceStatus, setEnhanceStatus] = useState<Record<string, string>>({});
  const [deepDiveOpen, setDeepDiveOpen] = useState<string | null>(null);
  const [deepDiveFocus, setDeepDiveFocus] = useState<Record<string, string>>({});
  const [deepDiveQuestions, setDeepDiveQuestions] = useState<Record<string, string>>({});
  const [deepDiveStatus, setDeepDiveStatus] = useState<Record<string, string>>({});
  const [resynthStatus, setResynthStatus] = useState<Record<string, string>>({});
  const [featureStatus, setFeatureStatus] = useState<Record<string, string>>({});
  const [drivingQuestions, setDrivingQuestions] = useState<Record<string, string>>({});
  const [drivingQuestionStatus, setDrivingQuestionStatus] = useState<Record<string, string>>({});
  const [llmStatus, setLlmStatus] = useState<Record<string, string>>({});
  const [componentStatus, setComponentStatus] = useState<Record<string, string>>({});
  const [componentsOpen, setComponentsOpen] = useState<string | null>(null);
  const [componentGenStatus, setComponentGenStatus] = useState<Record<string, string>>({});

  const toggleFeature = async (topic: string, currentlyFeatured: boolean) => {
    const next = !currentlyFeatured;
    setFeatureStatus((s) => ({ ...s, [topic]: 'saving…' }));
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, featured: next }),
      });
      if (!res.ok) throw new Error('Failed');
      setFeatureStatus((s) => ({ ...s, [topic]: next ? 'featured ★' : 'unfeatured' }));
      load();
    } catch {
      setFeatureStatus((s) => ({ ...s, [topic]: 'error' }));
    }
  };

  const saveDrivingQuestion = async (topic: string) => {
    const q = drivingQuestions[topic] ?? '';
    setDrivingQuestionStatus((s) => ({ ...s, [topic]: 'saving…' }));
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, driving_question: q }),
      });
      if (!res.ok) throw new Error('Failed');
      setDrivingQuestionStatus((s) => ({ ...s, [topic]: 'saved ✓' }));
      setTimeout(() => setDrivingQuestionStatus((s) => ({ ...s, [topic]: '' })), 2500);
    } catch {
      setDrivingQuestionStatus((s) => ({ ...s, [topic]: 'error' }));
    }
  };

  const generateLLMPerspectives = async (d: Dossier) => {
    setLlmStatus((s) => ({ ...s, [d.topic]: 'generating…' }));
    try {
      const output = d.synthesized_output as Record<string, unknown> | null;
      const res = await fetch('/api/reports/llm-perspectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: d.topic,
          title: d.title,
          summary: (output?.executive_summary as string)?.slice(0, 300) ?? d.summary ?? '',
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setLlmStatus((s) => ({ ...s, [d.topic]: 'done ✓' }));
      load();
    } catch {
      setLlmStatus((s) => ({ ...s, [d.topic]: 'error' }));
    }
  };

  const generateComponentRecs = async (d: Dossier) => {
    setComponentGenStatus((s) => ({ ...s, [d.topic]: 'generating…' }));
    try {
      const res = await fetch('/api/admin/components/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: d.topic }),
      });
      if (!res.ok) throw new Error('Failed');
      setComponentGenStatus((s) => ({ ...s, [d.topic]: '' }));
      load();
    } catch {
      setComponentGenStatus((s) => ({ ...s, [d.topic]: 'error' }));
    }
  };

  const toggleComponent = async (d: Dossier, componentId: string, enabled: boolean) => {
    const recs = d.recommended_components ?? [];
    // Merge recs into selected (start from recs if selected is empty)
    const base: ComponentRecord[] = (d.selected_components ?? []).length > 0
      ? (d.selected_components ?? [])
      : recs;

    const updated = base.map((c) => c.id === componentId ? { ...c, enabled } : c);
    // If the component isn't in selected yet (e.g. from recs only), add it
    const exists = updated.some((c) => c.id === componentId);
    if (!exists) {
      const rec = recs.find((c) => c.id === componentId);
      if (rec) updated.push({ ...rec, enabled });
    }

    setComponentStatus((s) => ({ ...s, [`${d.topic}:${componentId}`]: 'saving…' }));
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: d.topic, selected_components: updated }),
      });
      if (!res.ok) throw new Error('Failed');
      setComponentStatus((s) => ({ ...s, [`${d.topic}:${componentId}`]: enabled ? 'enabled ✓' : 'disabled' }));
      load();
    } catch {
      setComponentStatus((s) => ({ ...s, [`${d.topic}:${componentId}`]: 'error' }));
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all sessions; build topic → most-recent session_id map
      const res = await fetch('/api/admin/sessions');
      const sessData = await res.json();
      const allSessions = (sessData.sessions ?? []) as { id: string; topic: string; status: string; session_type: string; created_at: string }[];

      // Build pending enhancement map: topic → count of pending_review enhancement sessions
      const enhancementMap: Record<string, number> = {};
      for (const s of allSessions) {
        if (s.session_type === 'enhancement' && s.status === 'pending_review') {
          enhancementMap[s.topic] = (enhancementMap[s.topic] ?? 0) + 1;
        }
      }
      setPendingEnhancements(enhancementMap);

      const completeSessions = allSessions.filter((s) => s.status === 'complete');

      // Keep most-recent session per topic (sort newest-first before iterating)
      const topicSessionMap: Record<string, string> = {};
      const sorted = [...completeSessions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      for (const s of sorted) {
        if (!topicSessionMap[s.topic]) topicSessionMap[s.topic] = s.id;
      }
      const topics = Object.keys(topicSessionMap);

      const results = await Promise.all(
        topics.map((t) =>
          fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`)
            .then((r) => r.json())
            .then((d) => {
              const dossier = d.dossier as Dossier | null;
              if (dossier) dossier.session_id = topicSessionMap[t];
              return dossier;
            })
            .catch(() => null)
        )
      );
      setDossiers(results.filter(Boolean) as Dossier[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const publishOrUpdate = async (topic: string, isUpdate: boolean, resolvedSlug: string) => {
    const slug = resolvedSlug.trim();
    if (!slug) return;
    setPublishStatus((s) => ({ ...s, [topic]: isUpdate ? 'updating…' : 'publishing…' }));
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slug }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      setPublishStatus((s) => ({ ...s, [topic]: isUpdate ? `updated → ${data.url}` : `live → ${data.url}` }));
      load();
    } catch (err) {
      setPublishStatus((s) => ({ ...s, [topic]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const resynthesize = async (d: Dossier) => {
    setResynthStatus((s) => ({ ...s, [d.topic]: 'running…' }));
    try {
      const res = await fetch('/api/admin/resynthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: d.topic, title: d.title }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      setResynthStatus((s) => ({ ...s, [d.topic]: `done — ${data.findingsUsed} findings, score ${data.convergenceScore}, ${data.jawDropLayers} jaw-drops` }));
      load();
    } catch (err) {
      setResynthStatus((s) => ({ ...s, [d.topic]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const launchDeepDive = async (d: Dossier) => {
    const focus = deepDiveFocus[d.topic]?.trim();
    const questionsRaw = deepDiveQuestions[d.topic]?.trim();
    if (!focus) return;
    const questions = questionsRaw
      ? questionsRaw.split('\n').map((q) => q.trim()).filter(Boolean)
      : [`What specific evidence exists related to: ${focus}`];

    setDeepDiveStatus((s) => ({ ...s, [d.topic]: 'queuing…' }));
    try {
      const res = await fetch('/api/research/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: d.topic,
          title: d.title,
          research_questions: questions,
          focus_areas: focus,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      const sessionId = data.session_id as string;
      setDeepDiveOpen(null);
      setDeepDiveStatus((s) => ({ ...s, [d.topic]: `running — session ${sessionId.slice(0, 8)}…` }));

      // Poll until complete
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/research/${sessionId}`);
          if (!r.ok) return;
          const rd = await r.json();
          const status = rd?.session?.status ?? 'pending';
          if (status === 'complete') {
            clearInterval(poll);
            setDeepDiveStatus((s) => ({ ...s, [d.topic]: 'complete — refresh to see updated content' }));
            load();
          } else if (status === 'failed') {
            clearInterval(poll);
            setDeepDiveStatus((s) => ({ ...s, [d.topic]: `failed — ${(rd?.session?.error_log ?? []).join('; ')}` }));
          } else {
            setDeepDiveStatus((s) => ({ ...s, [d.topic]: `${SESSION_STATUS_LABELS[status] ?? status}…` }));
          }
        } catch { /* network blip */ }
      }, 8000);
    } catch (err) {
      setDeepDiveStatus((s) => ({ ...s, [d.topic]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const launchEnhance = async (d: Dossier) => {
    const questions = (enhanceQuestions[d.topic] ?? ['']).filter((q) => q.trim());
    if (questions.length === 0) return;

    const sources = enhanceSources[d.topic]?.trim() || undefined;
    const batchCount = Math.ceil(questions.length / 3);

    setEnhanceStatus((s) => ({ ...s, [d.topic]: 'queuing…' }));
    setEnhanceOpen(null);
    try {
      const res = await fetch('/api/research/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: d.topic,
          title: d.title,
          research_questions: questions,
          source_urls: sources,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      const sessionId = (data.session_id ?? (data.session_ids as string[] | undefined)?.[0]) as string;
      const label = batchCount > 1
        ? `${batchCount} batches running — check Sessions tab`
        : `running — session ${sessionId.slice(0, 8)}…`;
      setEnhanceStatus((s) => ({ ...s, [d.topic]: label }));

      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/research/${sessionId}`);
          if (!r.ok) return;
          const rd = await r.json();
          const status = rd?.session?.status ?? 'pending';
          if (status === 'pending_review') {
            clearInterval(poll);
            setEnhanceStatus((s) => ({ ...s, [d.topic]: 'complete — awaiting your review in Sessions tab' }));
          } else if (status === 'failed') {
            clearInterval(poll);
            setEnhanceStatus((s) => ({ ...s, [d.topic]: `failed — ${(rd?.session?.error_log ?? []).join('; ')}` }));
          } else {
            setEnhanceStatus((s) => ({ ...s, [d.topic]: `${SESSION_STATUS_LABELS[status] ?? status}…` }));
          }
        } catch { /* network blip */ }
      }, 8000);
    } catch (err) {
      setEnhanceStatus((s) => ({ ...s, [d.topic]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const unpublish = async (topic: string) => {
    setPublishStatus((s) => ({ ...s, [topic]: 'unpublishing…' }));
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data.error as string ?? 'Failed');
      }
      setPublishStatus((s) => ({ ...s, [topic]: 'unpublished' }));
      load();
    } catch (err) {
      setPublishStatus((s) => ({ ...s, [topic]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl mb-1">Content Management</h2>
          <p className="text-sm text-text-secondary">Review completed research, assign slugs, and publish to the site.</p>
        </div>
        <button onClick={load} className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold border border-border px-3 py-1.5 rounded transition-colors">
          Refresh
        </button>
      </div>

      {Object.keys(pendingEnhancements).length > 0 && (
        <div className="flex items-center gap-3 border border-gold/30 bg-gold/5 rounded px-4 py-3">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-gold">
            {Object.values(pendingEnhancements).reduce((a, b) => a + b, 0)} enhanced research {Object.values(pendingEnhancements).reduce((a, b) => a + b, 0) === 1 ? 'batch' : 'batches'} awaiting review
          </span>
          <span className="font-mono text-[9px] text-text-tertiary">→ approve in Sessions tab</span>
        </div>
      )}

      {loading && <div className="text-sm text-text-tertiary">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && dossiers.length === 0 && (
        <div className="text-sm text-text-tertiary border border-border rounded p-8 text-center">
          No completed research yet. Run a session from the Launch tab.
        </div>
      )}

      {!loading && dossiers.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {([
              ['all',          `All`,          dossiers.length],
              ['published',    `Published`,    dossiers.filter(d => d.published).length],
              ['unpublished',  `Unpublished`,  dossiers.filter(d => !d.published).length],
              ['needs_review', `Needs Review`, Object.values(pendingEnhancements).reduce((a, b) => a + b, 0)],
            ] as const).map(([f, label, count]) => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`font-mono text-[9px] uppercase tracking-widest px-4 py-2.5 border-b-2 -mb-px transition-colors ${
                  filterStatus === f
                    ? f === 'needs_review' ? 'border-amber-400 text-amber-400' : 'border-gold text-gold'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {label}
                <span className="ml-1.5 font-mono text-[8px] opacity-60">({count})</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 justify-end">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">Sort:</span>
            {([['unpublished', 'New & Unpublished'], ['score', 'Score'], ['title', 'A → Z']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setSortBy(val)}
                className={`font-mono text-[9px] uppercase tracking-widest px-2 py-1 border transition-colors ${sortBy === val ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {dossiers
          .filter((d) => {
            if (filterStatus === 'published')    return d.published;
            if (filterStatus === 'unpublished')  return !d.published;
            if (filterStatus === 'needs_review') return (pendingEnhancements[d.topic] ?? 0) > 0;
            return true;
          })
          .sort((a, b) => {
            if (sortBy === 'unpublished') {
              if (a.published !== b.published) return a.published ? 1 : -1;
              return (b.best_convergence_score ?? 0) - (a.best_convergence_score ?? 0);
            }
            if (sortBy === 'score') return (b.best_convergence_score ?? 0) - (a.best_convergence_score ?? 0);
            return a.title.localeCompare(b.title);
          })
          .map((d) => {
          const isPreview = previewing === d.topic;
          const output = d.synthesized_output;
          const autoSlug = d.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '';
          const slugVal = slugInputs[d.topic] ?? d.slug ?? autoSlug;
          const statusMsg = publishStatus[d.topic];
          const dqVal = d.topic in drivingQuestions ? drivingQuestions[d.topic] : (d.driving_question ?? '');

          const isExpanded = expandedCard === d.topic;

          return (
            <div key={d.topic} className="border border-border bg-ground-light/30">
              {/* Collapsed header — always visible, click to expand */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : d.topic)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-ground-light/20 transition-colors"
              >
                {/* Status dot */}
                <span className={`shrink-0 w-2 h-2 rounded-full ${d.published ? 'bg-emerald-400' : 'bg-text-tertiary/30'}`} />

                {/* Title + badges */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-primary leading-snug">{d.title}</span>
                  {d.best_convergence_score > 0 && (
                    <span className="font-mono text-[9px] text-gold shrink-0">
                      {d.best_convergence_score}
                    </span>
                  )}
                  {pendingEnhancements[d.topic] > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-[8px] uppercase tracking-widest text-amber-400 shrink-0">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                      </span>
                      Review
                    </span>
                  )}
                </div>

                {/* Right: published date + view link + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  {d.published && d.published_at && (
                    <span className="font-mono text-[8px] text-text-tertiary hidden sm:block">
                      {new Date(d.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  {d.published && d.slug && (
                    <a
                      href={`/topics/${d.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 hover:underline transition-colors"
                    >
                      View →
                    </a>
                  )}
                  <span className="font-mono text-[9px] text-text-tertiary">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>

              {/* Expanded controls */}
              {isExpanded && <>

              {/* Publish controls */}
              <div className="border-t border-border/60 px-4 pb-3 pt-3 flex items-center gap-3 flex-wrap">
                <input
                  className="bg-ground border border-border px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded w-full max-w-sm"
                  placeholder="url-slug"
                  value={slugVal}
                  onChange={(e) => setSlugInputs((s) => ({ ...s, [d.topic]: e.target.value }))}
                />
                <button
                  onClick={() => publishOrUpdate(d.topic, d.published, slugVal)}
                  disabled={!slugVal || publishStatus[d.topic] === 'publishing…' || publishStatus[d.topic] === 'updating…'}
                  className={`font-mono text-[9px] uppercase tracking-widest border px-3 py-1 rounded transition-colors disabled:opacity-40 ${
                    d.published
                      ? 'text-sky-400 border-sky-400/30 bg-sky-400/5 hover:bg-sky-400/10'
                      : 'text-gold border-gold/30 bg-gold/5 hover:bg-gold/10'
                  }`}
                >
                  {d.published
                    ? (publishStatus[d.topic] === 'updating…' ? 'Updating…' : 'Update →')
                    : (publishStatus[d.topic] === 'publishing…' ? 'Publishing…' : 'Publish →')
                  }
                </button>
                {d.published && (
                  <button
                    onClick={() => unpublish(d.topic)}
                    disabled={publishStatus[d.topic] === 'unpublishing…'}
                    className="font-mono text-[9px] uppercase tracking-widest text-red-400 border border-red-400/30 hover:bg-red-400/10 px-3 py-1 rounded transition-colors disabled:opacity-40"
                  >
                    Unpublish
                  </button>
                )}
                {d.published && (
                  <button
                    onClick={() => toggleFeature(d.topic, d.featured)}
                    disabled={featureStatus[d.topic] === 'saving…'}
                    className={`font-mono text-[9px] uppercase tracking-widest border px-3 py-1 rounded transition-colors disabled:opacity-40 ${
                      d.featured
                        ? 'text-amber-400 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20'
                        : 'text-text-tertiary border-border hover:border-amber-400/30 hover:text-amber-400'
                    }`}
                  >
                    {d.featured ? '★ Featured' : '☆ Feature'}
                  </button>
                )}
                {featureStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${featureStatus[d.topic] === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                    {featureStatus[d.topic]}
                  </span>
                )}
                <button
                  onClick={() => generateLLMPerspectives(d)}
                  disabled={llmStatus[d.topic] === 'generating…'}
                  className={`font-mono text-[9px] uppercase tracking-widest border px-3 py-1 rounded transition-colors disabled:opacity-40 ${
                    d.llm_perspectives
                      ? 'text-sky-400 border-sky-400/30 hover:bg-sky-400/10'
                      : 'text-violet-400 border-violet-400/30 hover:bg-violet-400/10'
                  }`}
                >
                  {llmStatus[d.topic] === 'generating…'
                    ? 'Querying AIs…'
                    : d.llm_perspectives
                    ? '↺ Re-run AI Check'
                    : '◈ Generate AI Check'}
                </button>
                {llmStatus[d.topic] && llmStatus[d.topic] !== 'generating…' && (
                  <span className={`font-mono text-[9px] ${llmStatus[d.topic] === 'error' ? 'text-red-400' : 'text-violet-400'}`}>
                    {llmStatus[d.topic]}
                  </span>
                )}
                {statusMsg && (
                  <span className={`font-mono text-[9px] ${statusMsg.startsWith('error') ? 'text-red-400' : statusMsg.startsWith('live') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                    {statusMsg}
                  </span>
                )}
              </div>

              {/* Driving Question */}
              <div className="border-t border-border/40 px-4 pb-3 pt-3 space-y-2">
                <label className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
                  Driving Question <span className="normal-case tracking-normal opacity-60 ml-1">— shown above the article title. Leave blank to hide.</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    className="flex-1 bg-ground border border-border px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded font-mono"
                    placeholder="The single question this research investigates. Plain language. Genuine question. 15–35 words."
                    value={dqVal}
                    onChange={(e) => setDrivingQuestions((s) => ({ ...s, [d.topic]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveDrivingQuestion(d.topic); }}
                  />
                  <button
                    onClick={() => saveDrivingQuestion(d.topic)}
                    disabled={drivingQuestionStatus[d.topic] === 'saving…'}
                    className="font-mono text-[9px] uppercase tracking-widest text-gold border border-gold/30 bg-gold/5 hover:bg-gold/10 px-3 py-1 rounded transition-colors disabled:opacity-40 shrink-0"
                  >
                    Save
                  </button>
                  {drivingQuestionStatus[d.topic] && (
                    <span className={`font-mono text-[9px] shrink-0 ${drivingQuestionStatus[d.topic].startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {drivingQuestionStatus[d.topic]}
                    </span>
                  )}
                </div>
                {dqVal && (
                  <p className="font-mono text-[9px] text-text-tertiary">
                    {dqVal.trim().split(/\s+/).length} words
                  </p>
                )}
              </div>

              {/* Research controls */}
              <div className="px-4 pb-3 flex items-center gap-3 flex-wrap border-t border-border/40 pt-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">Research:</span>
                <button
                  onClick={() => setPreviewing(isPreview ? null : d.topic)}
                  className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold border border-border px-2 py-1 rounded transition-colors"
                >
                  {isPreview ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  onClick={() => {
                    setEnhanceOpen(enhanceOpen === d.topic ? null : d.topic);
                    setDeepDiveOpen(null);
                    if (!enhanceQuestions[d.topic]) {
                      setEnhanceQuestions((q) => ({ ...q, [d.topic]: [''] }));
                    }
                  }}
                  className="font-mono text-[9px] uppercase tracking-widest text-gold border border-gold/30 hover:bg-gold/10 px-2 py-1 rounded transition-colors"
                >
                  + Enhance
                </button>
                <button
                  onClick={() => {
                    setDeepDiveOpen(deepDiveOpen === d.topic ? null : d.topic);
                    setEnhanceOpen(null);
                  }}
                  className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border border-sky-400/30 hover:bg-sky-400/10 px-2 py-1 rounded transition-colors"
                >
                  Deep Dive
                </button>
                <button
                  onClick={() => resynthesize(d)}
                  disabled={resynthStatus[d.topic] === 'running…'}
                  className="font-mono text-[9px] uppercase tracking-widest text-violet-400 border border-violet-400/30 hover:bg-violet-400/10 px-2 py-1 rounded transition-colors disabled:opacity-40"
                >
                  Re-synthesize
                </button>
                {resynthStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${resynthStatus[d.topic].startsWith('error') ? 'text-red-400' : resynthStatus[d.topic] === 'running…' ? 'text-text-tertiary' : 'text-violet-400'}`}>
                    {resynthStatus[d.topic]}
                  </span>
                )}
                {enhanceStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${enhanceStatus[d.topic].startsWith('error') ? 'text-red-400' : enhanceStatus[d.topic].startsWith('complete') ? 'text-gold' : 'text-text-tertiary'}`}>
                    {enhanceStatus[d.topic]}
                  </span>
                )}
                {deepDiveStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${deepDiveStatus[d.topic].startsWith('error') ? 'text-red-400' : deepDiveStatus[d.topic].startsWith('running') ? 'text-text-tertiary' : 'text-sky-400'}`}>
                    {deepDiveStatus[d.topic]}
                  </span>
                )}
              </div>

              {/* Enhance form */}
              {enhanceOpen === d.topic && (
                <div className="px-4 pb-4 border-t border-gold/20 space-y-3 pt-3 bg-gold/3">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-gold">
                    Enhance Article — New Research Round
                  </div>
                  <p className="font-mono text-[9px] text-text-tertiary">
                    Up to {MAX_ENHANCE_QUESTIONS} questions — auto-batched in groups of 3. Results go to pending review before merging.
                  </p>
                  <div className="space-y-2">
                    {(enhanceQuestions[d.topic] ?? ['']).map((q, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className="flex-1 bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                          placeholder={`New research question ${i + 1}`}
                          value={q}
                          onChange={(e) => {
                            const updated = [...(enhanceQuestions[d.topic] ?? [''])];
                            updated[i] = e.target.value;
                            setEnhanceQuestions((s) => ({ ...s, [d.topic]: updated }));
                          }}
                        />
                        {(enhanceQuestions[d.topic] ?? ['']).length > 1 && (
                          <button
                            onClick={() => {
                              const updated = (enhanceQuestions[d.topic] ?? ['']).filter((_, idx) => idx !== i);
                              setEnhanceQuestions((s) => ({ ...s, [d.topic]: updated }));
                            }}
                            className="px-2 text-text-tertiary hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(enhanceQuestions[d.topic] ?? ['']).length < MAX_ENHANCE_QUESTIONS && (
                    <button
                      onClick={() => setEnhanceQuestions((s) => ({ ...s, [d.topic]: [...(s[d.topic] ?? ['']), ''] }))}
                      className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
                    >
                      + Add question
                    </button>
                  )}
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">
                      Source Material <span className="normal-case tracking-normal opacity-60">(optional — articles, excerpts, or URLs agents must cite directly)</span>
                    </label>
                    <textarea
                      className="w-full bg-ground border border-border px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none font-mono"
                      rows={4}
                      placeholder={"Paste full article text, excerpts, or URLs — one per line.\nAgents will treat this as primary source material and cite it directly.\n\nhttps://example.com/article\n\"Direct quote from source...\""}
                      value={enhanceSources[d.topic] ?? ''}
                      onChange={(e) => setEnhanceSources((s) => ({ ...s, [d.topic]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => launchEnhance(d)}
                      disabled={!(enhanceQuestions[d.topic] ?? ['']).some((q) => q.trim())}
                      className="font-mono text-[9px] uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                    >
                      Launch Enhancement →
                    </button>
                    <span className="font-mono text-[9px] text-text-tertiary">
                      {Math.ceil(((enhanceQuestions[d.topic] ?? ['']).filter(q => q.trim()).length || 1) / 3) > 1
                        ? `${Math.ceil((enhanceQuestions[d.topic] ?? ['']).filter(q => q.trim()).length / 3)} batches will run in parallel.`
                        : 'Runs 3–5 min.'} Awaits your approval before updating the article.
                    </span>
                  </div>
                </div>
              )}

              {/* Deep Dive form */}
              {deepDiveOpen === d.topic && (
                <div className="px-4 pb-4 border-t border-border/40 space-y-3 pt-3 bg-sky-400/5">
                  <div className="font-mono text-[9px] uppercase tracking-widest text-sky-400">Deep Dive — Targeted Rabbit Holes</div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">
                      Focus Areas (names, books, events, claims to investigate specifically)
                    </label>
                    <textarea
                      rows={4}
                      className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-sky-400/50 rounded resize-none"
                      placeholder={`e.g.\n- Aleš Hrdlička and his role in dismissing giant skeleton reports at the Smithsonian\n- Richard Dewhurst's "Ancient Giants Who Ruled America" (2014) — specific claims and evidence cited\n- Major John Wesley Powell and Bureau of American Ethnology policies on anomalous skeletal remains`}
                      value={deepDiveFocus[d.topic] ?? ''}
                      onChange={(e) => setDeepDiveFocus((s) => ({ ...s, [d.topic]: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">
                      Research Questions (one per line — leave blank to auto-generate)
                    </label>
                    <textarea
                      rows={3}
                      className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-sky-400/50 rounded resize-none"
                      placeholder={`e.g.\nWhat documented evidence exists for Smithsonian collection or suppression of anomalous skeletal remains?\nWhat specific skeletal finds does Dewhurst cite and what is their evidential status?`}
                      value={deepDiveQuestions[d.topic] ?? ''}
                      onChange={(e) => setDeepDiveQuestions((s) => ({ ...s, [d.topic]: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => launchDeepDive(d)}
                      disabled={!deepDiveFocus[d.topic]?.trim() || deepDiveStatus[d.topic] === 'running pipeline…'}
                      className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                    >
                      Launch Deep Dive →
                    </button>
                    <span className="font-mono text-[9px] text-text-tertiary">Runs 3–5 min. Synthesis includes all prior sessions.</span>
                  </div>
                </div>
              )}

              {/* Preview panel */}
              {isPreview && output && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {output.executive_summary != null && (
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">Summary</div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {String(output.executive_summary).slice(0, 600)}{String(output.executive_summary).length > 600 ? '…' : ''}
                      </p>
                    </div>
                  )}
                  {Array.isArray(output.jaw_drop_layers) && output.jaw_drop_layers.length > 0 && (
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">
                        Jaw-Drop Layers ({(output.jaw_drop_layers as unknown[]).length})
                      </div>
                      <div className="space-y-2">
                        {(output.jaw_drop_layers as { level: number; title: string; content: string }[]).slice(0, 3).map((l) => (
                          <div key={l.level} className="flex gap-3 p-2 bg-ground-light/40 border border-border/50">
                            <span className="font-mono text-[10px] text-gold shrink-0 w-4">{l.level}</span>
                            <div>
                              <div className="text-xs font-medium text-text-primary">{l.title}</div>
                              <div className="text-xs text-text-tertiary mt-0.5 leading-relaxed">
                                {String(l.content).slice(0, 200)}…
                              </div>
                            </div>
                          </div>
                        ))}
                        {(output.jaw_drop_layers as unknown[]).length > 3 && (
                          <div className="text-xs text-text-tertiary pl-7">
                            +{(output.jaw_drop_layers as unknown[]).length - 3} more layers
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {Array.isArray(output.open_questions) && (
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">
                        Open Questions ({(output.open_questions as unknown[]).length})
                      </div>
                      <ul className="space-y-1">
                        {(output.open_questions as string[]).slice(0, 4).map((q, i) => (
                          <li key={i} className="text-xs text-text-secondary flex gap-2">
                            <span className="text-gold/50 shrink-0">·</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {/* People & Institutions */}
              {d.session_id && <DossierEntities sessionId={d.session_id} topic={d.topic} />}

              {/* Interactive Components */}
              {d.synthesized_output && (
                <div className="border-t border-border">
                  <button
                    onClick={() => setComponentsOpen(componentsOpen === d.topic ? null : d.topic)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-ground-light/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-violet-400">
                        ⬡ Interactive Components
                      </span>
                      {(d.recommended_components ?? []).length > 0 && (
                        <span className="font-mono text-[8px] text-text-tertiary">
                          {(d.selected_components?.length ? d.selected_components : d.recommended_components ?? []).filter((c) => c.enabled).length} of {(d.recommended_components ?? []).length} enabled
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {componentsOpen === d.topic ? '−' : '+'}
                    </span>
                  </button>

                  {componentsOpen === d.topic && (
                    <div className="px-4 pb-4 space-y-2">
                      {(d.recommended_components ?? []).length === 0 ? (
                        <div className="flex items-center gap-3 py-2">
                          <p className="font-mono text-[8px] text-text-tertiary">
                            No recommendations yet.
                          </p>
                          <button
                            onClick={() => generateComponentRecs(d)}
                            disabled={componentGenStatus[d.topic] === 'generating…'}
                            className="font-mono text-[8px] uppercase tracking-wider px-2 py-1 border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
                          >
                            {componentGenStatus[d.topic] === 'generating…' ? 'Generating…' : '+ Generate Recommendations'}
                          </button>
                          {componentGenStatus[d.topic] === 'error' && (
                            <span className="font-mono text-[8px] text-red-400">error</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <p className="font-mono text-[8px] text-text-tertiary mb-3">
                            Enable to show on the published report.
                          </p>
                          {(d.selected_components?.length ? d.selected_components : d.recommended_components ?? []).map((comp) => {
                            const statusKey = `${d.topic}:${comp.id}`;
                            return (
                              <div key={comp.id} className="flex items-start gap-3 p-3 border border-border/50 bg-ground-light/10">
                                <div className="flex-1 min-w-0">
                                  <p className="font-mono text-[10px] text-text-primary">{comp.label}</p>
                                  <p className="font-mono text-[8px] text-text-tertiary mt-0.5 leading-snug">{comp.reason}</p>
                                  {componentStatus[statusKey] && (
                                    <p className="font-mono text-[8px] text-violet-400 mt-1">{componentStatus[statusKey]}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => toggleComponent(d, comp.id, !comp.enabled)}
                                  className={`font-mono text-[8px] uppercase tracking-wider px-2 py-1 border shrink-0 transition-colors ${
                                    comp.enabled
                                      ? 'border-violet-500/50 text-violet-400 hover:border-red-500/50 hover:text-red-400'
                                      : 'border-border/40 text-text-tertiary hover:border-violet-500/50 hover:text-violet-400'
                                  }`}
                                >
                                  {comp.enabled ? 'Enabled ✓' : 'Disabled'}
                                </button>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Visual Strategy */}
              {typeof d.synthesized_output?.visual_strategy === 'string' ? (
                <VisualStrategy text={d.synthesized_output.visual_strategy} />
              ) : d.synthesized_output ? (
                <GenerateVisualStrategy topic={d.topic} />
              ) : null}

              {/* Podcast Audio */}
              <DossierPodcast topic={d.topic} />

              {/* Images */}
              <DossierImages topic={d.topic} title={d.title ?? d.topic} />

              {isPreview && !output && (
                <div className="border-t border-border px-4 py-3 text-sm text-text-tertiary">
                  No synthesized output found for this topic.
                </div>
              )}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dossier Entities Panel ────────────────────────────────────────────────────

interface EntityRecord {
  id: string;
  full_name?: string;
  name?: string;
  slug: string | null;
  status: string;
  credibility_tier?: string;
  institution_type?: string;
  short_bio: string | null;
  topic_role: string | null;
  topic_context: string | null;
  source: 'extracted' | 'linked';
  extraction_notes?: string | null;
}

function DossierEntities({ sessionId, topic }: { sessionId: string; topic: string }) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<EntityRecord[]>([]);
  const [institutions, setInstitutions] = useState<EntityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [researchStatus, setResearchStatus] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dossier/entities?session_id=${sessionId}`);
      const data = await res.json();
      setPeople((data.people ?? []).filter((p: EntityRecord) => p.status !== 'archived'));
      setInstitutions((data.institutions ?? []).filter((i: EntityRecord) => i.status !== 'archived'));
    } catch {
      // leave empty — show empty state
    } finally {
      setLoading(false);
    }
  };

  const extractNow = async () => {
    setExtracting(true);
    setExtractMsg('');
    try {
      const res = await fetch('/api/admin/dossier/entities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, topic }),
      });
      const data = await res.json();
      if (!res.ok) { setExtractMsg(`Error: ${data.error}`); return; }
      setExtractMsg(`Done — ${data.created_people} people, ${data.created_institutions} institutions extracted`);
      await load();
    } catch (err) {
      setExtractMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExtracting(false);
    }
  };

  // Auto-load when panel is opened
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionId]);

  const promote = async (type: 'person' | 'institution', id: string) => {
    setStatuses((s) => ({ ...s, [id]: 'saving…' }));
    const res = await fetch('/api/admin/dossier/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action: 'draft' }),
    });
    if (res.ok) {
      setStatuses((s) => ({ ...s, [id]: 'draft ✓' }));
      load();
    } else {
      setStatuses((s) => ({ ...s, [id]: 'error' }));
    }
  };

  const skip = async (type: 'person' | 'institution', id: string) => {
    await fetch('/api/admin/dossier/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action: 'skip' }),
    });
    if (type === 'person') setPeople((p) => p.filter((x) => x.id !== id));
    else setInstitutions((i) => i.filter((x) => x.id !== id));
  };

  const researchAndAdd = async (type: 'person' | 'institution', entity: EntityRecord) => {
    const label = entity.full_name ?? entity.name ?? '';
    setResearchStatus((s) => ({ ...s, [entity.id]: 'researching…' }));
    try {
      const resRoute = type === 'person' ? '/api/admin/people/research' : '/api/admin/institutions/research';
      const saveRoute = type === 'person' ? '/api/admin/people' : '/api/admin/institutions';
      const res = await fetch(resRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, description: entity.topic_context ?? '' }),
      });
      if (!res.ok) throw new Error('Research failed');
      const data = await res.json();
      // Save as draft
      const payload = type === 'person'
        ? { person: { ...data.person, status: 'draft' }, bio_sections: data.bio_sections ?? [], suggested_relationships: data.suggested_relationships ?? [], suggested_books: data.suggested_books ?? [] }
        : { institution: { ...data.institution, status: 'draft' }, bio_sections: data.bio_sections ?? [], suggested_relationships: data.suggested_relationships ?? [] };
      await fetch(saveRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setResearchStatus((s) => ({ ...s, [entity.id]: 'added as draft ✓' }));
      load();
    } catch {
      setResearchStatus((s) => ({ ...s, [entity.id]: 'failed' }));
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      needs_review: 'text-amber-400 border-amber-400/30',
      draft: 'text-sky-400 border-sky-400/30',
      published: 'text-emerald-400 border-emerald-400/30',
    };
    return (
      <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${colors[status] ?? 'text-text-tertiary border-border'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const total = people.length + institutions.length;

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => { setOpen(!open); if (!open && people.length === 0 && institutions.length === 0) load(); }}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
          People & Institutions
          {total > 0 && <span className="ml-2 text-violet-400">({total})</span>}
        </span>
        <span className="font-mono text-[9px] text-text-tertiary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {loading && <p className="font-mono text-[10px] text-text-tertiary">Loading…</p>}

          {!loading && total === 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <p className="font-mono text-[10px] text-text-tertiary">
                  No entities extracted yet.
                </p>
                <button
                  onClick={load}
                  disabled={extracting}
                  className="font-mono text-[9px] text-text-tertiary border border-border px-2 py-1 rounded hover:text-text-secondary transition-colors disabled:opacity-40"
                >
                  Refresh
                </button>
                <button
                  onClick={extractNow}
                  disabled={extracting}
                  className="font-mono text-[9px] text-gold border border-gold/30 bg-gold/5 hover:bg-gold/10 px-2 py-1 rounded transition-colors disabled:opacity-40"
                >
                  {extracting ? 'Extracting…' : 'Extract Now'}
                </button>
              </div>
              {extractMsg && (
                <p className={`font-mono text-[9px] ${extractMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                  {extractMsg}
                </p>
              )}
            </div>
          )}

          {/* People */}
          {people.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-violet-400 mb-2">
                People ({people.length})
              </div>
              <div className="space-y-2">
                {people.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 p-2.5 border border-border/50 bg-ground-light/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-text-primary font-medium">{p.full_name}</span>
                        {statusBadge(p.status)}
                        {p.credibility_tier && (
                          <span className="font-mono text-[8px] text-text-tertiary uppercase tracking-wider">
                            {p.credibility_tier.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {p.topic_role && (
                        <div className="font-mono text-[9px] text-gold mt-0.5">{p.topic_role}</div>
                      )}
                      {p.short_bio && (
                        <div className="text-xs text-text-tertiary mt-0.5 leading-relaxed line-clamp-2">{p.short_bio}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {p.status === 'published' && p.slug && (
                        <a
                          href={`/people/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[8px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded hover:bg-emerald-400/10 transition-colors"
                        >
                          View →
                        </a>
                      )}
                      {p.status === 'needs_review' && (
                        <>
                          <button
                            onClick={() => researchAndAdd('person', p)}
                            disabled={!!researchStatus[p.id] && !researchStatus[p.id].includes('failed')}
                            className="font-mono text-[8px] uppercase tracking-widest text-violet-400 border border-violet-400/30 px-2 py-1 rounded hover:bg-violet-400/10 transition-colors disabled:opacity-40"
                          >
                            {researchStatus[p.id] ?? 'Research & Add'}
                          </button>
                          <button
                            onClick={() => promote('person', p.id)}
                            disabled={statuses[p.id] === 'saving…'}
                            className="font-mono text-[8px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-2 py-1 rounded hover:bg-sky-400/10 transition-colors disabled:opacity-40"
                          >
                            {statuses[p.id] ?? 'To Draft'}
                          </button>
                        </>
                      )}
                      {p.status === 'draft' && p.slug && (
                        <a
                          href={`/people/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[8px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-2 py-1 rounded hover:bg-sky-400/10 transition-colors"
                        >
                          Edit →
                        </a>
                      )}
                      <button
                        onClick={() => skip('person', p.id)}
                        className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutions */}
          {institutions.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-violet-400 mb-2">
                Institutions ({institutions.length})
              </div>
              <div className="space-y-2">
                {institutions.map((inst) => (
                  <div key={inst.id} className="flex items-start gap-3 p-2.5 border border-border/50 bg-ground-light/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-text-primary font-medium">{inst.name}</span>
                        {statusBadge(inst.status)}
                        {inst.institution_type && (
                          <span className="font-mono text-[8px] text-text-tertiary uppercase tracking-wider">
                            {inst.institution_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      {inst.topic_role && (
                        <div className="font-mono text-[9px] text-gold mt-0.5">{inst.topic_role}</div>
                      )}
                      {inst.short_bio && (
                        <div className="text-xs text-text-tertiary mt-0.5 leading-relaxed line-clamp-2">{inst.short_bio}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {inst.status === 'published' && inst.slug && (
                        <a
                          href={`/institutions/${inst.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[8px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded hover:bg-emerald-400/10 transition-colors"
                        >
                          View →
                        </a>
                      )}
                      {inst.status === 'needs_review' && (
                        <>
                          <button
                            onClick={() => researchAndAdd('institution', inst)}
                            disabled={!!researchStatus[inst.id] && !researchStatus[inst.id].includes('failed')}
                            className="font-mono text-[8px] uppercase tracking-widest text-violet-400 border border-violet-400/30 px-2 py-1 rounded hover:bg-violet-400/10 transition-colors disabled:opacity-40"
                          >
                            {researchStatus[inst.id] ?? 'Research & Add'}
                          </button>
                          <button
                            onClick={() => promote('institution', inst.id)}
                            disabled={statuses[inst.id] === 'saving…'}
                            className="font-mono text-[8px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-2 py-1 rounded hover:bg-sky-400/10 transition-colors disabled:opacity-40"
                          >
                            {statuses[inst.id] ?? 'To Draft'}
                          </button>
                        </>
                      )}
                      {inst.status === 'draft' && inst.slug && (
                        <a
                          href={`/institutions/${inst.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[8px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-2 py-1 rounded hover:bg-sky-400/10 transition-colors"
                        >
                          Edit →
                        </a>
                      )}
                      <button
                        onClick={() => skip('institution', inst.id)}
                        className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Podcast Audio Panel ───────────────────────────────────────────────────────

function DossierPodcast({ topic }: { topic: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/admin/audio?topic=${encodeURIComponent(topic)}`);
    const data = await res.json();
    setAudioUrl(data.audio_url ?? null);
    setGeneratedAt(data.audio_generated_at ?? null);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const generate = async () => {
    setGenerating(true);
    setMsg('Writing script then generating audio — takes 60–120 seconds…');
    try {
      const res = await fetch('/api/admin/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Generated — ${data.wav_size_mb} MB WAV`);
      setAudioUrl(data.audio_url);
      setGeneratedAt(new Date().toISOString());
    } catch (err) {
      setMsg(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const remove = async () => {
    if (!confirm('Delete this podcast audio?')) return;
    await fetch(`/api/admin/audio?topic=${encodeURIComponent(topic)}`, { method: 'DELETE' });
    setAudioUrl(null);
    setGeneratedAt(null);
    setMsg('');
  };

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
          Podcast Audio
          {audioUrl && <span className="ml-2 text-emerald-400">● Ready</span>}
        </span>
        <span className="font-mono text-[9px] text-text-tertiary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {audioUrl ? (
            <div className="space-y-2">
              <audio controls src={audioUrl} className="w-full h-10" />
              {generatedAt && (
                <p className="font-mono text-[8px] text-text-tertiary/50">
                  Generated {new Date(generatedAt).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={generate}
                  disabled={generating}
                  className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-violet-400 hover:border-violet-400/30 transition-colors disabled:opacity-40"
                >
                  {generating ? 'Regenerating…' : '↻ Regenerate'}
                </button>
                <button
                  onClick={remove}
                  className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={generating}
              className="font-mono text-[9px] uppercase tracking-widest text-violet-400 border border-violet-400/30 px-3 py-1.5 rounded hover:bg-violet-400/10 transition-colors disabled:opacity-40"
            >
              {generating ? '⏳ Generating…' : '▶ Generate Podcast Audio'}
            </button>
          )}
          {msg && (
            <p className={`font-mono text-[8px] leading-relaxed ${msg.startsWith('Failed') ? 'text-red-400' : 'text-text-tertiary'}`}>
              {msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Visual Strategy Panel ─────────────────────────────────────────────────────

function VisualStrategy({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-violet-400">
          Visual Strategy — Hero Image Prompts
        </span>
        <span className="font-mono text-[9px] text-text-tertiary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="flex justify-end mb-2">
            <button
              onClick={copy}
              className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${
                copied
                  ? 'text-emerald-400 border-emerald-400/30'
                  : 'text-text-tertiary border-border hover:text-violet-400 hover:border-violet-400/30'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy All'}
            </button>
          </div>
          <pre className="text-[10px] text-text-secondary leading-relaxed whitespace-pre-wrap font-sans bg-ground-light/10 border border-border/30 rounded p-3 max-h-96 overflow-y-auto">
            {text}
          </pre>
          <p className="font-mono text-[8px] text-text-tertiary/50 mt-2">
            Paste into Grok Imagine or Gemini to generate images. All prompts are 16:9.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Generate Visual Strategy ──────────────────────────────────────────────────

function GenerateVisualStrategy({ topic }: { topic: string }) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setStatus('generating');
    setError(null);
    try {
      const res = await fetch('/api/admin/visual-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  };

  return (
    <div className="border-t border-border/40 px-4 py-3 flex items-center justify-between">
      <span className="font-mono text-[9px] uppercase tracking-widest text-violet-400/50">
        Visual Strategy — Hero Image Prompts
      </span>
      {status === 'done' ? (
        <span className="font-mono text-[9px] text-emerald-400">Generated ✓ — refresh to view</span>
      ) : status === 'error' ? (
        <span className="font-mono text-[9px] text-red-400">{error}</span>
      ) : (
        <button
          onClick={generate}
          disabled={status === 'generating'}
          className="font-mono text-[9px] uppercase tracking-widest border border-violet-400/30 text-violet-400 px-3 py-1 hover:bg-violet-400/10 transition-colors disabled:opacity-40"
        >
          {status === 'generating' ? 'Generating…' : '+ Generate'}
        </button>
      )}
    </div>
  );
}

// ── Dossier Images Panel ──────────────────────────────────────────────────────

interface TopicImage {
  id: string;
  topic: string;
  source: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  source_page_url: string | null;
  license: string | null;
  license_url: string | null;
  attribution: string;
  author: string | null;
  width: number | null;
  height: number | null;
  status: 'suggested' | 'approved' | 'rejected';
  featured: boolean;
  quality_score: number;
  gemini_verdict: 'approve' | 'approve_with_tweaks' | 'reject' | null;
  gemini_aesthetic_score: number | null;
  gemini_literal: string | null;
  gemini_alignment: string | null;
  gemini_caption: string | null;
  gemini_tweaks: string | null;
  gemini_alternatives: string | null;
  hero_position: string | null;
  cropped_url: string | null;
}

function DossierImages({ topic, title }: { topic: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<TopicImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [cropStatus, setCropStatus] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/images?topic=${encodeURIComponent(topic)}`);
    const data = await res.json();
    setImages(data.images ?? []);
    setLoading(false);
  };

  // Parse Gemini tweaks crop hint: "crop: 20%-80% vertical, 0%-100% horizontal — reason"
  const parseCropHint = (tweaks: string | null): { top: number; bottom: number; left: number; right: number } | null => {
    if (!tweaks) return null;
    const m = tweaks.match(/crop:\s*(\d+)%-(\d+)%\s*vertical,\s*(\d+)%-(\d+)%\s*horizontal/i);
    if (!m) return null;
    return {
      top: parseInt(m[1]) / 100,
      bottom: parseInt(m[2]) / 100,
      left: parseInt(m[3]) / 100,
      right: parseInt(m[4]) / 100,
    };
  };

  const applyCrop = async (img: TopicImage) => {
    const crop = parseCropHint(img.gemini_tweaks);
    if (!crop) { setCropStatus((s) => ({ ...s, [img.id]: 'No crop hint found in tweaks' })); return; }
    setCropStatus((s) => ({ ...s, [img.id]: 'cropping…' }));
    try {
      const res = await fetch('/api/admin/images/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id, ...crop }),
      });
      const data = await res.json();
      if (!res.ok) { setCropStatus((s) => ({ ...s, [img.id]: `error: ${data.error}` })); return; }
      setCropStatus((s) => ({ ...s, [img.id]: `cropped ✓ (${data.width}×${data.height})` }));
      await load();
    } catch (err) {
      setCropStatus((s) => ({ ...s, [img.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const setPosition = async (id: string, position: string) => {
    await fetch('/api/admin/images/crop', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hero_position: position }),
    });
    setImages((prev) => prev.map((i) => i.id === id ? { ...i, hero_position: position } : i));
  };

  const search = async () => {
    setSearching(true);
    setSearchMsg('Generating queries and searching Wikimedia Commons…');
    try {
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const parts = [];
      if (data.sources?.wikimedia) parts.push(`${data.sources.wikimedia} Wikimedia`);
      if (data.sources?.met_museum) parts.push(`${data.sources.met_museum} Met`);
      if (data.sources?.cleveland_museum) parts.push(`${data.sources.cleveland_museum} Cleveland`);
      if (data.sources?.loc) parts.push(`${data.sources.loc} LOC`);
      if (data.sources?.smithsonian) parts.push(`${data.sources.smithsonian} SI`);
      if (data.sources?.david_rumsey) parts.push(`${data.sources.david_rumsey} Rumsey`);
      const sourceStr = parts.length ? ` (${parts.join(', ')})` : '';
      const rejectedNote = data.rejected > 0 ? ` — ${data.rejected} auto-rejected` : '';
      setSearchMsg(`Found ${data.found} images${sourceStr}${rejectedNote}`);
      load();
    } catch (err) {
      setSearchMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSearching(false);
    }
  };

  const update = async (id: string, patch: Partial<Pick<TopicImage, 'status' | 'featured'>>) => {
    await fetch('/api/admin/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    setImages((imgs) => imgs.map((img) => img.id === id ? { ...img, ...patch } : img));
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadMsg(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('topic', topic);
      form.append('title', title);
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUploadMsg(`Uploaded — ${data.gemini_caption ?? 'Visual Curator reviewed'}`);
      load();
    } catch (err) {
      setUploadMsg(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const suggested = images.filter((i) => i.status === 'suggested');
  const approved = images.filter((i) => i.status === 'approved');

  const licenseColor = (license: string | null) => {
    if (!license) return 'text-text-tertiary';
    const l = license.toLowerCase();
    if (l.includes('public domain') || l.includes('cc0')) return 'text-emerald-400';
    if (l.includes('cc by')) return 'text-sky-400';
    return 'text-amber-400';
  };

  return (
    <div className="border-t border-border/40">
      <button
        onClick={() => { setOpen(!open); if (!open && images.length === 0) load(); }}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
          Images
          {approved.length > 0 && <span className="ml-2 text-emerald-400">({approved.length} approved)</span>}
          {suggested.length > 0 && <span className="ml-2 text-amber-400">({suggested.length} suggested)</span>}
        </span>
        <span className="font-mono text-[9px] text-text-tertiary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={search}
              disabled={searching}
              className="font-mono text-[9px] uppercase tracking-widest text-violet-400 border border-violet-400/30 px-3 py-1.5 rounded hover:bg-violet-400/10 transition-colors disabled:opacity-40"
            >
              {searching ? 'Searching…' : images.length > 0 ? '↻ Re-search Wikimedia' : '⌕ Search Wikimedia Commons'}
            </button>
            {images.length > 0 && (
              <button
                onClick={load}
                className="font-mono text-[9px] text-text-tertiary border border-border px-2 py-1 rounded hover:text-text-secondary transition-colors"
              >
                Refresh
              </button>
            )}
            {searchMsg && (
              <span className={`font-mono text-[9px] ${searchMsg.startsWith('Error') ? 'text-red-400' : 'text-text-tertiary'}`}>
                {searchMsg}
              </span>
            )}
          </div>

          {loading && <p className="font-mono text-[10px] text-text-tertiary">Loading…</p>}

          {/* Approved images */}
          {approved.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 mb-2">
                Approved ({approved.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {approved.map((img) => (
                  <div key={img.id} className="group relative border border-emerald-400/30 bg-ground-light/20 overflow-hidden">
                    {img.featured && (
                      <div className="absolute top-1 left-1 z-10 font-mono text-[7px] uppercase tracking-widest bg-gold text-ground px-1 py-0.5">
                        Featured
                      </div>
                    )}
                    <div className="aspect-[4/3] bg-ground-light/40 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.thumbnail_url ?? img.image_url}
                        alt={img.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <div className="text-[10px] text-text-secondary leading-tight line-clamp-2 mb-1">{img.title}</div>
                      <div className={`font-mono text-[8px] ${licenseColor(img.license)}`}>{img.license ?? 'Unknown license'}</div>
                      <div className="font-mono text-[8px] text-text-tertiary line-clamp-1">{img.author ?? ''}</div>
                      <div className="font-mono text-[7px] text-text-tertiary/40 uppercase tracking-widest mt-0.5">{img.source.replace('_', ' ')}</div>
                    </div>
                    <div className="px-2 pb-2 flex gap-1 flex-wrap">
                      <button
                        onClick={() => update(img.id, { featured: !img.featured })}
                        className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded transition-colors ${img.featured ? 'text-gold border-gold/30 bg-gold/5' : 'text-text-tertiary border-border hover:text-gold'}`}
                      >
                        {img.featured ? '★ Featured' : '☆ Feature'}
                      </button>
                      <button
                        onClick={() => update(img.id, { status: 'rejected' })}
                        className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                      >
                        Remove
                      </button>
                      {img.source_page_url && (
                        <a
                          href={img.source_page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[7px] uppercase tracking-widest text-sky-400/60 border border-sky-400/20 px-1.5 py-0.5 rounded hover:text-sky-400 transition-colors"
                        >
                          Source →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested images — Visual Curator verdicts */}
          {suggested.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-amber-400 mb-2">
                Suggested ({suggested.length}) — Visual Curator review
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggested.map((img) => {
                  const verdictColor =
                    img.gemini_verdict === 'approve' ? 'text-emerald-400 border-emerald-400/30' :
                    img.gemini_verdict === 'approve_with_tweaks' ? 'text-amber-400 border-amber-400/30' :
                    'text-text-tertiary border-border';
                  const verdictLabel =
                    img.gemini_verdict === 'approve' ? '✓ Approve' :
                    img.gemini_verdict === 'approve_with_tweaks' ? '~ Tweaks' :
                    img.gemini_verdict ? '✗ Queried' : null;

                  return (
                    <div key={img.id} className="border border-border/50 bg-ground-light/10 overflow-hidden hover:border-border/80 transition-colors">
                      {/* Image */}
                      <div className="aspect-video bg-ground-light/40 overflow-hidden relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.thumbnail_url ?? img.image_url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {/* Verdict badge */}
                        {verdictLabel && (
                          <div className={`absolute top-1.5 right-1.5 font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 bg-ground/80 backdrop-blur-sm ${verdictColor}`}>
                            {verdictLabel}
                          </div>
                        )}
                        {/* Score badge */}
                        {img.gemini_aesthetic_score !== null && (
                          <div className="absolute top-1.5 left-1.5 font-mono text-[7px] bg-ground/80 backdrop-blur-sm border border-border/60 px-1.5 py-0.5 text-text-secondary">
                            {img.gemini_aesthetic_score}/10
                          </div>
                        )}
                      </div>

                      {/* Curator analysis */}
                      <div className="p-2.5 space-y-1.5">
                        <div className="text-[10px] text-text-secondary leading-tight line-clamp-1 font-medium">{img.title}</div>

                        {/* Literal description */}
                        {img.gemini_literal && (
                          <p className="text-[9px] text-text-tertiary leading-snug line-clamp-2">
                            <span className="font-mono text-[8px] text-text-tertiary/50 uppercase tracking-widest mr-1">Shows:</span>
                            {img.gemini_literal}
                          </p>
                        )}

                        {/* Alignment */}
                        {img.gemini_alignment && (
                          <p className="text-[9px] text-text-secondary leading-snug line-clamp-2">
                            <span className="font-mono text-[8px] text-text-tertiary/50 uppercase tracking-widest mr-1">Fit:</span>
                            {img.gemini_alignment}
                          </p>
                        )}

                        {/* Suggested caption */}
                        {img.gemini_caption && (
                          <p className="text-[9px] text-sky-400/80 leading-snug line-clamp-2 italic">
                            &ldquo;{img.gemini_caption}&rdquo;
                          </p>
                        )}

                        {/* Tweaks note + crop controls */}
                        {img.gemini_tweaks && (
                          <div className="space-y-1.5">
                            <p className="text-[9px] text-amber-400/80 leading-snug line-clamp-3">
                              <span className="font-mono text-[8px] uppercase tracking-widest mr-1">Tweak:</span>
                              {img.gemini_tweaks}
                            </p>
                            {/* Crop + position controls for approved images */}
                            {img.status === 'approved' && (
                              <div className="flex items-center gap-2 flex-wrap">
                                {parseCropHint(img.gemini_tweaks) && (
                                  <button
                                    onClick={() => void applyCrop(img)}
                                    disabled={cropStatus[img.id] === 'cropping…'}
                                    className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 rounded transition-colors disabled:opacity-40"
                                  >
                                    {img.cropped_url ? 'Re-crop' : 'Apply Crop'}
                                  </button>
                                )}
                                {img.cropped_url && (
                                  <span className="font-mono text-[8px] text-emerald-400">cropped ✓</span>
                                )}
                                {cropStatus[img.id] && (
                                  <span className={`font-mono text-[8px] ${cropStatus[img.id].startsWith('error') ? 'text-red-400' : cropStatus[img.id].includes('✓') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                                    {cropStatus[img.id]}
                                  </span>
                                )}
                                <span className="font-mono text-[8px] text-text-tertiary">pos:</span>
                                {(['top', 'center', 'bottom'] as const).map((pos) => (
                                  <button
                                    key={pos}
                                    onClick={() => void setPosition(img.id, pos)}
                                    className={`font-mono text-[8px] px-1.5 py-0.5 border rounded transition-colors ${(img.hero_position ?? 'center') === pos ? 'border-gold text-gold bg-gold/10' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
                                  >
                                    {pos}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* License + author */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <span className={`font-mono text-[8px] ${licenseColor(img.license)}`}>{img.license ?? 'Unknown license'}</span>
                          {img.license?.toLowerCase().includes('nc') && (
                            <span className="font-mono text-[7px] uppercase tracking-widest text-orange-400 border border-orange-400/30 px-1 py-0.5">⚠ NC</span>
                          )}
                          {img.author && <span className="font-mono text-[8px] text-text-tertiary/60 line-clamp-1">{img.author}</span>}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-2.5 pb-2.5 flex gap-1.5 flex-wrap border-t border-border/30 pt-2">
                        <button
                          onClick={() => update(img.id, { status: 'approved' })}
                          className="font-mono text-[7px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-1.5 py-0.5 rounded hover:bg-emerald-400/10 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => update(img.id, { status: 'approved', featured: true })}
                          className="font-mono text-[7px] uppercase tracking-widest text-gold border border-gold/30 px-1.5 py-0.5 rounded hover:bg-gold/10 transition-colors"
                        >
                          ★ Feature
                        </button>
                        <button
                          onClick={() => update(img.id, { status: 'rejected' })}
                          className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                        >
                          ✕
                        </button>
                        {img.source_page_url && (
                          <a
                            href={img.source_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[7px] uppercase tracking-widest text-sky-400/60 border border-sky-400/20 px-1.5 py-0.5 rounded hover:text-sky-400 transition-colors ml-auto"
                          >
                            Commons →
                          </a>
                        )}
                      </div>

                      {/* Alternatives (for borderline images) */}
                      {img.gemini_alternatives && (
                        <div className="px-2.5 pb-2 border-t border-border/20">
                          <p className="font-mono text-[7px] text-text-tertiary/50 uppercase tracking-widest mt-1.5 mb-0.5">Alternatives</p>
                          <p className="text-[9px] text-text-tertiary/70 leading-snug">{img.gemini_alternatives}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upload your own image */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border border-dashed border-border/40 hover:border-violet-400/40 transition-colors rounded p-4 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/tiff"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
            />
            <p className="font-mono text-[9px] text-text-tertiary mb-2">
              Upload your own image — goes straight to Approved
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-3 py-1.5 rounded hover:bg-sky-400/10 transition-colors disabled:opacity-40"
            >
              {uploading ? 'Uploading…' : '↑ Choose File or Drag Here'}
            </button>
            {uploadMsg && (
              <p className={`font-mono text-[8px] mt-2 ${uploadMsg.startsWith('Upload failed') ? 'text-red-400' : 'text-emerald-400'}`}>
                {uploadMsg}
              </p>
            )}
          </div>

          {!loading && images.length === 0 && !searching && (
            <p className="font-mono text-[10px] text-text-tertiary">
              Search sources above or upload your own image.
            </p>
          )}
        </div>
      )}
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

// ── People Diff Panel ─────────────────────────────────────────────────────────

function PersonDiffPanel({
  person,
  fresh,
  applyingDiff,
  onApply,
  onDismiss,
}: {
  person: PersonRow;
  fresh: AIResearchResult;
  applyingDiff: boolean;
  onApply: (fields: Record<string, unknown>) => void;
  onDismiss: () => void;
}) {
  const changed = DIFF_FIELDS.filter(({ key }) => {
    const fv = String(fresh[key] ?? '').trim();
    const cv = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
    return fv !== '' && fv !== cv;
  });
  const unchanged = DIFF_FIELDS.filter(({ key }) => {
    const fv = String(fresh[key] ?? '').trim();
    const cv = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
    return fv === '' || fv === cv;
  });
  const warnings = validateAIResult(fresh);
  const changedFields = Object.fromEntries(changed.map(({ key }) => [key, fresh[key]])) as Record<string, unknown>;

  return (
    <div className="mt-3 border border-sky-400/20 bg-sky-400/5 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[8px] uppercase tracking-widest text-sky-400">
          Re-research result — {changed.length} field{changed.length !== 1 ? 's' : ''} changed
        </p>
        <button onClick={onDismiss} className="font-mono text-[8px] text-text-tertiary hover:text-text-secondary">
          ✕ dismiss
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded p-2 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="font-mono text-[9px] text-amber-400/80">⚠ {w}</p>
          ))}
        </div>
      )}

      {changed.length === 0 ? (
        <p className="font-mono text-[9px] text-text-tertiary">No differences found — data looks current.</p>
      ) : (
        <div className="space-y-2">
          {changed.map(({ key, label }) => {
            const freshVal = String(fresh[key] ?? '').trim();
            const currentVal = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
            return (
              <div key={key} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-start text-xs">
                <span className="font-mono text-[8px] text-text-tertiary pt-0.5">{label}</span>
                <span className="text-text-tertiary line-clamp-2 bg-ground rounded px-2 py-1">{currentVal || '—'}</span>
                <span className="text-text-primary line-clamp-2 bg-ground rounded px-2 py-1 border border-sky-400/20">{freshVal}</span>
              </div>
            );
          })}
          {unchanged.length > 0 && (
            <p className="font-mono text-[8px] text-text-tertiary">
              {unchanged.length} field{unchanged.length !== 1 ? 's' : ''} unchanged ({unchanged.map((f) => f.label).join(', ')})
            </p>
          )}
        </div>
      )}

      {changed.length > 0 && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onApply(changedFields)}
            disabled={applyingDiff}
            className="font-mono text-[8px] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-3 py-1.5 rounded hover:bg-sky-400/5 transition-colors disabled:opacity-40"
          >
            {applyingDiff ? 'Applying…' : `Apply ${changed.length} change${changed.length !== 1 ? 's' : ''} →`}
          </button>
          <button
            onClick={onDismiss}
            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary px-3 py-1.5 rounded hover:text-text-secondary transition-colors"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

// ── People Tab ────────────────────────────────────────────────────────────────

const CREDIBILITY_TIERS = [
  'academic', 'journalist', 'independent_researcher', 'whistleblower',
  'public_figure', 'historical_figure', 'witness', 'unclassified',
];

const STATUS_OPTIONS = ['draft', 'published', 'archived'];

// ── Validation ────────────────────────────────────────────────────────────────

const KNOWN_BAD_ROLE_VALUES = new Set([
  'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'string', 'null', 'undefined',
  'n/a', 'unknown', 'tbd', 'none', 'placeholder', 'example', 'test',
]);

const PLACEHOLDER_PATTERNS = /^(string|null|undefined|N\/A|unknown|TBD|none|example|test|\[.*\])$/i;

function validateAIResult(r: AIResearchResult): string[] {
  const warnings: string[] = [];

  if (r.current_role) {
    const roleNorm = r.current_role.toLowerCase().trim();
    if (KNOWN_BAD_ROLE_VALUES.has(roleNorm))
      warnings.push(`current_role looks like a DB/placeholder artifact: "${r.current_role}"`);
  }

  if (r.credibility_tier && !CREDIBILITY_TIERS.includes(r.credibility_tier))
    warnings.push(`credibility_tier "${r.credibility_tier}" is not in the allowed list`);

  for (const field of ['short_bio', 'bio', 'nationality', 'born_location'] as const) {
    const val = r[field];
    if (typeof val === 'string' && PLACEHOLDER_PATTERNS.test(val.trim()))
      warnings.push(`${field} looks like a placeholder: "${val}"`);
  }

  if (r.short_bio && r.short_bio.trim().length < 10)
    warnings.push('short_bio is suspiciously short');

  if (r.born_date) {
    const year = parseInt(r.born_date.slice(0, 4));
    if (isNaN(year) || year < 1200 || year > 2010)
      warnings.push(`born_date "${r.born_date}" looks invalid`);
  }

  if (r.slug && !/^[a-z0-9-]+$/.test(r.slug))
    warnings.push(`slug "${r.slug}" contains invalid characters`);

  return warnings;
}

const STALE_DAYS = 90;
function isStale(lastResearched: string | null): boolean {
  if (!lastResearched) return true;
  const ms = Date.now() - new Date(lastResearched).getTime();
  return ms > STALE_DAYS * 24 * 60 * 60 * 1000;
}

// Fields we compare when showing a re-research diff
const DIFF_FIELDS: { key: keyof AIResearchResult; label: string }[] = [
  { key: 'short_bio', label: 'Short bio' },
  { key: 'credibility_tier', label: 'Tier' },
  { key: 'current_role', label: 'Current role' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'born_date', label: 'Born' },
  { key: 'born_location', label: 'Born location' },
  { key: 'died_date', label: 'Died' },
  { key: 'website_url', label: 'Website' },
  { key: 'twitter_handle', label: 'X / Twitter' },
  { key: 'wikipedia_url', label: 'Wikipedia' },
];

// ─────────────────────────────────────────────────────────────────────────────

interface PersonRow {
  id: string;
  slug: string | null;
  full_name: string;
  known_as: string[] | null;
  short_bio: string | null;
  credibility_tier: string;
  current_role: string | null;
  status: string | null;
  featured: boolean;
  last_researched_at: string | null;
  relationship_count?: number;
  media_count?: number;
  topic_count?: number;
}

interface AIResearchResult {
  full_name: string;
  known_as?: string[];
  short_bio?: string;
  bio?: string;
  born_date?: string;
  born_location?: string;
  died_date?: string;
  nationality?: string;
  credibility_tier?: string;
  current_role?: string;
  work_history?: unknown[];
  education?: unknown[];
  notable_claims?: unknown[];
  key_positions?: string[];
  website_url?: string;
  twitter_handle?: string;
  wikipedia_url?: string;
  socials?: { platform: string; url: string; handle?: string }[];
  bio_sections?: { section_type: string; title: string; content: string; sort_order: number }[];
  suggested_relationships?: { person_name: string; relationship_type: string; description: string; strength: number; bidirectional: boolean; start_year?: string }[];
  suggested_books?: unknown[];
  slug?: string;
}

function PeopleTab() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [personDescription, setPersonDescription] = useState('');
  const [personSources, setPersonSources] = useState('');
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<AIResearchResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'list' | 'add' | 'wishlist'>('list');
  const [wishlist, setWishlist] = useState<{ id: string; person_name: string; relationship_type: string | null; source_person_name: string | null; description: string | null; created_at: string }[]>([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const [reresearchingId, setReresearchingId] = useState<string | null>(null);
  const [diffResult, setDiffResult] = useState<{ personId: string; fresh: AIResearchResult } | null>(null);
  const [applyingDiff, setApplyingDiff] = useState(false);
  const [personEnhanceOpen, setPersonEnhanceOpen] = useState<string | null>(null);
  const [personEnhanceQuestions, setPersonEnhanceQuestions] = useState<Record<string, string[]>>({});
  const [personEnhanceSources, setPersonEnhanceSources] = useState<Record<string, string>>({});
  const [personEnhanceStatus, setPersonEnhanceStatus] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/people');
      const data = await res.json();
      setPeople(data.people ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWishlist = useCallback(async () => {
    setWishlistLoading(true);
    try {
      const res = await fetch('/api/admin/people/wishlist');
      const data = await res.json();
      setWishlist(data.wishlist ?? []);
    } finally {
      setWishlistLoading(false);
    }
  }, []);

  const addToWishlist = async (personName: string, relationshipType: string, sourceName: string) => {
    setWishlisted((prev) => new Set(prev).add(personName));
    await fetch('/api/admin/people/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ person_name: personName, relationship_type: relationshipType, source_person_name: sourceName }),
    });
  };

  const removeFromWishlist = async (id: string) => {
    await fetch(`/api/admin/people/wishlist?id=${id}`, { method: 'DELETE' });
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  };

  useEffect(() => { load(); }, [load]);

  const runResearch = async () => {
    if (!searchName.trim()) return;
    setResearching(true);
    setResearchResult(null);
    try {
      const res = await fetch('/api/admin/people/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: searchName.trim(),
          description: personDescription.trim() || undefined,
          sources: personSources.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Research failed');
      setResearchResult(data.person);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
    }
  };

  const savePerson = async () => {
    if (!researchResult) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: { ...researchResult, status: 'draft' },
          bio_sections: researchResult.bio_sections ?? [],
          suggested_relationships: researchResult.suggested_relationships ?? [],
          suggested_books: researchResult.suggested_books ?? [],
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Save failed');
      setResearchResult(null);
      setSearchName('');
      setActiveSection('list');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const patchPerson = async (id: string, fields: Record<string, unknown>) => {
    await fetch('/api/admin/people', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    await load();
  };

  const deletePerson = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/people?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const runReresearch = async (person: PersonRow) => {
    setReresearchingId(person.id);
    setDiffResult(null);
    try {
      const res = await fetch('/api/admin/people/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: person.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Re-research failed');
      setDiffResult({ personId: person.id, fresh: data.person });
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setReresearchingId(null);
    }
  };

  const launchPersonEnhance = async (person: PersonRow) => {
    const key = person.id;
    const questions = (personEnhanceQuestions[key] ?? ['']).filter((q) => q.trim());
    if (questions.length === 0) return;
    const sources = personEnhanceSources[key]?.trim() || undefined;
    const batchCount = Math.ceil(questions.length / 3);
    setPersonEnhanceStatus((s) => ({ ...s, [key]: 'queuing…' }));
    setPersonEnhanceOpen(null);
    try {
      const res = await fetch('/api/research/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: person.slug || person.full_name.toLowerCase().replace(/\s+/g, '-'),
          title: person.full_name,
          research_questions: questions,
          source_urls: sources,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error as string);
      const label = batchCount > 1
        ? `${batchCount} batches queued — check Sessions tab`
        : `queued — check Sessions tab`;
      setPersonEnhanceStatus((s) => ({ ...s, [key]: label }));
    } catch (err) {
      setPersonEnhanceStatus((s) => ({ ...s, [key]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const applyDiffFields = async (personId: string, fields: Record<string, unknown>) => {
    setApplyingDiff(true);
    try {
      await patchPerson(personId, { ...fields, last_researched_at: new Date().toISOString() });
      setDiffResult(null);
    } finally {
      setApplyingDiff(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl mb-1">People</h2>
          <p className="text-sm text-text-secondary">
            Researchers, whistleblowers, and figures connected to research topics.
            AI auto-populates profiles from a name.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('list')}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${activeSection === 'list' ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
          >
            List
          </button>
          <button
            onClick={() => { setActiveSection('wishlist'); loadWishlist(); }}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors flex items-center gap-1.5 ${activeSection === 'wishlist' ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
          >
            Wishlist
            {wishlist.length > 0 && (
              <span className="bg-gold/20 text-gold text-[7px] px-1 py-0.5 rounded-full leading-none">{wishlist.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('add')}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${activeSection === 'add' ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
          >
            + Add Person
          </button>
        </div>
      </div>

      {/* ADD SECTION */}
      {activeSection === 'add' && (
        <div className="border border-border bg-ground-light rounded p-6 space-y-6">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Person&apos;s Name
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                placeholder="e.g. Graham Hancock"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runResearch()}
              />
              <button
                onClick={runResearch}
                disabled={researching || !searchName.trim()}
                className="font-mono text-sm px-5 py-2 border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {researching ? 'Researching…' : 'Research with AI →'}
              </button>
            </div>
            <p className="mt-1 font-mono text-[9px] text-text-tertiary">
              Claude + Perplexity will auto-fill bio, credentials, relationships, and more.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Description <span className="normal-case tracking-normal opacity-60">(optional — disambiguate or focus the AI)</span>
            </label>
            <textarea
              className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder="e.g. British author known for alternative archaeology and lost civilisations — not the jazz musician of the same name"
              value={personDescription}
              onChange={(e) => setPersonDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Source Hints <span className="normal-case tracking-normal opacity-60">(optional — URLs or book titles, one per line)</span>
            </label>
            <textarea
              className="w-full bg-ground border border-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder={"https://grahamhancock.com\nhttps://en.wikipedia.org/wiki/Graham_Hancock"}
              value={personSources}
              onChange={(e) => setPersonSources(e.target.value)}
            />
          </div>

          {/* Research result preview */}
          {researchResult && (
            <div className="border border-gold/20 bg-gold/5 rounded p-5 space-y-5">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-xl">{researchResult.full_name}</h3>
                <span className="font-mono text-[8px] uppercase tracking-widest border border-gold/30 text-gold px-2 py-0.5 rounded">
                  AI Draft
                </span>
              </div>

              {/* Editable fields preview */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'short_bio', label: 'Short bio' },
                  { key: 'credibility_tier', label: 'Tier' },
                  { key: 'current_role', label: 'Role' },
                  { key: 'nationality', label: 'Nationality' },
                  { key: 'born_date', label: 'Born' },
                  { key: 'born_location', label: 'Born location' },
                ].map(({ key, label }) => (
                  <div key={key} className={key === 'short_bio' ? 'col-span-2' : ''}>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">{label}</p>
                    <input
                      className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                      value={(researchResult[key as keyof AIResearchResult] as string) ?? ''}
                      onChange={(e) => setResearchResult((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                    />
                  </div>
                ))}
              </div>

              {researchResult.bio && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Bio preview</p>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">{researchResult.bio}</p>
                </div>
              )}

              {researchResult.bio_sections && researchResult.bio_sections.length > 0 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                    {researchResult.bio_sections.length} bio sections generated
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {researchResult.bio_sections.map((s, i) => (
                      <span key={i} className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                        {s.section_type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {researchResult.suggested_relationships && researchResult.suggested_relationships.length > 0 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                    {researchResult.suggested_relationships.length} suggested relationships
                  </p>
                  <div className="space-y-1">
                    {researchResult.suggested_relationships.slice(0, 4).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span className="border border-border px-1.5 py-0.5 rounded font-mono text-[8px]">{r.relationship_type}</span>
                        <span className="flex-1">{r.person_name}</span>
                        {wishlisted.has(r.person_name) ? (
                          <span className="font-mono text-[7px] text-gold">✓ queued</span>
                        ) : (
                          <button
                            onClick={() => addToWishlist(r.person_name, r.relationship_type, researchResult.full_name)}
                            title="Add to wishlist"
                            className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5 rounded hover:text-gold hover:border-gold/30 transition-colors leading-none"
                          >
                            + wishlist
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {researchResult.suggested_books && (researchResult.suggested_books as unknown[]).length > 0 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                    {(researchResult.suggested_books as unknown[]).length} books
                  </p>
                  <div className="space-y-1">
                    {(researchResult.suggested_books as Record<string, unknown>[]).slice(0, 4).map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span className="border border-border px-1.5 py-0.5 rounded font-mono text-[8px]">{b.relationship as string}</span>
                        <span className="font-serif">{b.title as string}</span>
                        <span className="text-text-tertiary">by {b.author_name as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(researchResult.website_url || researchResult.twitter_handle || researchResult.wikipedia_url || (researchResult.socials as unknown[] | undefined)?.length) && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Socials / links found</p>
                  <div className="flex flex-wrap gap-2">
                    {researchResult.website_url && <span className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">website</span>}
                    {researchResult.twitter_handle && <span className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">X {researchResult.twitter_handle}</span>}
                    {researchResult.wikipedia_url && <span className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">wikipedia</span>}
                    {(researchResult.socials as { platform: string }[] | undefined)?.map((s, i) => (
                      <span key={i} className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">{s.platform}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation warnings */}
              {(() => {
                const warnings = validateAIResult(researchResult);
                if (warnings.length === 0) return null;
                return (
                  <div className="border border-amber-400/30 bg-amber-400/5 rounded p-3 space-y-1">
                    <p className="font-mono text-[8px] uppercase tracking-widest text-amber-400 mb-2">
                      {warnings.length} validation warning{warnings.length > 1 ? 's' : ''} — review before saving
                    </p>
                    {warnings.map((w, i) => (
                      <p key={i} className="font-mono text-[9px] text-amber-400/80">⚠ {w}</p>
                    ))}
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2 border-t border-border">
                <button
                  onClick={savePerson}
                  disabled={saving}
                  className="font-mono text-sm px-5 py-2 border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save as Draft →'}
                </button>
                <button
                  onClick={() => setResearchResult(null)}
                  className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors px-3 py-2"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WISHLIST SECTION */}
      {activeSection === 'wishlist' && (
        <div>
          {wishlistLoading ? (
            <p className="text-text-tertiary font-mono text-sm">Loading…</p>
          ) : wishlist.length === 0 ? (
            <div className="text-center py-12 border border-border rounded">
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">Wishlist empty</p>
              <p className="text-xs text-text-tertiary">Click <span className="text-gold">+ wishlist</span> next to suggested relationships when researching a person.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wishlist.map((item) => (
                <div key={item.id} className="border border-border bg-ground-light rounded p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-serif text-base">{item.person_name}</span>
                      {item.relationship_type && (
                        <span className="font-mono text-[7px] uppercase tracking-widest border border-border text-text-tertiary px-1.5 py-0.5 rounded">
                          {item.relationship_type}
                        </span>
                      )}
                    </div>
                    {item.source_person_name && (
                      <p className="text-xs text-text-tertiary">
                        Suggested from <span className="text-text-secondary">{item.source_person_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSearchName(item.person_name);
                        setPersonDescription(item.source_person_name
                          ? `Suggested as ${item.relationship_type ?? 'connection'} of ${item.source_person_name}`
                          : '');
                        removeFromWishlist(item.id);
                        setActiveSection('add');
                      }}
                      className="font-mono text-[8px] uppercase tracking-widest text-gold border border-gold/30 px-3 py-1.5 rounded hover:bg-gold/5 transition-colors"
                    >
                      Research Now →
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1.5 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIST SECTION */}
      {activeSection === 'list' && (
        <div>
          {loading ? (
            <p className="text-text-tertiary font-mono text-sm">Loading…</p>
          ) : people.length === 0 ? (
            <p className="text-text-tertiary font-mono text-sm">No people yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <div key={person.id} className="border border-border bg-ground-light rounded p-4">
                  {editingId === person.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: 'short_bio', label: 'Short bio', span: true },
                          { key: 'credibility_tier', label: 'Tier' },
                          { key: 'current_role', label: 'Role' },
                          { key: 'status', label: 'Status' },
                          { key: 'slug', label: 'Slug' },
                          { key: 'faith', label: 'Faith' },
                          { key: 'faith_status', label: 'Faith status' },
                          { key: 'political_party', label: 'Political party' },
                          { key: 'political_party_status', label: 'Party status' },
                        ].map(({ key, label, span }) => (
                          <div key={key} className={span ? 'col-span-3' : ''}>
                            <label className="block font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">{label}</label>
                            {key === 'credibility_tier' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {CREDIBILITY_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : key === 'status' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : key === 'faith_status' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? 'unknown'}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {['unknown', 'professed', 'assumed'].map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : key === 'political_party_status' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? 'unknown'}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {['unknown', 'registered', 'assumed'].map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await patchPerson(person.id, editFields);
                            setEditingId(null);
                          }}
                          className="font-mono text-[9px] uppercase tracking-widest border border-gold/30 text-gold px-3 py-1.5 rounded hover:bg-gold/5 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary px-3 py-1.5 rounded hover:text-text-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-serif text-base">{person.full_name}</span>
                          <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${person.status === 'published' ? 'text-emerald-400 border-emerald-400/30' : person.status === 'archived' ? 'text-text-tertiary border-border' : 'text-amber-400 border-amber-400/30'}`}>
                            {person.status ?? 'draft'}
                          </span>
                          {person.credibility_tier && person.credibility_tier !== 'unclassified' && (
                            <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                              {person.credibility_tier}
                            </span>
                          )}
                          {isStale(person.last_researched_at) && (
                            <span title={person.last_researched_at ? `Last researched ${new Date(person.last_researched_at).toLocaleDateString()}` : 'Never researched'} className="font-mono text-[7px] uppercase tracking-widest text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">
                              stale
                            </span>
                          )}
                        </div>
                        {person.short_bio && (
                          <p className="text-xs text-text-tertiary line-clamp-1">{person.short_bio}</p>
                        )}
                        <div className="flex gap-3 mt-1">
                          {person.slug && (
                            <span className="font-mono text-[8px] text-text-tertiary">/people/{person.slug}</span>
                          )}
                          {(person.relationship_count ?? 0) > 0 && (
                            <span className="font-mono text-[8px] text-text-tertiary">{person.relationship_count} connections</span>
                          )}
                          {person.last_researched_at && (
                            <span className="font-mono text-[8px] text-text-tertiary">
                              researched {new Date(person.last_researched_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {person.slug && (
                          <a
                            href={`/people/${person.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => runReresearch(person)}
                          disabled={reresearchingId === person.id}
                          className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-sky-400 hover:border-sky-400/30 transition-colors disabled:opacity-40"
                        >
                          {reresearchingId === person.id ? '…' : '↻'}
                        </button>
                        <button
                          onClick={() => {
                            setPersonEnhanceOpen(personEnhanceOpen === person.id ? null : person.id);
                            if (!personEnhanceQuestions[person.id]) {
                              setPersonEnhanceQuestions((q) => ({ ...q, [person.id]: [''] }));
                            }
                          }}
                          className="font-mono text-[8px] uppercase tracking-widest text-gold border border-gold/30 px-2 py-1 rounded hover:bg-gold/5 transition-colors"
                        >
                          + Enhance
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(person.id);
                            setEditFields({
                              short_bio: person.short_bio ?? '',
                              credibility_tier: person.credibility_tier ?? 'unclassified',
                              current_role: person.current_role ?? '',
                              status: person.status ?? 'draft',
                              slug: person.slug ?? '',
                              faith: (person as unknown as Record<string, string>).faith ?? '',
                              faith_status: (person as unknown as Record<string, string>).faith_status ?? 'unknown',
                              political_party: (person as unknown as Record<string, string>).political_party ?? '',
                              political_party_status: (person as unknown as Record<string, string>).political_party_status ?? 'unknown',
                            });
                          }}
                          className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => patchPerson(person.id, { status: person.status === 'published' ? 'draft' : 'published' })}
                          className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${person.status === 'published' ? 'text-amber-400 border-amber-400/30 hover:bg-amber-400/5' : 'text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/5'}`}
                        >
                          {person.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => deletePerson(person.id, person.full_name)}
                          className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Diff panel — shown after re-research */}
                    {diffResult?.personId === person.id && (
                      <PersonDiffPanel
                        person={person}
                        fresh={diffResult.fresh}
                        applyingDiff={applyingDiff}
                        onApply={(fields) => applyDiffFields(person.id, fields)}
                        onDismiss={() => setDiffResult(null)}
                      />
                    )}

                    {/* Enhance panel */}
                    {personEnhanceOpen === person.id && (
                      <div className="mt-3 pt-3 border-t border-gold/20 space-y-3 bg-gold/3 rounded-b px-1">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-gold">
                          Enhance Research — {person.full_name}
                        </div>
                        <p className="font-mono text-[9px] text-text-tertiary">
                          Up to 9 questions, auto-batched in groups of 3. Results go to Sessions tab for review.
                        </p>
                        <div className="space-y-2">
                          {(personEnhanceQuestions[person.id] ?? ['']).map((q, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                className="flex-1 bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                placeholder={`Research question ${i + 1}`}
                                value={q}
                                onChange={(e) => {
                                  const updated = [...(personEnhanceQuestions[person.id] ?? [''])];
                                  updated[i] = e.target.value;
                                  setPersonEnhanceQuestions((s) => ({ ...s, [person.id]: updated }));
                                }}
                              />
                              {(personEnhanceQuestions[person.id] ?? ['']).length > 1 && (
                                <button
                                  onClick={() => {
                                    const updated = (personEnhanceQuestions[person.id] ?? ['']).filter((_, idx) => idx !== i);
                                    setPersonEnhanceQuestions((s) => ({ ...s, [person.id]: updated }));
                                  }}
                                  className="px-2 text-text-tertiary hover:text-red-400 transition-colors"
                                >×</button>
                              )}
                            </div>
                          ))}
                        </div>
                        {(personEnhanceQuestions[person.id] ?? ['']).length < 9 && (
                          <button
                            onClick={() => setPersonEnhanceQuestions((s) => ({ ...s, [person.id]: [...(s[person.id] ?? ['']), ''] }))}
                            className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
                          >
                            + Add question
                          </button>
                        )}
                        <div>
                          <label className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-1">
                            Source Material <span className="normal-case tracking-normal opacity-60">(paste articles, excerpts, or URLs — agents will cite these directly)</span>
                          </label>
                          <textarea
                            className="w-full bg-ground border border-border px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none font-mono"
                            rows={5}
                            placeholder={"Paste full article text, excerpts, or URLs.\nAgents treat this as primary source material.\n\nhttps://example.com/article\n\"Direct quote from source...\""}
                            value={personEnhanceSources[person.id] ?? ''}
                            onChange={(e) => setPersonEnhanceSources((s) => ({ ...s, [person.id]: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-3 items-center">
                          <button
                            onClick={() => launchPersonEnhance(person)}
                            disabled={!(personEnhanceQuestions[person.id] ?? ['']).some((q) => q.trim())}
                            className="font-mono text-[9px] uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
                          >
                            Launch Enhancement →
                          </button>
                          <button
                            onClick={() => setPersonEnhanceOpen(null)}
                            className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {personEnhanceStatus[person.id] && (
                      <div className={`mt-2 font-mono text-[9px] ${personEnhanceStatus[person.id].startsWith('error') ? 'text-red-400' : 'text-text-tertiary'}`}>
                        {personEnhanceStatus[person.id]}
                      </div>
                    )}
                  </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Institutions Tab ──────────────────────────────────────────────────────────

interface InstitutionRow {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  institution_type: string;
  transparency_tier: string;
  status: string;
  short_bio?: string;
  headquarters_city?: string;
  headquarters_country?: string;
  people_count?: number;
  relationship_count?: number;
}

interface AIInstitutionResult {
  name: string;
  slug?: string;
  short_name?: string;
  known_as?: string[];
  short_bio?: string;
  bio?: string;
  institution_type?: string;
  transparency_tier?: string;
  founded_year?: string;
  headquarters_city?: string;
  headquarters_state?: string;
  headquarters_country?: string;
  relevance_summary?: string;
  controversy_summary?: string;
  website_url?: string;
  wikipedia_url?: string;
  bio_sections?: Array<{ section_type: string; title: string; content: string; sort_order: number }>;
  suggested_relationships?: Array<{ institution_name: string; relationship_type: string; description: string; covert: boolean; start_year?: string }>;
}

const INSTITUTION_TYPES = [
  'museum', 'university', 'intelligence', 'secret_society', 'government_agency',
  'military', 'religious', 'think_tank', 'research_institute', 'other',
];

const TRANSPARENCY_TIERS = [
  'open', 'standard', 'opaque', 'classified', 'defunct_classified',
];

const INST_TYPE_BADGE: Record<string, string> = {
  museum: 'text-sky-400 border-sky-400/30',
  university: 'text-violet-400 border-violet-400/30',
  intelligence: 'text-red-400 border-red-400/30',
  secret_society: 'text-amber-400 border-amber-400/30',
  government_agency: 'text-orange-400 border-orange-400/30',
  military: 'text-red-400 border-red-400/30',
  religious: 'text-purple-400 border-purple-400/30',
  think_tank: 'text-emerald-400 border-emerald-400/30',
  research_institute: 'text-teal-400 border-teal-400/30',
};

const INST_TIER_BADGE: Record<string, string> = {
  open: 'text-emerald-400 border-emerald-400/30',
  standard: 'text-text-tertiary border-border',
  opaque: 'text-amber-400 border-amber-400/30',
  classified: 'text-red-400 border-red-400/30',
  defunct_classified: 'text-orange-400 border-orange-400/30',
};

function InstitutionsTab() {
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [institutionDescription, setInstitutionDescription] = useState('');
  const [institutionSources, setInstitutionSources] = useState('');
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<AIInstitutionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'list' | 'add'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/institutions');
      const data = await res.json();
      setInstitutions(data.institutions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runResearch = async () => {
    if (!searchName.trim()) return;
    setResearching(true);
    setResearchResult(null);
    try {
      const res = await fetch('/api/admin/institutions/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: searchName.trim(),
          description: institutionDescription.trim() || undefined,
          sources: institutionSources.trim() || undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Research failed');
      setResearchResult(data.institution as AIInstitutionResult);
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(false);
    }
  };

  const saveInstitution = async () => {
    if (!researchResult) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution: { ...researchResult, status: 'draft' },
          bio_sections: researchResult.bio_sections ?? [],
          suggested_relationships: researchResult.suggested_relationships ?? [],
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error((data.error as string) ?? 'Save failed');
      setResearchResult(null);
      setSearchName('');
      setActiveSection('list');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const patchInstitution = async (id: string, fields: Record<string, unknown>) => {
    await fetch('/api/admin/institutions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    });
    await load();
  };

  const deleteInstitution = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/institutions?id=${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl mb-1">Institutions</h2>
          <p className="text-sm text-text-secondary">
            Agencies, societies, universities, and organizations in the evidence index.
            AI auto-populates profiles from a name.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('list')}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${activeSection === 'list' ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
          >
            List
          </button>
          <button
            onClick={() => setActiveSection('add')}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${activeSection === 'add' ? 'border-gold text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
          >
            + Add Institution
          </button>
        </div>
      </div>

      {/* ADD SECTION */}
      {activeSection === 'add' && (
        <div className="border border-border bg-ground-light rounded p-6 space-y-6">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Institution Name
            </label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                placeholder="e.g. Central Intelligence Agency"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runResearch()}
              />
              <button
                onClick={runResearch}
                disabled={researching || !searchName.trim()}
                className="font-mono text-sm px-5 py-2 border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {researching ? 'Researching…' : 'Research with AI →'}
              </button>
            </div>
            <p className="mt-1 font-mono text-[9px] text-text-tertiary">
              Claude + Perplexity will auto-fill overview, programs, departments, and more.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Description <span className="normal-case tracking-normal opacity-60">(optional — disambiguate or focus the AI)</span>
            </label>
            <textarea
              className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder="e.g. US federal intelligence agency, not the UK-based charity of the same name"
              value={institutionDescription}
              onChange={(e) => setInstitutionDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1">
              Source Hints <span className="normal-case tracking-normal opacity-60">(optional — URLs, one per line)</span>
            </label>
            <textarea
              className="w-full bg-ground border border-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder={"https://www.cia.gov\nhttps://en.wikipedia.org/wiki/Central_Intelligence_Agency"}
              value={institutionSources}
              onChange={(e) => setInstitutionSources(e.target.value)}
            />
          </div>

          {/* Research result preview */}
          {researchResult && (
            <div className="border border-gold/20 bg-gold/5 rounded p-5 space-y-5">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-xl">{researchResult.name}</h3>
                <span className="font-mono text-[8px] uppercase tracking-widest border border-gold/30 text-gold px-2 py-0.5 rounded">
                  AI Draft
                </span>
              </div>

              {/* Editable fields preview */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'short_bio', label: 'Short bio' },
                  { key: 'institution_type', label: 'Type' },
                  { key: 'transparency_tier', label: 'Tier' },
                  { key: 'founded_year', label: 'Founded' },
                  { key: 'headquarters_city', label: 'HQ City' },
                  { key: 'headquarters_country', label: 'HQ Country' },
                ].map(({ key, label }) => (
                  <div key={key} className={key === 'short_bio' ? 'col-span-2' : ''}>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">{label}</p>
                    {key === 'institution_type' ? (
                      <select
                        className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                        value={(researchResult[key as keyof AIInstitutionResult] as string) ?? ''}
                        onChange={(e) => setResearchResult((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                      >
                        <option value="">—</option>
                        {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : key === 'transparency_tier' ? (
                      <select
                        className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                        value={(researchResult[key as keyof AIInstitutionResult] as string) ?? ''}
                        onChange={(e) => setResearchResult((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                      >
                        <option value="">—</option>
                        {TRANSPARENCY_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input
                        className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                        value={(researchResult[key as keyof AIInstitutionResult] as string) ?? ''}
                        onChange={(e) => setResearchResult((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {researchResult.bio && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Bio preview</p>
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-4">{researchResult.bio}</p>
                </div>
              )}

              {researchResult.bio_sections && researchResult.bio_sections.length > 0 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                    {researchResult.bio_sections.length} bio sections generated
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {researchResult.bio_sections.map((s, i) => (
                      <span key={i} className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                        {s.section_type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {researchResult.suggested_relationships && researchResult.suggested_relationships.length > 0 && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                    {researchResult.suggested_relationships.length} suggested relationships
                  </p>
                  <div className="space-y-1">
                    {researchResult.suggested_relationships.slice(0, 4).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span className="border border-border px-1.5 py-0.5 rounded font-mono text-[8px]">{r.relationship_type}</span>
                        <span>{r.institution_name}</span>
                        {r.covert && <span className="font-mono text-[7px] border border-amber-400/30 text-amber-400 px-1 py-0.5 rounded">covert</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(researchResult.website_url || researchResult.wikipedia_url) && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">Links found</p>
                  <div className="flex flex-wrap gap-2">
                    {researchResult.website_url && <span className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">website</span>}
                    {researchResult.wikipedia_url && <span className="font-mono text-[8px] border border-border px-1.5 py-0.5 rounded text-text-tertiary">wikipedia</span>}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-border">
                <button
                  onClick={saveInstitution}
                  disabled={saving}
                  className="font-mono text-sm px-5 py-2 border border-gold/30 bg-gold/5 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40"
                >
                  {saving ? 'Saving…' : 'Save as Draft →'}
                </button>
                <button
                  onClick={() => setResearchResult(null)}
                  className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors px-3 py-2"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST SECTION */}
      {activeSection === 'list' && (
        <div>
          {loading ? (
            <p className="text-text-tertiary font-mono text-sm">Loading…</p>
          ) : institutions.length === 0 ? (
            <p className="text-text-tertiary font-mono text-sm">No institutions yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {institutions.map((inst) => (
                <div key={inst.id} className="border border-border bg-ground-light rounded p-4">
                  {editingId === inst.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { key: 'short_bio', label: 'Short bio', span: true },
                          { key: 'institution_type', label: 'Type' },
                          { key: 'transparency_tier', label: 'Tier' },
                          { key: 'status', label: 'Status' },
                          { key: 'slug', label: 'Slug' },
                          { key: 'headquarters_city', label: 'HQ City' },
                          { key: 'headquarters_country', label: 'HQ Country' },
                        ].map(({ key, label, span }) => (
                          <div key={key} className={span ? 'col-span-3' : ''}>
                            <label className="block font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">{label}</label>
                            {key === 'institution_type' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : key === 'transparency_tier' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {TRANSPARENCY_TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            ) : key === 'status' ? (
                              <select
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              >
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            ) : (
                              <input
                                className="w-full bg-ground border border-border px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-gold/50 rounded"
                                value={editFields[key] ?? ''}
                                onChange={(e) => setEditFields((f) => ({ ...f, [key]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            await patchInstitution(inst.id, editFields);
                            setEditingId(null);
                          }}
                          className="font-mono text-[9px] uppercase tracking-widest border border-gold/30 text-gold px-3 py-1.5 rounded hover:bg-gold/5 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary px-3 py-1.5 rounded hover:text-text-secondary transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-serif text-base">{inst.name}</span>
                          <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${inst.status === 'published' ? 'text-emerald-400 border-emerald-400/30' : inst.status === 'archived' ? 'text-text-tertiary border-border' : 'text-amber-400 border-amber-400/30'}`}>
                            {inst.status ?? 'draft'}
                          </span>
                          {inst.institution_type && (
                            <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${INST_TYPE_BADGE[inst.institution_type] ?? 'text-text-tertiary border-border'}`}>
                              {inst.institution_type.replace(/_/g, ' ')}
                            </span>
                          )}
                          {inst.transparency_tier && inst.transparency_tier !== 'standard' && (
                            <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${INST_TIER_BADGE[inst.transparency_tier] ?? 'text-text-tertiary border-border'}`}>
                              {inst.transparency_tier.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        {inst.short_bio && (
                          <p className="text-xs text-text-tertiary line-clamp-1">{inst.short_bio}</p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-1">
                          {inst.slug && (
                            <span className="font-mono text-[8px] text-text-tertiary">/institutions/{inst.slug}</span>
                          )}
                          {(inst.headquarters_city || inst.headquarters_country) && (
                            <span className="font-mono text-[8px] text-text-tertiary">
                              {[inst.headquarters_city, inst.headquarters_country].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {(inst.people_count ?? 0) > 0 && (
                            <span className="font-mono text-[8px] text-text-tertiary">{inst.people_count} people</span>
                          )}
                          {(inst.relationship_count ?? 0) > 0 && (
                            <span className="font-mono text-[8px] text-text-tertiary">{inst.relationship_count} connections</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {inst.slug && (
                          <a
                            href={`/institutions/${inst.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                          >
                            View
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(inst.id);
                            setEditFields({
                              short_bio: inst.short_bio ?? '',
                              institution_type: inst.institution_type ?? '',
                              transparency_tier: inst.transparency_tier ?? 'standard',
                              status: inst.status ?? 'draft',
                              slug: inst.slug ?? '',
                              headquarters_city: inst.headquarters_city ?? '',
                              headquarters_country: inst.headquarters_country ?? '',
                            });
                          }}
                          className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => patchInstitution(inst.id, { status: inst.status === 'published' ? 'draft' : 'published' })}
                          className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-1 rounded transition-colors ${inst.status === 'published' ? 'text-amber-400 border-amber-400/30 hover:bg-amber-400/5' : 'text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/5'}`}
                        >
                          {inst.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          onClick={() => deleteInstitution(inst.id, inst.name)}
                          className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-red-400 hover:border-red-400/30 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
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

// ── Backlog Tab ───────────────────────────────────────────────────────────────

type BacklogFilter = 'pending' | 'launched' | 'archived' | 'all';

const BACKLOG_FILTER_LABELS: Record<BacklogFilter, string> = {
  all: 'All',
  pending: 'Pending',
  launched: 'Launched',
  archived: 'Archived',
};

const BACKLOG_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gold border-gold/30 bg-gold/5',
  launched: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  archived: 'text-text-tertiary border-border bg-transparent',
};

type LaunchResult = { sessionId: string } | { error: string };

function BacklogRow({
  item,
  onLaunch,
  onArchive,
  onDelete,
  launching,
  result,
}: {
  item: BacklogItem;
  onLaunch: (item: BacklogItem) => void;
  onArchive: (item: BacklogItem) => void;
  onDelete: (item: BacklogItem) => void;
  launching: boolean;
  result?: LaunchResult;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 border rounded ${BACKLOG_STATUS_COLORS[item.status]}`}
            >
              {item.status}
            </span>
            <span className="font-mono text-[9px] text-text-tertiary">
              {item.research_questions.length} questions
            </span>
          </div>
          <h3 className="font-serif text-base mt-1">{item.title}</h3>
          {item.angle && (
            <p className="text-text-secondary text-xs leading-relaxed mt-1 line-clamp-2">
              {item.angle}
            </p>
          )}
          {item.launched_session_id && (
            <p className="font-mono text-[9px] text-text-tertiary mt-1">
              Session: {item.launched_session_id}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {item.status === 'pending' && (
            <button
              onClick={() => onLaunch(item)}
              disabled={launching}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-gold/50 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40"
            >
              {launching ? 'Launching…' : 'Launch →'}
            </button>
          )}
          {item.status !== 'archived' && (
            <button
              onClick={() => onArchive(item)}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-text-secondary hover:border-border/80 transition-colors rounded"
            >
              Archive
            </button>
          )}
          <button
            onClick={() => onDelete(item)}
            className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-red-900/40 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors rounded"
          >
            Delete
          </button>
        </div>
      </div>

      {result && (
        <div className={`font-mono text-[10px] px-3 py-2 rounded border ${'error' in result ? 'border-red-400/30 bg-red-400/5 text-red-400' : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-400'}`}>
          {'error' in result
            ? `Launch failed: ${result.error}`
            : `Launched — session ${result.sessionId}`}
        </div>
      )}

      {item.research_questions.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {expanded ? '▲ Hide questions' : '▼ Show questions'}
          </button>
          {expanded && (
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              {item.research_questions.map((q, i) => (
                <li key={i} className="text-xs text-text-secondary leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function AddBacklogItemForm({ onAdded }: { onAdded: (item: BacklogItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [angle, setAngle] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim() || !topic.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), topic: topic.trim(), angle: angle.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded(data.item as BacklogItem);
      setTitle(''); setTopic(''); setAngle(''); setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-border text-text-tertiary hover:text-text-secondary hover:border-gold/30 transition-colors rounded px-4 py-3 font-mono text-[9px] uppercase tracking-widest"
      >
        + Add Item
      </button>
    );
  }

  return (
    <div className="border border-gold/30 rounded p-4 space-y-3">
      <p className="font-mono text-[9px] uppercase tracking-widest text-gold">New Backlog Item</p>
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (display name)"
          className="w-full bg-ground border border-border rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (research query)"
          className="w-full bg-ground border border-border rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50"
        />
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          placeholder="Angle / brief description (optional)"
          rows={2}
          className="w-full bg-ground border border-border rounded px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/50 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || !title.trim() || !topic.trim()}
          className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 border border-gold/50 text-gold hover:bg-gold/10 transition-colors rounded disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors rounded"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BacklogTab() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BacklogFilter>('pending');
  const [launching, setLaunching] = useState<string | null>(null);
  const [launchResults, setLaunchResults] = useState<Record<string, LaunchResult>>({});

  useEffect(() => {
    fetch('/api/admin/backlog')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  const launch = async (item: BacklogItem) => {
    setLaunching(item.id);
    try {
      const res = await fetch('/api/research/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: item.topic,
          title: item.title,
          research_questions: item.research_questions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Launch failed');

      const sessionId = data.session_id as string;

      await fetch('/api/admin/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: 'launched', launched_session_id: sessionId }),
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: 'launched', launched_session_id: sessionId } : i
        )
      );
      setLaunchResults((prev) => ({ ...prev, [item.id]: { sessionId } }));
    } catch (err) {
      setLaunchResults((prev) => ({
        ...prev,
        [item.id]: { error: err instanceof Error ? err.message : String(err) },
      }));
    } finally {
      setLaunching(null);
    }
  };

  const archive = async (item: BacklogItem) => {
    await fetch('/api/admin/backlog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'archived' }),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'archived' } : i)));
  };

  const deleteItem = async (item: BacklogItem) => {
    await fetch(`/api/admin/backlog?id=${item.id}`, { method: 'DELETE' });
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  const counts: Record<BacklogFilter, number> = {
    all: items.length,
    pending: items.filter((i) => i.status === 'pending').length,
    launched: items.filter((i) => i.status === 'launched').length,
    archived: items.filter((i) => i.status === 'archived').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-serif text-2xl mb-1">Research Backlog</h2>
        <p className="text-sm text-text-secondary">
          {counts.pending} pending · {counts.launched} launched · {counts.archived} archived
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {(Object.keys(BACKLOG_FILTER_LABELS) as BacklogFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors',
              filter === f
                ? 'border-gold/60 bg-gold/10 text-gold'
                : 'border-border text-text-tertiary hover:border-gold/30 hover:text-text-secondary',
            ].join(' ')}
          >
            {BACKLOG_FILTER_LABELS[f]}
            <span className="ml-1.5 opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-tertiary text-sm font-mono">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-text-tertiary text-sm font-mono py-8 text-center">
          No {filter === 'all' ? '' : filter} items.
        </p>
      ) : (
        <div className="space-y-3 mb-6">
          {filtered.map((item) => (
            <BacklogRow
              key={item.id}
              item={item}
              onLaunch={launch}
              onArchive={archive}
              onDelete={deleteItem}
              launching={launching === item.id}
              result={launchResults[item.id]}
            />
          ))}
        </div>
      )}

      <AddBacklogItemForm onAdded={(item) => setItems((prev) => [item, ...prev])} />
    </div>
  );
}

// ── Jobs Tab ──────────────────────────────────────────────────────────────────

interface ResearchJob {
  id: string;
  session_id: string;
  topic: string;
  job_type: string;
  status: string;
  priority: number;
  params: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  run_after_job_ids: string[];
  requires_approval: boolean;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const JOB_STATUS_COLORS: Record<string, string> = {
  pending: 'text-text-tertiary bg-border/30',
  running: 'text-sky-400 bg-sky-400/10',
  complete: 'text-emerald-400 bg-emerald-400/10',
  failed: 'text-red-400 bg-red-400/10',
  awaiting_approval: 'text-gold bg-gold/10',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  agent_signal: 'Agent',
  agent_evaluation: 'Agent Eval',
  cross_validation: 'Cross-Val',
  convergence_analysis: 'Convergence',
  adversarial_debate: 'Debate',
  synthesis_outline: 'Outline',
  synthesis_section: 'Section',
  synthesis_assembly: 'Assembly',
};

function JobsTab() {
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [tickLoading, setTickLoading] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [queuePhasesStatus, setQueuePhasesStatus] = useState<Record<string, string>>({});
  const [stopStatus, setStopStatus] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runTick = async () => {
    setTickLoading(true);
    setTickResult(null);
    try {
      const res = await fetch('/api/jobs/tick', { method: 'POST' });
      const data = await res.json();
      const fired = data.jobs_fired ?? 0;
      const running = counts['running'] ?? 0;
      const msg = fired > 0
        ? `Fired ${fired} job${fired !== 1 ? 's' : ''}`
        : running > 0
        ? `${running} job${running !== 1 ? 's' : ''} already running — waiting for deps`
        : `No runnable jobs`;
      setTickResult(msg);
      setTimeout(() => void load(), 2000);
    } catch {
      setTickResult('Tick failed');
    } finally {
      setTickLoading(false);
    }
  };

  const approve = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/approve`, { method: 'POST' });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (jobId: string) => {
    const notes = prompt('Rejection notes (optional):') ?? '';
    setActionLoading(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/approve?action=reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const retry = async (jobId: string) => {
    setActionLoading(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const queuePhases = async (sessionId: string) => {
    setQueuePhasesStatus((s) => ({ ...s, [sessionId]: 'queuing…' }));
    try {
      const res = await fetch(`/api/research/${sessionId}/queue-phases`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setQueuePhasesStatus((s) => ({ ...s, [sessionId]: `error: ${data.error}` }));
      } else {
        setQueuePhasesStatus((s) => ({ ...s, [sessionId]: `queued ✓ — run tick to start` }));
        await load();
      }
    } catch (err) {
      setQueuePhasesStatus((s) => ({ ...s, [sessionId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const stopSession = async (sessionId: string, topic: string) => {
    if (!confirm(`Stop & delete session for "${topic}"?\n\nAll pending and running jobs will be cancelled.`)) return;
    setStopStatus((s) => ({ ...s, [sessionId]: 'stopping…' }));
    try {
      const res = await fetch(`/api/admin/sessions?id=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setStopStatus((s) => ({ ...s, [sessionId]: `error: ${data.error}` }));
      } else {
        await load();
      }
    } catch (err) {
      setStopStatus((s) => ({ ...s, [sessionId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  // Group jobs by session_id, ordered by most-recently-updated session first
  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] ?? 0) + 1;
    return acc;
  }, {});

  // Build session groups from the full jobs list (so summary counts are always accurate)
  const sessionGroups = jobs.reduce<Record<string, ResearchJob[]>>((acc, j) => {
    (acc[j.session_id] ??= []).push(j);
    return acc;
  }, {});
  const sessionIds = Object.keys(sessionGroups).sort((a, b) => {
    const aLatest = Math.max(...sessionGroups[a].map((j) => new Date(j.updated_at).getTime()));
    const bLatest = Math.max(...sessionGroups[b].map((j) => new Date(j.updated_at).getTime()));
    return bLatest - aLatest;
  });
  // Filter: only show sessions that have at least one job matching the status filter
  const visibleSessionIds = filterStatus === 'all'
    ? sessionIds
    : filterStatus === 'active'
    ? sessionIds.filter((sid) => !sessionGroups[sid].every((j) => j.status === 'complete'))
    : sessionIds.filter((sid) => sessionGroups[sid].some((j) => j.status === filterStatus));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(['active', 'all', 'pending', 'running', 'awaiting_approval', 'complete', 'failed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded border transition-colors ${
                filterStatus === s
                  ? 'border-gold text-gold bg-gold/5'
                  : 'border-border text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {s === 'all'
                ? `All (${jobs.length})`
                : s === 'active'
                ? `Active (${jobs.filter((j) => j.status !== 'complete').length})`
                : `${s.replace(/_/g, ' ')} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {tickResult && (
            <span className={`font-mono text-[10px] ${tickResult.startsWith('No runnable') || tickResult.includes('waiting') ? 'text-text-tertiary' : tickResult === 'Tick failed' ? 'text-red-400' : 'text-emerald-400'}`}>
              {tickResult}
            </span>
          )}
          <button
            onClick={() => void runTick()}
            disabled={tickLoading}
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border border-sky-400/30 text-sky-400 hover:bg-sky-400/5 rounded transition-colors disabled:opacity-50"
          >
            {tickLoading ? 'Ticking…' : 'Run Tick'}
          </button>
          <button
            onClick={() => void load()}
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-[11px] text-text-tertiary">Loading jobs…</p>
      ) : visibleSessionIds.length === 0 ? (
        <p className="font-mono text-[11px] text-text-tertiary">No jobs found.</p>
      ) : (
        <div className="space-y-3">
          {visibleSessionIds.map((sid) => {
            const allSessionJobs = sessionGroups[sid];
            const visibleJobs = filterStatus === 'all'
              ? allSessionJobs
              : filterStatus === 'active'
              ? allSessionJobs.filter((j) => j.status !== 'complete')
              : allSessionJobs.filter((j) => j.status === filterStatus);
            const topic = allSessionJobs[0]?.topic || sid.slice(0, 8);
            const sc = allSessionJobs.reduce<Record<string, number>>((acc, j) => {
              acc[j.status] = (acc[j.status] ?? 0) + 1;
              return acc;
            }, {});
            const hasApproval = allSessionJobs.some((j) => j.status === 'awaiting_approval');
            const hasFailed = allSessionJobs.some((j) => j.status === 'failed');
            const hasRunning = allSessionJobs.some((j) => j.status === 'running');
            const allComplete = allSessionJobs.every((j) => j.status === 'complete');
            // Detect sessions where agents + cross-val finished but downstream phases were never queued
            const missingDownstream = allComplete &&
              !allSessionJobs.some((j) => ['convergence_analysis', 'adversarial_debate', 'synthesis_outline', 'synthesis_section', 'synthesis_assembly', 'editor_pass'].includes(j.job_type));

            const borderColor = hasApproval
              ? 'border-gold/40'
              : hasFailed
              ? 'border-red-400/30'
              : hasRunning
              ? 'border-sky-400/30'
              : allComplete
              ? 'border-emerald-400/20'
              : 'border-border';

            return (
              <details key={sid} className={`group border ${borderColor} rounded overflow-hidden`}>
                <summary className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer hover:bg-white/[0.02] list-none select-none">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Expand chevron */}
                    <span className="font-mono text-[10px] text-text-tertiary group-open:rotate-90 transition-transform shrink-0">▶</span>
                    {/* Topic */}
                    <span className="font-mono text-[11px] text-text-primary truncate">{topic}</span>
                    {/* Status badge */}
                    {hasApproval && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-gold/10 text-gold shrink-0">
                        Needs Review
                      </span>
                    )}
                    {hasRunning && !hasApproval && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-sky-400/10 text-sky-400 shrink-0">
                        Running
                      </span>
                    )}
                    {hasFailed && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-red-400/10 text-red-400 shrink-0">
                        Failed
                      </span>
                    )}
                    {allComplete && !missingDownstream && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 shrink-0">
                        Complete
                      </span>
                    )}
                    {missingDownstream && (
                      <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 shrink-0">
                        Agents done — phases needed
                      </span>
                    )}
                  </div>
                  {/* Counts mini-bar */}
                  <div className="flex items-center gap-3 shrink-0">
                    {sc.complete ? <span className="font-mono text-[9px] text-emerald-400">{sc.complete} done</span> : null}
                    {sc.running ? <span className="font-mono text-[9px] text-sky-400">{sc.running} running</span> : null}
                    {sc.awaiting_approval ? <span className="font-mono text-[9px] text-gold">{sc.awaiting_approval} review</span> : null}
                    {sc.pending ? <span className="font-mono text-[9px] text-text-tertiary">{sc.pending} pending</span> : null}
                    {sc.failed ? <span className="font-mono text-[9px] text-red-400">{sc.failed} failed</span> : null}
                    <span className="font-mono text-[9px] text-text-tertiary">/ {allSessionJobs.length}</span>
                    {missingDownstream && !queuePhasesStatus[sid] && (
                      <button
                        onClick={(e) => { e.preventDefault(); void queuePhases(sid); }}
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border border-amber-400/40 text-amber-400 hover:bg-amber-400/5 rounded transition-colors"
                      >
                        Queue phases →
                      </button>
                    )}
                    {queuePhasesStatus[sid] && (
                      <span className={`font-mono text-[9px] ${queuePhasesStatus[sid].startsWith('error') ? 'text-red-400' : queuePhasesStatus[sid].includes('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {queuePhasesStatus[sid]}
                      </span>
                    )}
                    {!allComplete && !stopStatus[sid] && (
                      <button
                        onClick={(e) => { e.preventDefault(); void stopSession(sid, topic); }}
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border border-red-400/40 text-red-400 bg-red-400/5 hover:bg-red-400/15 rounded transition-colors"
                      >
                        Stop & Delete
                      </button>
                    )}
                    {stopStatus[sid] && (
                      <span className={`font-mono text-[9px] ${stopStatus[sid].startsWith('error') ? 'text-red-400' : 'text-text-tertiary'}`}>
                        {stopStatus[sid]}
                      </span>
                    )}
                  </div>
                </summary>

                {/* Expanded job list */}
                <div className="border-t border-border divide-y divide-border/50">
                  {visibleJobs.map((job) => (
                    <div key={job.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                          <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded shrink-0 ${JOB_STATUS_COLORS[job.status] ?? 'text-text-tertiary'}`}>
                            {job.status.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-text-secondary">
                            {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
                            {job.params.agent_id ? ` — ${String(job.params.agent_id)}` : ''}
                            {job.params.section_key ? ` — ${String(job.params.section_key)}` : ''}
                          </span>
                          <span className="font-mono text-[9px] text-text-tertiary">p{job.priority}</span>
                          {job.run_after_job_ids.length > 0 && (
                            <span className="font-mono text-[9px] text-text-tertiary">{job.run_after_job_ids.length} deps</span>
                          )}
                        </div>
                        {job.status === 'awaiting_approval' && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => void approve(job.id)}
                              disabled={actionLoading === job.id}
                              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/5 rounded transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => void reject(job.id)}
                              disabled={actionLoading === job.id}
                              className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border border-red-400/30 text-red-400 hover:bg-red-400/5 rounded transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {job.status === 'failed' && (
                          <button
                            onClick={() => void retry(job.id)}
                            disabled={actionLoading === job.id}
                            className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 border border-amber-400/30 text-amber-400 hover:bg-amber-400/5 rounded transition-colors disabled:opacity-50 shrink-0"
                          >
                            Retry
                          </button>
                        )}
                      </div>

                      {job.last_error && (
                        <p className="font-mono text-[10px] text-red-400 bg-red-400/5 border border-red-400/10 rounded px-3 py-2">
                          {job.last_error}
                        </p>
                      )}

                      {job.status === 'awaiting_approval' && job.output_data && (
                        <div className="space-y-2">
                          {/* Debate: show advocate/skeptic cases and scores */}
                          {job.job_type === 'adversarial_debate' && (() => {
                            const d = job.output_data as Record<string, unknown>;
                            return (
                              <div className="space-y-2 text-[10px]">
                                <div className="flex gap-4 font-mono">
                                  <span className="text-emerald-400">Advocate {Math.round((d.advocate_confidence as number) * 100)}%</span>
                                  <span className="text-red-400">Skeptic {Math.round((d.skeptic_confidence as number) * 100)}%</span>
                                  <span className="text-text-tertiary">{d.rounds as number} rounds · {d.agreed_facts_count as number} agreed · {d.unresolved_tensions_count as number} tensions</span>
                                </div>
                                {!!d.advocate_case_excerpt && (
                                  <details open>
                                    <summary className="font-mono text-[9px] text-emerald-400 cursor-pointer">Advocate case</summary>
                                    <p className="mt-1 font-mono text-[9px] text-text-secondary bg-surface border border-border rounded p-2 whitespace-pre-wrap">{d.advocate_case_excerpt as string}…</p>
                                  </details>
                                )}
                                {!!d.skeptic_case_excerpt && (
                                  <details open>
                                    <summary className="font-mono text-[9px] text-red-400 cursor-pointer">Skeptic case</summary>
                                    <p className="mt-1 font-mono text-[9px] text-text-secondary bg-surface border border-border rounded p-2 whitespace-pre-wrap">{d.skeptic_case_excerpt as string}…</p>
                                  </details>
                                )}
                                {Array.isArray(d.unresolved_tensions) && (d.unresolved_tensions as string[]).length > 0 && (
                                  <details>
                                    <summary className="font-mono text-[9px] text-gold cursor-pointer">Unresolved tensions</summary>
                                    <ul className="mt-1 space-y-1">{(d.unresolved_tensions as string[]).map((t, i) => <li key={i} className="font-mono text-[9px] text-text-secondary">• {t}</li>)}</ul>
                                  </details>
                                )}
                              </div>
                            );
                          })()}

                          {/* Outline: show title, score, section notes */}
                          {job.job_type === 'synthesis_outline' && (() => {
                            const o = (job.output_data as Record<string, unknown>).outline as Record<string, unknown> | undefined;
                            if (!o) return null;
                            return (
                              <div className="space-y-2 text-[10px]">
                                <div className="font-mono">
                                  <p className="text-text-primary font-medium">{o.title as string}</p>
                                  <p className="text-text-tertiary">{o.subtitle as string}</p>
                                  <p className="text-sky-400 mt-1">Convergence score: {o.convergence_score as number}/100</p>
                                </div>
                                {!!o.section_notes && (
                                  <details>
                                    <summary className="font-mono text-[9px] text-gold cursor-pointer">Section editorial notes</summary>
                                    <div className="mt-1 space-y-1">
                                      {Object.entries(o.section_notes as Record<string, string>).map(([k, v]) => (
                                        <p key={k} className="font-mono text-[9px] text-text-secondary"><span className="text-text-tertiary">{k}:</span> {v}</p>
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                            );
                          })()}

                          {/* Assembly: show section list and version */}
                          {job.job_type === 'synthesis_assembly' && (() => {
                            const d = job.output_data as Record<string, unknown>;
                            return (
                              <div className="font-mono text-[10px] space-y-1">
                                <p className="text-emerald-400">Version {d.version_number as number} — {d.section_count as number} sections assembled</p>
                                {Array.isArray(d.missing_sections) && (d.missing_sections as string[]).length > 0 && (
                                  <p className="text-amber-400">Missing: {(d.missing_sections as string[]).join(', ')}</p>
                                )}
                              </div>
                            );
                          })()}

                          {/* Fallback: raw JSON for unknown types */}
                          {!['adversarial_debate', 'synthesis_outline', 'synthesis_assembly'].includes(job.job_type) && (
                            <details>
                              <summary className="font-mono text-[10px] text-gold cursor-pointer hover:text-gold/70">View output</summary>
                              <pre className="mt-2 font-mono text-[9px] text-text-tertiary bg-surface border border-border rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                                {JSON.stringify(job.output_data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
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

const TABS = [
  { id: 'analytics', label: '↗ Analytics' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'launch', label: 'Launch Research' },
  { id: 'content', label: 'Content' },
  { id: 'social', label: 'Social' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'media', label: 'Media Library' },
  { id: 'people', label: 'People' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'agents', label: 'Agents' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'thread', label: '⊙ Thread' },
  { id: 'promo', label: 'Promo Codes' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>('content');

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg">Unraveled</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/feedback"
              className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
            >
              ⚑ Feedback
            </a>
            <a
              href="/"
              className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
            >
              ← Site
            </a>
          </div>
        </div>
      </div>

      <OllamaBanner />

      {/* Tab nav */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-3 border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-gold text-gold'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'backlog' && <BacklogTab />}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'launch' && <LaunchTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'social' && <SocialTab />}
        {tab === 'intelligence' && <IntelligenceTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'people' && <PeopleTab />}
        {tab === 'institutions' && <InstitutionsTab />}
        {tab === 'agents' && <AgentsTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'thread' && <ThreadTab />}
        {tab === 'promo' && <PromoCodesTab />}
      </div>
    </div>
  );
}
