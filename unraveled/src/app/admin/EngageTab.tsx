'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reply {
  id: string;
  tweet_id: string;
  parent_tweet_id: string;
  topic: string;
  author_username: string;
  author_name: string;
  text: string;
  created_at_x: string | null;
  priority: 'respond' | 'consider' | 'skip' | 'pending';
  priority_reason: string | null;
  draft_reply: string | null;
  reply_status: 'pending' | 'posted' | 'skipped' | 'dismissed';
  posted_reply_text: string | null;
  posted_at: string | null;
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  respond:  { label: 'Respond',  color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' },
  consider: { label: 'Consider', color: 'text-amber-400 border-amber-400/30 bg-amber-400/5' },
  skip:     { label: 'Skip',     color: 'text-text-tertiary border-border' },
  pending:  { label: 'Pending',  color: 'text-text-tertiary border-border' },
};

// ── Reply Card ────────────────────────────────────────────────────────────────

function ReplyCard({
  reply,
  onUpdate,
}: {
  reply: Reply;
  onUpdate: (id: string, updates: Partial<Reply> & { _posting?: boolean; _postError?: string }) => void;
}) {
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftText, setDraftText] = useState(reply.draft_reply ?? '');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [saving, setSaving] = useState(false);

  const pc = PRIORITY_CONFIG[reply.priority];
  const isPosted = reply.reply_status === 'posted';
  const isSkipped = reply.reply_status === 'skipped' || reply.reply_status === 'dismissed';
  const charCount = draftText.length;
  const overLimit = charCount > 280;

  async function postReply() {
    if (!draftText.trim() || overLimit) return;
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch('/api/admin/social/replies/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reply.id, text: draftText }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(reply.id, { reply_status: 'posted', posted_reply_text: draftText, posted_at: new Date().toISOString() });
      } else {
        setPostError(data.error ?? 'Post failed');
      }
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Request failed');
    }
    setPosting(false);
  }

  async function saveDraft() {
    setSaving(true);
    await fetch('/api/admin/social/replies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reply.id, draft_reply: draftText }),
    });
    onUpdate(reply.id, { draft_reply: draftText });
    setEditingDraft(false);
    setSaving(false);
  }

  async function skip() {
    await fetch('/api/admin/social/replies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reply.id, reply_status: 'skipped' }),
    });
    onUpdate(reply.id, { reply_status: 'skipped' });
  }

  return (
    <div className={`border rounded p-4 space-y-3 ${
      isPosted ? 'border-violet-400/20 bg-violet-400/3 opacity-70' :
      isSkipped ? 'border-border opacity-40' :
      reply.priority === 'respond' ? 'border-emerald-400/20 bg-emerald-400/3' :
      reply.priority === 'consider' ? 'border-amber-400/10' :
      'border-border bg-ground-light/10'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ${pc.color}`}>
          {pc.label}
        </span>
        <a
          href={`https://x.com/${reply.author_username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] text-sky-400/80 hover:text-sky-400 transition-colors"
        >
          @{reply.author_username}
        </a>
        <span className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5">
          {reply.topic.slice(0, 30)}
        </span>
        {reply.created_at_x && (
          <span className="font-mono text-[8px] text-text-tertiary ml-auto">
            {new Date(reply.created_at_x).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Their reply */}
      <p className="text-sm text-text-primary leading-relaxed">{reply.text}</p>

      {/* Priority reason */}
      {reply.priority_reason && (
        <p className="font-mono text-[8px] text-text-tertiary border-l border-border/50 pl-2 italic">
          {reply.priority_reason}
        </p>
      )}

      {/* View on X */}
      <a
        href={`https://x.com/i/web/status/${reply.tweet_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[8px] text-text-tertiary hover:text-sky-400 transition-colors"
      >
        ↗ View on X
      </a>

      {/* Posted confirmation */}
      {isPosted && reply.posted_reply_text && (
        <div className="border border-violet-400/20 bg-violet-400/5 px-3 py-2 rounded">
          <p className="font-mono text-[8px] uppercase tracking-widest text-violet-400 mb-1">Posted</p>
          <p className="text-xs text-text-secondary">{reply.posted_reply_text}</p>
        </div>
      )}

      {/* Draft reply */}
      {!isPosted && !isSkipped && reply.priority !== 'skip' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Draft Reply</span>
            {!editingDraft && (
              <button
                onClick={() => setEditingDraft(true)}
                className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editingDraft ? (
            <div className="space-y-2">
              <textarea
                value={draftText}
                onChange={e => setDraftText(e.target.value)}
                rows={3}
                className="w-full bg-ground border border-border text-sm text-text-primary p-2 focus:outline-none focus:border-gold/40 resize-none"
                placeholder="Draft a reply…"
              />
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[9px] ${overLimit ? 'text-red-400' : 'text-text-tertiary'}`}>
                  {charCount}/280
                </span>
                <button onClick={saveDraft} disabled={saving}
                  className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50 ml-auto">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditingDraft(false); setDraftText(reply.draft_reply ?? ''); }}
                  className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-border/50 bg-ground-light/20 px-3 py-2 rounded">
              {draftText ? (
                <p className="text-sm text-text-secondary leading-relaxed">{draftText}</p>
              ) : (
                <p className="text-sm text-text-tertiary italic">No draft — click Edit to write one</p>
              )}
              {draftText && (
                <span className={`font-mono text-[8px] ${draftText.length > 280 ? 'text-red-400' : 'text-text-tertiary'}`}>
                  {draftText.length}/280
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isPosted && !isSkipped && (
        <div className="flex items-center gap-2 pt-1">
          {draftText && !overLimit && (
            <button
              onClick={postReply}
              disabled={posting}
              className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 transition-colors disabled:opacity-50"
            >
              {posting ? 'Posting…' : '↑ Post Reply'}
            </button>
          )}
          <button
            onClick={skip}
            className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Skip
          </button>
          {postError && (
            <p className="font-mono text-[8px] text-red-400 ml-2">{postError}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function EngageTab() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('respond');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const loadReplies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter === 'all' ? 'all' : statusFilter, limit: '100' });
    const res = await fetch(`/api/admin/social/replies?${params}`);
    const data = await res.json();
    setReplies(data.replies ?? []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  async function fetchFromX() {
    setFetching(true);
    setFetchStatus('Fetching replies from X…');
    try {
      const res = await fetch('/api/admin/social/replies', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFetchStatus(`Fetched ${data.fetched} replies — ${data.new} new. Respond: ${data.by_priority?.respond ?? 0}, Consider: ${data.by_priority?.consider ?? 0}, Skip: ${data.by_priority?.skip ?? 0}`);
        await loadReplies();
      } else {
        setFetchStatus(`Error: ${data.error}`);
      }
    } catch {
      setFetchStatus('Request failed');
    }
    setFetching(false);
  }

  function updateReply(id: string, updates: Partial<Reply>) {
    setReplies(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  const filtered = replies.filter(r => {
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    return true;
  });

  const counts = {
    respond:  replies.filter(r => r.priority === 'respond'  && r.reply_status === 'pending').length,
    consider: replies.filter(r => r.priority === 'consider' && r.reply_status === 'pending').length,
    posted:   replies.filter(r => r.reply_status === 'posted').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-serif text-xl text-text-primary">Engage</h2>
          <p className="font-mono text-[9px] text-text-tertiary mt-1">
            Replies and mentions on published X posts — classified and drafted for review.
          </p>
        </div>
        <button
          onClick={fetchFromX}
          disabled={fetching}
          className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
        >
          {fetching ? 'Fetching…' : '↓ Fetch Replies from X'}
        </button>
      </div>

      {fetchStatus && (
        <p className="font-mono text-[10px] text-text-secondary border-l-2 border-gold/40 pl-3">{fetchStatus}</p>
      )}

      {/* Stats */}
      {replies.length > 0 && (
        <div className="flex gap-6 border border-border bg-ground-light/20 px-4 py-3">
          <div>
            <div className="font-serif text-xl text-emerald-400">{counts.respond}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Respond</div>
          </div>
          <div>
            <div className="font-serif text-xl text-amber-400">{counts.consider}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Consider</div>
          </div>
          <div>
            <div className="font-serif text-xl text-violet-400">{counts.posted}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Posted</div>
          </div>
          <div>
            <div className="font-serif text-xl text-text-secondary">{replies.length}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Total</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-0 border border-border">
          {['respond', 'consider', 'skip', 'all'].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${priorityFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-0 border border-border">
          {['pending', 'posted', 'skipped', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reply list */}
      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">
            {replies.length === 0 ? 'No replies yet' : 'No replies match current filters'}
          </p>
          {replies.length === 0 && (
            <p className="text-sm text-text-secondary">
              Click "Fetch Replies from X" to pull in mentions and replies on your published posts.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reply => (
            <ReplyCard key={reply.id} reply={reply} onUpdate={updateReply} />
          ))}
        </div>
      )}
    </div>
  );
}
