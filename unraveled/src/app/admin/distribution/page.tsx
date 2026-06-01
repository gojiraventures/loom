'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';
import { IntelligenceTab } from '../IntelligenceTab';
import { SocialCalendar } from '../SocialCalendar';

// ── Types ──────────────────────────────────────────────────────────────────────

interface DesignVariant {
  id: string;
  content_piece_id: string;
  variant_label: string;
  template_type: string;
  image_url: string;
  storage_path: string;
  width: number;
  height: number;
  selected: boolean;
  created_at: string;
}

interface QAResult {
  result: 'pass' | 'flag' | 'block';
  issues: { category: string; severity: string; description: string }[];
  summary: string;
}

interface ContentPiece {
  id: string;
  topic: string;
  platform: 'x' | 'instagram' | 'facebook' | 'youtube';
  content_type: string;
  text_content: string;
  supplementary: {
    posts?: string[];
    slides?: { header?: string; body: string }[];
    caption?: string;
    published_tweet_ids?: string[];
    published_tweet_url?: string;
  } | null;
  day_offset: number;
  sort_order: number;
  status: 'draft' | 'approved' | 'rejected' | 'scheduled' | 'published';
  scheduled_at: string | null;
  created_at: string;
  _designs?: DesignVariant[];
  _qa?: QAResult | null;
  _publishing?: boolean;
  _publishError?: string;
}

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

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  max_uses: number | null;
  uses_count: number;
  duration_days: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

interface Dossier {
  topic: string;
  title: string;
  slug: string | null;
  published: boolean;
  best_convergence_score: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAR_LIMITS: Record<string, number> = {
  x: 280, instagram: 2200, facebook: 63206, youtube: 5000,
};

const PLATFORM_LABELS: Record<string, string> = {
  x: 'X / Twitter', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube',
};

const PLATFORM_COLORS: Record<string, string> = {
  x: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  instagram: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  facebook: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  youtube: 'text-red-400 border-red-400/30 bg-red-400/5',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  launch_thread: 'Launch Thread',
  standalone_surprise: 'Surprise Finding',
  tradition_voice: 'Tradition Voice',
  debate_post: 'Advocate vs Skeptic',
  open_question: 'Open Question',
  score_reveal: 'Score Reveal',
  primary_findings_carousel: 'Findings Carousel',
  tradition_voices_carousel: 'Voices Carousel',
  advocate_skeptic_carousel: 'Debate Carousel',
  quote_card: 'Quote Card',
  reels_script: 'Reels Script',
  summary_post: 'Summary Post',
  discussion_prompt: 'Discussion Prompt',
  tradition_spotlight: 'Tradition Spotlight',
  link_share: 'Link Share',
};

// ── Sidebar ────────────────────────────────────────────────────────────────────

type DistView = 'social' | 'generate' | 'calendar' | 'replies' | 'performance' | 'promo';

const DIST_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command-center', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio', label: 'Studio', href: '/admin/studio' },
      { id: 'admin', label: 'Admin Home', href: '/admin' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'social',      label: 'Social Queue' },
      { id: 'generate',    label: 'Generate & QA' },
      { id: 'calendar',    label: 'Calendar' },
      { id: 'replies',     label: 'Replies' },
      { id: 'performance', label: 'Performance' },
      { id: 'promo',       label: 'Promo Codes' },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtScheduled(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET';
}

// ── Per-platform validation chips (display-only) ───────────────────────────────

function ValidationChips({ piece }: { piece: ContentPiece }) {
  const chips: { text: string; error: boolean }[] = [];

  if (piece.platform === 'x') {
    const posts = piece.supplementary?.posts ?? [];
    if (posts.length > 0) {
      const worst = Math.max(...posts.map(p => p.length));
      if (worst > CHAR_LIMITS.x) chips.push({ text: `X: ${worst}/${CHAR_LIMITS.x}`, error: true });
    } else if ((piece.text_content?.length ?? 0) > CHAR_LIMITS.x) {
      chips.push({ text: `X: ${piece.text_content.length}/${CHAR_LIMITS.x}`, error: true });
    }
  }

  if (piece.platform === 'instagram') {
    const hasImage = piece._designs?.some(d => d.selected);
    if (!hasImage) chips.push({ text: 'IG: no image selected', error: true });
  }

  if (piece.platform === 'facebook') {
    const hasLink = piece.content_type === 'link_share' ||
      /https?:\/\//.test(piece.text_content ?? '');
    if (!hasLink) chips.push({ text: 'FB: link recommended', error: false });
  }

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map((chip, i) => (
        <span key={i} className={`font-mono text-[var(--admin-label-xs)] border px-1 py-0.5 ${
          chip.error ? 'text-red-400 border-red-400/30 bg-red-400/5' : 'text-amber-400 border-amber-400/30 bg-amber-400/5'
        }`}>
          {chip.text}
        </span>
      ))}
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────────

function PublishConfirmModal({ piece, onConfirm, onCancel }: {
  piece: ContentPiece; onConfirm: () => void; onCancel: () => void;
}) {
  const posts = piece.supplementary?.posts ?? [];
  const tweetCount = posts.length > 0 ? posts.length : 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-ground border border-sky-400/30 p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="font-mono font-medium text-[var(--admin-label)] text-sky-400">Confirm Post to X</h3>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${PLATFORM_COLORS[piece.platform]}`}>
              {PLATFORM_LABELS[piece.platform]}
            </span>
            {tweetCount > 1 && (
              <span className="font-mono text-[var(--admin-label-xs)] border border-amber-400/40 text-amber-400 px-1.5 py-0.5">{tweetCount} tweets</span>
            )}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{posts[0] ?? piece.text_content}</p>
          {tweetCount > 1 && (
            <p className="font-mono text-[var(--admin-label-sm)] text-amber-400/70">Posts as a thread of {tweetCount} tweets.</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onConfirm}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 transition-colors flex-1">
            Post Now
          </button>
          <button onClick={onCancel}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ScheduleModal({ piece, onConfirm, onCancel }: {
  piece: ContentPiece; onConfirm: (scheduledAt: string) => void; onCancel: () => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [hour, setHour] = useState(9);

  function confirm() {
    const iso = new Date(`${date}T00:00:00Z`);
    iso.setUTCHours(hour + 5, 0, 0, 0);
    onConfirm(iso.toISOString());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-ground border border-gold/30 p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-mono font-medium text-[var(--admin-label)] text-gold">Schedule Post</h3>
        <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
          {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type} · {PLATFORM_LABELS[piece.platform]}
        </p>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-ground-light border border-border px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Time (ET)</label>
            <select value={hour} onChange={e => setHour(parseInt(e.target.value))}
              className="bg-ground-light border border-border px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/40">
              {[7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(h => (
                <option key={h} value={h}>{h < 12 ? `${h}:00 am` : h === 12 ? '12:00 pm' : `${h-12}:00 pm`} ET{h === 9 ? ' (optimal)' : ''}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={confirm}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors flex-1">
            Lock In
          </button>
          <button onClick={onCancel}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate & QA View ────────────────────────────────────────────────────────

function GenerateView() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pieceActions, setPieceActions] = useState<Record<string, string>>({});

  // ── Scheduler state ────
  const [schedStartDate, setSchedStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
  });
  const [schedSlots, setSchedSlots] = useState(3);
  const [schedPlatforms, setSchedPlatforms] = useState<string[]>(['x', 'instagram', 'facebook']);
  const [schedStatus, setSchedStatus] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    async function loadDossiers() {
      try {
        const sessRes = await fetch('/api/admin/sessions');
        const sessData = await sessRes.json();
        const complete = (sessData.sessions ?? []).filter(
          (s: { status: string }) => s.status === 'complete'
        ) as { id: string; topic: string; created_at: string }[];
        const topicMap: Record<string, boolean> = {};
        const sorted = [...complete].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const topics = sorted.filter(s => { if (topicMap[s.topic]) return false; topicMap[s.topic] = true; return true; }).map(s => s.topic);
        const results = await Promise.all(topics.map(t =>
          fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`).then(r => r.json()).then(d => d.dossier as Dossier | null).catch(() => null)
        ));
        const published = results.filter((d): d is Dossier => !!d && d.published);
        setDossiers(published);
        if (published.length > 0) setSelectedTopic(published[0].topic);
      } finally {
        setLoadingDossiers(false);
      }
    }
    void loadDossiers();
  }, []);

  const loadPieces = useCallback(async (topic: string) => {
    setLoadingPieces(true);
    const res = await fetch(`/api/admin/social/pieces?${new URLSearchParams({ topic })}`);
    const data = await res.json();
    setPieces(data.pieces ?? []);
    setLoadingPieces(false);
  }, []);

  useEffect(() => { if (selectedTopic) void loadPieces(selectedTopic); }, [selectedTopic, loadPieces]);

  async function generate() {
    if (!selectedTopic) return;
    setGenerating(true);
    setGenStatus('Generating content…');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic }),
      });
      const data = await res.json() as { pieces_created?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Generate failed');
      setGenStatus(`Generated ✓ — ${data.pieces_created ?? '?'} pieces created`);
      void loadPieces(selectedTopic);
    } catch (err) {
      setGenStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  }

  async function runQA(pieceId: string) {
    setPieceActions(a => ({ ...a, [pieceId]: 'running QA…' }));
    try {
      const res = await fetch('/api/admin/social/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json() as { result?: string; summary?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'QA failed');
      setPieceActions(a => ({ ...a, [pieceId]: `QA: ${data.result ?? 'done'} — ${data.summary ?? ''}` }));
    } catch (err) {
      setPieceActions(a => ({ ...a, [pieceId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }

  async function runAutoFix(pieceId: string) {
    setPieceActions(a => ({ ...a, [pieceId]: 'fixing…' }));
    try {
      const res = await fetch('/api/admin/social/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Auto-fix failed');
      setPieceActions(a => ({ ...a, [pieceId]: 'fixed ✓' }));
      if (selectedTopic) void loadPieces(selectedTopic);
    } catch (err) {
      setPieceActions(a => ({ ...a, [pieceId]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }

  async function scheduleAll() {
    setScheduling(true);
    setSchedStatus('Scheduling…');
    try {
      const res = await fetch('/api/admin/social/schedule/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: schedStartDate, slots_per_day: schedSlots, platforms: schedPlatforms }),
      });
      const data = await res.json() as { scheduled?: number; calendar?: Record<string, unknown[]>; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Schedule failed');
      const dayCount = data.calendar ? Object.keys(data.calendar).length : 0;
      setSchedStatus(`Scheduled ✓ — ${data.scheduled ?? '?'} pieces across ${dayCount} days`);
      if (selectedTopic) void loadPieces(selectedTopic);
    } catch (err) {
      setSchedStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setScheduling(false);
    }
  }

  async function clearAll() {
    if (!confirm('Clear all scheduled timestamps? Posts will return to Approved status.')) return;
    setClearing(true);
    setSchedStatus('Clearing…');
    try {
      const res = await fetch('/api/admin/social/schedule/global', { method: 'DELETE' });
      const data = await res.json() as { cleared?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Clear failed');
      setSchedStatus(`Cleared ✓ — ${data.cleared ?? '?'} timestamps removed`);
      if (selectedTopic) void loadPieces(selectedTopic);
    } catch (err) {
      setSchedStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setClearing(false);
    }
  }

  const draftPieces = pieces.filter(p => p.status === 'draft' || p.status === 'rejected');
  const approvedPieces = pieces.filter(p => p.status === 'approved');

  return (
    <div className="space-y-8 max-w-3xl">
      {/* ── Article selector ── */}
      <div>
        <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Article</label>
        {loadingDossiers ? (
          <p className="text-sm text-text-tertiary">Loading…</p>
        ) : (
          <select
            value={selectedTopic ?? ''}
            onChange={e => setSelectedTopic(e.target.value)}
            className="w-full max-w-sm bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/40"
          >
            {dossiers.map(d => <option key={d.topic} value={d.topic}>{d.title || d.topic}</option>)}
            {dossiers.length === 0 && <option value="">No published dossiers</option>}
          </select>
        )}
      </div>

      {/* ── Generate Content ── */}
      <section className="border border-border bg-ground-light/20 p-5 rounded space-y-4">
        <div>
          <h2 className="font-mono font-medium text-[var(--admin-label)] text-gold mb-1">Generate Content</h2>
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
            Deletes draft/rejected pieces for this article and generates a fresh set. Approved &amp; published pieces are preserved.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={generate}
            disabled={generating || !selectedTopic}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-gold/50 text-gold bg-gold/5 hover:bg-gold/10 rounded transition-colors disabled:opacity-40"
          >
            {generating ? '⊙ Generating…' : 'Generate Content'}
          </button>
          {genStatus && (
            <span className={`font-mono text-[var(--admin-label-sm)] ${genStatus.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {genStatus}
            </span>
          )}
        </div>
      </section>

      {/* ── Per-piece QA / Auto-fix ── */}
      {selectedTopic && (
        <section className="border border-border bg-ground-light/20 p-5 rounded space-y-4">
          <h2 className="font-mono font-medium text-[var(--admin-label)] text-gold">Per-piece QA & Auto-fix</h2>
          {loadingPieces ? (
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary animate-pulse">Loading pieces…</p>
          ) : draftPieces.length === 0 ? (
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">No draft pieces — generate content first.</p>
          ) : (
            <div className="space-y-2">
              {draftPieces.map(p => {
                const posts = p.supplementary?.posts ?? [];
                const preview = posts[0] ?? p.text_content ?? '';
                const action = pieceActions[p.id];
                return (
                  <div key={p.id} className="border border-border rounded px-3 py-2.5 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1 py-0.5 ${PLATFORM_COLORS[p.platform]}`}>
                          {p.platform === 'x' ? 'X' : p.platform === 'instagram' ? 'IG' : p.platform === 'facebook' ? 'FB' : p.platform.toUpperCase()}
                        </span>
                        <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">
                          {CONTENT_TYPE_LABELS[p.content_type] ?? p.content_type}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary line-clamp-1">{preview}</p>
                      {action && (
                        <p className={`font-mono text-[var(--admin-label-sm)] mt-1 ${action.startsWith('error') ? 'text-red-400' : action.includes('✓') || action.startsWith('QA:') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                          {action}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => void runQA(p.id)}
                        disabled={!!action && !action.startsWith('error')}
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 rounded transition-colors disabled:opacity-40"
                      >
                        QA
                      </button>
                      <button
                        onClick={() => void runAutoFix(p.id)}
                        disabled={!!action && !action.startsWith('error')}
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 rounded transition-colors disabled:opacity-40"
                      >
                        Fix
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Global Scheduler ── */}
      <section className="border border-border bg-ground-light/20 p-5 rounded space-y-4">
        <div>
          <h2 className="font-mono font-medium text-[var(--admin-label)] text-gold mb-1">Global Scheduler</h2>
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
            Schedule all approved pieces across platforms. {approvedPieces.length} approved for selected article.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-lg">
          <div>
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Start date</label>
            <input
              type="date"
              value={schedStartDate}
              onChange={e => setSchedStartDate(e.target.value)}
              className="w-full bg-ground border border-border px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Slots / day</label>
            <input
              type="number"
              min={1} max={10}
              value={schedSlots}
              onChange={e => setSchedSlots(parseInt(e.target.value) || 1)}
              className="w-full bg-ground border border-border px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Platforms</label>
            <div className="flex gap-1">
              {['x', 'instagram', 'facebook'].map(pl => (
                <button
                  key={pl}
                  onClick={() => setSchedPlatforms(prev =>
                    prev.includes(pl) ? prev.filter(p => p !== pl) : [...prev, pl]
                  )}
                  className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-1.5 py-1 border rounded transition-colors ${
                    schedPlatforms.includes(pl)
                      ? PLATFORM_COLORS[pl]
                      : 'border-border text-text-tertiary'
                  }`}
                >
                  {pl === 'x' ? 'X' : pl === 'instagram' ? 'IG' : 'FB'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={scheduleAll}
            disabled={scheduling || clearing}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-emerald-400/40 text-emerald-400 bg-emerald-400/5 hover:bg-emerald-400/10 rounded transition-colors disabled:opacity-40"
          >
            {scheduling ? '⊙ Scheduling…' : 'Schedule All'}
          </button>
          <button
            onClick={clearAll}
            disabled={scheduling || clearing}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-red-400/30 text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-40"
          >
            {clearing ? '⊙ Clearing…' : 'Clear All'}
          </button>
          {schedStatus && (
            <span className={`font-mono text-[var(--admin-label-sm)] ${schedStatus.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {schedStatus}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Social Queue View ──────────────────────────────────────────────────────────

function SocialKanbanCard({
  piece, onSetStatus, onSchedule, onPublish, onUnschedule,
}: {
  piece: ContentPiece;
  onSetStatus: (id: string, status: ContentPiece['status']) => void;
  onSchedule: (id: string) => void;
  onPublish: (id: string) => void;
  onUnschedule: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const posts = piece.supplementary?.posts ?? [];
  const selectedDesign = piece._designs?.find(d => d.selected);

  return (
    <div className={`border rounded bg-ground-light/10 transition-colors ${
      piece.status === 'scheduled' ? 'border-gold/30' :
      piece.status === 'published' ? 'border-violet-400/20' :
      piece.status === 'approved' ? 'border-emerald-400/20' :
      piece.status === 'rejected' ? 'border-red-400/10 opacity-50' :
      'border-border'
    }`}>
      <div className="p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1 py-0.5 shrink-0 ${PLATFORM_COLORS[piece.platform]}`}>
            {piece.platform === 'x' ? 'X' : piece.platform === 'instagram' ? 'IG' : piece.platform === 'facebook' ? 'FB' : piece.platform.toUpperCase()}
          </span>
          {posts.length > 1 && (
            <span className="font-mono text-[var(--admin-label-xs)] border border-amber-400/40 text-amber-400 px-1 py-0.5 shrink-0">
              {posts.length}t
            </span>
          )}
          {piece._qa && (
            <span className={`font-mono text-[var(--admin-label-xs)] shrink-0 ${
              piece._qa.result === 'pass' ? 'text-emerald-400' :
              piece._qa.result === 'flag' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {piece._qa.result === 'pass' ? '✓QA' : piece._qa.result === 'flag' ? '⚑QA' : '✗QA'}
            </span>
          )}
          <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary ml-auto">D{piece.day_offset}</span>
        </div>

        <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-secondary mb-1">
          {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}
        </p>
        <p className="text-xs text-text-tertiary leading-snug line-clamp-2">
          {posts[0] ?? piece.text_content}
        </p>

        {piece.scheduled_at && (
          <p className="font-mono text-[var(--admin-label-xs)] text-gold/80 mt-1">{fmtScheduled(piece.scheduled_at)}</p>
        )}

        {selectedDesign && !expanded && (
          <div className="mt-1.5 border border-border overflow-hidden relative" style={{ paddingBottom: '28%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedDesign.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        <ValidationChips piece={piece} />

        <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/30 mt-1">{expanded ? '↑' : '↓'}</p>
      </div>

      {expanded && (
        <div className="px-3 pb-3 border-t border-border/40 pt-2 space-y-2">
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
            {posts.length > 0 ? posts.map((p, i) => `${i+1}. ${p}`).join('\n\n') : piece.text_content}
          </p>

          {selectedDesign && (
            <div className="border border-border overflow-hidden relative" style={{ paddingBottom: `${(selectedDesign.height / selectedDesign.width * 100).toFixed(2)}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedDesign.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          {piece.status === 'published' && piece.supplementary?.published_tweet_url && (
            <a href={piece.supplementary.published_tweet_url} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[var(--admin-label-xs)] text-sky-400 hover:text-sky-300 block">
              ↗ View on X
            </a>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
            {piece.status === 'draft' && (
              <button onClick={() => onSetStatus(piece.id, 'approved')}
                className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20 transition-colors">
                Approve
              </button>
            )}
            {piece.status === 'approved' && (
              <>
                <button onClick={() => onSetStatus(piece.id, 'draft')}
                  className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                  Unapprove
                </button>
                <button onClick={() => onSchedule(piece.id)}
                  className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors ml-auto">
                  Schedule
                </button>
                {piece.platform === 'x' && (
                  <button onClick={() => onPublish(piece.id)} disabled={piece._publishing}
                    className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 disabled:opacity-50">
                    {piece._publishing ? 'Posting...' : 'Post Now'}
                  </button>
                )}
              </>
            )}
            {piece.status === 'scheduled' && (
              <>
                <button onClick={() => onUnschedule(piece.id)}
                  className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                  Unschedule
                </button>
                {piece.platform === 'x' && (
                  <button onClick={() => onPublish(piece.id)} disabled={piece._publishing}
                    className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 disabled:opacity-50 ml-auto">
                    {piece._publishing ? 'Posting...' : 'Post Now'}
                  </button>
                )}
              </>
            )}
            {piece._publishError && (
              <p className="w-full font-mono text-[var(--admin-label-xs)] text-red-400">{piece._publishError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialKanbanColumn({
  title, count, accentClass, emptyText, children,
}: {
  title: string; count: number; accentClass: string; emptyText: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-[240px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2 border-b mb-2 ${accentClass}`}>
        <span className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest">{title}</span>
        <span className="font-mono text-[var(--admin-label-sm)] opacity-60">{count}</span>
      </div>
      <div className="space-y-2 flex-1">
        {count === 0
          ? <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary/40 text-center py-6">{emptyText}</p>
          : children}
      </div>
    </div>
  );
}

function SocialQueueView() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [scheduleModalId, setScheduleModalId] = useState<string | null>(null);
  const [publishedPage, setPublishedPage] = useState(0);
  const PUBLISHED_PAGE_SIZE = 10;

  useEffect(() => {
    async function load() {
      try {
        const sessRes = await fetch('/api/admin/sessions');
        const sessData = await sessRes.json();
        const complete = (sessData.sessions ?? []).filter(
          (s: { status: string }) => s.status === 'complete'
        ) as { id: string; topic: string; created_at: string }[];
        const topicMap: Record<string, boolean> = {};
        const sorted = [...complete].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const topics = sorted.filter(s => { if (topicMap[s.topic]) return false; topicMap[s.topic] = true; return true; }).map(s => s.topic);
        const results = await Promise.all(topics.map(t =>
          fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`).then(r => r.json()).then(d => d.dossier as Dossier | null).catch(() => null)
        ));
        const published = results.filter((d): d is Dossier => !!d && d.published);
        setDossiers(published);
        if (published.length > 0) setSelectedTopic(published[0].topic);
      } catch { /* silent */ }
      finally { setLoadingDossiers(false); }
    }
    load();
  }, []);

  const loadPieces = useCallback(async (topic: string) => {
    setLoadingPieces(true);
    setPublishedPage(0);
    const res = await fetch(`/api/admin/social/pieces?${new URLSearchParams({ topic })}`);
    const data = await res.json();
    const loaded: ContentPiece[] = data.pieces ?? [];
    setPieces(loaded);
    setLoadingPieces(false);
    if (loaded.length === 0) return;
    const designResults = await Promise.allSettled(
      loaded.map(p =>
        fetch(`/api/admin/social/design?piece_id=${encodeURIComponent(p.id)}`)
          .then(r => r.ok ? r.json() : { variants: [] })
          .then(d => ({ id: p.id, variants: (d.variants ?? []) as DesignVariant[] }))
      )
    );
    const designMap: Record<string, DesignVariant[]> = {};
    for (const r of designResults) {
      if (r.status === 'fulfilled' && r.value.variants.length > 0) designMap[r.value.id] = r.value.variants;
    }
    if (Object.keys(designMap).length > 0) {
      setPieces(prev => prev.map(p => designMap[p.id] ? { ...p, _designs: designMap[p.id] } : p));
    }
  }, []);

  useEffect(() => { if (selectedTopic) loadPieces(selectedTopic); }, [selectedTopic, loadPieces]);

  function updatePiece(id: string, updates: Partial<ContentPiece>) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  async function setStatus(id: string, status: ContentPiece['status']) {
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) updatePiece(id, { status });
  }

  async function schedulePiece(id: string, scheduledAt: string) {
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'scheduled', scheduled_at: scheduledAt }),
    });
    if (res.ok) updatePiece(id, { status: 'scheduled', scheduled_at: scheduledAt });
    setScheduleModalId(null);
  }

  async function unschedulePiece(id: string) {
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'approved', scheduled_at: null }),
    });
    if (res.ok) updatePiece(id, { status: 'approved', scheduled_at: null });
  }

  async function publishPiece(pieceId: string) {
    setPublishConfirmId(null);
    updatePiece(pieceId, { _publishing: true, _publishError: undefined });
    try {
      const res = await fetch('/api/admin/social/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        updatePiece(pieceId, {
          status: 'published', _publishing: false, _publishError: undefined,
          supplementary: { published_tweet_ids: data.tweet_ids, published_tweet_url: data.tweet_url },
        });
      } else {
        updatePiece(pieceId, { _publishing: false, _publishError: data.error ?? 'Post failed' });
      }
    } catch (err) {
      updatePiece(pieceId, { _publishing: false, _publishError: err instanceof Error ? err.message : 'Request failed' });
    }
  }

  const filtered = pieces.filter(p => platformFilter === 'all' || p.platform === platformFilter);

  // Column assignment (client-side computed)
  const colDraft      = filtered.filter(p => (p.status === 'draft' || p.status === 'rejected') && (!p._designs || p._designs.length === 0));
  const colNeedsDesign = filtered.filter(p => p.status === 'draft' && (p._designs?.length ?? 0) > 0 && !p._designs?.some(d => d.selected));
  const colQA         = filtered.filter(p => p.status === 'draft' && p._designs?.some(d => d.selected) === true);
  const colApproved   = filtered.filter(p => p.status === 'approved');
  const colScheduled  = filtered.filter(p => p.status === 'scheduled');
  const colPublished  = filtered.filter(p => p.status === 'published');

  // Published pagination
  const publishedVisible = colPublished.slice(0, (publishedPage + 1) * PUBLISHED_PAGE_SIZE);
  const hasMorePublished = colPublished.length > publishedVisible.length;

  const sharedCardProps = {
    onSetStatus: setStatus,
    onSchedule: (id: string) => setScheduleModalId(id),
    onPublish: (id: string) => setPublishConfirmId(id),
    onUnschedule: unschedulePiece,
  };

  const publishConfirmPiece = publishConfirmId ? pieces.find(p => p.id === publishConfirmId) ?? null : null;
  const scheduleModalPiece  = scheduleModalId  ? pieces.find(p => p.id === scheduleModalId)  ?? null : null;

  return (
    <div className="space-y-4">
      {publishConfirmPiece && (
        <PublishConfirmModal piece={publishConfirmPiece}
          onConfirm={() => publishPiece(publishConfirmPiece.id)}
          onCancel={() => setPublishConfirmId(null)} />
      )}
      {scheduleModalPiece && (
        <ScheduleModal piece={scheduleModalPiece}
          onConfirm={(scheduledAt) => schedulePiece(scheduleModalPiece.id, scheduledAt)}
          onCancel={() => setScheduleModalId(null)} />
      )}

      {/* Article selector */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary block mb-1">Article</label>
          {loadingDossiers ? (
            <p className="text-sm text-text-tertiary">Loading...</p>
          ) : (
            <select value={selectedTopic ?? ''} onChange={e => setSelectedTopic(e.target.value)}
              className="w-full bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/40">
              {dossiers.map(d => <option key={d.topic} value={d.topic}>{d.title || d.topic}</option>)}
              {dossiers.length === 0 && <option value="">No published dossiers</option>}
            </select>
          )}
        </div>
        <div className="flex gap-0 border border-border">
          {['all', 'x', 'instagram', 'facebook'].map(p => (
            <button key={p} onClick={() => setPlatformFilter(p)}
              className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border-r border-border last:border-r-0 transition-colors ${platformFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {p === 'all' ? 'All' : p === 'x' ? 'X' : p === 'instagram' ? 'IG' : 'FB'}
            </button>
          ))}
        </div>
      </div>

      {loadingPieces ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading...</p>
      ) : pieces.length === 0 && selectedTopic ? (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary mb-2">No content yet</p>
          <p className="text-sm text-text-secondary">Go to Social Queue in the main admin to generate content for this article.</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          <SocialKanbanColumn title="Draft" count={colDraft.length}
            accentClass="border-text-tertiary/20 text-text-tertiary" emptyText="No raw drafts">
            {colDraft.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
          </SocialKanbanColumn>

          <SocialKanbanColumn title="Needs Design" count={colNeedsDesign.length}
            accentClass="border-violet-400/30 text-violet-400" emptyText="All pieces have designs">
            {colNeedsDesign.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
          </SocialKanbanColumn>

          <SocialKanbanColumn title="QA" count={colQA.length}
            accentClass="border-amber-400/30 text-amber-400" emptyText="No pieces in QA">
            {colQA.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
          </SocialKanbanColumn>

          <SocialKanbanColumn title="Approved" count={colApproved.length}
            accentClass="border-emerald-400/30 text-emerald-400" emptyText="Nothing approved yet">
            {colApproved.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
          </SocialKanbanColumn>

          <SocialKanbanColumn title="Scheduled" count={colScheduled.length}
            accentClass="border-gold/30 text-gold" emptyText="Nothing scheduled">
            {colScheduled.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
          </SocialKanbanColumn>

          <SocialKanbanColumn title="Published" count={colPublished.length}
            accentClass="border-violet-400/20 text-violet-400" emptyText="Nothing published yet">
            {publishedVisible.map(p => <SocialKanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
            {hasMorePublished && (
              <button onClick={() => setPublishedPage(prev => prev + 1)}
                className="w-full font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary hover:text-text-secondary py-2 border border-border/40 transition-colors">
                Show more ({colPublished.length - publishedVisible.length} remaining)
              </button>
            )}
          </SocialKanbanColumn>
        </div>
      )}
    </div>
  );
}

// ── Replies View ───────────────────────────────────────────────────────────────

function RepliesView() {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchStatus, setFetchStatus] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('respond');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadReplies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: 'pending', limit: '100' });
    const res = await fetch(`/api/admin/social/replies?${params}`);
    const data = await res.json();
    setReplies(data.replies ?? []);
    setLoading(false);
    setCurrentIndex(0);
  }, []);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  const filtered = replies.filter(r => priorityFilter === 'all' || r.priority === priorityFilter);
  const current = filtered[currentIndex] ?? null;

  // Reset draft text when current reply changes
  useEffect(() => {
    if (current) {
      setDraftText(current.draft_reply ?? '');
      setEditMode(false);
      setPostError('');
    }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard handler
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        // Allow ⌘Enter to post even when in textarea
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          if (current && draftText.trim() && draftText.length <= 280 && !posting) {
            handlePost();
          }
        }
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setCurrentIndex(i => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setCurrentIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (current) handleSkip(current.id);
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditMode(true);
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, filtered.length, draftText, posting]);

  function updateReply(id: string, updates: Partial<Reply>) {
    setReplies(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  async function handleSkip(id: string) {
    await fetch('/api/admin/social/replies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reply_status: 'skipped' }),
    });
    updateReply(id, { reply_status: 'skipped' });
    setCurrentIndex(i => Math.min(i, filtered.length - 2));
  }

  async function saveDraft(id: string, text: string) {
    setSavingDraft(true);
    await fetch('/api/admin/social/replies', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, draft_reply: text }),
    });
    updateReply(id, { draft_reply: text });
    setEditMode(false);
    setSavingDraft(false);
  }

  async function handlePost() {
    if (!current || !draftText.trim() || draftText.length > 280) return;
    setPosting(true);
    setPostError('');
    try {
      const res = await fetch('/api/admin/social/replies/respond', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: current.id, text: draftText }),
      });
      const data = await res.json();
      if (res.ok) {
        updateReply(current.id, { reply_status: 'posted', posted_reply_text: draftText, posted_at: new Date().toISOString() });
        setCurrentIndex(i => Math.min(i, filtered.length - 2));
      } else {
        setPostError(data.error ?? 'Post failed');
      }
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Request failed');
    }
    setPosting(false);
  }

  async function fetchFromX() {
    setFetching(true);
    setFetchStatus('Fetching from X...');
    try {
      const res = await fetch('/api/admin/social/replies', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFetchStatus(`${data.new} new replies. Respond: ${data.by_priority?.respond ?? 0}, Consider: ${data.by_priority?.consider ?? 0}`);
        await loadReplies();
      } else {
        setFetchStatus(`Error: ${data.error}`);
      }
    } catch { setFetchStatus('Request failed'); }
    setFetching(false);
  }

  const counts = {
    respond:  replies.filter(r => r.priority === 'respond'  && r.reply_status === 'pending').length,
    consider: replies.filter(r => r.priority === 'consider' && r.reply_status === 'pending').length,
    posted:   replies.filter(r => r.reply_status === 'posted').length,
  };

  const overLimit = draftText.length > 280;

  return (
    <div className="space-y-4">
      {/* Header + fetch */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-4">
          <div>
            <span className="font-serif text-xl text-emerald-400">{counts.respond}</span>
            <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Respond</p>
          </div>
          <div>
            <span className="font-serif text-xl text-amber-400">{counts.consider}</span>
            <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Consider</p>
          </div>
          <div>
            <span className="font-serif text-xl text-violet-400">{counts.posted}</span>
            <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Posted</p>
          </div>
        </div>
        <button onClick={fetchFromX} disabled={fetching}
          className="ml-auto font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
          {fetching ? 'Fetching...' : '↓ Fetch from X'}
        </button>
      </div>

      {fetchStatus && <p className="font-mono text-[var(--admin-label-sm)] text-text-secondary border-l-2 border-gold/40 pl-3">{fetchStatus}</p>}

      {/* Keyboard hint bar */}
      <div className="flex items-center gap-4 border border-border/40 bg-ground-light/20 px-3 py-2">
        {[
          ['J', 'next'],
          ['K', 'prev'],
          ['S', 'skip'],
          ['E', 'edit'],
          ['⌘↵', 'post'],
        ].map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <kbd className="font-mono text-[var(--admin-label-xs)] border border-border px-1.5 py-0.5 bg-ground text-text-secondary">{key}</kbd>
            <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">{label}</span>
          </span>
        ))}
        {filtered.length > 0 && (
          <span className="ml-auto font-mono text-[var(--admin-label-sm)] text-text-tertiary">
            {currentIndex + 1} / {filtered.length}
          </span>
        )}
      </div>

      {/* Priority filter */}
      <div className="flex gap-0 border border-border w-fit">
        {(['respond', 'consider', 'all'] as const).map(p => (
          <button key={p} onClick={() => { setPriorityFilter(p); setCurrentIndex(0); }}
            className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border-r border-border last:border-r-0 transition-colors ${priorityFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary">
            {replies.length === 0 ? 'No replies yet' : 'Nothing in this queue'}
          </p>
        </div>
      ) : current ? (
        <div className="grid grid-cols-[1fr_280px] gap-4">
          {/* Current reply — main focus */}
          <div className={`border rounded p-5 space-y-4 ${
            current.priority === 'respond' ? 'border-emerald-400/30 bg-emerald-400/3' :
            current.priority === 'consider' ? 'border-amber-400/20' : 'border-border'
          }`}>
            {/* Priority + metadata */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${
                current.priority === 'respond' ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5' :
                current.priority === 'consider' ? 'text-amber-400 border-amber-400/30 bg-amber-400/5' :
                'text-text-tertiary border-border'
              }`}>
                {current.priority}
              </span>
              <a href={`https://x.com/${current.author_username}`} target="_blank" rel="noopener noreferrer"
                className="font-mono text-[var(--admin-label-sm)] text-sky-400/80 hover:text-sky-400 transition-colors">
                @{current.author_username}
              </a>
              <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary border border-border px-1.5 py-0.5">
                {current.topic.slice(0, 35)}
              </span>
              {current.created_at_x && (
                <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary ml-auto">
                  {new Date(current.created_at_x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>

            {/* Their text */}
            <p className="text-base text-text-primary leading-relaxed">{current.text}</p>

            {current.priority_reason && (
              <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary border-l border-border/50 pl-2 italic">
                {current.priority_reason}
              </p>
            )}

            <a href={`https://x.com/i/web/status/${current.tweet_id}`} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[var(--admin-label-xs)] text-text-tertiary hover:text-sky-400 transition-colors block">
              ↗ View on X
            </a>

            {/* Draft reply */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Draft Reply</span>
                {!editMode && (
                  <button onClick={() => { setEditMode(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                    className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
                    Edit (E)
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-2">
                  <textarea ref={textareaRef}
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    rows={4}
                    className="w-full bg-ground border border-border text-sm text-text-primary p-2 focus:outline-none focus:border-gold/40 resize-none"
                    placeholder="Draft a reply..."
                  />
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[var(--admin-label-sm)] ${overLimit ? 'text-red-400' : 'text-text-tertiary'}`}>
                      {draftText.length}/280
                    </span>
                    <button onClick={() => saveDraft(current.id, draftText)} disabled={savingDraft}
                      className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 disabled:opacity-50 ml-auto">
                      {savingDraft ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditMode(false); setDraftText(current.draft_reply ?? ''); }}
                      className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-border/50 bg-ground-light/20 px-3 py-2 rounded min-h-[60px]">
                  {draftText ? (
                    <>
                      <p className="text-sm text-text-secondary leading-relaxed">{draftText}</p>
                      <span className={`font-mono text-[var(--admin-label-xs)] ${draftText.length > 280 ? 'text-red-400' : 'text-text-tertiary'}`}>
                        {draftText.length}/280
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-text-tertiary italic">No draft — press E to write one</p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handlePost} disabled={posting || !draftText.trim() || overLimit}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 transition-colors disabled:opacity-40">
                {posting ? 'Posting...' : '↑ Post (⌘↵)'}
              </button>
              <button onClick={() => handleSkip(current.id)}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                Skip (S)
              </button>
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={() => setCurrentIndex(i => Math.max(i - 1, 0))} disabled={currentIndex === 0}
                  className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-2 py-1.5 border border-border text-text-tertiary hover:text-text-secondary disabled:opacity-30 transition-colors">
                  ↑ K
                </button>
                <button onClick={() => setCurrentIndex(i => Math.min(i + 1, filtered.length - 1))} disabled={currentIndex >= filtered.length - 1}
                  className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-2 py-1.5 border border-border text-text-tertiary hover:text-text-secondary disabled:opacity-30 transition-colors">
                  ↓ J
                </button>
              </div>
              {postError && <p className="font-mono text-[var(--admin-label-xs)] text-red-400">{postError}</p>}
            </div>
          </div>

          {/* Queue list — compact */}
          <div className="space-y-1 overflow-y-auto max-h-[560px]">
            <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-2">Queue</p>
            {filtered.map((r, i) => (
              <button key={r.id} onClick={() => setCurrentIndex(i)}
                className={`w-full text-left border rounded px-3 py-2 transition-colors ${
                  i === currentIndex
                    ? r.priority === 'respond' ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-gold/40 bg-gold/5'
                    : r.reply_status !== 'pending' ? 'border-border/30 opacity-40' : 'border-border/40 hover:border-border'
                }`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`font-mono text-[var(--admin-label-xs)] ${
                    r.priority === 'respond' ? 'text-emerald-400' :
                    r.priority === 'consider' ? 'text-amber-400' : 'text-text-tertiary'
                  }`}>
                    {r.priority.toUpperCase().slice(0, 3)}
                  </span>
                  <span className="font-mono text-[var(--admin-label-xs)] text-sky-400/70">@{r.author_username}</span>
                  {r.reply_status !== 'pending' && (
                    <span className="font-mono text-[var(--admin-label-xs)] text-violet-400 ml-auto">
                      {r.reply_status === 'posted' ? '✓' : '—'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-tertiary line-clamp-1">{r.text}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Promo View ─────────────────────────────────────────────────────────────────

function PromoView() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', description: '', max_uses: '', duration_days: '', expires_at: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/promo-codes');
    const data = await res.json() as { codes: PromoCode[] };
    setCodes(data.codes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setCreating(true);
    const res = await fetch('/api/admin/promo-codes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        description: form.description || null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
        expires_at: form.expires_at || null,
      }),
    });
    const data = await res.json() as { code?: PromoCode; error?: string };
    setCreating(false);
    if (!res.ok) { setError(data.error ?? 'Failed to create code'); return; }
    setSuccess(`Code "${data.code!.code}" created`);
    setForm({ code: '', description: '', max_uses: '', duration_days: '', expires_at: '' });
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setCodes(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c));
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm(f => ({ ...f, code }));
  }

  function activeBadge(active: boolean) {
    return active
      ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
      : 'text-text-tertiary border-border bg-ground-light';
  }

  return (
    <div className="space-y-10">
      {/* Create form */}
      <section>
        <h2 className="font-mono font-medium text-[var(--admin-label)] text-gold mb-6">Create Promo Code</h2>
        <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Code</label>
              <input value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="LAUNCH2026" required
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40" />
            </div>
            <div className="flex items-end">
              <button type="button" onClick={generateCode}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-2 border border-border text-text-tertiary hover:text-gold hover:border-gold/40 transition-colors">
                Generate
              </button>
            </div>
          </div>
          <div>
            <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Description</label>
            <input value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Influencer collab — April 2026"
              className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Max uses</label>
              <input type="number" value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited" min="1"
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40" />
            </div>
            <div>
              <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Duration (days)</label>
              <input type="number" value={form.duration_days}
                onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))}
                placeholder="Permanent" min="1"
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40" />
            </div>
            <div>
              <label className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1">Code expires</label>
              <input type="date" value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-gold/40" />
            </div>
          </div>
          {error   && <p className="font-mono text-[var(--admin-label-sm)] text-red-400">{error}</p>}
          {success && <p className="font-mono text-[var(--admin-label-sm)] text-emerald-400">{success}</p>}
          <button type="submit" disabled={creating}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-5 py-2 bg-gold text-ground hover:bg-gold/90 transition-colors disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Code'}
          </button>
        </form>
      </section>

      {/* Code list */}
      <section>
        <h2 className="font-mono font-medium text-[var(--admin-label)] text-gold mb-4">All Codes</h2>
        {loading ? (
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Loading...</p>
        ) : codes.length === 0 ? (
          <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">No codes yet.</p>
        ) : (
          <div className="border border-border divide-y divide-border/40">
            <div className="grid grid-cols-[140px_1fr_80px_80px_90px_80px_100px] gap-3 px-4 py-2 bg-ground-light/20">
              {['Code', 'Description', 'Uses', 'Duration', 'Expires', 'Status', ''].map(h => (
                <span key={h} className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">{h}</span>
              ))}
            </div>
            {codes.map(c => {
              const expired = !!(c.expires_at && new Date(c.expires_at) < new Date());
              const isCopied = copied === c.code;
              return (
                <div key={c.id} className="grid grid-cols-[140px_1fr_80px_80px_90px_80px_100px] gap-3 px-4 py-3 items-center hover:bg-ground-light/10 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[var(--admin-label)] text-gold tracking-wider">{c.code}</span>
                    <button
                      onClick={() => copyCode(c.code)}
                      title="Copy code"
                      className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-1.5 py-0.5 border transition-colors shrink-0 ${
                        isCopied
                          ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
                          : 'text-text-tertiary border-border hover:text-gold hover:border-gold/40'
                      }`}
                    >
                      {isCopied ? '✓' : '⎘'}
                    </button>
                  </div>
                  <span className="text-xs text-text-secondary truncate">{c.description ?? '—'}</span>
                  <span className="font-mono text-[var(--admin-label-sm)] text-text-secondary">
                    {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ''}
                  </span>
                  <span className="font-mono text-[var(--admin-label-sm)] text-text-secondary">
                    {c.duration_days ? `${c.duration_days}d` : 'Forever'}
                  </span>
                  <span className={`font-mono text-[var(--admin-label-sm)] ${expired ? 'text-red-400' : 'text-text-tertiary'}`}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                  </span>
                  <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${activeBadge(c.active && !expired)}`}>
                    {!c.active ? 'Disabled' : expired ? 'Expired' : 'Active'}
                  </span>
                  <button onClick={() => toggleActive(c.id, c.active)}
                    className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function DistributionPage() {
  const [view, setView] = useState<DistView>('social');

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={DIST_SIDEBAR_GROUPS}
          activeView={view}
          onSelect={(v) => setView(v as DistView)}
          siteHref="/"
          feedbackHref="/admin/feedback"
        />
      }
    >
      <div className="px-6 py-8 max-w-[1400px]">
        {/* Section heading */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-text-primary">Distribution Desk</h1>
          <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary mt-1">
            {view === 'social'      && 'Social Queue — 6-stage pipeline'}
            {view === 'generate'    && 'Generate & QA — generate content, run QA, schedule'}
            {view === 'calendar'    && 'Calendar — scheduled posts by date'}
            {view === 'replies'     && 'Reply Queue — keyboard-first'}
            {view === 'performance' && 'Performance — engagement analytics'}
            {view === 'promo'       && 'Promo Codes — manage discount codes'}
          </p>
        </div>

        {view === 'social'      && <SocialQueueView />}
        {view === 'generate'    && <GenerateView />}
        {view === 'calendar'    && <SocialCalendar />}
        {view === 'replies'     && <RepliesView />}
        {view === 'performance' && <IntelligenceTab />}
        {view === 'promo'       && <PromoView />}
      </div>
    </AdminShell>
  );
}
