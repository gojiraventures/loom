'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllAgents } from '@/lib/research/agents/definitions';
import type { AgentDefinition } from '@/lib/research/types';

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

interface Dossier {
  topic: string;
  title: string;
  slug: string | null;
  published: boolean;
  best_convergence_score: number;
  key_traditions: string[];
  summary: string | null;
  synthesized_output: Record<string, unknown> | null;
  last_researched_at: string | null;
}

interface Session {
  id: string;
  topic: string;
  title: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_log: string[];
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
  cross_validating: 'text-sky-400',
  converging: 'text-amber-400',
  debating: 'text-orange-400',
  synthesizing: 'text-violet-400',
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
  cross_validating: 'Layer 2 — Cross-validation',
  converging: 'Layer 3 — Convergence analysis',
  debating: 'Layer 4 — Adversarial debate',
  synthesizing: 'Layer 5 — Synthesis',
  complete: 'Complete',
  failed: 'Failed',
};

function LaunchTab() {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState(['', '', '']);
  const [description, setDescription] = useState('');
  const [sources, setSources] = useState('');
  const [launchStatus, setLaunchStatus] = useState<'idle' | 'queuing' | 'polling' | 'done' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/research/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const s = data?.session?.status ?? 'pending';
      setPipelineStatus(s);
      if (s === 'complete' || s === 'failed') {
        stopPolling();
        setLaunchStatus(s === 'complete' ? 'done' : 'error');
        if (s === 'failed') setErrorMsg(data?.session?.error_log?.join('\n') ?? 'Pipeline failed');
      }
    } catch { /* network blip — keep polling */ }
  }, []);

  const addQuestion = () => setQuestions((q) => [...q, '']);
  const removeQuestion = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, val: string) =>
    setQuestions((q) => q.map((qv, idx) => (idx === i ? val : qv)));

  const launch = async () => {
    const validQuestions = questions.filter((q) => q.trim());
    if (!topic.trim() || !title.trim() || validQuestions.length === 0) return;

    stopPolling();
    setLaunchStatus('queuing');
    setSessionId(null);
    setPipelineStatus('pending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/research', {
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
      setLaunchStatus('polling');

      // Poll every 8 seconds — safe to close/navigate, server continues running
      pollRef.current = setInterval(() => pollStatus(id), 8000);
      pollStatus(id);
    } catch (err) {
      setLaunchStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  const isRunning = launchStatus === 'queuing' || launchStatus === 'polling';

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
          <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">
            Research Questions
          </label>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="flex-1 bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                  placeholder={`Question ${i + 1}`}
                  value={q}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                />
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(i)}
                    className="px-2 text-text-tertiary hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addQuestion}
            className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
          >
            + Add question
          </button>
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
            {launchStatus === 'queuing' ? 'Starting pipeline…'
              : launchStatus === 'polling' ? `${SESSION_STATUS_LABELS[pipelineStatus] ?? pipelineStatus}…`
              : launchStatus === 'done' ? 'Complete — check Sessions tab'
              : 'Failed'}
          </div>

          {/* Live phase progress bar */}
          {(launchStatus === 'polling' || launchStatus === 'done') && (
            <div className="flex gap-1">
              {['researching','cross_validating','converging','debating','synthesizing','complete'].map((phase) => {
                const phases = ['researching','cross_validating','converging','debating','synthesizing','complete'];
                const currentIdx = phases.indexOf(pipelineStatus);
                const phaseIdx = phases.indexOf(phase);
                const done = currentIdx > phaseIdx || pipelineStatus === 'complete';
                const active = currentIdx === phaseIdx;
                return (
                  <div
                    key={phase}
                    className={`flex-1 h-1 rounded-full transition-colors duration-500 ${
                      done ? 'bg-emerald-500' : active ? 'bg-sky-400 animate-pulse' : 'bg-border'
                    }`}
                  />
                );
              })}
            </div>
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
              {agent.primaryExpertise.slice(0, 8).map((e, i) => (
                <li key={i} className="text-xs text-text-secondary flex gap-2">
                  <span className="text-gold/50 shrink-0">·</span>
                  <span>{e}</span>
                </li>
              ))}
              {agent.primaryExpertise.length > 8 && (
                <li className="text-xs text-text-tertiary pl-4">
                  +{agent.primaryExpertise.length - 8} more
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

      <div className="space-y-px">
        {sessions.map((s) => (
          <div key={s.id} className="border border-border bg-ground-light/40 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-primary font-medium">{s.title}</span>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${STATUS_COLORS[s.status] ?? 'text-text-tertiary'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-text-tertiary mt-0.5 font-mono">{s.topic}</div>
                {s.error_log?.length > 0 && (
                  <div className="text-xs text-red-400 mt-1">{s.error_log[s.error_log.length - 1]}</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[9px] text-text-tertiary">
                  {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString()}
                </div>
                {s.completed_at && s.started_at && (
                  <div className="font-mono text-[9px] text-text-tertiary mt-0.5">
                    {Math.round((new Date(s.completed_at).getTime() - new Date(s.started_at).getTime()) / 1000)}s
                  </div>
                )}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});
  const [publishStatus, setPublishStatus] = useState<Record<string, string>>({});
  const [deepDiveOpen, setDeepDiveOpen] = useState<string | null>(null);
  const [deepDiveFocus, setDeepDiveFocus] = useState<Record<string, string>>({});
  const [deepDiveQuestions, setDeepDiveQuestions] = useState<Record<string, string>>({});
  const [deepDiveStatus, setDeepDiveStatus] = useState<Record<string, string>>({});
  const [resynthStatus, setResynthStatus] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all dossiers (published and unpublished)
      const res = await fetch('/api/admin/sessions');
      const sessData = await res.json();
      // Get unique topics from sessions, then fetch their dossiers
      const topics = [...new Set<string>((sessData.sessions ?? [])
        .filter((s: { status: string }) => s.status === 'complete')
        .map((s: { topic: string }) => s.topic))];

      const results = await Promise.all(
        topics.map((t) =>
          fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`)
            .then((r) => r.json())
            .then((d) => d.dossier as Dossier | null)
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

  const publishOrUpdate = async (topic: string, isUpdate: boolean) => {
    const slug = slugInputs[topic]?.trim();
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

      {loading && <div className="text-sm text-text-tertiary">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!loading && dossiers.length === 0 && (
        <div className="text-sm text-text-tertiary border border-border rounded p-8 text-center">
          No completed research yet. Run a session from the Launch tab.
        </div>
      )}

      <div className="space-y-4">
        {dossiers.map((d) => {
          const isPreview = previewing === d.topic;
          const output = d.synthesized_output;
          const autoSlug = d.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? '';
          const slugVal = slugInputs[d.topic] ?? d.slug ?? autoSlug;
          const statusMsg = publishStatus[d.topic];

          return (
            <div key={d.topic} className="border border-border bg-ground-light/30">
              {/* Header row */}
              <div className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{d.title}</span>
                    {d.published && (
                      <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 px-1.5 py-0.5 rounded">
                        Live
                      </span>
                    )}
                    {d.best_convergence_score > 0 && (
                      <span className="font-mono text-[9px] text-gold">
                        Score: {d.best_convergence_score}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[9px] text-text-tertiary mt-0.5">{d.topic}</div>
                  {d.key_traditions?.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1">
                      {d.key_traditions.slice(0, 6).map((t) => (
                        <span key={t} className="font-mono text-[8px] uppercase tracking-wider text-text-tertiary border border-border/60 px-1">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setPreviewing(isPreview ? null : d.topic)}
                    className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold border border-border px-2 py-1 rounded transition-colors"
                  >
                    {isPreview ? 'Hide' : 'Preview'}
                  </button>
                  {d.published && d.slug && (
                    <a
                      href={`/topics/${d.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-2 py-1 rounded hover:bg-emerald-400/10 transition-colors"
                    >
                      View →
                    </a>
                  )}
                </div>
              </div>

              {/* Publish controls */}
              <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
                <input
                  className="bg-ground border border-border px-2 py-1 text-xs font-mono text-text-primary focus:outline-none focus:border-gold/50 rounded w-full max-w-sm"
                  placeholder="url-slug"
                  value={slugVal}
                  onChange={(e) => setSlugInputs((s) => ({ ...s, [d.topic]: e.target.value }))}
                />
                <button
                  onClick={() => publishOrUpdate(d.topic, d.published)}
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
                {statusMsg && (
                  <span className={`font-mono text-[9px] ${statusMsg.startsWith('error') ? 'text-red-400' : statusMsg.startsWith('live') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                    {statusMsg}
                  </span>
                )}
              </div>

              {/* Research controls */}
              <div className="px-4 pb-3 flex items-center gap-3 flex-wrap border-t border-border/40 pt-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">Research:</span>
                <button
                  onClick={() => setDeepDiveOpen(deepDiveOpen === d.topic ? null : d.topic)}
                  className="font-mono text-[9px] uppercase tracking-widest text-sky-400 border border-sky-400/30 hover:bg-sky-400/10 px-2 py-1 rounded transition-colors"
                >
                  + Deep Dive
                </button>
                <button
                  onClick={() => resynthesize(d)}
                  disabled={resynthStatus[d.topic] === 'running…'}
                  className="font-mono text-[9px] uppercase tracking-widest text-violet-400 border border-violet-400/30 hover:bg-violet-400/10 px-2 py-1 rounded transition-colors disabled:opacity-40"
                >
                  Re-synthesize All
                </button>
                {resynthStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${resynthStatus[d.topic].startsWith('error') ? 'text-red-400' : resynthStatus[d.topic] === 'running…' ? 'text-text-tertiary' : 'text-violet-400'}`}>
                    {resynthStatus[d.topic]}
                  </span>
                )}
                {deepDiveStatus[d.topic] && (
                  <span className={`font-mono text-[9px] ${deepDiveStatus[d.topic].startsWith('error') ? 'text-red-400' : deepDiveStatus[d.topic].startsWith('running') ? 'text-text-tertiary' : 'text-sky-400'}`}>
                    {deepDiveStatus[d.topic]}
                  </span>
                )}
              </div>

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
              {isPreview && !output && (
                <div className="border-t border-border px-4 py-3 text-sm text-text-tertiary">
                  No synthesized output found for this topic.
                </div>
              )}
            </div>
          );
        })}
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

// ── People Tab ────────────────────────────────────────────────────────────────

const CREDIBILITY_TIERS = [
  'academic', 'journalist', 'independent_researcher', 'whistleblower',
  'public_figure', 'historical_figure', 'witness', 'controversial', 'unclassified',
];

const STATUS_OPTIONS = ['draft', 'published', 'archived'];

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

// ── Admin Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'launch', label: 'Launch Research' },
  { id: 'content', label: 'Content' },
  { id: 'media', label: 'Media Library' },
  { id: 'people', label: 'People' },
  { id: 'institutions', label: 'Institutions' },
  { id: 'agents', label: 'Agents' },
  { id: 'sessions', label: 'Sessions' },
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
          <a
            href="/"
            className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
          >
            ← Site
          </a>
        </div>
      </div>

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
        {tab === 'launch' && <LaunchTab />}
        {tab === 'content' && <ContentTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'people' && <PeopleTab />}
        {tab === 'institutions' && <InstitutionsTab />}
        {tab === 'agents' && <AgentsTab />}
        {tab === 'sessions' && <SessionsTab />}
      </div>
    </div>
  );
}
