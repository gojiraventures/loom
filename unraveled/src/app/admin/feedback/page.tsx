'use client';

import { useEffect, useState, useCallback } from 'react';

interface Submission {
  id: string;
  article_id: string;
  title: string;
  category: string;
  description: string;
  source_url: string | null;
  priority: 'normal' | 'elevated' | 'high';
  status: string;
  account_age_days: number | null;
  user_id: string | null;
  created_at: string;
}

const PRIORITY_ORDER = { high: 0, elevated: 1, normal: 2 };

const PRIORITY_COLORS: Record<string, string> = {
  high:     'text-red-400 border-red-400/30 bg-red-400/10',
  elevated: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  normal:   'text-text-tertiary border-border bg-ground-light',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-gold border-gold/30 bg-gold/10',
  reviewing:  'text-blue-400 border-blue-400/30 bg-blue-400/10',
  actioned:   'text-green-400 border-green-400/30 bg-green-400/10',
  dismissed:  'text-text-tertiary border-border bg-ground-light',
};

const CATEGORY_LABELS: Record<string, string> = {
  factual_inaccuracy:   'Factual inaccuracy',
  missing_source:       'Missing source',
  outdated_information: 'Outdated info',
  missing_context:      'Missing context',
  other:                'Other',
};

export default function FeedbackQueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/feedback');
    if (res.ok) {
      const data = await res.json() as { submissions: Submission[] };
      const sorted = [...data.submissions].sort((a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2) ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setSubmissions(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setWorking(id + status);
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    setWorking(null);
  };

  const banUser = async (submission: Submission) => {
    if (!submission.user_id) return;
    if (!confirm('Ban this account? This sets their profile to banned and revokes all sessions.')) return;
    setWorking(submission.id + 'ban');
    await fetch('/api/admin/feedback/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: submission.user_id }),
    });
    await updateStatus(submission.id, 'dismissed');
    setWorking(null);
  };

  const pending = submissions.filter((s) => ['pending', 'reviewing'].includes(s.status));
  const resolved = submissions.filter((s) => !['pending', 'reviewing'].includes(s.status));

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <a href="/admin" className="font-mono text-[9px] text-text-tertiary hover:text-gold transition-colors">
              ← Admin
            </a>
            <h1 className="font-serif text-2xl mt-2">Feedback Queue</h1>
          </div>
          <button
            onClick={load}
            className="font-mono text-[10px] uppercase tracking-widest border border-border px-4 py-2 hover:border-gold/40 transition-colors"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="font-mono text-[11px] text-text-tertiary">Loading…</p>
        ) : submissions.length === 0 ? (
          <div className="border border-border px-6 py-12 text-center">
            <p className="font-mono text-[11px] text-text-tertiary">No feedback submissions yet.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Active queue */}
            {pending.length > 0 && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-3">
                  Active — {pending.length}
                </p>
                <div className="divide-y divide-border border border-border">
                  {pending.map((s) => (
                    <SubmissionRow
                      key={s.id}
                      s={s}
                      working={working}
                      onStatus={updateStatus}
                      onBan={banUser}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved */}
            {resolved.length > 0 && (
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-3">
                  Resolved — {resolved.length}
                </p>
                <div className="divide-y divide-border border border-border opacity-60">
                  {resolved.map((s) => (
                    <SubmissionRow
                      key={s.id}
                      s={s}
                      working={working}
                      onStatus={updateStatus}
                      onBan={banUser}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionRow({
  s,
  working,
  onStatus,
  onBan,
}: {
  s: Submission;
  working: string | null;
  onStatus: (id: string, status: string) => void;
  onBan: (s: Submission) => void;
}) {
  const PRIORITY_COLORS: Record<string, string> = {
    high:     'text-red-400 border-red-400/30 bg-red-400/10',
    elevated: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
    normal:   'text-text-tertiary border-border bg-transparent',
  };

  const STATUS_COLORS: Record<string, string> = {
    pending:    'text-gold border-gold/30 bg-gold/10',
    reviewing:  'text-blue-400 border-blue-400/30 bg-blue-400/10',
    actioned:   'text-green-400 border-green-400/30 bg-green-400/10',
    dismissed:  'text-text-tertiary border-border bg-transparent',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    factual_inaccuracy:   'Factual inaccuracy',
    missing_source:       'Missing source',
    outdated_information: 'Outdated info',
    missing_context:      'Missing context',
    other:                'Other',
  };

  const isNewAccount = s.account_age_days !== null && s.account_age_days < 7;
  const busy = working?.startsWith(s.id) ?? false;

  return (
    <div className="px-5 py-4 bg-ground-light/30 hover:bg-ground-light/50 transition-colors">
      {/* Top row */}
      <div className="flex flex-wrap items-start gap-2 mb-2">
        {/* Priority */}
        <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${PRIORITY_COLORS[s.priority] ?? ''}`}>
          {s.priority}
        </span>
        {/* Status */}
        <span className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${STATUS_COLORS[s.status] ?? ''}`}>
          {s.status}
        </span>
        {/* Category */}
        <span className="font-mono text-[9px] text-text-tertiary border border-border px-1.5 py-0.5">
          {CATEGORY_LABELS[s.category] ?? s.category}
        </span>
        {/* New account warning */}
        {isNewAccount && (
          <span className="font-mono text-[9px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5">
            New account ({s.account_age_days}d)
          </span>
        )}
        <span className="font-mono text-[9px] text-text-tertiary ml-auto">
          {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* Article link */}
      <div className="mb-2">
        <a
          href={`/topics/${s.article_id}`}
          target="_blank"
          rel="noopener"
          className="font-mono text-[10px] text-gold/70 hover:text-gold transition-colors"
        >
          {s.title ?? s.article_id} ↗
        </a>
      </div>

      {/* Content */}
      <p className="text-sm text-text-secondary leading-relaxed mb-2">{s.description}</p>

      {/* Source URL */}
      {s.source_url && (
        <a
          href={s.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] text-blue-400/70 hover:text-blue-400 transition-colors block mb-3 truncate"
        >
          {s.source_url}
        </a>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: 'Acknowledge', status: 'reviewing' },
          { label: 'Actioned',   status: 'actioned' },
          { label: 'Dismiss',    status: 'dismissed' },
        ].map(({ label, status }) => (
          <button
            key={status}
            disabled={busy || s.status === status}
            onClick={() => onStatus(s.id, status)}
            className="font-mono text-[9px] uppercase tracking-widest border border-border px-2.5 py-1 text-text-tertiary hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
        {s.user_id && (
          <button
            disabled={busy}
            onClick={() => onBan(s)}
            className="font-mono text-[9px] uppercase tracking-widest border border-red-400/30 px-2.5 py-1 text-red-400/70 hover:text-red-400 hover:border-red-400/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
          >
            Ban account
          </button>
        )}
      </div>
    </div>
  );
}
