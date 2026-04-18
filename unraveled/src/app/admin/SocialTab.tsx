'use client';

import { useState, useEffect, useCallback } from 'react';
import { SocialCalendar } from './SocialCalendar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QAIssue {
  category: 'spelling' | 'brand' | 'tone' | 'factual' | 'platform' | 'balance';
  severity: 'flag' | 'block';
  description: string;
  suggestion: string;
}

interface QAResult {
  result: 'pass' | 'flag' | 'block';
  issues: QAIssue[];
  summary: string;
}

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

interface DesignBriefSummary {
  visual_note?: string;
  image_prompt?: string;
  identified_subject?: string;
}

interface ContentPiece {
  id: string;
  topic: string;
  platform: 'x' | 'instagram' | 'facebook' | 'youtube';
  content_type: string;
  voice_profile: string;
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
  _qa?: QAResult | null;
  _qaRunning?: boolean;
  _fixing?: boolean;
  _fixError?: string;
  _designs?: DesignVariant[];
  _designRunning?: boolean;
  _designError?: string;
  _designBrief?: DesignBriefSummary;
  _visualQA?: QAResult | null;
  _qaError?: string;
  _publishing?: boolean;
  _publishError?: string;
}

interface Dossier {
  topic: string;
  title: string;
  slug: string | null;
  published: boolean;
  best_convergence_score: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

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

const CHAR_LIMITS: Record<string, number> = {
  x: 280, instagram: 2200, facebook: 63206, youtube: 5000,
};

const DAY_LABELS = ['Day 0 — Publish', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];

const QA_RESULT_COLORS: Record<string, string> = {
  pass: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/5',
  flag: 'text-amber-400 border-amber-400/40 bg-amber-400/5',
  block: 'text-red-400 border-red-400/40 bg-red-400/5',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function charCount(text: string, platform: string) {
  const limit = CHAR_LIMITS[platform] ?? 9999;
  return { count: text.length, limit, over: text.length > limit };
}

function fmtScheduled(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET';
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ThreadPreview({ posts }: { posts: string[] }) {
  return (
    <div className="space-y-2 mt-3">
      {posts.map((post, i) => (
        <div key={i} className="flex gap-2">
          <span className="font-mono text-[9px] text-text-tertiary shrink-0 mt-0.5 w-5">{i + 1}</span>
          <div className="flex-1">
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{post}</p>
            <span className={`font-mono text-[8px] ${post.length > CHAR_LIMITS.x ? 'text-red-400' : 'text-text-tertiary'}`}>
              {post.length}/{CHAR_LIMITS.x}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CarouselPreview({ slides }: { slides: { header?: string; body: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="mt-3">
      <div className="border border-border bg-ground p-4 rounded min-h-[80px] flex flex-col justify-center">
        {slides[active]?.header && (
          <p className="font-mono text-[9px] tracking-widest uppercase text-gold mb-1">{slides[active].header}</p>
        )}
        <p className="text-sm text-text-primary">{slides[active]?.body}</p>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`w-4 h-1 rounded-full transition-colors ${i === active ? 'bg-gold' : 'bg-border'}`} />
        ))}
        <span className="font-mono text-[9px] text-text-tertiary ml-2">{active + 1}/{slides.length}</span>
      </div>
    </div>
  );
}

function DesignGallery({
  variants, brief, visualQA, onSelect, onRedesignWithPrompt,
}: {
  variants: DesignVariant[];
  brief?: DesignBriefSummary;
  visualQA?: QAResult | null;
  onSelect: (id: string) => void;
  onRedesignWithPrompt?: (prompt: string) => void;
}) {
  const [active, setActive] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null);
  if (variants.length === 0) return null;

  const current = variants[active];
  const paddingBottom = `${((current.height / current.width) * 100).toFixed(4)}%`;
  const qaColor = visualQA
    ? visualQA.result === 'pass' ? 'text-emerald-400 border-emerald-400/40'
    : visualQA.result === 'flag' ? 'text-amber-400 border-amber-400/40'
    : 'text-red-400 border-red-400/40' : '';
  const qaLabel = visualQA
    ? visualQA.result === 'pass' ? '✓ QA Pass'
    : visualQA.result === 'flag' ? '⚑ QA Flag' : '✗ QA Block' : '';

  return (
    <div className="mt-3 space-y-2">
      <div className="border border-border bg-ground overflow-hidden relative" style={{ paddingBottom }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.image_url} alt={current.variant_label}
          className="absolute inset-0 w-full h-full object-cover" />
      </div>
      {variants.length > 1 && (
        <div className="flex items-center gap-2">
          {variants.map((v, i) => (
            <button key={v.id} onClick={() => setActive(i)}
              className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ${i === active ? 'border-gold/40 text-gold bg-gold/5' : 'border-border text-text-tertiary hover:text-text-secondary'}`}>
              {v.variant_label}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[8px] text-text-tertiary">{current.template_type} · {current.width}x{current.height}</span>
        {visualQA && (
          <button onClick={() => setShowQA(!showQA)}
            className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${qaColor}`}>
            {qaLabel}
          </button>
        )}
        <button onClick={() => onSelect(current.id)}
          className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ml-auto ${current.selected ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/5' : 'border-border text-text-tertiary hover:text-gold'}`}>
          {current.selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
      {visualQA && showQA && (
        <div className={`border px-3 py-2 space-y-1 ${visualQA.result === 'pass' ? 'border-emerald-400/20 bg-emerald-400/3' : visualQA.result === 'flag' ? 'border-amber-400/20 bg-amber-400/3' : 'border-red-400/20 bg-red-400/3'}`}>
          <p className="font-mono text-[8px] text-text-secondary">{visualQA.summary}</p>
          {visualQA.issues.map((issue, i) => (
            <div key={i} className="pl-2 border-l border-border/50">
              <p className={`font-mono text-[8px] ${issue.severity === 'block' ? 'text-red-400' : 'text-amber-400'}`}>[{issue.category}] {issue.description}</p>
              {issue.suggestion && <p className="font-mono text-[8px] text-text-tertiary mt-0.5">{issue.suggestion}</p>}
            </div>
          ))}
        </div>
      )}
      {brief?.visual_note && <p className="font-mono text-[8px] text-text-tertiary border-l border-gold/30 pl-2 italic">{brief.visual_note}</p>}
      {brief?.identified_subject && (
        <p className="font-mono text-[8px] text-text-tertiary border-l border-border pl-2">
          <span className="text-text-tertiary/60">Identified: </span>{brief.identified_subject}
        </p>
      )}
      {brief?.image_prompt && (
        <div>
          <button onClick={() => { setShowPrompt(!showPrompt); if (!showPrompt && editedPrompt === null) setEditedPrompt(brief.image_prompt ?? ''); }}
            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
            {showPrompt ? '↑ Hide image prompt' : '↓ Edit image prompt'}
          </button>
          {showPrompt && (
            <div className="mt-1 space-y-1">
              <textarea value={editedPrompt ?? brief.image_prompt} onChange={e => setEditedPrompt(e.target.value)}
                rows={6} className="w-full border border-border/50 bg-ground-light/30 p-2 font-mono text-[8px] text-text-secondary leading-relaxed resize-y focus:outline-none focus:border-gold/40" />
              <div className="flex items-center gap-2">
                <button onClick={() => setEditedPrompt(brief.image_prompt ?? '')}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">Reset</button>
                {onRedesignWithPrompt && (
                  <button onClick={() => onRedesignWithPrompt(editedPrompt ?? brief.image_prompt ?? '')}
                    className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-gold/40 text-gold hover:bg-gold/5 transition-colors ml-auto">
                    Redesign with this prompt
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QADisplay({ qa }: { qa: QAResult }) {
  const [showIssues, setShowIssues] = useState(false);
  const label = qa.result === 'pass' ? '✓ QA PASS' : qa.result === 'flag' ? '⚑ QA FLAG' : '✗ QA BLOCK';
  return (
    <div className={`mt-3 border rounded px-3 py-2 ${QA_RESULT_COLORS[qa.result]}`}>
      <div className="flex items-start gap-2">
        <span className={`font-mono text-[8px] uppercase tracking-widest shrink-0 ${QA_RESULT_COLORS[qa.result]}`}>{label}</span>
        <p className="font-mono text-[9px] text-text-secondary flex-1 leading-relaxed">{qa.summary}</p>
        {qa.issues.length > 0 && (
          <button onClick={() => setShowIssues(!showIssues)}
            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary shrink-0 transition-colors">
            {showIssues ? 'Hide' : `${qa.issues.length} issue${qa.issues.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
      {showIssues && qa.issues.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-current/20 pt-2">
          {qa.issues.map((issue, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0 self-start mt-0.5 ${issue.severity === 'block' ? 'text-red-400 border-red-400/40' : 'text-amber-400 border-amber-400/40'}`}>
                {issue.severity}
              </span>
              <div>
                <span className="font-mono text-[8px] text-text-tertiary uppercase">{issue.category}: </span>
                <span className="font-mono text-[8px] text-text-secondary">{issue.description}</span>
                {issue.suggestion && <p className="font-mono text-[8px] text-text-tertiary mt-0.5">to {issue.suggestion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function PublishConfirmModal({ piece, onConfirm, onCancel }: {
  piece: ContentPiece; onConfirm: () => void; onCancel: () => void;
}) {
  const posts = piece.supplementary?.posts ?? [];
  const tweetCount = posts.length > 0 ? posts.length : 1;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-ground border border-sky-400/30 p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-sky-400">Confirm Post to X</h3>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ${PLATFORM_COLORS[piece.platform]}`}>
              {PLATFORM_LABELS[piece.platform]}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-widest border border-border px-1.5 py-0.5 text-text-tertiary">
              {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}
            </span>
            {tweetCount > 1 && (
              <span className="font-mono text-[8px] border border-amber-400/40 text-amber-400 px-1.5 py-0.5">{tweetCount} tweets</span>
            )}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">{posts[0] ?? piece.text_content}</p>
          {tweetCount > 1 && (
            <p className="font-mono text-[9px] text-amber-400/70">This will post a thread of {tweetCount} tweets to X immediately.</p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onConfirm}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 transition-colors flex-1">
            Post Now
          </button>
          <button onClick={onCancel}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
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
    iso.setUTCHours(hour + 5, 0, 0, 0); // ET = UTC-5
    onConfirm(iso.toISOString());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-ground border border-gold/30 p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-gold">Schedule Post</h3>
        <p className="font-mono text-[9px] text-text-tertiary">
          {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type} · {PLATFORM_LABELS[piece.platform]}
        </p>
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-ground-light border border-border px-2 py-1.5 text-sm text-text-primary font-mono focus:outline-none focus:border-gold/40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Time (ET)</label>
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
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors flex-1">
            Lock In
          </button>
          <button onClick={onCancel}
            className="font-mono text-[9px] uppercase tracking-widest px-4 py-2 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Card (full detail, for Draft tab) ──────────────────────────────────

function ReviewCard({
  piece, onUpdate, onRunQA, onRunDesign, onSelectDesignVariant, onAutoFix, onRedesignWithPrompt, onSetStatus,
}: {
  piece: ContentPiece;
  onUpdate: (id: string, updates: Partial<ContentPiece>) => void;
  onRunQA: (id: string) => void;
  onRunDesign: (id: string) => void;
  onSelectDesignVariant: (pieceId: string, variantId: string) => void;
  onAutoFix: (id: string) => void;
  onRedesignWithPrompt: (pieceId: string, prompt: string) => void;
  onSetStatus: (id: string, status: ContentPiece['status']) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(piece.text_content);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cc = charCount(editText, piece.platform);
  const posts = piece.supplementary?.posts ?? [];
  const slides = piece.supplementary?.slides ?? [];

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: piece.id, text_content: editText }),
    });
    if (res.ok) { onUpdate(piece.id, { text_content: editText }); setEditing(false); }
    setSaving(false);
  }

  return (
    <div className={`border rounded p-4 ${piece.status === 'rejected' ? 'border-red-400/10 opacity-50' : 'border-border bg-ground-light/20'}`}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ${PLATFORM_COLORS[piece.platform]}`}>
          {PLATFORM_LABELS[piece.platform]}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-widest border border-border px-1.5 py-0.5 text-text-tertiary">
          {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}
        </span>
        <span className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5">
          {DAY_LABELS[piece.day_offset] ?? `Day ${piece.day_offset}`}
        </span>
        {posts.length > 1 && (
          <span className="font-mono text-[8px] border border-amber-400/40 text-amber-400 px-1.5 py-0.5">
            {posts.length} tweets
          </span>
        )}
      </div>

      {/* Text */}
      {editing ? (
        <div className="space-y-2">
          <textarea value={editText} onChange={e => setEditText(e.target.value)}
            className="w-full bg-ground border border-border text-sm text-text-primary p-2 focus:outline-none focus:border-gold/40 resize-none min-h-[120px]" />
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[9px] ${cc.over ? 'text-red-400' : 'text-text-tertiary'}`}>
              {cc.count}{cc.limit < 9999 ? `/${cc.limit}` : ''} chars
            </span>
            <button onClick={save} disabled={saving}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors ml-auto disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setEditText(piece.text_content); }}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className={`text-sm text-text-secondary leading-relaxed whitespace-pre-wrap ${!expanded ? 'line-clamp-4' : ''}`}>
            {piece.text_content}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`font-mono text-[9px] ${cc.over ? 'text-red-400' : 'text-text-tertiary'}`}>
              {cc.count}{cc.limit < 9999 ? `/${cc.limit}` : ''} chars
            </span>
            {(posts.length > 0 || slides.length > 0) && (
              <button onClick={() => setExpanded(!expanded)}
                className="font-mono text-[9px] text-text-tertiary hover:text-gold transition-colors">
                {expanded
                  ? '↑ Collapse'
                  : `↓ Preview ${posts.length > 0 ? `thread (${posts.length} posts)` : `carousel (${slides.length} slides)`}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thread / carousel preview */}
      {!editing && posts.length > 0 && expanded && <ThreadPreview posts={posts} />}
      {!editing && slides.length > 0 && expanded && <CarouselPreview slides={slides} />}

      {/* Design gallery */}
      {piece._designs && piece._designs.length > 0 && (
        <DesignGallery
          variants={piece._designs}
          brief={piece._designBrief}
          visualQA={piece._visualQA}
          onSelect={(variantId) => onSelectDesignVariant(piece.id, variantId)}
          onRedesignWithPrompt={(prompt) => onRedesignWithPrompt(piece.id, prompt)}
        />
      )}
      {piece._designError && (
        <p className="font-mono text-[9px] text-red-400 mt-2 border border-red-400/20 px-2 py-1">{piece._designError}</p>
      )}

      {/* QA */}
      {piece._qa && <QADisplay qa={piece._qa} />}

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
        <button onClick={() => setEditing(true)}
          className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-gold transition-colors">
          Edit
        </button>
        <button onClick={() => onRunDesign(piece.id)} disabled={piece._designRunning}
          className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1 border transition-colors disabled:opacity-50 ${piece._designs?.length ? 'border-violet-400/30 text-violet-400/70 hover:text-violet-400' : 'border-border text-text-tertiary hover:text-text-secondary'}`}>
          {piece._designRunning ? 'Designing...' : piece._designs?.length ? 'Redesign' : 'Design'}
        </button>
        <button onClick={() => onRunQA(piece.id)} disabled={piece._qaRunning}
          className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1 border transition-colors disabled:opacity-50 ${
            piece._qa
              ? piece._qa.result === 'pass' ? 'border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400'
              : piece._qa.result === 'block' ? 'border-red-400/30 text-red-400/70 hover:text-red-400'
              : 'border-amber-400/30 text-amber-400/70 hover:text-amber-400'
              : 'border-border text-text-tertiary hover:text-text-secondary'}`}>
          {piece._qaRunning ? 'Running QA...' : piece._qa ? 'Re-run QA' : 'Run QA'}
        </button>
        {piece._qa && piece._qa.result !== 'pass' && (
          <button onClick={() => onAutoFix(piece.id)} disabled={piece._fixing}
            className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50">
            {piece._fixing ? 'Fixing...' : 'Auto-fix'}
          </button>
        )}
        {piece._qaError && <p className="w-full font-mono text-[8px] text-red-400">QA error: {piece._qaError}</p>}
        {piece._fixError && <p className="w-full font-mono text-[8px] text-red-400">{piece._fixError}</p>}

        <div className="flex gap-2 ml-auto">
          {piece.status === 'draft' && (
            <button onClick={() => onSetStatus(piece.id, 'approved')}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20 transition-colors">
              Approve
            </button>
          )}
          {piece.status !== 'rejected' && (
            <button onClick={() => onSetStatus(piece.id, 'rejected')}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors">
              Reject
            </button>
          )}
          {piece.status === 'rejected' && (
            <button onClick={() => onSetStatus(piece.id, 'draft')}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pipeline Kanban ───────────────────────────────────────────────────────────

function KanbanCard({
  piece, onUpdate, onRunQA, onRunDesign, onSelectDesignVariant, onPublish,
  onAutoFix, onRedesignWithPrompt, onSchedule, onUnschedule, onSetStatus,
}: {
  piece: ContentPiece;
  onUpdate: (id: string, updates: Partial<ContentPiece>) => void;
  onRunQA: (id: string) => void;
  onRunDesign: (id: string) => void;
  onSelectDesignVariant: (pieceId: string, variantId: string) => void;
  onPublish: (id: string) => void;
  onAutoFix: (id: string) => void;
  onRedesignWithPrompt: (pieceId: string, prompt: string) => void;
  onSchedule: (id: string) => void;
  onUnschedule: (id: string) => void;
  onSetStatus: (id: string, status: ContentPiece['status']) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(piece.text_content);
  const [saving, setSaving] = useState(false);

  const posts = piece.supplementary?.posts ?? [];
  const slides = piece.supplementary?.slides ?? [];
  const selectedDesign = piece._designs?.find(d => d.selected);
  const cc = charCount(editText, piece.platform);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: piece.id, text_content: editText }),
    });
    if (res.ok) { onUpdate(piece.id, { text_content: editText }); setEditing(false); }
    setSaving(false);
  }

  return (
    <div className={`border rounded bg-ground-light/10 transition-colors ${
      piece.status === 'scheduled' ? 'border-gold/30' :
      piece.status === 'published' ? 'border-violet-400/20' :
      'border-emerald-400/20'
    }`}>
      {/* Compact header */}
      <div className="p-3 cursor-pointer" onClick={() => !editing && setExpanded(!expanded)}>
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0.5 shrink-0 ${PLATFORM_COLORS[piece.platform]}`}>
            {piece.platform === 'x' ? 'X' : piece.platform === 'instagram' ? 'IG' : piece.platform === 'facebook' ? 'FB' : piece.platform}
          </span>
          {posts.length > 1 && (
            <span className="font-mono text-[7px] border border-amber-400/40 text-amber-400 px-1 py-0.5 shrink-0">
              {posts.length} tweets
            </span>
          )}
          <span className="font-mono text-[7px] text-text-tertiary ml-auto">Day {piece.day_offset}</span>
        </div>
        <p className="font-mono text-[8px] uppercase tracking-widest text-text-secondary mb-1">
          {CONTENT_TYPE_LABELS[piece.content_type] ?? piece.content_type}
        </p>
        <p className="text-xs text-text-tertiary leading-snug line-clamp-2">{posts[0] ?? piece.text_content}</p>
        {piece.scheduled_at && (
          <p className="font-mono text-[7px] text-gold/80 mt-1.5">{fmtScheduled(piece.scheduled_at)}</p>
        )}
        {selectedDesign && !expanded && (
          <div className="mt-2 border border-border overflow-hidden relative" style={{ paddingBottom: '28%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedDesign.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}
        {piece._qa && (
          <p className={`mt-1 font-mono text-[7px] uppercase ${piece._qa.result === 'pass' ? 'text-emerald-400' : piece._qa.result === 'flag' ? 'text-amber-400' : 'text-red-400'}`}>
            {piece._qa.result === 'pass' ? '✓ QA' : piece._qa.result === 'flag' ? '⚑ QA Flag' : '✗ QA Block'}
          </p>
        )}
        <p className="font-mono text-[7px] text-text-tertiary/40 mt-1">{expanded ? '↑ collapse' : '↓ expand'}</p>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/40 pt-3 space-y-3">
          {editing ? (
            <div className="space-y-2">
              <textarea value={editText} onChange={e => setEditText(e.target.value)}
                className="w-full bg-ground border border-border text-sm text-text-primary p-2 focus:outline-none focus:border-gold/40 resize-none min-h-[100px]" />
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[9px] ${cc.over ? 'text-red-400' : 'text-text-tertiary'}`}>
                  {cc.count}{cc.limit < 9999 ? `/${cc.limit}` : ''} chars
                </span>
                <button onClick={save} disabled={saving}
                  className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 ml-auto disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(false); setEditText(piece.text_content); }}
                  className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{piece.text_content}</p>
          )}
          {!editing && posts.length > 0 && <ThreadPreview posts={posts} />}
          {!editing && slides.length > 0 && <CarouselPreview slides={slides} />}
          {piece._designs && piece._designs.length > 0 && (
            <DesignGallery variants={piece._designs} brief={piece._designBrief} visualQA={piece._visualQA}
              onSelect={(vid) => onSelectDesignVariant(piece.id, vid)}
              onRedesignWithPrompt={(p) => onRedesignWithPrompt(piece.id, p)} />
          )}
          {piece._qa && <QADisplay qa={piece._qa} />}
          {piece.status === 'published' && piece.supplementary?.published_tweet_url && (
            <a href={piece.supplementary.published_tweet_url} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[9px] uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors block">
              View on X
            </a>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
            {piece.status !== 'published' && (
              <>
                <button onClick={() => setEditing(true)}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-gold transition-colors">Edit</button>
                <button onClick={() => onRunDesign(piece.id)} disabled={piece._designRunning}
                  className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors disabled:opacity-50 ${piece._designs?.length ? 'border-violet-400/30 text-violet-400/70 hover:text-violet-400' : 'border-border text-text-tertiary hover:text-text-secondary'}`}>
                  {piece._designRunning ? 'Designing...' : piece._designs?.length ? 'Redesign' : 'Design'}
                </button>
                <button onClick={() => onRunQA(piece.id)} disabled={piece._qaRunning}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50">
                  {piece._qaRunning ? 'QA...' : piece._qa ? 'Re-QA' : 'QA'}
                </button>
                {piece._qa && piece._qa.result !== 'pass' && (
                  <button onClick={() => onAutoFix(piece.id)} disabled={piece._fixing}
                    className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 disabled:opacity-50">
                    {piece._fixing ? 'Fixing...' : 'Auto-fix'}
                  </button>
                )}
              </>
            )}

            {piece.status === 'approved' && (
              <>
                <button onClick={() => onSetStatus(piece.id, 'draft')}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                  Unapprove
                </button>
                <button onClick={() => onSchedule(piece.id)}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors ml-auto">
                  Schedule
                </button>
                {piece.platform === 'x' && (
                  <button onClick={() => onPublish(piece.id)} disabled={piece._publishing}
                    className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 disabled:opacity-50">
                    {piece._publishing ? 'Posting...' : 'Post Now'}
                  </button>
                )}
              </>
            )}
            {piece.status === 'scheduled' && (
              <>
                <button onClick={() => onUnschedule(piece.id)}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
                  Unschedule
                </button>
                {piece.platform === 'x' && (
                  <button onClick={() => onPublish(piece.id)} disabled={piece._publishing}
                    className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 disabled:opacity-50 ml-auto">
                    {piece._publishing ? 'Posting...' : 'Post Now'}
                  </button>
                )}
              </>
            )}
            {piece._publishError && <p className="w-full font-mono text-[8px] text-red-400">{piece._publishError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({ title, count, accentClass, emptyText, children }: {
  title: string; count: number; accentClass: string; emptyText: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2 border-b mb-3 ${accentClass}`}>
        <span className="font-mono text-[9px] uppercase tracking-widest">{title}</span>
        <span className="font-mono text-[9px] opacity-60">{count}</span>
      </div>
      <div className="space-y-2 flex-1">
        {count === 0
          ? <p className="font-mono text-[8px] text-text-tertiary/40 text-center py-8">{emptyText}</p>
          : children}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function SocialTab() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(true);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'review' | 'pipeline' | 'calendar'>('review');

  // Modals
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [scheduleModalId, setScheduleModalId] = useState<string | null>(null);

  // Global scheduler
  const [globalDate, setGlobalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [globalSlots, setGlobalSlots] = useState(2);
  const [globalScheduling, setGlobalScheduling] = useState(false);
  const [globalStatus, setGlobalStatus] = useState('');
  const [showGlobalPanel, setShowGlobalPanel] = useState(false);
  const [globalPlatforms, setGlobalPlatforms] = useState<string[]>(['x', 'instagram', 'facebook']);
  const [bufferTestResult, setBufferTestResult] = useState<string | null>(null);
  const [bufferTesting, setBufferTesting] = useState(false);

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

  async function generate() {
    if (!selectedTopic) return;
    setGenerating(true);
    setGenerateStatus('Running Claude content generation... (~60s)');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic }),
      });
      const data = await res.json();
      if (!res.ok) setGenerateStatus(`Error: ${data.error}`);
      else { setGenerateStatus(`Generated ${data.pieces_generated} pieces`); await loadPieces(selectedTopic); }
    } catch { setGenerateStatus('Request failed'); }
    setGenerating(false);
  }

  function updatePiece(id: string, updates: Partial<ContentPiece>) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  async function setStatus(id: string, status: ContentPiece['status']) {
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      updatePiece(id, { status });
    }
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

  async function runDesignForPiece(pieceId: string, imagePromptOverride?: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: true, _designError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/design', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId, image_prompt_override: imagePromptOverride }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => p.id !== pieceId ? p : {
          ...p, _designs: data.variants, _designRunning: false, _designError: undefined,
          _designBrief: data.brief ? { visual_note: data.brief.visual_note, image_prompt: data.brief.image_prompt, identified_subject: data.identified_subject ?? undefined } : undefined,
          _visualQA: data.visual_qa ?? null,
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: false, _designError: data.error ?? 'Design failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: false, _designError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function selectDesignVariant(pieceId: string, variantId: string) {
    setPieces(prev => prev.map(p => p.id !== pieceId ? p : { ...p, _designs: p._designs?.map(v => ({ ...v, selected: v.id === variantId })) }));
    await fetch('/api/admin/social/design/select', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piece_id: pieceId, variant_id: variantId }),
    });
  }

  async function runQAForPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: true } : p));
    try {
      // Fetch the selected design image and encode as base64 for visual QA
      const piece = pieces.find(p => p.id === pieceId);
      const selectedDesign = piece?._designs?.find(d => d.selected) ?? piece?._designs?.[0];
      let image_base64: string | undefined;
      let image_mime: string | undefined;
      if (selectedDesign?.image_url) {
        try {
          const imgRes = await fetch(selectedDesign.image_url);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            image_base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            image_mime = imgRes.headers.get('content-type') ?? 'image/png';
          }
        } catch { /* skip image if fetch fails */ }
      }

      const res = await fetch('/api/admin/social/qa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId, image_base64, image_mime }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => {
          if (p.id !== pieceId) return p;
          const updates: Partial<ContentPiece> = { _qa: data.qa, _qaRunning: false, _qaError: undefined };
          if (data.auto_rejected) updates.status = 'rejected';
          return { ...p, ...updates };
        }));
      } else {
        const errMsg = data.error ?? `HTTP ${res.status}`;
        console.error('[QA] failed:', errMsg);
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: false, _qaError: errMsg } : p));
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[QA] exception:', errMsg);
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: false, _qaError: errMsg } : p));
    }
  }

  async function autoFixPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: true, _fixError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/fix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => p.id !== pieceId ? p : {
          ...p, text_content: data.text_content, supplementary: data.supplementary ?? p.supplementary,
          status: 'draft', _qa: null, _fixing: false, _fixError: undefined,
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: false, _fixError: data.error ?? 'Auto-fix failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: false, _fixError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function publishPiece(pieceId: string) {
    setPublishConfirmId(null);
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: true, _publishError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => p.id !== pieceId ? p : {
          ...p, status: 'published', _publishing: false, _publishError: undefined,
          supplementary: { ...(p.supplementary ?? {}), published_tweet_ids: data.tweet_ids, published_tweet_url: data.tweet_url },
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: false, _publishError: data.error ?? 'Post failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: false, _publishError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function approveAll() {
    const drafts = filtered.filter(p => p.status === 'draft');
    await Promise.all(drafts.map(p =>
      fetch('/api/admin/social/pieces', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: 'approved' }),
      })
    ));
    setPieces(prev => prev.map(p => drafts.find(d => d.id === p.id) ? { ...p, status: 'approved' } : p));
    setActiveTab('pipeline');
  }

  async function scheduleGlobal() {
    setGlobalScheduling(true);
    setGlobalStatus('Computing global schedule...');
    try {
      const res = await fetch('/api/admin/social/schedule/global', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: globalDate, slots_per_day: globalSlots, platforms: globalPlatforms }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalStatus(`Error: ${data.error}`);
      } else {
        const bufferInfo = data.buffer_queued != null
          ? ` · Buffer: ${data.buffer_queued} queued`
          : '';
        const bufferErrInfo = data.buffer_errors?.length
          ? ` · ${data.buffer_errors.length} Buffer error(s): ${data.buffer_errors[0]?.bufferError ?? ''}`
          : '';
        setGlobalStatus(`Scheduled ${data.total_scheduled} posts across ${data.topics} article${data.topics !== 1 ? 's' : ''} over ${data.days_needed} days${bufferInfo}${bufferErrInfo}`);
        if (selectedTopic) await loadPieces(selectedTopic);
      }
    } catch (err) { setGlobalStatus(`Request failed: ${err instanceof Error ? err.message : String(err)}`); }
    setGlobalScheduling(false);
  }

  async function clearAllSchedules() {
    await fetch('/api/admin/social/schedule/global', { method: 'DELETE' });
    setGlobalStatus('All schedules cleared');
    if (selectedTopic) await loadPieces(selectedTopic);
  }

  async function testBuffer() {
    setBufferTesting(true);
    setBufferTestResult(null);
    try {
      const res = await fetch('/api/admin/social/buffer-test');
      const data = await res.json();
      if (data.channel_query_error) {
        setBufferTestResult(`FAIL (token): ${data.channel_query_error}`);
      } else if (data.draft_post_error) {
        setBufferTestResult(`Token OK, post FAIL: ${data.draft_post_error}`);
      } else if (data.ok) {
        const channels = (data.channels ?? []) as { id: string; service: string; name: string }[];
        const summary = channels.map((c: { service: string; name: string; id: string }) => `${c.service}:${c.name}`).join(', ');
        setBufferTestResult(`OK — channels: ${summary} · draft post: ${JSON.stringify(data.draft_post_test)}`);
      } else {
        setBufferTestResult(`FAIL: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setBufferTestResult(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setBufferTesting(false);
  }

  const filtered = pieces.filter(p => platformFilter === 'all' || p.platform === platformFilter);

  const reviewPieces  = filtered.filter(p => p.status === 'draft' || p.status === 'rejected');
  const pipelineCols  = {
    approved:  filtered.filter(p => p.status === 'approved'),
    scheduled: filtered.filter(p => p.status === 'scheduled'),
    published: filtered.filter(p => p.status === 'published'),
  };

  const counts = {
    draft:     pieces.filter(p => p.status === 'draft').length,
    approved:  pieces.filter(p => p.status === 'approved').length,
    scheduled: pieces.filter(p => p.status === 'scheduled').length,
    published: pieces.filter(p => p.status === 'published').length,
  };

  const publishConfirmPiece = publishConfirmId ? pieces.find(p => p.id === publishConfirmId) ?? null : null;
  const scheduleModalPiece  = scheduleModalId  ? pieces.find(p => p.id === scheduleModalId)  ?? null : null;

  const sharedCardProps = {
    onUpdate: updatePiece,
    onRunQA: runQAForPiece,
    onRunDesign: runDesignForPiece,
    onSelectDesignVariant: selectDesignVariant,
    onPublish: (id: string) => setPublishConfirmId(id),
    onAutoFix: autoFixPiece,
    onRedesignWithPrompt: (id: string, prompt: string) => runDesignForPiece(id, prompt),
    onSchedule: (id: string) => setScheduleModalId(id),
    onUnschedule: unschedulePiece,
    onSetStatus: setStatus,
  };

  return (
    <div className="space-y-5">

      {/* Modals */}
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

      {/* Article selector + generate */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary block mb-1">Article</label>
          {loadingDossiers ? (
            <p className="text-sm text-text-tertiary">Loading...</p>
          ) : (
            <select value={selectedTopic ?? ''} onChange={e => setSelectedTopic(e.target.value)}
              className="w-full bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/40">
              {dossiers.map(d => <option key={d.topic} value={d.topic}>{d.title || d.topic}</option>)}
            </select>
          )}
        </div>
        <button onClick={generate} disabled={generating || !selectedTopic}
          className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50">
          {generating ? 'Generating...' : pieces.length > 0 ? 'Regenerate' : 'Generate Content'}
        </button>
      </div>

      {generateStatus && (
        <p className="font-mono text-[10px] text-text-secondary border-l-2 border-gold/40 pl-3">{generateStatus}</p>
      )}

      {pieces.length > 0 && (
        <>
          {/* Tab switcher */}
          <div className="flex items-center gap-0 border-b border-border">
            <button onClick={() => setActiveTab('review')}
              className={`font-mono text-[10px] uppercase tracking-widest px-5 py-2.5 border-b-2 transition-colors ${activeTab === 'review' ? 'border-gold text-gold' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              Review
              {counts.draft > 0 && (
                <span className="ml-2 font-mono text-[8px] border border-current/30 px-1 py-0.5 rounded">{counts.draft}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('pipeline')}
              className={`font-mono text-[10px] uppercase tracking-widest px-5 py-2.5 border-b-2 transition-colors ${activeTab === 'pipeline' ? 'border-gold text-gold' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              Pipeline
              {(counts.approved + counts.scheduled) > 0 && (
                <span className="ml-2 font-mono text-[8px] border border-current/30 px-1 py-0.5 rounded">
                  {counts.approved + counts.scheduled}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('calendar')}
              className={`font-mono text-[10px] uppercase tracking-widest px-5 py-2.5 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-gold text-gold' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              Calendar
            </button>
          </div>

          {/* Platform filter */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-0 border border-border w-fit">
              {['all', 'x', 'instagram', 'facebook'].map(p => (
                <button key={p} onClick={() => setPlatformFilter(p)}
                  className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${platformFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
                  {p === 'all' ? 'All' : PLATFORM_LABELS[p]}
                </button>
              ))}
            </div>
            {/* Batch actions per tab */}
            {activeTab === 'review' && counts.draft > 0 && (
              <button onClick={approveAll}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 transition-colors ml-auto">
                Approve All Drafts ({counts.draft})
              </button>
            )}
            {activeTab === 'pipeline' && (
              <button onClick={() => setShowGlobalPanel(!showGlobalPanel)}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-sky-400/20 text-sky-400/70 hover:text-sky-400 transition-colors ml-auto">
                Global Schedule
              </button>
            )}
          </div>

          {/* Global scheduler panel (Pipeline tab only) */}
          {activeTab === 'pipeline' && showGlobalPanel && (
            <div className="border border-sky-400/20 bg-sky-400/3 px-4 py-4 space-y-3">
              <p className="font-mono text-[9px] text-text-tertiary">
                Schedules approved posts across every article. X posts via cron; Instagram and Facebook queued in Buffer.
              </p>
              {/* Platform selector */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Platforms:</span>
                {(['x', 'instagram', 'facebook'] as const).map(p => {
                  const active = globalPlatforms.includes(p);
                  const label = p === 'x' ? 'X / Twitter' : p === 'instagram' ? 'Instagram' : 'Facebook';
                  const color = p === 'x' ? 'border-sky-400/40 text-sky-400 bg-sky-400/10' : p === 'instagram' ? 'border-pink-400/40 text-pink-400 bg-pink-400/10' : 'border-blue-400/40 text-blue-400 bg-blue-400/10';
                  return (
                    <button key={p} onClick={() => setGlobalPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ${active ? color : 'border-border text-text-tertiary'}`}>
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Start Date</label>
                  <input type="date" value={globalDate} onChange={e => setGlobalDate(e.target.value)}
                    className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-sky-400/40" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Posts Per Day</label>
                  <select value={globalSlots} onChange={e => setGlobalSlots(parseInt(e.target.value))}
                    className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-sky-400/40">
                    <option value={1}>1 per day</option>
                    <option value={2}>2 per day (recommended)</option>
                    <option value={3}>3 per day</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={scheduleGlobal} disabled={globalScheduling}
                    className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 disabled:opacity-50">
                    {globalScheduling ? 'Scheduling...' : 'Schedule All Articles'}
                  </button>
                  <button onClick={clearAllSchedules}
                    className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40">
                    Clear All
                  </button>
                </div>
              </div>
              {globalStatus && <p className="font-mono text-[9px] text-text-secondary border-l-2 border-sky-400/40 pl-3">{globalStatus}</p>}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={testBuffer} disabled={bufferTesting}
                  className="font-mono text-[8px] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-text-secondary disabled:opacity-50">
                  {bufferTesting ? 'Testing...' : 'Test Buffer Connection'}
                </button>
                {bufferTestResult && (
                  <p className={`font-mono text-[8px] flex-1 ${bufferTestResult.startsWith('OK') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bufferTestResult}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab content */}
          {activeTab === 'calendar' ? (
            <SocialCalendar />
          ) : loadingPieces ? (
            <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading...</p>
          ) : activeTab === 'review' ? (
            /* ── Review tab: full detail cards ── */
            reviewPieces.length === 0 ? (
              <div className="border border-border bg-ground-light/20 p-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">All caught up</p>
                <p className="text-sm text-text-secondary">No drafts to review. Switch to Pipeline to schedule and publish.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewPieces.map(piece => (
                  <ReviewCard key={piece.id} piece={piece} {...sharedCardProps} />
                ))}
              </div>
            )
          ) : (
            /* ── Pipeline tab: Kanban board ── */
            <div className="flex gap-4 overflow-x-auto pb-4">
              <KanbanColumn title="Approved" count={pipelineCols.approved.length}
                accentClass="border-emerald-400/30 text-emerald-400" emptyText="Nothing approved yet -- go to Review">
                {pipelineCols.approved.map(p => <KanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
              </KanbanColumn>
              <KanbanColumn title="Scheduled" count={pipelineCols.scheduled.length}
                accentClass="border-gold/30 text-gold" emptyText="Approve a piece then lock in a date">
                {pipelineCols.scheduled.map(p => <KanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
              </KanbanColumn>
              <KanbanColumn title="Published" count={pipelineCols.published.length}
                accentClass="border-violet-400/20 text-violet-400" emptyText="Nothing published yet">
                {pipelineCols.published.map(p => <KanbanCard key={p.id} piece={p} {...sharedCardProps} />)}
              </KanbanColumn>
            </div>
          )}
        </>
      )}

      {!loadingPieces && pieces.length === 0 && (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-2">No content yet</p>
          <p className="text-sm text-text-secondary">Select an article and click Generate Content.</p>
        </div>
      )}
    </div>
  );
}
