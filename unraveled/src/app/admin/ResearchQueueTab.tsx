'use client';

import { useState, useEffect, useCallback } from 'react';

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

const STATUS_STYLES: Record<QueueItem['status'], string> = {
  queued:   'text-text-tertiary border-border',
  running:  'text-amber-400 border-amber-400/40 bg-amber-400/5',
  complete: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/5',
  failed:   'text-red-400 border-red-400/40 bg-red-400/5',
};

const STATUS_LABEL: Record<QueueItem['status'], string> = {
  queued:   'Queued',
  running:  'Running…',
  complete: 'Complete',
  failed:   'Failed',
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function ResearchQueueTab() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [questionsRaw, setQuestionsRaw] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/research-queue');
    if (res.ok) {
      const json = await res.json();
      setItems(json.items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s when something is running
  useEffect(() => {
    const hasRunning = items.some((i) => i.status === 'running');
    if (!hasRunning) return;
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [items, load]);

  async function handleAdd() {
    if (!topic.trim() || !title.trim()) return;
    setSubmitting(true);
    const res = await fetch('/api/admin/research-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic.trim(),
        title: title.trim(),
        research_questions: questionsRaw
          .split('\n')
          .map((q) => q.trim())
          .filter(Boolean),
        description: description.trim() || undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setTopic(''); setTitle(''); setQuestionsRaw(''); setDescription('');
      setAddOpen(false);
      load();
    }
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
    await fetch(`/api/admin/research-queue/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    load();
  }

  const queued   = items.filter((i) => i.status === 'queued');
  const running  = items.filter((i) => i.status === 'running');
  const done     = items.filter((i) => i.status === 'complete' || i.status === 'failed');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl">Research Queue</h2>
          <p className="font-mono text-[10px] text-text-tertiary mt-1">
            Topics run automatically end-to-end — no approval steps. One at a time.
          </p>
        </div>
        <button
          onClick={() => setAddOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-widest px-3 py-2 border border-gold text-gold hover:bg-gold/10 transition-colors rounded"
        >
          + Add to Queue
        </button>
      </div>

      {/* Add form */}
      {addOpen && (
        <div className="border border-border rounded p-6 space-y-4 bg-ground">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">New Queue Item</p>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[10px] text-text-tertiary block mb-1">Topic (slug-style)</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. great-flood-traditions"
                className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-tertiary block mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Great Flood Across Traditions"
                className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-tertiary block mb-1">
                Research Questions <span className="opacity-50">(one per line, optional)</span>
              </label>
              <textarea
                value={questionsRaw}
                onChange={(e) => setQuestionsRaw(e.target.value)}
                rows={4}
                placeholder={"What are the oldest flood narratives?\nDo accounts share structural similarities?"}
                className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold resize-none"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-tertiary block mb-1">
                Description <span className="opacity-50">(optional context for agents)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-transparent border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={submitting || !topic.trim() || !title.trim()}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-gold text-black disabled:opacity-40 hover:bg-gold/90 transition-colors rounded"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button
              onClick={() => setAddOpen(false)}
              className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="font-mono text-[11px] text-text-tertiary">Loading…</p>
      )}

      {!loading && items.length === 0 && (
        <p className="font-mono text-[11px] text-text-tertiary">
          Queue is empty. Add a topic above and the cron will pick it up within 2 minutes.
        </p>
      )}

      {/* Running */}
      {running.length > 0 && (
        <section className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">Now Running</p>
          {running.map((item) => (
            <QueueRow key={item.id} item={item} onDelete={null} deleteId={deleteId} />
          ))}
        </section>
      )}

      {/* Queued */}
      {queued.length > 0 && (
        <section className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            Up Next <span className="opacity-50">({queued.length})</span>
          </p>
          {queued.map((item) => (
            <QueueRow key={item.id} item={item} onDelete={handleDelete} deleteId={deleteId} />
          ))}
        </section>
      )}

      {/* History */}
      {done.length > 0 && (
        <section className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">History</p>
          {done.map((item) => (
            <QueueRow key={item.id} item={item} onDelete={null} deleteId={deleteId} />
          ))}
        </section>
      )}
    </div>
  );
}

function QueueRow({
  item,
  onDelete,
  deleteId,
}: {
  item: QueueItem;
  onDelete: ((id: string) => void) | null;
  deleteId: string | null;
}) {
  return (
    <div className={`border rounded p-4 flex items-start gap-4 ${STATUS_STYLES[item.status]}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
            {item.status === 'running' ? '● ' : ''}{STATUS_LABEL[item.status]}
          </span>
          <span className="font-mono text-[9px] opacity-40">
            {item.completed_at
              ? `completed ${timeAgo(item.completed_at)}`
              : item.started_at
              ? `started ${timeAgo(item.started_at)}`
              : `queued ${timeAgo(item.created_at)}`}
          </span>
        </div>
        <p className="font-serif text-sm mt-1 truncate">{item.title}</p>
        <p className="font-mono text-[9px] opacity-50 mt-0.5">{item.topic}</p>
        {item.research_questions.length > 0 && (
          <p className="font-mono text-[9px] opacity-40 mt-1">
            {item.research_questions.length} research question{item.research_questions.length !== 1 ? 's' : ''}
          </p>
        )}
        {item.error_detail && (
          <p className="font-mono text-[9px] text-red-400 mt-1 truncate">{item.error_detail}</p>
        )}
        {item.session_id && (
          <p className="font-mono text-[9px] opacity-40 mt-1">
            Session: {item.session_id.slice(0, 8)}…
          </p>
        )}
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(item.id)}
          disabled={deleteId === item.id}
          className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
        >
          {deleteId === item.id ? '…' : 'Remove'}
        </button>
      )}
    </div>
  );
}
