'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface QueueItem {
  id: string;
  topic: string;
  title: string;
  research_questions: string[];
  description: string | null;
  status: 'queued' | 'running' | 'complete' | 'failed';
  session_id: string | null;
  error_detail: string | null;
  priority: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
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

// ── Constants ─────────────────────────────────────────────────────────────────

const RUNNING_STATUSES = ['researching', 'researched', 'cross_validating', 'converging', 'debating', 'synthesizing'];

const SESSION_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  researching: 'Researching',
  researched: 'Research done',
  cross_validating: 'Cross-validating',
  converging: 'Converging',
  debating: 'Debating',
  synthesizing: 'Synthesizing',
  complete: 'Complete',
  failed: 'Failed',
  pending_review: 'Needs Review',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  agent_signal: 'Agent Research',
  agent_evaluation: 'Agent Eval',
  cross_validation: 'Cross-Validation',
  convergence_analysis: 'Convergence',
  adversarial_debate: 'Debate',
  synthesis_outline: 'Outline',
  synthesis_section: 'Section',
  synthesis_assembly: 'Assembly',
};

const PHASE_JOB_TYPES: { label: string; types: string[] }[] = [
  { label: 'Primary Research', types: ['agent_signal', 'agent_evaluation'] },
  { label: 'Cross-Validation', types: ['cross_validation'] },
  { label: 'Convergence', types: ['convergence_analysis'] },
  { label: 'Debate', types: ['adversarial_debate'] },
  { label: 'Synthesis', types: ['synthesis_outline', 'synthesis_section', 'synthesis_assembly'] },
];

const ARCHIVE_CAP = 25;

// ── Sidebar ───────────────────────────────────────────────────────────────────

const STUDIO_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command-center', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio', label: 'Studio (Kanban)' },
      { id: 'thread', label: 'Discovery', href: '/admin' },
      { id: 'media', label: 'Media Library', href: '/admin' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
      { id: 'health', label: 'Content Health', href: '/admin' },
      { id: 'editorial', label: 'Editorial', href: '/admin' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'social', label: 'Social Queue', href: '/admin' },
      { id: 'engage', label: 'Replies', href: '/admin' },
      { id: 'intelligence', label: 'Performance', href: '/admin' },
      { id: 'promo', label: 'Promo Codes', href: '/admin' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'agents', label: 'Agents', href: '/admin' },
      { id: 'inbox', label: 'Inbox', href: '/admin' },
      { id: 'analytics', label: 'Analytics', href: '/admin' },
      { id: 'services', label: 'Service Health', href: '/admin/services' },
    ],
  },
];

// ── Utility ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

type PhaseStatus = 'complete' | 'running' | 'failed' | 'awaiting' | 'pending';

function phaseStatusFor(jobs: ResearchJob[], types: string[]): PhaseStatus {
  const ph = jobs.filter((j) => types.includes(j.job_type));
  if (ph.length === 0) return 'pending';
  if (ph.some((j) => j.status === 'running')) return 'running';
  if (ph.some((j) => j.status === 'awaiting_approval')) return 'awaiting';
  if (ph.some((j) => j.status === 'failed')) return 'failed';
  if (ph.every((j) => j.status === 'complete')) return 'complete';
  return 'pending';
}

const PHASE_STATUS_COLOR: Record<PhaseStatus, string> = {
  complete: 'text-emerald-400',
  running: 'text-sky-400',
  failed: 'text-red-400',
  awaiting: 'text-gold',
  pending: 'text-text-tertiary',
};

const PHASE_STATUS_RING: Record<PhaseStatus, string> = {
  complete: 'border-emerald-400/50 bg-emerald-400/10',
  running: 'border-sky-400/50 bg-sky-400/10',
  failed: 'border-red-400/50 bg-red-400/10',
  awaiting: 'border-gold/50 bg-gold/10',
  pending: 'border-border bg-transparent',
};

// ── Launch Form ───────────────────────────────────────────────────────────────

interface NoveltyResult {
  overlaps: { slug: string | null; title: string; overlap_reason: string }[];
  is_near_duplicate: boolean;
  fresh_angle: string;
  differentiation_guidance: string;
  revised_questions: string[];
}

function LaunchForm({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [description, setDescription] = useState('');
  const [sourceUrls, setSourceUrls] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [freshness, setFreshness] = useState<NoveltyResult | null>(null);
  const [gateGuidance, setGateGuidance] = useState('');

  const reset = () => {
    setTopic(''); setTitle(''); setQuestions(['']); setDescription(''); setSourceUrls(''); setStatus('');
    setFreshness(null); setGateGuidance('');
  };

  const runFreshnessCheck = async () => {
    if (!topic.trim()) { setStatus('Topic is required'); return; }
    setChecking(true); setStatus('Checking the library for overlapping articles…');
    try {
      const res = await fetch('/api/admin/research/novelty-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), title: title.trim() || undefined, research_questions: questions.filter(Boolean) }),
      });
      const data = await res.json() as { result?: NoveltyResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? 'Freshness check failed');
      setFreshness(data.result);
      setGateGuidance(data.result.differentiation_guidance || '');
      setStatus(
        data.result.overlaps.length === 0
          ? '✓ No meaningful overlap — clear to launch a fresh report'
          : data.result.is_near_duplicate
            ? '⚠ Near-duplicate of existing work — review the fresh angle below before launching'
            : `Found ${data.result.overlaps.length} related article(s) — review the fresh angle below`,
      );
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setChecking(false); }
  };

  const launchNow = async () => {
    if (!topic.trim()) { setStatus('Topic is required'); return; }
    setBusy(true); setStatus('Launching…');
    try {
      const res = await fetch('/api/research/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: title.trim() || undefined,
          research_questions: questions.filter(Boolean),
          description: description.trim() || undefined,
          source_urls: sourceUrls.split('\n').map((s) => s.trim()).filter(Boolean),
          differentiation_context: gateGuidance.trim() || undefined,
        }),
      });
      const data = await res.json() as { session_id?: string; total_jobs?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Launch failed');
      setStatus(`Launched ✓ — ${data.total_jobs ?? '?'} jobs queued (${data.session_id?.slice(0, 8)})`);
      setTimeout(() => { reset(); setOpen(false); onRefresh(); }, 1500);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  const addToQueue = async () => {
    if (!topic.trim()) { setStatus('Topic is required'); return; }
    setBusy(true); setStatus('Adding to queue…');
    try {
      const res = await fetch('/api/admin/research-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: title.trim() || undefined,
          research_questions: questions.filter(Boolean),
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setStatus('Added to queue ✓');
      setTimeout(() => { reset(); setOpen(false); onRefresh(); }, 1200);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  const saveToBacklog = async () => {
    if (!topic.trim()) { setStatus('Topic is required'); return; }
    setBusy(true); setStatus('Saving…');
    try {
      const res = await fetch('/api/admin/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          title: title.trim() || undefined,
          research_questions: questions.filter(Boolean),
          angle: description.trim() || null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setStatus('Saved to backlog ✓');
      setTimeout(() => { reset(); setOpen(false); onRefresh(); }, 1200);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-gold/50 text-gold bg-gold/5 hover:bg-gold/10 rounded transition-colors"
        >
          + New Research
        </button>
        <span className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Launch Now · Add to Queue · Save to Backlog</span>
      </div>
    );
  }

  return (
    <div className="mb-8 border border-gold/30 bg-ground-light/70 p-5 rounded">
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-gold">New Research</span>
        <button
          onClick={() => { setOpen(false); reset(); }}
          className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Topic *</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/50 rounded"
              placeholder="topic-slug"
            />
          </div>
          <div>
            <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
              placeholder="Display title"
            />
          </div>
        </div>

        <div>
          <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Research Questions</label>
          {questions.map((q, i) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input
                value={q}
                onChange={(e) => setQuestions((qs) => qs.map((v, j) => (j === i ? e.target.value : v)))}
                className="flex-1 bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded"
                placeholder={`Question ${i + 1}`}
              />
              {questions.length > 1 && (
                <button
                  onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
                  className="text-text-tertiary hover:text-red-400 text-xs px-1 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {questions.length < 9 && (
            <button
              onClick={() => setQuestions((qs) => [...qs, ''])}
              className="font-mono text-[var(--admin-label-sm)] text-text-tertiary hover:text-gold transition-colors"
            >
              + question
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Description / Angle</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder="Optional context or angle"
            />
          </div>
          <div>
            <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Source URLs (one per line)</label>
            <textarea
              value={sourceUrls}
              onChange={(e) => setSourceUrls(e.target.value)}
              className="w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/50 rounded resize-none"
              rows={2}
              placeholder="https://…"
            />
          </div>
        </div>

        {freshness && (
          <div className="border border-amber-400/30 bg-amber-400/5 rounded p-3 space-y-2.5">
            <div className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-amber-400">
              Freshness Brief{freshness.is_near_duplicate ? ' · ⚠ near-duplicate' : ''}
            </div>
            {freshness.overlaps.length === 0 ? (
              <p className="text-sm text-text-secondary">No meaningful overlap with existing articles — clear to launch a fresh report.</p>
            ) : (
              <>
                <div>
                  <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-1">Overlaps with</div>
                  <ul className="space-y-1">
                    {freshness.overlaps.map((o, i) => (
                      <li key={i} className="text-sm text-text-secondary leading-snug">
                        <span className="text-text-primary">{o.title}</span> — <span className="text-text-tertiary">{o.overlap_reason}</span>
                        {o.slug && <a href={`/topics/${o.slug}`} target="_blank" rel="noopener noreferrer" className="text-gold/70 hover:text-gold ml-1">↗</a>}
                      </li>
                    ))}
                  </ul>
                </div>
                {freshness.fresh_angle && (
                  <div>
                    <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-1">Fresh angle</div>
                    <p className="text-sm text-text-primary leading-snug">{freshness.fresh_angle}</p>
                  </div>
                )}
                <div>
                  <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-1">Directive sent to the research agents (edit if needed)</div>
                  <textarea
                    value={gateGuidance}
                    onChange={(e) => setGateGuidance(e.target.value)}
                    rows={3}
                    className="w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 rounded resize-none"
                  />
                </div>
                {freshness.revised_questions?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setQuestions(freshness.revised_questions)}
                      className="font-mono text-[var(--admin-label-sm)] text-gold/80 hover:text-gold"
                    >
                      ↳ replace questions with the sharper set ({freshness.revised_questions.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {status && (
          <div className={`font-mono text-[var(--admin-label-sm)] ${status.startsWith('Error') ? 'text-red-400' : status.includes('✓') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
            {status}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={runFreshnessCheck}
            disabled={checking || busy}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-teal-400/40 text-teal-400 bg-teal-400/5 hover:bg-teal-400/10 rounded transition-colors disabled:opacity-50"
          >
            {checking ? 'Checking…' : '① Check Freshness'}
          </button>
          <button
            onClick={launchNow}
            disabled={busy}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-sky-400/40 text-sky-400 bg-sky-400/5 hover:bg-sky-400/10 rounded transition-colors disabled:opacity-50"
          >
            Launch Now
          </button>
          <button
            onClick={addToQueue}
            disabled={busy}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-amber-400/40 text-amber-400 bg-amber-400/5 hover:bg-amber-400/10 rounded transition-colors disabled:opacity-50"
          >
            Add to Queue
          </button>
          <button
            onClick={saveToBacklog}
            disabled={busy}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-border text-text-secondary hover:text-text-primary hover:border-gold/30 rounded transition-colors disabled:opacity-50"
          >
            Save to Backlog
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session Detail Panel ──────────────────────────────────────────────────────

function SessionDetailPanel({
  session,
  jobs,
  onClose,
  onRefresh,
}: {
  session: Session;
  jobs: ResearchJob[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const sessionJobs = jobs.filter((j) => j.session_id === session.id);
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});
  const [continueStatus, setContinueStatus] = useState('');
  const [rerunStatus, setRerunStatus] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const canContinue =
    ['researched', 'failed', 'cross_validating', 'converging', 'debating', 'synthesizing'].includes(session.status) &&
    !session.pipeline_locked;

  const continueSession = async () => {
    setContinueStatus('continuing…');
    try {
      const res = await fetch(`/api/research/${session.id}/continue`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setContinueStatus(`error: ${err.error ?? res.statusText}`);
        return;
      }
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`/api/research/${session.id}`);
          if (!pr.ok) return;
          const pd = await pr.json() as { session?: { status?: string } };
          const st = pd?.session?.status ?? 'pending';
          if (st === 'complete' || st === 'failed' || st === 'pending_review') {
            if (pollRef.current) clearInterval(pollRef.current);
            setContinueStatus(st === 'complete' ? 'complete ✓' : st === 'pending_review' ? 'needs review' : 'failed');
            onRefresh();
          } else {
            setContinueStatus(`${SESSION_STATUS_LABELS[st] ?? st}…`);
          }
        } catch { /* poll blip */ }
      }, 8000);
    } catch (err) {
      setContinueStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const reviewSession = async (action: 'approve' | 'reject') => {
    setActionStatus((s) => ({ ...s, review: action === 'approve' ? 'approving…' : 'rejecting…' }));
    try {
      const res = await fetch('/api/admin/review-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, action }),
      });
      const data = await res.json() as { convergenceScore?: number; findingsUsed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setActionStatus((s) => ({
        ...s,
        review: action === 'approve'
          ? `approved ✓ — ${data.findingsUsed ?? ''} findings, score ${data.convergenceScore ?? ''}`
          : 'rejected',
      }));
      onRefresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, review: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const approveJob = async (jobId: string) => {
    setActionStatus((s) => ({ ...s, [jobId]: 'approving…' }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve`, { method: 'POST' });
      if (!res.ok) throw new Error(`${res.status}`);
      setActionStatus((s) => ({ ...s, [jobId]: 'approved ✓' }));
      onRefresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, [jobId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const rejectJob = async (jobId: string) => {
    const notes = prompt('Rejection notes (optional):') ?? '';
    setActionStatus((s) => ({ ...s, [jobId]: 'rejecting…' }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/approve?action=reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setActionStatus((s) => ({ ...s, [jobId]: 'rejected' }));
      onRefresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, [jobId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const retryJob = async (jobId: string) => {
    setActionStatus((s) => ({ ...s, [jobId]: 'retrying…' }));
    try {
      const res = await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error(`${res.status}`);
      setActionStatus((s) => ({ ...s, [jobId]: 'retried ✓' }));
      onRefresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, [jobId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  const rerunSession = async () => {
    setRerunStatus('launching re-run…');
    try {
      const res = await fetch('/api/research/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: session.topic,
          title: session.title || undefined,
          research_questions: session.research_questions,
        }),
      });
      const data = await res.json() as { session_id?: string; total_jobs?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Re-run failed');
      setRerunStatus(`launched ✓ — session ${data.session_id?.slice(0, 8)} (${data.total_jobs ?? '?'} jobs)`);
      onRefresh();
    } catch (err) {
      setRerunStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const stopSession = async () => {
    const isActive = !['complete', 'failed'].includes(session.status);
    const msg = isActive
      ? `Stop & delete this in-progress session?\n\nAll pending and running jobs will be cancelled. This cannot be undone.`
      : `Delete this session and its data?`;
    if (!confirm(msg)) return;
    setActionStatus((s) => ({ ...s, stop: 'stopping…' }));
    try {
      const res = await fetch(`/api/admin/sessions?id=${session.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setActionStatus((s) => ({ ...s, stop: `error: ${data.error ?? res.statusText}` }));
        return;
      }
      onClose();
      onRefresh();
    } catch (err) {
      setActionStatus((s) => ({ ...s, stop: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  return (
    <>
      {/* Backdrop — click to close */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      {/* Slide-in drawer so the panel is always visible on click, regardless of scroll */}
      <aside className="fixed right-0 top-0 h-screen w-[560px] max-w-[92vw] overflow-y-auto bg-ground border-l border-border z-50 shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-base text-text-primary">{session.title || session.topic}</span>
            <span className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded">
              {session.status}
            </span>
            {session.session_type === 'enhancement' && (
              <span className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-gold/70 border border-gold/20 px-1.5 py-0.5 rounded">
                enhancement
              </span>
            )}
          </div>
          <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mt-0.5">{session.topic}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/admin/dossiers/${encodeURIComponent(session.topic)}`}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 px-2 py-1 rounded transition-colors"
          >
            Open Dossier →
          </a>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors text-base px-1"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Phase timeline */}
        <div>
          <div className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary mb-3">Research Pipeline</div>
          <div className="space-y-3">
            {PHASE_JOB_TYPES.map(({ label, types }, i) => {
              const phaseJobs = sessionJobs.filter((j) => types.includes(j.job_type));
              const ps = phaseStatusFor(sessionJobs, types);
              const color = PHASE_STATUS_COLOR[ps];
              const ring = PHASE_STATUS_RING[ps];
              const psIcon = { complete: '✓', running: '●', failed: '✗', awaiting: '⏸', pending: '' }[ps];

              return (
                <div key={label} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${ring} ${ps === 'running' ? 'animate-pulse' : ''}`}>
                    <span className={`font-mono text-[var(--admin-label-xs)] ${color}`}>{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[var(--admin-label-sm)] text-text-primary">{label}</span>
                      {psIcon && <span className={`font-mono text-[var(--admin-label-sm)] ${color}`}>{psIcon}</span>}
                      {phaseJobs.length > 0 && (
                        <span className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
                          {phaseJobs.length} job{phaseJobs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {/* Awaiting approval jobs */}
                    {phaseJobs.filter((j) => j.status === 'awaiting_approval').map((j) => (
                      <div key={j.id} className="mt-1.5 flex items-center gap-2 pl-2 flex-wrap">
                        <span className="font-mono text-[var(--admin-label-sm)] text-gold">{JOB_TYPE_LABELS[j.job_type] ?? j.job_type}</span>
                        {actionStatus[j.id] ? (
                          <span className={`font-mono text-[var(--admin-label-sm)] ${actionStatus[j.id].startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
                            {actionStatus[j.id]}
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => approveJob(j.id)}
                              className="font-mono text-[var(--admin-label-sm)] text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10 px-2 py-0.5 rounded transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectJob(j.id)}
                              className="font-mono text-[var(--admin-label-sm)] text-red-400 border border-red-400/30 hover:bg-red-400/10 px-2 py-0.5 rounded transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Failed jobs */}
                    {phaseJobs.filter((j) => j.status === 'failed').map((j) => (
                      <div key={j.id} className="mt-1.5 flex items-center gap-2 pl-2 flex-wrap">
                        <span className="font-mono text-[var(--admin-label-sm)] text-red-400">{JOB_TYPE_LABELS[j.job_type] ?? j.job_type}</span>
                        {j.last_error && (
                          <span className="font-mono text-[var(--admin-label-sm)] text-red-400/60 truncate max-w-xs">{j.last_error}</span>
                        )}
                        {actionStatus[j.id] ? (
                          <span className={`font-mono text-[var(--admin-label-sm)] ${actionStatus[j.id].startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
                            {actionStatus[j.id]}
                          </span>
                        ) : (
                          <button
                            onClick={() => retryJob(j.id)}
                            className="font-mono text-[var(--admin-label-sm)] text-gold border border-gold/30 hover:bg-gold/10 px-2 py-0.5 rounded transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session-level actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          {session.status === 'pending_review' && !actionStatus['review'] && (
            <>
              <button
                onClick={() => reviewSession('approve')}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 bg-emerald-400/5 hover:bg-emerald-400/10 px-3 py-1.5 rounded transition-colors"
              >
                Approve Session →
              </button>
              <button
                onClick={() => reviewSession('reject')}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-red-400 border border-red-400/30 hover:bg-red-400/10 px-3 py-1.5 rounded transition-colors"
              >
                Reject Session
              </button>
            </>
          )}
          {actionStatus['review'] && (
            <span className={`font-mono text-[var(--admin-label-sm)] self-center ${actionStatus['review'].startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {actionStatus['review']}
            </span>
          )}
          {canContinue && !continueStatus && (
            <button
              onClick={continueSession}
              className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-sky-400 border border-sky-400/30 bg-sky-400/5 hover:bg-sky-400/10 px-3 py-1.5 rounded transition-colors"
            >
              Continue →
            </button>
          )}
          {continueStatus && (
            <span className={`font-mono text-[var(--admin-label-sm)] self-center ${continueStatus.startsWith('error') || continueStatus === 'failed' ? 'text-red-400' : continueStatus === 'complete ✓' ? 'text-emerald-400' : 'text-sky-400'}`}>
              {continueStatus}
            </span>
          )}
          {!rerunStatus ? (
            <button
              onClick={rerunSession}
              className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-amber-400 border border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/10 px-3 py-1.5 rounded transition-colors"
            >
              Re-run →
            </button>
          ) : (
            <span className={`font-mono text-[var(--admin-label-sm)] self-center ${rerunStatus.startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {rerunStatus}
            </span>
          )}
          <div className="ml-auto">
            {actionStatus['stop'] ? (
              <span className={`font-mono text-[var(--admin-label-sm)] ${actionStatus['stop'].startsWith('error') ? 'text-red-400' : 'text-text-tertiary'}`}>
                {actionStatus['stop']}
              </span>
            ) : (
              <button
                onClick={stopSession}
                className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${
                  !['complete', 'failed'].includes(session.status)
                    ? 'text-red-400 border-red-400/30 bg-red-400/5 hover:bg-red-400/15'
                    : 'text-text-tertiary border-border hover:text-red-400 hover:border-red-400/30'
                }`}
              >
                {!['complete', 'failed'].includes(session.status) ? 'Stop & Delete' : 'Delete Session'}
              </button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="border-t border-border pt-3 font-mono text-[var(--admin-label-sm)] text-text-tertiary space-y-0.5">
          <div>ID: {session.id}</div>
          {session.started_at && <div>Started: {new Date(session.started_at).toLocaleString()}</div>}
          {session.completed_at && session.started_at && (
            <div>
              Duration: {Math.round(
                (new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()) / 1000
              )}s
            </div>
          )}
          {session.error_log?.length > 0 && (
            <div className="text-red-400 mt-1">{session.error_log[session.error_log.length - 1]}</div>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────

function KanbanColumn({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[240px] w-60 flex-shrink-0">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest ${accent ?? 'text-text-tertiary'}`}>
          {title}
        </span>
        <span className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="border border-dashed border-border rounded px-3 py-4 text-center">
      <span className="font-mono text-[var(--admin-label-sm)] text-text-tertiary/40">Empty</span>
    </div>
  );
}

// ── Tick Control ──────────────────────────────────────────────────────────────

function TickControl() {
  const [tickStatus, setTickStatus] = useState('');
  const [autoTick, setAutoTick] = useState(false);
  const autoTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (autoTickRef.current) clearInterval(autoTickRef.current); };
  }, []);

  const runTick = useCallback(async () => {
    setTickStatus('ticking…');
    try {
      const res = await fetch('/api/admin/jobs/tick', { method: 'POST' });
      const data = await res.json() as { processed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Tick failed');
      setTickStatus(`tick ✓ — ${data.processed ?? 0} jobs processed`);
      setTimeout(() => setTickStatus(''), 4000);
    } catch (err) {
      setTickStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setTickStatus(''), 5000);
    }
  }, []);

  const toggleAutoTick = useCallback(() => {
    setAutoTick(prev => {
      if (!prev) {
        // start auto-tick every 10s
        void runTick();
        autoTickRef.current = setInterval(() => { void runTick(); }, 10000);
        return true;
      } else {
        if (autoTickRef.current) { clearInterval(autoTickRef.current); autoTickRef.current = null; }
        setTickStatus('');
        return false;
      }
    });
  }, [runTick]);

  return (
    <div className="flex items-center gap-3 mb-4 border border-border/40 bg-ground-light/20 px-4 py-2 rounded">
      <span className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary">Job Processor</span>
      <button
        onClick={() => void runTick()}
        disabled={autoTick}
        className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 transition-colors disabled:opacity-40 rounded"
      >
        Run Tick
      </button>
      <button
        onClick={toggleAutoTick}
        className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${
          autoTick
            ? 'border-emerald-400/50 text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/15'
            : 'border-border text-text-tertiary hover:text-text-secondary'
        }`}
      >
        {autoTick ? '⊙ Auto-tick ON' : 'Auto-tick OFF'}
      </button>
      {tickStatus && (
        <span className={`font-mono text-[var(--admin-label-sm)] ${tickStatus.startsWith('error') ? 'text-red-400' : tickStatus.includes('✓') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
          {tickStatus}
        </span>
      )}
    </div>
  );
}

// ── Main Studio Page ──────────────────────────────────────────────────────────

export default function StudioPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [backlogItems, setBacklogItems] = useState<BacklogItem[]>([]);
  const [jobs, setJobs] = useState<ResearchJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showAllComplete, setShowAllComplete] = useState(false);
  const [showAllFailed, setShowAllFailed] = useState(false);
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const [sessRes, queueRes, backlogRes, jobsRes] = await Promise.all([
        fetch('/api/admin/sessions'),
        fetch('/api/admin/research-queue'),
        fetch('/api/admin/backlog'),
        fetch('/api/admin/jobs'),
      ]);
      const [sessData, queueData, backlogData, jobsData] = await Promise.all([
        sessRes.json() as Promise<{ sessions?: Session[] }>,
        queueRes.json() as Promise<{ items?: QueueItem[] }>,
        backlogRes.json() as Promise<{ items?: BacklogItem[] }>,
        jobsRes.json() as Promise<{ jobs?: ResearchJob[] }>,
      ]);
      setSessions(sessData.sessions ?? []);
      setQueueItems(queueData.items ?? []);
      setBacklogItems(backlogData.items ?? []);
      setJobs(jobsData.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // Keep selected session in sync with refreshed data
  useEffect(() => {
    if (selectedSession) {
      const updated = sessions.find((s) => s.id === selectedSession.id);
      if (updated) setSelectedSession(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // ── Column data ─────────────────────────────────────────────────────────────

  const backlogCol = backlogItems.filter((i) => i.status === 'pending');

  const queuedCol = queueItems.filter((i) => i.status === 'queued');

  // Per-session job progress. The board is driven off real job activity because
  // the job processor never advances session.status — so a session can be fully
  // working while its status field still says 'pending'.
  const jobStats = (sid: string) => {
    const js = jobs.filter((j) => j.session_id === sid);
    return {
      total: js.length,
      complete: js.filter((j) => j.status === 'complete').length,
      running: js.filter((j) => j.status === 'running').length,
      pending: js.filter((j) => j.status === 'pending').length,
    };
  };

  // Needs Approval = pending_review sessions + sessions with awaiting_approval jobs
  const pendingReviewSessions = sessions.filter((s) => s.status === 'pending_review');
  const awaitingApprovalJobSessions = sessions.filter(
    (s) =>
      jobs.some((j) => j.session_id === s.id && j.status === 'awaiting_approval') &&
      !pendingReviewSessions.some((r) => r.id === s.id),
  );
  const approvalCol = [...pendingReviewSessions, ...awaitingApprovalJobSessions];
  const approvalIds = new Set(approvalCol.map((s) => s.id));

  const isTerminal = (s: Session) => s.status === 'complete' || s.status === 'failed';

  // Running = sessions the orchestrator marked active, PLUS launched sessions whose
  // jobs have actually started (any running or completed job), even if their status
  // field still says 'pending'. This is what makes progress visible on the board.
  const runningSessionItems = sessions.filter((s) => {
    if (approvalIds.has(s.id) || isTerminal(s)) return false;
    if (RUNNING_STATUSES.includes(s.status)) return true;
    const st = jobStats(s.id);
    return st.total > 0 && (st.running > 0 || st.complete > 0);
  });
  const runningIds = new Set(runningSessionItems.map((s) => s.id));
  const runningQueueItems = queueItems.filter((i) => i.status === 'running');

  // Queued = launched sessions whose jobs haven't started at all yet.
  const queuedSessions = sessions.filter(
    (s) => s.status === 'pending' && !runningIds.has(s.id) && !approvalIds.has(s.id) && !isTerminal(s),
  );

  const completeSessions = sessions
    .filter((s) => s.status === 'complete')
    .sort((a, b) =>
      new Date(b.completed_at ?? b.created_at).getTime() -
      new Date(a.completed_at ?? a.created_at).getTime(),
    );

  type FailedItem = { id: string; title: string; topic: string; created_at: string; type: 'session' | 'queue'; session?: Session };
  const failedItems: FailedItem[] = [
    ...sessions
      .filter((s) => s.status === 'failed')
      .map((s) => ({ id: s.id, title: s.title, topic: s.topic, created_at: s.created_at, type: 'session' as const, session: s })),
    ...queueItems
      .filter((i) => i.status === 'failed')
      .map((i) => ({ id: i.id, title: i.title, topic: i.topic, created_at: i.created_at, type: 'queue' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Backlog mutations ────────────────────────────────────────────────────────

  const launchBacklogItem = async (item: BacklogItem) => {
    setActionStatus((s) => ({ ...s, [item.id]: 'launching…' }));
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
      const data = await res.json() as { session_id?: string; total_jobs?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Launch failed');
      await fetch('/api/admin/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: 'launched', launched_session_id: data.session_id }),
      });
      setActionStatus((s) => ({ ...s, [item.id]: `launched ✓ (${data.total_jobs ?? '?'} jobs)` }));
      void refresh();
    } catch (err) {
      setActionStatus((s) => ({
        ...s,
        [item.id]: `error: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  };

  const archiveBacklogItem = async (item: BacklogItem) => {
    await fetch('/api/admin/backlog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: 'archived' }),
    });
    void refresh();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const sidebar = (
    <AdminSidebar
      groups={STUDIO_SIDEBAR_GROUPS}
      activeView="studio"
      onSelect={() => {}}
      siteHref="/"
    />
  );

  if (loading) {
    return (
      <AdminShell sidebar={sidebar}>
        <div className="px-6 py-8 font-mono text-sm text-text-tertiary">Loading studio…</div>
      </AdminShell>
    );
  }

  const completeVisible = showAllComplete ? completeSessions : completeSessions.slice(0, ARCHIVE_CAP);
  const failedVisible = showAllFailed ? failedItems : failedItems.slice(0, ARCHIVE_CAP);

  return (
    <AdminShell sidebar={sidebar}>
      <div className="px-6 py-8 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl mb-1">Research Studio</h1>
          <p className="font-mono text-[var(--admin-label-sm)] text-text-secondary">
            {backlogCol.length} backlog · {queuedCol.length + queuedSessions.length} queued · {runningSessionItems.length + runningQueueItems.length} running · {approvalCol.length} need review
            <button
              onClick={() => void refresh()}
              className="ml-4 text-text-tertiary hover:text-gold transition-colors"
            >
              ↻ refresh
            </button>
          </p>
        </div>

        {/* Job processor controls */}
        <TickControl />

        {/* Launch Form */}
        <LaunchForm onRefresh={() => void refresh()} />

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-1 px-1">

          {/* ── Backlog ── */}
          <KanbanColumn title="Backlog" count={backlogCol.length}>
            {backlogCol.length === 0 ? <EmptySlot /> : backlogCol.map((item) => (
              <div key={item.id} className="border border-border bg-ground-light/60 rounded px-3 py-2.5">
                <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                  {item.title || item.topic}
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mb-2">{item.topic}</div>
                {item.research_questions.length > 0 && (
                  <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mb-2">
                    {item.research_questions.length} question{item.research_questions.length !== 1 ? 's' : ''}
                  </div>
                )}
                {actionStatus[item.id] ? (
                  <div className={`font-mono text-[var(--admin-label-sm)] ${actionStatus[item.id].startsWith('error') ? 'text-red-400' : 'text-emerald-400'}`}>
                    {actionStatus[item.id]}
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => launchBacklogItem(item)}
                      className="font-mono text-[var(--admin-label-sm)] text-sky-400 border border-sky-400/30 hover:bg-sky-400/10 px-2 py-0.5 rounded transition-colors"
                    >
                      Launch
                    </button>
                    <button
                      onClick={() => archiveBacklogItem(item)}
                      className="font-mono text-[var(--admin-label-sm)] text-text-tertiary border border-border hover:text-red-400 hover:border-red-400/30 px-2 py-0.5 rounded transition-colors"
                    >
                      Archive
                    </button>
                  </div>
                )}
                <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(item.created_at)}</div>
              </div>
            ))}
          </KanbanColumn>

          {/* ── Queued ── */}
          <KanbanColumn title="Queued" count={queuedCol.length + queuedSessions.length} accent="text-amber-400">
            {queuedCol.length === 0 && queuedSessions.length === 0 ? <EmptySlot /> : null}
            {queuedSessions.map((s) => {
              const pendingJobs = jobs.filter((j) => j.session_id === s.id && j.status === 'pending');
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className="border border-amber-400/20 bg-ground-light/60 rounded px-3 py-2.5 w-full text-left transition-colors hover:bg-ground-light"
                >
                  <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                    {s.title || s.topic}
                  </div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-amber-400 mb-0.5">Waiting to start</div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{s.topic}</div>
                  {pendingJobs.length > 0 && (
                    <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mt-0.5">
                      {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} queued
                    </div>
                  )}
                  <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(s.created_at)}</div>
                </button>
              );
            })}
            {queuedCol.map((item) => (
              <div key={item.id} className="border border-amber-400/20 bg-ground-light/60 rounded px-3 py-2.5">
                <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                  {item.title || item.topic}
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mb-1">{item.topic}</div>
                {item.session_id && (
                  <button
                    onClick={() => { const s = sessions.find((x) => x.id === item.session_id); if (s) setSelectedSession(s); }}
                    className="font-mono text-[var(--admin-label-sm)] text-gold/60 hover:text-gold transition-colors block"
                  >
                    → session {item.session_id.slice(0, 8)}
                  </button>
                )}
                <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(item.created_at)}</div>
              </div>
            ))}
          </KanbanColumn>

          {/* ── Running ── */}
          <KanbanColumn
            title="Running"
            count={runningSessionItems.length + runningQueueItems.length}
            accent="text-sky-400"
          >
            {runningSessionItems.length === 0 && runningQueueItems.length === 0 ? <EmptySlot /> : null}
            {runningSessionItems.map((s) => {
              const st = jobStats(s.id);
              const pct = st.total > 0 ? Math.round((st.complete / st.total) * 100) : 0;
              // Prefer the orchestrator's phase label; otherwise show job-driven progress.
              const label = RUNNING_STATUSES.includes(s.status)
                ? (SESSION_STATUS_LABELS[s.status] ?? s.status)
                : 'Researching';
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className="border border-sky-400/20 bg-ground-light/60 rounded px-3 py-2.5 w-full text-left transition-colors hover:bg-ground-light"
                >
                  <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                    {s.title || s.topic}
                  </div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-sky-400 mb-0.5">
                    ● {label}
                  </div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{s.topic}</div>
                  {st.total > 0 && (
                    <>
                      <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary mt-1">
                        {st.complete}/{st.total} jobs done{st.running > 0 ? ` · ${st.running} running` : ''}
                      </div>
                      <div className="mt-1 h-1 rounded bg-border overflow-hidden">
                        <div className="h-full bg-sky-400/70" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )}
                  <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(s.created_at)}</div>
                </button>
              );
            })}
            {runningQueueItems.map((item) => (
              <div key={item.id} className="border border-amber-400/20 bg-ground-light/60 rounded px-3 py-2.5">
                <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                  {item.title || item.topic}
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-amber-400 mb-0.5">Queue Running</div>
                <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{item.topic}</div>
                {item.session_id && (
                  <button
                    onClick={() => { const s = sessions.find((x) => x.id === item.session_id); if (s) setSelectedSession(s); }}
                    className="font-mono text-[var(--admin-label-sm)] text-gold/60 hover:text-gold transition-colors block mt-0.5"
                  >
                    → session {item.session_id.slice(0, 8)}
                  </button>
                )}
                <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(item.created_at)}</div>
              </div>
            ))}
          </KanbanColumn>

          {/* ── Needs Approval ── */}
          <KanbanColumn title="Needs Approval" count={approvalCol.length} accent="text-gold">
            {approvalCol.length === 0 ? <EmptySlot /> : approvalCol.map((session) => {
              const approvalJobs = jobs.filter(
                (j) => j.session_id === session.id && j.status === 'awaiting_approval',
              );
              const isSessionReview = session.status === 'pending_review';
              return (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className="border border-gold/25 bg-ground-light/60 rounded px-3 py-2.5 w-full text-left transition-colors hover:bg-ground-light"
                >
                  <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                    {session.title || session.topic}
                  </div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-gold mb-0.5">
                    {isSessionReview
                      ? 'Session Review'
                      : `${approvalJobs.length} job${approvalJobs.length !== 1 ? 's' : ''} need approval`}
                  </div>
                  <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{session.topic}</div>
                  <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(session.created_at)}</div>
                </button>
              );
            })}
          </KanbanColumn>

          {/* ── Complete (capped) ── */}
          <KanbanColumn
            title={completeSessions.length > ARCHIVE_CAP ? `Complete (${ARCHIVE_CAP}/${completeSessions.length})` : 'Complete'}
            count={completeSessions.length}
            accent="text-emerald-400"
          >
            {completeSessions.length === 0 ? <EmptySlot /> : null}
            {completeVisible.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="border border-emerald-400/15 bg-ground-light/60 rounded px-3 py-2.5 w-full text-left transition-colors hover:bg-ground-light"
              >
                <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                  {s.title || s.topic}
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{s.topic}</div>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={`/admin/dossiers/${encodeURIComponent(s.topic)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-[var(--admin-label-sm)] text-gold/60 hover:text-gold transition-colors"
                  >
                    Dossier →
                  </a>
                  <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50">
                    {timeAgo(s.completed_at ?? s.created_at)}
                  </span>
                </div>
              </button>
            ))}
            {completeSessions.length > ARCHIVE_CAP && !showAllComplete && (
              <button
                onClick={() => setShowAllComplete(true)}
                className="w-full font-mono text-[var(--admin-label-sm)] text-text-tertiary hover:text-gold border border-border rounded py-2 transition-colors"
              >
                Show all {completeSessions.length} →
              </button>
            )}
          </KanbanColumn>

          {/* ── Failed (capped) ── */}
          <KanbanColumn
            title={failedItems.length > ARCHIVE_CAP ? `Failed (${ARCHIVE_CAP}/${failedItems.length})` : 'Failed'}
            count={failedItems.length}
            accent="text-red-400"
          >
            {failedItems.length === 0 ? <EmptySlot /> : null}
            {failedVisible.map((item) => (
              <div
                key={item.id}
                className={`border border-red-400/15 bg-ground-light/60 rounded px-3 py-2.5 ${item.type === 'session' ? 'cursor-pointer hover:bg-ground-light transition-colors' : ''}`}
                onClick={item.type === 'session' && item.session ? () => setSelectedSession(item.session!) : undefined}
              >
                <div className="text-sm text-text-primary font-medium leading-snug mb-0.5">
                  {item.title || item.topic}
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-red-400/60 mb-0.5">
                  {item.type === 'session' ? 'Session' : 'Queue'} failed
                </div>
                <div className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">{item.topic}</div>
                {item.type === 'session' && (item.session?.error_log?.length ?? 0) > 0 && (
                  <div className="font-mono text-[var(--admin-label-sm)] text-red-400/50 mt-0.5 truncate">
                    {item.session!.error_log[item.session!.error_log.length - 1]}
                  </div>
                )}
                <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/50 mt-1.5">{timeAgo(item.created_at)}</div>
              </div>
            ))}
            {failedItems.length > ARCHIVE_CAP && !showAllFailed && (
              <button
                onClick={() => setShowAllFailed(true)}
                className="w-full font-mono text-[var(--admin-label-sm)] text-text-tertiary hover:text-gold border border-border rounded py-2 transition-colors"
              >
                Show all {failedItems.length} →
              </button>
            )}
          </KanbanColumn>

        </div>

        {/* Session Detail Panel */}
        {selectedSession && (
          <SessionDetailPanel
            session={selectedSession}
            jobs={jobs}
            onClose={() => setSelectedSession(null)}
            onRefresh={() => void refresh()}
          />
        )}
      </div>
    </AdminShell>
  );
}
