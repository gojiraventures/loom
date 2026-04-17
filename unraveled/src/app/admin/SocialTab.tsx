'use client';

import { useState, useEffect, useCallback } from 'react';

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
  // Client-side only — loaded separately
  _qa?: QAResult | null;
  _qaRunning?: boolean;
  _fixing?: boolean;
  _fixError?: string;
  _designs?: DesignVariant[];
  _designRunning?: boolean;
  _designError?: string;
  _designBrief?: DesignBriefSummary;
  _visualQA?: QAResult | null;
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
  x: 'X / Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
};

const PLATFORM_COLORS: Record<string, string> = {
  x: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  instagram: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  facebook: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  youtube: 'text-red-400 border-red-400/30 bg-red-400/5',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-text-tertiary border-border',
  approved: 'text-emerald-400 border-emerald-400/30',
  rejected: 'text-red-400 border-red-400/30',
  scheduled: 'text-gold border-gold/30',
  published: 'text-violet-400 border-violet-400/30',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  launch_thread: 'Launch Thread',
  standalone_surprise: 'Surprise Finding',
  tradition_voice: 'Tradition Voice',
  debate_post: 'Advocate vs Skeptic',
  open_question: 'Open Question',
  score_reveal: 'Score Reveal',
  primary_findings_carousel: 'Primary Findings Carousel',
  tradition_voices_carousel: 'Tradition Voices Carousel',
  advocate_skeptic_carousel: 'Debate Carousel',
  quote_card: 'Quote Card',
  reels_script: 'Reels Script',
  summary_post: 'Summary Post',
  discussion_prompt: 'Discussion Prompt',
  tradition_spotlight: 'Tradition Spotlight',
  link_share: 'Link Share',
};

const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  instagram: 2200,
  facebook: 63206,
  youtube: 5000, // community post / description limit
};

const DAY_LABELS = ['Day 0 — Publish', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'];

const QA_RESULT_COLORS: Record<string, string> = {
  pass: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/5',
  flag: 'text-amber-400 border-amber-400/40 bg-amber-400/5',
  block: 'text-red-400 border-red-400/40 bg-red-400/5',
};

const QA_CATEGORY_LABELS: Record<string, string> = {
  spelling: 'Spelling',
  brand: 'Brand',
  tone: 'Tone',
  factual: 'Factual',
  platform: 'Platform',
  balance: 'Balance',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function charCount(text: string, platform: string): { count: number; limit: number; over: boolean } {
  const limit = CHAR_LIMITS[platform] ?? 9999;
  return { count: text.length, limit, over: text.length > limit };
}

// ── Thread Preview ────────────────────────────────────────────────────────────

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

// ── Carousel Preview ──────────────────────────────────────────────────────────

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
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`w-4 h-1 rounded-full transition-colors ${i === active ? 'bg-gold' : 'bg-border'}`}
          />
        ))}
        <span className="font-mono text-[9px] text-text-tertiary ml-2">{active + 1}/{slides.length}</span>
      </div>
    </div>
  );
}

// ── Design Gallery ────────────────────────────────────────────────────────────

function DesignGallery({
  variants,
  brief,
  visualQA,
  onSelect,
}: {
  variants: DesignVariant[];
  brief?: DesignBriefSummary;
  visualQA?: QAResult | null;
  onSelect: (id: string) => void;
}) {
  const [active, setActive] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showQA, setShowQA] = useState(false);
  if (variants.length === 0) return null;

  const current = variants[active];
  const paddingBottom = `${((current.height / current.width) * 100).toFixed(4)}%`;

  const qaColor = visualQA
    ? visualQA.result === 'pass' ? 'text-emerald-400 border-emerald-400/40'
    : visualQA.result === 'flag' ? 'text-amber-400 border-amber-400/40'
    : 'text-red-400 border-red-400/40'
    : '';
  const qaLabel = visualQA
    ? visualQA.result === 'pass' ? '✓ QA Pass'
    : visualQA.result === 'flag' ? '⚑ QA Flag'
    : '✗ QA Block'
    : '';

  return (
    <div className="mt-3 space-y-2">
      {/* Image preview */}
      <div className="border border-border bg-ground overflow-hidden relative"
        style={{ paddingBottom }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.image_url}
          alt={current.variant_label}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Slide navigation (carousels) */}
      {variants.length > 1 && (
        <div className="flex items-center gap-2">
          {variants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => setActive(i)}
              className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ${i === active ? 'border-gold/40 text-gold bg-gold/5' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
            >
              {v.variant_label}
            </button>
          ))}
        </div>
      )}

      {/* Metadata + QA badge + select */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[8px] text-text-tertiary">
          {current.template_type} · {current.width}×{current.height}
        </span>
        {visualQA && (
          <button
            onClick={() => setShowQA(!showQA)}
            className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${qaColor}`}
          >
            {qaLabel}
          </button>
        )}
        <button
          onClick={() => onSelect(current.id)}
          className={`font-mono text-[8px] uppercase tracking-widest px-2 py-1 border transition-colors ml-auto ${current.selected ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/5' : 'border-border text-text-tertiary hover:text-gold'}`}
        >
          {current.selected ? '✓ Selected' : 'Select'}
        </button>
      </div>

      {/* Visual QA detail */}
      {visualQA && showQA && (
        <div className={`border px-3 py-2 space-y-1 ${
          visualQA.result === 'pass' ? 'border-emerald-400/20 bg-emerald-400/3' :
          visualQA.result === 'flag' ? 'border-amber-400/20 bg-amber-400/3' :
          'border-red-400/20 bg-red-400/3'
        }`}>
          <p className="font-mono text-[8px] text-text-secondary">{visualQA.summary}</p>
          {visualQA.issues.map((issue, i) => (
            <div key={i} className="pl-2 border-l border-border/50">
              <p className={`font-mono text-[8px] ${issue.severity === 'block' ? 'text-red-400' : 'text-amber-400'}`}>
                [{issue.category}] {issue.description}
              </p>
              {issue.suggestion && (
                <p className="font-mono text-[8px] text-text-tertiary mt-0.5">{issue.suggestion}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Art direction notes */}
      {brief?.visual_note && (
        <p className="font-mono text-[8px] text-text-tertiary border-l border-gold/30 pl-2 italic">
          {brief.visual_note}
        </p>
      )}

      {/* What Gemini identified in the image */}
      {brief?.identified_subject && (
        <p className="font-mono text-[8px] text-text-tertiary border-l border-border pl-2">
          <span className="text-text-tertiary/60">Identified: </span>{brief.identified_subject}
        </p>
      )}

      {/* Image prompt (Flux/ComfyUI) */}
      {brief?.image_prompt && (
        <div>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
          >
            {showPrompt ? '↑ Hide image prompt' : '↓ Image prompt'}
          </button>
          {showPrompt && (
            <div className="mt-1 border border-border/50 bg-ground-light/30 p-2">
              <p className="font-mono text-[8px] text-text-secondary leading-relaxed whitespace-pre-wrap select-all">
                {brief.image_prompt}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── QA Display ────────────────────────────────────────────────────────────────

function QADisplay({ qa }: { qa: QAResult }) {
  const [showIssues, setShowIssues] = useState(false);
  const label = qa.result === 'pass' ? '✓ QA PASS' : qa.result === 'flag' ? '⚑ QA FLAG' : '✗ QA BLOCK';

  return (
    <div className={`mt-3 border rounded px-3 py-2 ${QA_RESULT_COLORS[qa.result]}`}>
      <div className="flex items-start gap-2">
        <span className={`font-mono text-[8px] uppercase tracking-widest shrink-0 ${QA_RESULT_COLORS[qa.result]}`}>
          {label}
        </span>
        <p className="font-mono text-[9px] text-text-secondary flex-1 leading-relaxed">{qa.summary}</p>
        {qa.issues.length > 0 && (
          <button
            onClick={() => setShowIssues(!showIssues)}
            className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary shrink-0 transition-colors"
          >
            {showIssues ? 'Hide' : `${qa.issues.length} issue${qa.issues.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>
      {showIssues && qa.issues.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-current/20 pt-2">
          {qa.issues.map((issue, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
              <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0 self-start mt-0.5 ${
                issue.severity === 'block' ? 'text-red-400 border-red-400/40' : 'text-amber-400 border-amber-400/40'
              }`}>
                {issue.severity === 'block' ? 'block' : 'flag'}
              </span>
              <div>
                <span className="font-mono text-[8px] text-text-tertiary uppercase">{QA_CATEGORY_LABELS[issue.category] ?? issue.category}: </span>
                <span className="font-mono text-[8px] text-text-secondary">{issue.description}</span>
                {issue.suggestion && (
                  <p className="font-mono text-[8px] text-text-tertiary mt-0.5">→ {issue.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Piece Card ────────────────────────────────────────────────────────────────

function PieceCard({
  piece,
  onUpdate,
  onRunQA,
  onRunDesign,
  onSelectDesignVariant,
  onPublish,
  onAutoFix,
}: {
  piece: ContentPiece;
  onUpdate: (id: string, updates: Partial<ContentPiece>) => void;
  onRunQA: (id: string) => void;
  onRunDesign: (id: string) => void;
  onSelectDesignVariant: (pieceId: string, variantId: string) => void;
  onPublish: (id: string) => void;
  onAutoFix: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(piece.text_content);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const cc = charCount(editText, piece.platform);
  const hasThread = piece.supplementary?.posts && piece.supplementary.posts.length > 0;
  const hasSlides = piece.supplementary?.slides && piece.supplementary.slides.length > 0;

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: piece.id, text_content: editText }),
    });
    if (res.ok) {
      onUpdate(piece.id, { text_content: editText });
      setEditing(false);
    }
    setSaving(false);
  }

  async function setStatus(status: ContentPiece['status']) {
    const res = await fetch('/api/admin/social/pieces', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: piece.id, status }),
    });
    if (res.ok) onUpdate(piece.id, { status });
  }

  return (
    <div className={`border rounded p-4 ${piece.status === 'approved' ? 'border-emerald-400/20 bg-emerald-400/3' : piece.status === 'rejected' ? 'border-red-400/10 opacity-50' : 'border-border bg-ground-light/20'}`}>
      {/* Header row */}
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
        <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 ml-auto ${STATUS_COLORS[piece.status]}`}>
          {piece.status}
        </span>
        {piece.scheduled_at && piece.status === 'approved' && (
          <span className="font-mono text-[8px] text-gold/70 border border-gold/20 px-1.5 py-0.5">
            ⏱ {new Date(piece.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET
          </span>
        )}
      </div>

      {/* Main text */}
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full bg-ground border border-border text-sm text-text-primary p-2 focus:outline-none focus:border-gold/40 resize-none min-h-[120px]"
          />
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[9px] ${cc.over ? 'text-red-400' : 'text-text-tertiary'}`}>
              {cc.count}{cc.limit < 9999 ? `/${cc.limit}` : ''} chars
            </span>
            <button onClick={save} disabled={saving}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors ml-auto disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setEditText(piece.text_content); }}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className={`text-sm text-text-secondary leading-relaxed whitespace-pre-wrap ${!expanded && 'line-clamp-4'}`}>
            {piece.text_content}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`font-mono text-[9px] ${cc.over ? 'text-red-400' : 'text-text-tertiary'}`}>
              {cc.count}{cc.limit < 9999 ? `/${cc.limit}` : ''} chars
            </span>
            {piece.text_content.split('\n').length > 4 && (
              <button onClick={() => setExpanded(!expanded)}
                className="font-mono text-[9px] text-text-tertiary hover:text-gold transition-colors">
                {expanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thread/carousel preview */}
      {!editing && hasThread && expanded && (
        <ThreadPreview posts={piece.supplementary!.posts!} />
      )}
      {!editing && hasSlides && expanded && (
        <CarouselPreview slides={piece.supplementary!.slides!} />
      )}
      {!editing && (hasThread || hasSlides) && (
        <button onClick={() => setExpanded(!expanded)}
          className="font-mono text-[9px] text-text-tertiary hover:text-gold transition-colors mt-1">
          {expanded ? '↑ Hide preview' : `↓ Preview ${hasThread ? `thread (${piece.supplementary!.posts!.length} posts)` : `carousel (${piece.supplementary!.slides!.length} slides)`}`}
        </button>
      )}

      {/* Design gallery */}
      {piece._designs && piece._designs.length > 0 && (
        <DesignGallery
          variants={piece._designs}
          brief={piece._designBrief}
          visualQA={piece._visualQA}
          onSelect={(variantId) => onSelectDesignVariant(piece.id, variantId)}
        />
      )}

      {/* Design error */}
      {piece._designError && (
        <p className="font-mono text-[9px] text-red-400 mt-2 border border-red-400/20 px-2 py-1 rounded">
          {piece._designError}
        </p>
      )}

      {/* QA result */}
      {piece._qa && <QADisplay qa={piece._qa} />}

      {/* Actions */}
      {piece.status === 'published' && piece.supplementary?.published_tweet_url && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <a
            href={piece.supplementary.published_tweet_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors"
          >
            ↗ View on X
          </a>
        </div>
      )}

      {piece.status !== 'published' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
          {piece.status !== 'approved' && (
            <button onClick={() => setStatus('approved')}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/20 transition-colors">
              Approve
            </button>
          )}
          {piece.status === 'approved' && (
            <button onClick={() => setStatus('draft')}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
              Unapprove
            </button>
          )}
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-border text-text-tertiary hover:text-gold transition-colors">
              Edit
            </button>
          )}
          <button
            onClick={() => onRunDesign(piece.id)}
            disabled={piece._designRunning}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1 border transition-colors disabled:opacity-50 ${
              piece._designs?.length
                ? 'border-violet-400/30 text-violet-400/70 hover:text-violet-400'
                : 'border-border text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {piece._designRunning ? 'Designing…' : piece._designs?.length ? '↺ Redesign' : '🎨 Design'}
          </button>
          <button
            onClick={() => onRunQA(piece.id)}
            disabled={piece._qaRunning}
            className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1 border transition-colors disabled:opacity-50 ${
              piece._qa
                ? piece._qa.result === 'pass'
                  ? 'border-emerald-400/30 text-emerald-400/70 hover:text-emerald-400'
                  : piece._qa.result === 'block'
                    ? 'border-red-400/30 text-red-400/70 hover:text-red-400'
                    : 'border-amber-400/30 text-amber-400/70 hover:text-amber-400'
                : 'border-border text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {piece._qaRunning ? 'Running QA…' : piece._qa ? '↺ Re-run QA' : 'Run QA'}
          </button>
          {piece._qa && piece._qa.result !== 'pass' && (
            <button
              onClick={() => onAutoFix(piece.id)}
              disabled={piece._fixing}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
            >
              {piece._fixing ? 'Fixing…' : '✦ Auto-fix'}
            </button>
          )}
          {piece._fixError && (
            <p className="w-full font-mono text-[8px] text-red-400 mt-1">{piece._fixError}</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {piece.platform === 'x' && piece.status === 'approved' && (
              <button
                onClick={() => onPublish(piece.id)}
                disabled={piece._publishing}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 transition-colors disabled:opacity-50"
              >
                {piece._publishing ? 'Posting…' : '↑ Post to X'}
              </button>
            )}
            {piece.status !== 'rejected' && (
              <button onClick={() => setStatus('rejected')}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors">
                Reject
              </button>
            )}
          </div>
          {piece._publishError && (
            <p className="w-full font-mono text-[8px] text-red-400 mt-1">{piece._publishError}</p>
          )}
        </div>
      )}
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Per-article schedule (legacy, kept for single-article use)
  const [scheduleDate, setScheduleDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [scheduleHour, setScheduleHour] = useState<number>(9);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleStatus, setScheduleStatus] = useState('');
  // Global scheduler
  const [globalDate, setGlobalDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [globalSlots, setGlobalSlots] = useState<number>(2);
  const [globalScheduling, setGlobalScheduling] = useState(false);
  const [globalStatus, setGlobalStatus] = useState('');
  const [globalCalendar, setGlobalCalendar] = useState<Record<string, { topic: string; time_et: string }[]> | null>(null);
  const [showGlobalPanel, setShowGlobalPanel] = useState(false);

  // Load published dossiers (same pattern as ContentTab)
  useEffect(() => {
    async function load() {
      try {
        const sessRes = await fetch('/api/admin/sessions');
        const sessData = await sessRes.json();
        const complete = (sessData.sessions ?? []).filter(
          (s: { status: string }) => s.status === 'complete'
        ) as { id: string; topic: string; created_at: string }[];

        // Deduplicate — keep most-recent session per topic
        const topicMap: Record<string, boolean> = {};
        const sorted = [...complete].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const topics = sorted.filter(s => {
          if (topicMap[s.topic]) return false;
          topicMap[s.topic] = true;
          return true;
        }).map(s => s.topic);

        const results = await Promise.all(
          topics.map(t =>
            fetch(`/api/admin/dossier?topic=${encodeURIComponent(t)}`)
              .then(r => r.json())
              .then(d => d.dossier as Dossier | null)
              .catch(() => null)
          )
        );
        const published = results.filter((d): d is Dossier => !!d && d.published);
        setDossiers(published);
        if (published.length > 0) setSelectedTopic(published[0].topic);
      } catch {
        // silent
      } finally {
        setLoadingDossiers(false);
      }
    }
    load();
  }, []);

  // Load pieces for selected topic, then hydrate each piece with its existing design variants
  const loadPieces = useCallback(async (topic: string) => {
    setLoadingPieces(true);
    const params = new URLSearchParams({ topic });
    const res = await fetch(`/api/admin/social/pieces?${params}`);
    const data = await res.json();
    const pieces: ContentPiece[] = data.pieces ?? [];
    setPieces(pieces);
    setLoadingPieces(false);

    // Fetch existing design variants for all pieces in parallel (non-blocking)
    if (pieces.length === 0) return;
    const designResults = await Promise.allSettled(
      pieces.map(p =>
        fetch(`/api/admin/social/design?piece_id=${encodeURIComponent(p.id)}`)
          .then(r => r.ok ? r.json() : { variants: [] })
          .then(d => ({ id: p.id, variants: (d.variants ?? []) as DesignVariant[] }))
      )
    );
    const designMap: Record<string, DesignVariant[]> = {};
    for (const result of designResults) {
      if (result.status === 'fulfilled' && result.value.variants.length > 0) {
        designMap[result.value.id] = result.value.variants;
      }
    }
    if (Object.keys(designMap).length > 0) {
      setPieces(prev => prev.map(p => designMap[p.id] ? { ...p, _designs: designMap[p.id] } : p));
    }
  }, []);

  useEffect(() => {
    if (selectedTopic) loadPieces(selectedTopic);
  }, [selectedTopic, loadPieces]);

  async function generate() {
    if (!selectedTopic) return;
    setGenerating(true);
    setGenerateStatus('Running Claude content generation… (~60s)');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateStatus(`Error: ${data.error}`);
      } else {
        setGenerateStatus(`Generated ${data.pieces_generated} pieces — X: ${data.by_platform.x}, Instagram: ${data.by_platform.instagram}, Facebook: ${data.by_platform.facebook}`);
        await loadPieces(selectedTopic);
      }
    } catch {
      setGenerateStatus('Request failed');
    }
    setGenerating(false);
  }

  async function runDesignForPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: true, _designError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p =>
          p.id === pieceId ? {
            ...p,
            _designs: data.variants,
            _designRunning: false,
            _designError: undefined,
            _designBrief: data.brief ? {
              visual_note: data.brief.visual_note,
              image_prompt: data.brief.image_prompt,
              identified_subject: data.identified_subject ?? undefined,
            } : undefined,
            _visualQA: data.visual_qa ?? null,
          } : p
        ));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: false, _designError: data.error ?? 'Design failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _designRunning: false, _designError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function selectDesignVariant(pieceId: string, variantId: string) {
    // Optimistically update selected state
    setPieces(prev => prev.map(p => {
      if (p.id !== pieceId) return p;
      return {
        ...p,
        _designs: p._designs?.map(v => ({ ...v, selected: v.id === variantId })),
      };
    }));
    // Persist to DB
    await fetch('/api/admin/social/design/select', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ piece_id: pieceId, variant_id: variantId }),
    });
  }

  async function runQAForPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: true } : p));
    try {
      const res = await fetch('/api/admin/social/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => {
          if (p.id !== pieceId) return p;
          // If auto-rejected (block result), update status too
          const updates: Partial<ContentPiece> = { _qa: data.qa, _qaRunning: false };
          if (data.auto_rejected) updates.status = 'rejected';
          return { ...p, ...updates };
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: false } : p));
      }
    } catch {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _qaRunning: false } : p));
    }
  }

  async function runQAAll() {
    const targets = filtered.filter(p => !p._qaRunning && p.status !== 'rejected' && p.status !== 'published');
    for (const piece of targets) {
      await runQAForPiece(piece.id);
    }
  }

  async function redesignAll() {
    const targets = filtered.filter(p => !p._designRunning && p.status !== 'published');
    for (const piece of targets) {
      await runDesignForPiece(piece.id);
    }
  }

  async function approveAll() {
    const drafts = filtered.filter(p => p.status === 'draft');
    await Promise.all(drafts.map(p =>
      fetch('/api/admin/social/pieces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: 'approved' }),
      })
    ));
    setPieces(prev => prev.map(p => drafts.find(d => d.id === p.id) ? { ...p, status: 'approved' } : p));
  }

  function updatePiece(id: string, updates: Partial<ContentPiece>) {
    setPieces(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }

  async function autoFixPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: true, _fixError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => {
          if (p.id !== pieceId) return p;
          return {
            ...p,
            text_content: data.text_content,
            supplementary: data.supplementary ?? p.supplementary,
            status: 'draft',
            _qa: null,
            _fixing: false,
            _fixError: undefined,
          };
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: false, _fixError: data.error ?? 'Auto-fix failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _fixing: false, _fixError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function publishPiece(pieceId: string) {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: true, _publishError: undefined } : p));
    try {
      const res = await fetch('/api/admin/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piece_id: pieceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPieces(prev => prev.map(p => {
          if (p.id !== pieceId) return p;
          return {
            ...p,
            status: 'published',
            _publishing: false,
            _publishError: undefined,
            supplementary: {
              ...(p.supplementary ?? {}),
              published_tweet_ids: data.tweet_ids,
              published_tweet_url: data.tweet_url,
            },
          };
        }));
      } else {
        setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: false, _publishError: data.error ?? 'Post failed' } : p));
      }
    } catch (err) {
      setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, _publishing: false, _publishError: err instanceof Error ? err.message : 'Request failed' } : p));
    }
  }

  async function scheduleGlobal() {
    setGlobalScheduling(true);
    setGlobalStatus('Computing global schedule…');
    setGlobalCalendar(null);
    try {
      const res = await fetch('/api/admin/social/schedule/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: globalDate, slots_per_day: globalSlots }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalStatus(`Error: ${data.error}`);
      } else {
        setGlobalStatus(`Scheduled ${data.total_scheduled} posts across ${data.topics} article${data.topics !== 1 ? 's' : ''} over ${data.days_needed} days`);
        setGlobalCalendar(data.calendar ?? null);
        if (selectedTopic) await loadPieces(selectedTopic);
      }
    } catch {
      setGlobalStatus('Request failed');
    }
    setGlobalScheduling(false);
  }

  async function clearAllSchedules() {
    await fetch('/api/admin/social/schedule/global', { method: 'DELETE' });
    setGlobalStatus('All schedules cleared');
    setGlobalCalendar(null);
    if (selectedTopic) await loadPieces(selectedTopic);
  }

  async function scheduleWeek() {
    if (!selectedTopic) return;
    setScheduling(true);
    setScheduleStatus('Computing schedule…');
    try {
      const res = await fetch('/api/admin/social/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic, start_date: scheduleDate, hour_et: scheduleHour }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScheduleStatus(`Error: ${data.error}`);
      } else {
        setScheduleStatus(`Scheduled ${data.scheduled} posts starting ${scheduleDate} at ${scheduleHour}:00 ET`);
        await loadPieces(selectedTopic);
      }
    } catch {
      setScheduleStatus('Request failed');
    }
    setScheduling(false);
  }

  async function clearSchedule() {
    if (!selectedTopic) return;
    await fetch('/api/admin/social/schedule', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: selectedTopic }),
    });
    setScheduleStatus('Schedule cleared');
    await loadPieces(selectedTopic);
  }

  const selectedDossier = dossiers.find(d => d.topic === selectedTopic);

  const filtered = pieces.filter(p => {
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const counts = {
    total: pieces.length,
    draft: pieces.filter(p => p.status === 'draft').length,
    approved: pieces.filter(p => p.status === 'approved').length,
    rejected: pieces.filter(p => p.status === 'rejected').length,
    qa_pass: pieces.filter(p => p._qa?.result === 'pass').length,
    qa_flag: pieces.filter(p => p._qa?.result === 'flag').length,
    qa_block: pieces.filter(p => p._qa?.result === 'block').length,
  };

  return (
    <div className="space-y-6">

      {/* Global Content Scheduler */}
      <div className="border border-sky-400/20 bg-sky-400/3">
        <button
          onClick={() => setShowGlobalPanel(!showGlobalPanel)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="font-mono text-[9px] uppercase tracking-widest text-sky-400">
            Global Content Scheduler
          </span>
          <span className="font-mono text-[9px] text-text-tertiary">{showGlobalPanel ? '↑ Collapse' : '↓ Expand'}</span>
        </button>

        {showGlobalPanel && (
          <div className="px-4 pb-4 space-y-4 border-t border-sky-400/10">
            <p className="font-mono text-[9px] text-text-tertiary pt-3">
              Schedules ALL approved X posts across every article. Interleaves topics so no two consecutive posts are from the same article.
            </p>

            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Start Date</label>
                <input
                  type="date"
                  value={globalDate}
                  onChange={e => setGlobalDate(e.target.value)}
                  className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-sky-400/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Posts Per Day</label>
                <select
                  value={globalSlots}
                  onChange={e => setGlobalSlots(parseInt(e.target.value))}
                  className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-sky-400/40"
                >
                  <option value={1}>1 per day — 9am ET</option>
                  <option value={2}>2 per day — 9am + 5pm ET (recommended)</option>
                  <option value={3}>3 per day — 9am + 1pm + 6pm ET</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={scheduleGlobal}
                  disabled={globalScheduling}
                  className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 bg-sky-400/10 border border-sky-400/40 text-sky-400 hover:bg-sky-400/20 transition-colors disabled:opacity-50"
                >
                  {globalScheduling ? 'Scheduling…' : '⏱ Schedule All Articles'}
                </button>
                <button
                  onClick={clearAllSchedules}
                  className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-red-400/20 text-red-400/60 hover:text-red-400 hover:border-red-400/40 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {globalStatus && (
              <p className="font-mono text-[9px] text-text-secondary border-l-2 border-sky-400/40 pl-3">{globalStatus}</p>
            )}

            {/* Calendar preview */}
            {globalCalendar && Object.keys(globalCalendar).length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-2">Schedule Preview</p>
                {Object.entries(globalCalendar).sort(([a], [b]) => a.localeCompare(b)).map(([date, slots]) => (
                  <div key={date} className="flex items-start gap-3">
                    <span className="font-mono text-[8px] text-text-tertiary shrink-0 w-20">
                      {new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {slots.map((s, i) => (
                        <span key={i} className="font-mono text-[8px] border border-sky-400/20 text-sky-400/70 px-1.5 py-0.5">
                          {s.time_et} · {s.topic.slice(0, 20)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Article selector */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <label className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary block mb-1">
            Article
          </label>
          {loadingDossiers ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : (
            <select
              value={selectedTopic ?? ''}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full bg-ground-light border border-border px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold/40"
            >
              {dossiers.map(d => (
                <option key={d.topic} value={d.topic}>{d.title || d.topic}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={generate}
            disabled={generating || !selectedTopic}
            className="font-mono text-[10px] uppercase tracking-widest px-4 py-2 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating…' : pieces.length > 0 ? '↺ Regenerate' : '⚡ Generate Content'}
          </button>
        </div>
      </div>

      {generateStatus && (
        <p className="font-mono text-[10px] text-text-secondary border-l-2 border-gold/40 pl-3">
          {generateStatus}
        </p>
      )}

      {/* Stats row */}
      {pieces.length > 0 && (
        <div className="flex flex-wrap gap-4 border border-border bg-ground-light/20 px-4 py-3">
          <div className="text-right">
            <div className="font-serif text-xl text-gold">{counts.total}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Total</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-xl text-text-secondary">{counts.draft}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Draft</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-xl text-emerald-400">{counts.approved}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Approved</div>
          </div>
          <div className="text-right">
            <div className="font-serif text-xl text-red-400">{counts.rejected}</div>
            <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Rejected</div>
          </div>
          {(counts.qa_pass + counts.qa_flag + counts.qa_block) > 0 && (
            <>
              <div className="text-right">
                <div className="font-serif text-xl text-emerald-400">{counts.qa_pass}</div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">QA Pass</div>
              </div>
              {counts.qa_flag > 0 && (
                <div className="text-right">
                  <div className="font-serif text-xl text-amber-400">{counts.qa_flag}</div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">QA Flag</div>
                </div>
              )}
              {counts.qa_block > 0 && (
                <div className="text-right">
                  <div className="font-serif text-xl text-red-400">{counts.qa_block}</div>
                  <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">QA Block</div>
                </div>
              )}
            </>
          )}
          {selectedDossier && (
            <div className="ml-auto text-right">
              <div className="font-serif text-xl text-gold">{selectedDossier.best_convergence_score}</div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Score</div>
            </div>
          )}
        </div>
      )}

      {/* Schedule Week panel */}
      {pieces.length > 0 && counts.approved > 0 && (
        <div className="border border-gold/20 bg-gold/3 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-widest text-gold">
              Auto-Schedule Week — {counts.approved} approved piece{counts.approved !== 1 ? 's' : ''}
            </span>
            {scheduleStatus && (
              <span className="font-mono text-[9px] text-text-secondary">{scheduleStatus}</span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">Start Date</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-gold/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary">X Posting Hour (ET)</label>
              <select
                value={scheduleHour}
                onChange={e => setScheduleHour(parseInt(e.target.value))}
                className="bg-ground border border-border px-2 py-1 text-xs text-text-primary font-mono focus:outline-none focus:border-gold/40"
              >
                {[7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(h => (
                  <option key={h} value={h}>{h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`} ET {h === 9 ? '(optimal)' : ''}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 mt-auto">
              <button
                onClick={scheduleWeek}
                disabled={scheduling}
                className="font-mono text-[9px] uppercase tracking-widest px-4 py-1.5 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 transition-colors disabled:opacity-50"
              >
                {scheduling ? 'Scheduling…' : '⏱ Schedule Week'}
              </button>
              <button
                onClick={clearSchedule}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          <p className="font-mono text-[8px] text-text-tertiary">
            Posts spaced 90 min apart per platform per day. Cron runs every 15 min and posts X automatically. Instagram and Facebook post manually.
          </p>
        </div>
      )}

      {/* Filters + batch actions */}
      {pieces.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-0 border border-border">
            {['all', 'x', 'instagram', 'facebook'].map(p => (
              <button key={p} onClick={() => setPlatformFilter(p)}
                className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${platformFilter === p ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {p === 'all' ? 'All' : PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
          <div className="flex gap-0 border border-border">
            {['all', 'draft', 'approved', 'rejected', 'published'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 transition-colors border-r border-border last:border-r-0 ${statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={redesignAll}
              disabled={filtered.every(p => p._designRunning)}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-violet-400/30 text-violet-400/70 hover:text-violet-400 transition-colors disabled:opacity-50"
            >
              ↺ Redesign All
            </button>
            <button
              onClick={runQAAll}
              disabled={filtered.every(p => p._qaRunning)}
              className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              Run QA All
            </button>
            {counts.draft > 0 && (
              <button onClick={approveAll}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 transition-colors">
                Approve All Drafts ({counts.draft})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pieces list */}
      {loadingPieces ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading pieces…</p>
      ) : pieces.length === 0 ? (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-3">
            No content generated yet
          </p>
          <p className="text-sm text-text-secondary mb-4">
            Select an article and click Generate Content to produce a full week of social posts.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-tertiary">No pieces match current filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(piece => (
            <PieceCard
              key={piece.id}
              piece={piece}
              onUpdate={updatePiece}
              onRunQA={runQAForPiece}
              onRunDesign={runDesignForPiece}
              onSelectDesignVariant={selectDesignVariant}
              onPublish={publishPiece}
              onAutoFix={autoFixPiece}
            />
          ))}
        </div>
      )}
    </div>
  );
}
