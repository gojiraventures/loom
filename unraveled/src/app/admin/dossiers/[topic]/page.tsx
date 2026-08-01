'use client';

/**
 * /admin/dossiers/[topic] — Dossier Workshop detail view (Phase 2).
 * Mirrors every action in the ContentTab's per-dossier expand panel,
 * organized into tabs: Overview · Research · Editorial · Media · Entities · Audio · Social · Settings.
 * Calls the same endpoints as ContentTab — no API changes.
 */

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { AdminShell } from '../../_components/AdminShell';
import { AdminSidebar, type SidebarGroup } from '../../_components/AdminSidebar';
import { StatusBadge } from '../../_components/StatusBadge';
import { ReadinessChecklist } from '../../_components/ReadinessChecklist';

// ── Sidebar (same as list page) ──────────────────────────────────────────────
const SIDEBAR_GROUPS: SidebarGroup[] = [
  { label: 'Command',      items: [{ id: 'command-center', label: 'Command Center', href: '/admin' }] },
  { label: 'Research',     items: [
    { id: 'sessions', label: 'Studio',         href: '/admin' },
    { id: 'thread',   label: 'Discovery',      href: '/admin' },
    { id: 'media',    label: 'Media Library',  href: '/admin' },
  ]},
  { label: 'Content',      items: [
    { id: 'dossiers',  label: 'Dossier Workshop' },
    { id: 'content',   label: 'Dossiers (Legacy)', href: '/admin' },
    { id: 'health',    label: 'Content Health',    href: '/admin' },
    { id: 'editorial', label: 'Editorial',          href: '/admin' },
  ]},
  { label: 'Knowledge',    items: [{ id: 'people', label: 'Entities', href: '/admin' }] },
  { label: 'Distribution', items: [
    { id: 'social',       label: 'Social Queue', href: '/admin' },
    { id: 'engage',       label: 'Replies',      href: '/admin' },
    { id: 'intelligence', label: 'Performance',  href: '/admin' },
    { id: 'promo',        label: 'Promo Codes',  href: '/admin' },
  ]},
  { label: 'System',       items: [
    { id: 'agents',    label: 'Agents',    href: '/admin' },
    { id: 'inbox',     label: 'Inbox',     href: '/admin' },
    { id: 'analytics', label: 'Analytics', href: '/admin' },
    { id: 'services',  label: 'Service Health', href: '/admin/services' },
  ]},
];

// ── Types ────────────────────────────────────────────────────────────────────

interface ComponentRecord { id: string; label: string; reason: string; enabled: boolean; data: unknown; }

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
  driving_question: string | null;
  overview_summary: string | null;
}

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
}

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
  attribution: string;
  author: string | null;
  width: number | null;
  height: number | null;
  status: 'suggested' | 'approved' | 'rejected';
  featured: boolean;
  quality_score: number;
  gemini_verdict: 'approve' | 'approve_with_tweaks' | 'reject' | null;
  gemini_aesthetic_score: number | null;
  gemini_caption: string | null;
  gemini_tweaks: string | null;
  hero_position: string | null;
  cropped_url: string | null;
}

interface SocialPiece {
  id: string;
  topic: string;
  platform: string;
  content_type: string;
  status: string;
  text_content: string | null;
  scheduled_at: string | null;
}

type WorkshopTab = 'overview' | 'research' | 'editorial' | 'media' | 'entities' | 'audio' | 'social' | 'settings';

const TABS: { id: WorkshopTab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'research',  label: 'Research' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'media',     label: 'Media' },
  { id: 'entities',  label: 'Entities' },
  { id: 'audio',     label: 'Audio' },
  { id: 'social',    label: 'Social' },
  { id: 'settings',  label: 'Settings' },
];

const SESSION_STATUS_LABELS: Record<string, string> = {
  pending:         'Queued',
  researching:     'Layer 1 — Research agents',
  researched:      'Layer 1 complete',
  cross_validating:'Layer 2 — Cross-validation',
  converging:      'Layer 3 — Convergence',
  debating:        'Layer 4 — Debate',
  synthesizing:    'Layer 5 — Synthesis',
  complete:        'Complete',
  failed:          'Failed',
  pending_review:  'Awaiting Review',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch {
    if ([504, 502, 503, 408].includes(res.status)) {
      throw new Error(`Request timed out (${res.status}). The pipeline runs for 3–5 minutes — try again or check Vercel logs.`);
    }
    throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`);
  }
}

// ── Readiness computation ────────────────────────────────────────────────────

function computeReadiness(
  dossier: Dossier | null,
  entities: { people: EntityRecord[]; institutions: EntityRecord[] } | null,
  images: TopicImage[] | null,
  audioUrl: string | null | undefined,
  socialCount: number,
) {
  const d = dossier;
  if (!d) return [];
  const hasHero = images !== null && images.some((i) => i.status === 'approved');
  const hasEntities = entities !== null && (entities.people.length + entities.institutions.length) > 0;
  return [
    { id: 'slug',           label: 'Slug',           status: d.slug ? 'pass' as const : 'fail' as const,    note: d.slug ?? undefined },
    { id: 'driving_question', label: 'Driving Question', status: d.driving_question ? 'pass' as const : 'fail' as const },
    { id: 'overview',       label: 'Overview Summary', status: d.overview_summary ? 'pass' as const : 'fail' as const },
    { id: 'synthesis',      label: 'Synthesis',       status: d.synthesized_output ? 'pass' as const : 'fail' as const },
    { id: 'hero_image',     label: 'Hero Image',      status: images === null ? 'pending' as const : hasHero ? 'pass' as const : 'fail' as const },
    { id: 'entities',       label: 'Entities',        status: entities === null ? 'pending' as const : hasEntities ? 'pass' as const : 'fail' as const },
    { id: 'editorial',      label: 'Editorial Review', status: d.llm_perspectives ? 'pass' as const : 'pending' as const },
    { id: 'social',         label: 'Social Package',  status: socialCount > 0 ? 'pass' as const : 'pending' as const, note: socialCount > 0 ? `${socialCount} posts` : undefined },
  ];
}

// ── Small shared UI atoms ────────────────────────────────────────────────────

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
      {children}
    </span>
  );
}

function ActionBtn({ onClick, disabled, variant = 'default', children }: {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'gold' | 'teal' | 'danger' | 'publish';
  children: React.ReactNode;
}) {
  const colors: Record<string, { color: string; border: string; bg: string; hoverBg: string }> = {
    default:  { color: 'var(--color-text-tertiary)', border: 'var(--color-border)', bg: 'transparent', hoverBg: 'var(--color-border)' },
    gold:     { color: 'var(--color-gold)', border: 'var(--color-gold)', bg: 'var(--color-gold-dim)', hoverBg: 'var(--color-gold-dim)' },
    teal:     { color: 'var(--color-teal)', border: 'var(--color-teal)', bg: 'var(--color-teal-dim)', hoverBg: 'var(--color-teal-dim)' },
    danger:   { color: 'var(--status-failed)', border: 'var(--status-failed)', bg: 'var(--status-failed-bg)', hoverBg: 'var(--status-failed-bg)' },
    publish:  { color: '#fff', border: 'var(--color-gold)', bg: 'var(--color-gold)', hoverBg: 'var(--color-gold)' },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: c.color, border: `1px solid ${c.border}`, background: c.bg, padding: '5px 10px', borderRadius: '3px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'opacity 0.15s' }}
    >
      {children}
    </button>
  );
}

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  const isError = msg.startsWith('error') || msg.startsWith('Error') || msg.startsWith('failed') || msg.startsWith('Failed');
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: isError ? 'var(--status-failed)' : 'var(--status-complete)' }}>
      {msg}
    </span>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 0 6px', marginTop: '16px' }}>
      <MonoLabel>{label}</MonoLabel>
    </div>
  );
}

// ── Image detail modal ──────────────────────────────────────────────────────

// Editorial purpose of each AI hero angle — the "why this works" context.
const ANGLE_RATIONALE: Record<string, string> = {
  literal: 'Depicts the subject directly and unmistakably — the strongest choice for instant recognition and for thumbnails on search and social.',
  symbolic: 'Trades literal depiction for metaphor and mood — best when the topic is abstract or the literal object would read as visually dull.',
  environmental: 'Places the subject in its world and setting — gives the piece scale, atmosphere, and editorial gravitas.',
  detail: 'An extreme close-up on a single telling detail — builds intrigue and a premium, gallery-like feel.',
};

function angleOf(img: TopicImage): string {
  const t = (img.title || '').toLowerCase();
  return (['literal', 'symbolic', 'environmental', 'detail'].find((a) => t.includes(a))) ?? '';
}

function ImageDetailModal({ img, onClose }: { img: TopicImage | null; onClose: () => void }) {
  if (!img) return null;
  const angle = angleOf(img);
  const rationale = ANGLE_RATIONALE[angle];
  const isAI = img.source?.includes('grok') || img.source?.includes('generated') || img.license === 'AI Generated';
  const label = 'var(--admin-label-sm)';
  const box: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: '3px', padding: '12px', background: 'var(--color-ground)' };
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-ground-light)', border: '1px solid var(--color-border)', borderRadius: '4px', maxWidth: '1000px', width: '100%', maxHeight: '90vh', overflow: 'auto', display: 'flex', flexWrap: 'wrap' }}
      >
        {/* Image */}
        <div style={{ flex: '1 1 420px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px' }}>
          <img src={img.cropped_url || img.image_url} alt={img.title} style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} />
        </div>
        {/* Context */}
        <div style={{ flex: '1 1 360px', minWidth: '320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', color: 'var(--color-text-primary)' }}>{img.title}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                {[img.author || img.source, img.width && img.height ? `${img.width}×${img.height}` : null, img.quality_score ? `Q${img.quality_score}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button onClick={onClose} style={{ fontSize: '18px', color: 'var(--color-text-tertiary)', lineHeight: 1, padding: '2px 6px' }}>✕</button>
          </div>

          {/* Why this image */}
          <div style={box}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: label, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>Why this image</p>
            {angle && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-primary)', marginBottom: rationale ? '4px' : 0 }}><strong style={{ textTransform: 'capitalize' }}>{angle} angle.</strong></p>}
            {rationale && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{rationale}</p>}
            {img.gemini_caption && <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '6px' }}>{img.gemini_caption}</p>}
            {(img.gemini_verdict || img.gemini_aesthetic_score != null) && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: label, color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                {img.gemini_verdict ? `AI review: ${img.gemini_verdict.replace(/_/g, ' ')}` : ''}{img.gemini_aesthetic_score != null ? ` · aesthetic ${img.gemini_aesthetic_score}/10` : ''}
              </p>
            )}
            {!rationale && !img.gemini_caption && (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                {img.description ? 'Generated to the house editorial style from the prompt below.' : 'Sourced image — see attribution below.'}
              </p>
            )}
          </div>

          {/* Prompt used */}
          {img.description && (
            <div style={box}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: label, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                {isAI ? 'Prompt used' : 'Description'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '220px', overflow: 'auto' }}>
                {img.description}
              </p>
            </div>
          )}

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)' }}>
            {img.attribution}{img.license ? ` · ${img.license}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Workshop page ────────────────────────────────────────────────────────────

export default function DossierWorkshopPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: rawTopic } = use(params);
  const topic = decodeURIComponent(rawTopic);

  const [activeTab, setActiveTab] = useState<WorkshopTab>('overview');
  const [dossier, setDossier]   = useState<Dossier | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Readiness-related loaded state
  const [entities, setEntities] = useState<{ people: EntityRecord[]; institutions: EntityRecord[] } | null>(null);
  const [images, setImages]     = useState<TopicImage[] | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null | undefined>(undefined); // undefined = not yet loaded
  const [socialPieces, setSocialPieces] = useState<SocialPiece[] | null>(null);
  const [modalImage, setModalImage] = useState<TopicImage | null>(null);

  // Overview tab state
  const [slugInput,   setSlugInput]   = useState('');
  const [publishStatus, setPublishStatus] = useState('');
  const [featStatus,    setFeatStatus]    = useState('');
  const [dqValue, setDqValue] = useState('');
  const [dqStatus, setDqStatus] = useState('');
  const [dqGenerating, setDqGenerating] = useState(false);
  const [overviewGenerating, setOverviewGenerating] = useState(false);
  const [overviewStatus, setOverviewStatus] = useState('');
  const [llmStatus, setLlmStatus] = useState('');
  const [componentGenStatus, setComponentGenStatus] = useState('');
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [componentStatus, setComponentStatus] = useState<Record<string, string>>({});

  // Research tab state
  const [enhanceOpen, setEnhanceOpen] = useState(false);
  const [enhanceQuestions, setEnhanceQuestions] = useState<string[]>(['']);
  const [enhanceSources, setEnhanceSources] = useState('');
  const [enhanceStatus, setEnhanceStatus] = useState('');
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveFocus, setDeepDiveFocus] = useState('');
  const [deepDiveQuestions, setDeepDiveQuestions] = useState('');
  const [deepDiveStatus, setDeepDiveStatus] = useState('');
  const [resynthStatus, setResynthStatus] = useState('');
  const [previewing, setPreviewing] = useState(false);

  // Entities tab state
  const [entitiesOpen, setEntitiesOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState('');
  const [entityStatuses, setEntityStatuses] = useState<Record<string, string>>({});
  const [researchStatus, setResearchStatus] = useState<Record<string, string>>({});

  // Audio tab state
  const [audioGenerating, setAudioGenerating] = useState(false);
  const [audioMsg, setAudioMsg] = useState('');
  const [audioGeneratedAt, setAudioGeneratedAt] = useState<string | null>(null);

  // Media tab state (search/generate state; images loaded via readiness loader)
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState('');
  const [heroKeywords, setHeroKeywords] = useState('');
  const [heroReference, setHeroReference] = useState<{ dataUrl: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [cropStatus, setCropStatus] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Social tab state
  const [socialGenerating, setSocialGenerating] = useState(false);
  const [socialMsg, setSocialMsg] = useState('');

  // Editorial tab state
  const [editorialData, setEditorialData] = useState<Array<{ id?: string; slug?: string; quality_level?: string; editorial_review?: { flags?: Array<{ severity: string; type: string; section: string; excerpt: string; issue: string; suggested_fix: string; status?: string }> } }> | null>(null);
  const [editorialRunning, setEditorialRunning] = useState(false);
  const [editorialMsg, setEditorialMsg] = useState('');

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadDossier = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Load dossier + find session ID in parallel
      const [dossierRes, sessRes] = await Promise.all([
        fetch(`/api/admin/dossier?topic=${encodeURIComponent(topic)}`),
        fetch('/api/admin/sessions'),
      ]);
      const dossierData = await dossierRes.json() as { dossier?: Dossier };
      const sessData    = await sessRes.json()    as { sessions?: Array<{ id: string; topic: string; status: string; created_at: string }> };

      if (!dossierData.dossier) { setError('Dossier not found'); setLoading(false); return; }
      const d = dossierData.dossier;
      setDossier(d);
      setSlugInput(d.slug ?? '');
      setDqValue(d.driving_question ?? '');

      // Most-recent complete session for this topic
      const sessions = (sessData.sessions ?? [])
        .filter((s) => s.topic === topic && s.status === 'complete')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sid = sessions[0]?.id ?? null;
      setSessionId(sid);

      // Load readiness data in parallel (non-blocking — fine to fail)
      Promise.all([
        // Images
        fetch(`/api/admin/images?topic=${encodeURIComponent(topic)}`)
          .then((r) => r.json())
          .then((r: { images?: TopicImage[] }) => setImages(r.images ?? []))
          .catch(() => setImages([])),
        // Audio
        fetch(`/api/admin/audio?topic=${encodeURIComponent(topic)}`)
          .then((r) => r.json())
          .then((r: { audio_url?: string | null; audio_generated_at?: string | null }) => {
            setAudioUrl(r.audio_url ?? null);
            setAudioGeneratedAt(r.audio_generated_at ?? null);
          })
          .catch(() => setAudioUrl(null)),
        // Social pieces
        fetch(`/api/admin/social/pieces?topic=${encodeURIComponent(topic)}`)
          .then((r) => r.json())
          .then((r: { pieces?: SocialPiece[] }) => setSocialPieces(r.pieces ?? []))
          .catch(() => setSocialPieces([])),
        // Entities (if session exists)
        ...(sid ? [
          fetch(`/api/admin/dossier/entities?session_id=${sid}`)
            .then((r) => r.json())
            .then((r: { people?: EntityRecord[]; institutions?: EntityRecord[] }) => {
              setEntities({
                people: (r.people ?? []).filter((p) => p.status !== 'archived'),
                institutions: (r.institutions ?? []).filter((i) => i.status !== 'archived'),
              });
            })
            .catch(() => setEntities({ people: [], institutions: [] })),
        ] : [Promise.resolve()]),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [topic]);

  useEffect(() => { loadDossier(); }, [loadDossier]);

  // ── Overview actions ───────────────────────────────────────────────────────

  const publishOrUpdate = async () => {
    if (!slugInput.trim()) return;
    const isUpdate = dossier?.published ?? false;
    setPublishStatus(isUpdate ? 'updating…' : 'publishing…');
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, slug: slugInput.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      setPublishStatus(isUpdate ? `updated → ${data.url}` : `live → ${data.url}`);
      loadDossier();
    } catch (err) {
      setPublishStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const unpublish = async () => {
    setPublishStatus('unpublishing…');
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) { const d = await safeJson(res); throw new Error(d.error as string ?? 'Failed'); }
      setPublishStatus('unpublished');
      loadDossier();
    } catch (err) {
      setPublishStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const toggleFeature = async () => {
    if (!dossier) return;
    const next = !dossier.featured;
    setFeatStatus('saving…');
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, featured: next }),
      });
      if (!res.ok) throw new Error('Failed');
      setFeatStatus(next ? 'featured ★' : 'unfeatured');
      loadDossier();
    } catch { setFeatStatus('error'); }
  };

  const saveDrivingQuestion = async () => {
    setDqStatus('saving…');
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, driving_question: dqValue }),
      });
      if (!res.ok) throw new Error('Failed');
      setDqStatus('saved ✓');
      setTimeout(() => setDqStatus(''), 2500);
    } catch { setDqStatus('error'); }
  };

  const generateDrivingQuestion = async () => {
    setDqGenerating(true);
    setDqStatus('generating…');
    try {
      const res = await fetch('/api/admin/dossier/driving-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { ok?: boolean; driving_question?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed');
      setDqValue(data.driving_question ?? '');
      setDqStatus('generated ✓');
      setTimeout(() => setDqStatus(''), 3000);
    } catch (err) {
      setDqStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setDqGenerating(false); }
  };

  const generateOverview = async () => {
    if (!dossier) return;
    setOverviewGenerating(true);
    setOverviewStatus('generating…');
    try {
      const res = await fetch('/api/admin/dossier/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { overview_summary?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed');
      setOverviewStatus('generated ✓');
      loadDossier();
      setTimeout(() => setOverviewStatus(''), 5000);
    } catch (err) {
      setOverviewStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setOverviewGenerating(false); }
  };

  const generateLLMPerspectives = async () => {
    if (!dossier) return;
    setLlmStatus('generating…');
    try {
      const output = dossier.synthesized_output;
      const res = await fetch('/api/reports/llm-perspectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          title: dossier.title,
          summary: (output?.executive_summary as string)?.slice(0, 300) ?? dossier.summary ?? '',
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setLlmStatus('done ✓');
      loadDossier();
    } catch { setLlmStatus('error'); }
  };

  const generateComponentRecs = async () => {
    setComponentGenStatus('generating…');
    try {
      const res = await fetch('/api/admin/components/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error('Failed');
      setComponentGenStatus('');
      loadDossier();
    } catch { setComponentGenStatus('error'); }
  };

  const toggleComponent = async (componentId: string, enabled: boolean) => {
    if (!dossier) return;
    const recs = dossier.recommended_components ?? [];
    const base: ComponentRecord[] = (dossier.selected_components ?? []).length > 0
      ? (dossier.selected_components ?? []) : recs;
    const updated = base.map((c) => c.id === componentId ? { ...c, enabled } : c);
    if (!updated.some((c) => c.id === componentId)) {
      const rec = recs.find((c) => c.id === componentId);
      if (rec) updated.push({ ...rec, enabled });
    }
    setComponentStatus((s) => ({ ...s, [componentId]: 'saving…' }));
    try {
      const res = await fetch('/api/admin/dossier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, selected_components: updated }),
      });
      if (!res.ok) throw new Error('Failed');
      setComponentStatus((s) => ({ ...s, [componentId]: enabled ? 'enabled ✓' : 'disabled' }));
      loadDossier();
    } catch { setComponentStatus((s) => ({ ...s, [componentId]: 'error' })); }
  };

  // ── Research actions ───────────────────────────────────────────────────────

  const resynthesize = async () => {
    if (!dossier) return;
    setResynthStatus('running…');
    try {
      const res = await fetch('/api/admin/resynthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title: dossier.title }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      setResynthStatus(`done — ${data.findingsUsed} findings, score ${data.convergenceScore}`);
      loadDossier();
    } catch (err) {
      setResynthStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const launchEnhance = async () => {
    if (!dossier) return;
    const questions = enhanceQuestions.filter((q) => q.trim());
    if (questions.length === 0) return;
    setEnhanceStatus('queuing…');
    setEnhanceOpen(false);
    try {
      const res = await fetch('/api/research/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title: dossier.title, research_questions: questions, source_urls: enhanceSources.trim() || undefined }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      const sid = (data.session_id ?? (data.session_ids as string[])?.[0]) as string;
      const batchCount = Math.ceil(questions.length / 3);
      setEnhanceStatus(batchCount > 1 ? `${batchCount} batches running — check Sessions tab` : `running — session ${sid.slice(0, 8)}…`);
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/research/${sid}`);
          if (!r.ok) return;
          const rd = await r.json() as { session?: { status: string; error_log?: string[] } };
          const st = rd.session?.status ?? 'pending';
          if (st === 'pending_review') { clearInterval(poll); setEnhanceStatus('complete — awaiting your review in Sessions tab'); }
          else if (st === 'failed') { clearInterval(poll); setEnhanceStatus(`failed — ${(rd.session?.error_log ?? []).join('; ')}`); }
          else setEnhanceStatus(`${SESSION_STATUS_LABELS[st] ?? st}…`);
        } catch { /* network blip */ }
      }, 8000);
    } catch (err) {
      setEnhanceStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const launchDeepDive = async () => {
    if (!dossier || !deepDiveFocus.trim()) return;
    const questions = deepDiveQuestions.trim()
      ? deepDiveQuestions.split('\n').map((q) => q.trim()).filter(Boolean)
      : [`What specific evidence exists related to: ${deepDiveFocus}`];
    setDeepDiveStatus('queuing…');
    setDeepDiveOpen(false);
    try {
      const res = await fetch('/api/research/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title: dossier.title, research_questions: questions, focus_areas: deepDiveFocus }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error as string);
      const sid = data.session_id as string;
      setDeepDiveStatus(`running — session ${sid.slice(0, 8)}…`);
      const poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/research/${sid}`);
          if (!r.ok) return;
          const rd = await r.json() as { session?: { status: string; error_log?: string[] } };
          const st = rd.session?.status ?? 'pending';
          if (st === 'complete') { clearInterval(poll); setDeepDiveStatus('complete — refresh to see updated content'); loadDossier(); }
          else if (st === 'failed') { clearInterval(poll); setDeepDiveStatus(`failed — ${(rd.session?.error_log ?? []).join('; ')}`); }
          else setDeepDiveStatus(`${SESSION_STATUS_LABELS[st] ?? st}…`);
        } catch { /* network blip */ }
      }, 8000);
    } catch (err) {
      setDeepDiveStatus(`error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ── Entities actions ───────────────────────────────────────────────────────

  const loadEntities = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/admin/dossier/entities?session_id=${sessionId}`);
      const data = await res.json() as { people?: EntityRecord[]; institutions?: EntityRecord[] };
      setEntities({
        people: (data.people ?? []).filter((p) => p.status !== 'archived'),
        institutions: (data.institutions ?? []).filter((i) => i.status !== 'archived'),
      });
    } catch { setEntities({ people: [], institutions: [] }); }
  };

  const extractEntities = async () => {
    if (!sessionId) return;
    setExtracting(true);
    setExtractMsg('');
    try {
      const res = await fetch('/api/admin/dossier/entities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, topic }),
      });
      const data = await res.json() as { ok?: boolean; created_people?: number; created_institutions?: number; error?: string };
      if (!res.ok) { setExtractMsg(`Error: ${data.error}`); return; }
      setExtractMsg(`Done — ${data.created_people} people, ${data.created_institutions} institutions extracted`);
      await loadEntities();
    } catch (err) {
      setExtractMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setExtracting(false); }
  };

  const promoteEntity = async (type: 'person' | 'institution', id: string) => {
    setEntityStatuses((s) => ({ ...s, [id]: 'saving…' }));
    const res = await fetch('/api/admin/dossier/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action: 'draft' }),
    });
    setEntityStatuses((s) => ({ ...s, [id]: res.ok ? 'draft ✓' : 'error' }));
    if (res.ok) loadEntities();
  };

  const skipEntity = async (type: 'person' | 'institution', id: string) => {
    await fetch('/api/admin/dossier/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, action: 'skip' }),
    });
    setEntities((prev) => {
      if (!prev) return prev;
      return type === 'person'
        ? { ...prev, people: prev.people.filter((p) => p.id !== id) }
        : { ...prev, institutions: prev.institutions.filter((i) => i.id !== id) };
    });
  };

  const researchAndAddEntity = async (type: 'person' | 'institution', entity: EntityRecord) => {
    const label = entity.full_name ?? entity.name ?? '';
    setResearchStatus((s) => ({ ...s, [entity.id]: 'researching…' }));
    try {
      const resRoute  = type === 'person' ? '/api/admin/people/research' : '/api/admin/institutions/research';
      const saveRoute = type === 'person' ? '/api/admin/people' : '/api/admin/institutions';
      const res = await fetch(resRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: label, description: entity.topic_context ?? '' }),
      });
      if (!res.ok) throw new Error('Research failed');
      const data = await res.json();
      const payload = type === 'person'
        ? { person: { ...data.person, status: 'draft' }, bio_sections: data.bio_sections ?? [], suggested_relationships: data.suggested_relationships ?? [], suggested_books: data.suggested_books ?? [] }
        : { institution: { ...data.institution, status: 'draft' }, bio_sections: data.bio_sections ?? [], suggested_relationships: data.suggested_relationships ?? [] };
      await fetch(saveRoute, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setResearchStatus((s) => ({ ...s, [entity.id]: 'added as draft ✓' }));
      loadEntities();
    } catch { setResearchStatus((s) => ({ ...s, [entity.id]: 'failed' })); }
  };

  // ── Audio actions ──────────────────────────────────────────────────────────

  const generateAudio = async () => {
    setAudioGenerating(true);
    setAudioMsg('Writing script then generating audio — takes 60–120 seconds…');
    try {
      const res = await fetch('/api/admin/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { error?: string; audio_url?: string; wav_size_mb?: number };
      if (!res.ok) throw new Error(data.error);
      setAudioMsg(`Generated — ${data.wav_size_mb} MB WAV`);
      setAudioUrl(data.audio_url ?? null);
      setAudioGeneratedAt(new Date().toISOString());
    } catch (err) {
      setAudioMsg(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setAudioGenerating(false); }
  };

  const deleteAudio = async () => {
    if (!confirm('Delete this podcast audio?')) return;
    await fetch(`/api/admin/audio?topic=${encodeURIComponent(topic)}`, { method: 'DELETE' });
    setAudioUrl(null);
    setAudioGeneratedAt(null);
    setAudioMsg('');
  };

  // ── Media actions ──────────────────────────────────────────────────────────

  const reloadImages = async () => {
    const res = await fetch(`/api/admin/images?topic=${encodeURIComponent(topic)}`);
    const data = await res.json() as { images?: TopicImage[] };
    setImages(data.images ?? []);
  };

  const searchImages = async () => {
    if (!dossier) return;
    setSearching(true);
    setSearchMsg('Generating queries and searching archives…');
    try {
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, title: dossier.title }),
      });
      const data = await res.json() as { found?: number; rejected?: number; error?: string; sources?: Record<string, number> };
      if (!res.ok) throw new Error(data.error);
      const sources = data.sources ?? {};
      const parts = Object.entries(sources).map(([k, v]) => `${v} ${k}`);
      setSearchMsg(`Found ${data.found} images${parts.length ? ` (${parts.join(', ')})` : ''}${data.rejected ? ` — ${data.rejected} auto-rejected` : ''}`);
      reloadImages();
    } catch (err) {
      setSearchMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setSearching(false); }
  };

  const generateHeroImages = async () => {
    setGenerating(true);
    setGenerateMsg(`Gemini is writing prompts and generating images${heroReference ? ' (reference-guided)' : ''} — ~2 min…`);
    try {
      const res = await fetch('/api/admin/images/generate-hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          keywords: heroKeywords.trim() || undefined,
          referenceImage: heroReference?.dataUrl,
        }),
      });
      const data = await res.json() as { generated?: number; errors?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setGenerateMsg(data.errors?.length ? `Generated ${data.generated}/4 — errors: ${data.errors.join(' | ')}` : `Generated ${data.generated}/4 AI hero images`);
      reloadImages();
    } catch (err) {
      setGenerateMsg(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setGenerating(false); }
  };

  const updateImage = async (id: string, patch: Partial<Pick<TopicImage, 'status' | 'featured'>>) => {
    await fetch('/api/admin/images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    setImages((imgs) => imgs?.map((img) => img.id === id ? { ...img, ...patch } : img) ?? null);
  };

  const uploadFile = async (file: File) => {
    if (!dossier) return;
    setUploading(true);
    setUploadMsg(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('topic', topic);
      form.append('title', dossier.title);
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: form });
      const data = await res.json() as { error?: string; gemini_caption?: string };
      if (!res.ok) throw new Error(data.error);
      setUploadMsg(`Uploaded — ${data.gemini_caption ?? 'reviewed'}`);
      reloadImages();
    } catch (err) {
      setUploadMsg(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyCrop = async (img: TopicImage) => {
    if (!img.gemini_tweaks) { setCropStatus((s) => ({ ...s, [img.id]: 'No crop hint in tweaks' })); return; }
    const m = img.gemini_tweaks.match(/crop:\s*(\d+)%-(\d+)%\s*vertical,\s*(\d+)%-(\d+)%\s*horizontal/i);
    if (!m) { setCropStatus((s) => ({ ...s, [img.id]: 'No crop hint found' })); return; }
    setCropStatus((s) => ({ ...s, [img.id]: 'cropping…' }));
    try {
      const res = await fetch('/api/admin/images/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: img.id, top: parseInt(m[1])/100, bottom: parseInt(m[2])/100, left: parseInt(m[3])/100, right: parseInt(m[4])/100 }),
      });
      const data = await res.json() as { error?: string; width?: number; height?: number };
      if (!res.ok) { setCropStatus((s) => ({ ...s, [img.id]: `error: ${data.error}` })); return; }
      setCropStatus((s) => ({ ...s, [img.id]: `cropped ✓ (${data.width}×${data.height})` }));
      reloadImages();
    } catch (err) {
      setCropStatus((s) => ({ ...s, [img.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  };

  // ── Social actions ─────────────────────────────────────────────────────────

  const generateSocial = async () => {
    setSocialGenerating(true);
    setSocialMsg('generating…');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json() as { count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setSocialMsg(`Generated ${data.count ?? 0} pieces — review in Social Queue`);
      // Reload pieces
      fetch(`/api/admin/social/pieces?topic=${encodeURIComponent(topic)}`)
        .then((r) => r.json())
        .then((r: { pieces?: SocialPiece[] }) => setSocialPieces(r.pieces ?? []))
        .catch(() => {});
    } catch (err) {
      setSocialMsg(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setSocialGenerating(false); }
  };

  // ── Editorial tab load ─────────────────────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'editorial' && editorialData === null) {
      fetch('/api/admin/editorial/list')
        .then((r) => r.json())
        .then((data) => {
          // editorialList is an array of { id, title, slug, editorial_review }
          const arr = Array.isArray(data) ? data : [];
          // Find the matching dossier by slug or title
          const match = arr.find((item: { slug?: string; title?: string }) =>
            item.slug === dossier?.slug || item.title === dossier?.title
          );
          setEditorialData(match ? [match] : []);
        })
        .catch(() => setEditorialData([]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dossier?.slug, dossier?.title]);

  const runEditorialReview = async () => {
    setEditorialRunning(true);
    setEditorialMsg('running review…');
    try {
      const res = await fetch('/api/admin/editorial/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: dossier?.slug }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Failed');
      setEditorialMsg('review complete ✓ — reload to see updated flags');
      setEditorialData(null); // force reload on next tab open
    } catch (err) {
      setEditorialMsg(`error: ${err instanceof Error ? err.message : String(err)}`);
    } finally { setEditorialRunning(false); }
  };

  // ── Readiness checklist (computed live) ───────────────────────────────────

  const checklist = computeReadiness(
    dossier, entities, images, audioUrl, socialPieces?.length ?? 0,
  );
  const allPass = checklist.length > 0 && checklist.every((c) => c.status === 'pass');

  // ── Rendering ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div data-theme="light">
        <AdminShell
          sidebar={<AdminSidebar groups={SIDEBAR_GROUPS} activeView="dossiers" onSelect={() => {}} />}
        >
          <div className="px-6 py-8">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-8 rounded" style={{ background: 'var(--color-ground-light)' }} />
              ))}
            </div>
          </div>
        </AdminShell>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div data-theme="light">
        <AdminShell
          sidebar={<AdminSidebar groups={SIDEBAR_GROUPS} activeView="dossiers" onSelect={() => {}} />}
        >
          <div className="px-6 py-8">
            <a href="/admin/dossiers" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)', textDecoration: 'none' }}>
              ← Dossiers
            </a>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--status-failed)', marginTop: '16px' }}>
              {error || 'Dossier not found'}
            </p>
          </div>
        </AdminShell>
      </div>
    );
  }

  const output = dossier.synthesized_output;

  return (
    <div data-theme="light">
      <ImageDetailModal img={modalImage} onClose={() => setModalImage(null)} />
      <AdminShell
        sidebar={<AdminSidebar groups={SIDEBAR_GROUPS} activeView="dossiers" onSelect={() => {}} />}
      >
        <div className="flex min-h-screen">
          {/* Main content */}
          <div className="flex-1 min-w-0 px-6 py-6 max-w-3xl">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>
              <a href="/admin/dossiers" style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-gold)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-tertiary)'; }}
              >
                Dossiers
              </a>
              <span>›</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{dossier.title}</span>
            </div>

            {/* Title + meta row */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-2xl text-text-primary leading-tight">{dossier.title}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', padding: '2px 6px', borderRadius: '3px' }}>
                    {topic}
                  </span>
                  {dossier.best_convergence_score > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-gold)' }}>
                      {dossier.best_convergence_score} score
                    </span>
                  )}
                  <StatusBadge status={dossier.published ? 'published' : 'draft'} />
                  {dossier.featured && <StatusBadge status="complete" label="Featured" />}
                </div>
              </div>
              {/* Publish / Update button */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {dossier.published ? (
                  <>
                    <ActionBtn onClick={publishOrUpdate} disabled={!slugInput.trim() || publishStatus.endsWith('…')} variant="gold">
                      {publishStatus === 'updating…' ? 'Updating…' : 'Update →'}
                    </ActionBtn>
                    <ActionBtn onClick={unpublish} disabled={publishStatus === 'unpublishing…'} variant="danger">
                      Unpublish
                    </ActionBtn>
                  </>
                ) : (
                  <ActionBtn onClick={publishOrUpdate} disabled={!slugInput.trim() || publishStatus.endsWith('…')} variant="publish">
                    {publishStatus === 'publishing…' ? 'Publishing…' : '↑ Publish Dossier'}
                  </ActionBtn>
                )}
                {dossier.published && dossier.slug && (
                  <a
                    href={`/topics/${dossier.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--status-complete)', textDecoration: 'none' }}
                  >
                    View Live →
                  </a>
                )}
                {publishStatus && <StatusMsg msg={publishStatus} />}
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-border mt-4 mb-5" style={{ overflowX: 'auto' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--admin-label-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '8px 14px',
                    borderBottom: '2px solid',
                    marginBottom: '-1px',
                    background: 'transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s',
                    borderBottomColor: activeTab === tab.id ? 'var(--color-gold)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--color-gold)' : 'var(--color-text-tertiary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Slug */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                    URL Slug
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value)}
                      placeholder="url-slug"
                      style={{ flex: 1, maxWidth: '320px', background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
                    />
                    <ActionBtn onClick={publishOrUpdate} disabled={!slugInput.trim() || publishStatus.endsWith('…')}>
                      {dossier.published ? 'Update Slug' : 'Save Slug'}
                    </ActionBtn>
                  </div>
                </div>

                {/* Featured toggle */}
                <div className="flex items-center gap-3">
                  <ActionBtn
                    onClick={toggleFeature}
                    disabled={!dossier.published || featStatus === 'saving…'}
                    variant={dossier.featured ? 'gold' : 'default'}
                  >
                    {dossier.featured ? '★ Featured' : '☆ Feature'}
                  </ActionBtn>
                  {!dossier.published && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                      Publish first to enable featuring
                    </span>
                  )}
                  {featStatus && <StatusMsg msg={featStatus} />}
                </div>

                {/* Driving Question */}
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '6px' }}>
                    Driving Question
                    <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', marginLeft: '6px', opacity: 0.6 }}>
                      — shown above the article title. 15–35 words.
                    </span>
                  </label>
                  <div className="flex gap-2 items-start">
                    <input
                      value={dqValue}
                      onChange={(e) => setDqValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveDrivingQuestion(); }}
                      placeholder="The single question this research investigates. Plain language."
                      style={{ flex: 1, background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none' }}
                    />
                    <ActionBtn onClick={generateDrivingQuestion} disabled={dqGenerating} variant="teal">
                      {dqGenerating ? '…' : '✦ Generate'}
                    </ActionBtn>
                    <ActionBtn onClick={saveDrivingQuestion} disabled={dqStatus === 'saving…'} variant="gold">
                      Save
                    </ActionBtn>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {dqValue && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                        {dqValue.trim().split(/\s+/).length} words
                      </span>
                    )}
                    {dqStatus && <StatusMsg msg={dqStatus} />}
                  </div>
                </div>

                {/* Overview Summary */}
                <div>
                  <div className="flex items-center gap-3">
                    <MonoLabel>Overview Summary</MonoLabel>
                    <ActionBtn onClick={generateOverview} disabled={overviewGenerating}>
                      {overviewGenerating ? '⏳ Generating…' : dossier.overview_summary ? '↺ Re-generate' : '✦ Generate'}
                    </ActionBtn>
                    {dossier.overview_summary && !overviewStatus && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--status-complete)', opacity: 0.7 }}>ready</span>
                    )}
                    {overviewStatus && <StatusMsg msg={overviewStatus} />}
                  </div>
                  {dossier.overview_summary && (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '8px', padding: '10px 12px', background: 'var(--color-ground-light)', borderRadius: '3px' }}>
                      {dossier.overview_summary}
                    </p>
                  )}
                </div>

                {/* LLM Perspectives */}
                <div>
                  <div className="flex items-center gap-3">
                    <MonoLabel>AI Perspectives</MonoLabel>
                    <ActionBtn onClick={generateLLMPerspectives} disabled={llmStatus === 'generating…'}>
                      {llmStatus === 'generating…' ? 'Querying AIs…' : dossier.llm_perspectives ? '↺ Re-run' : '◈ Generate'}
                    </ActionBtn>
                    {llmStatus && llmStatus !== 'generating…' && <StatusMsg msg={llmStatus} />}
                  </div>
                  {dossier.llm_perspectives && Array.isArray(dossier.llm_perspectives) && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {dossier.llm_perspectives.length} perspectives generated
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── RESEARCH TAB ─────────────────────────────────────────────── */}
            {activeTab === 'research' && (
              <div className="space-y-6">
                {/* Synthesis preview */}
                {output && (
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <MonoLabel>Synthesis Preview</MonoLabel>
                      <button
                        onClick={() => setPreviewing(!previewing)}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', background: 'transparent', border: '1px solid var(--color-border)', padding: '3px 8px', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        {previewing ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {previewing && (
                      <div className="space-y-4" style={{ background: 'var(--color-ground-light)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '16px' }}>
                        {output.executive_summary != null && (
                          <div>
                            <MonoLabel>Executive Summary</MonoLabel>
                            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginTop: '6px' }}>
                              {String(output.executive_summary).slice(0, 600)}{String(output.executive_summary).length > 600 ? '…' : ''}
                            </p>
                          </div>
                        )}
                        {Array.isArray(output.jaw_drop_layers) && output.jaw_drop_layers.length > 0 && (
                          <div>
                            <MonoLabel>Jaw-Drop Layers ({(output.jaw_drop_layers as unknown[]).length})</MonoLabel>
                            <div className="space-y-2 mt-2">
                              {(output.jaw_drop_layers as { level: number; title: string; content: string }[]).slice(0, 3).map((l) => (
                                <div key={l.level} className="flex gap-3 p-2" style={{ background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '2px' }}>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-gold)', flexShrink: 0, width: '16px' }}>{l.level}</span>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{l.title}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '2px', lineHeight: 1.5 }}>{String(l.content).slice(0, 200)}…</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(output.open_questions) && (
                          <div>
                            <MonoLabel>Open Questions ({(output.open_questions as unknown[]).length})</MonoLabel>
                            <ul className="mt-2 space-y-1">
                              {(output.open_questions as string[]).slice(0, 4).map((q, i) => (
                                <li key={i} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', gap: '8px' }}>
                                  <span style={{ color: 'var(--color-gold)', opacity: 0.5 }}>·</span>
                                  {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!output && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    No synthesis yet. Complete a research session to generate synthesis.
                  </p>
                )}

                {/* Re-synthesize */}
                <div>
                  <div className="flex items-center gap-3">
                    <MonoLabel>Re-synthesize</MonoLabel>
                    <ActionBtn onClick={resynthesize} disabled={resynthStatus === 'running…'}>
                      {resynthStatus === 'running…' ? 'Running…' : '↺ Re-synthesize All Findings'}
                    </ActionBtn>
                    {resynthStatus && <StatusMsg msg={resynthStatus} />}
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Runs the full synthesis pass over all existing findings. Takes 2–4 min.
                  </p>
                </div>

                {/* Enhance */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <MonoLabel>Enhance</MonoLabel>
                    <ActionBtn onClick={() => { setEnhanceOpen(!enhanceOpen); setDeepDiveOpen(false); }} variant="gold">
                      {enhanceOpen ? '− Close' : '+ New Research Round'}
                    </ActionBtn>
                    {enhanceStatus && <StatusMsg msg={enhanceStatus} />}
                  </div>
                  {enhanceOpen && (
                    <div style={{ background: 'var(--color-gold-dim)', border: '1px solid var(--color-gold)', borderRadius: '3px', padding: '14px', marginTop: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                        Enhance — New Research Round
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)', marginBottom: '10px' }}>
                        Up to 9 questions, auto-batched in groups of 3. Results await review before merging.
                      </p>
                      <div className="space-y-2 mb-3">
                        {enhanceQuestions.map((q, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={q}
                              onChange={(e) => {
                                const updated = [...enhanceQuestions];
                                updated[i] = e.target.value;
                                setEnhanceQuestions(updated);
                              }}
                              placeholder={`Research question ${i + 1}`}
                              style={{ flex: 1, background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-primary)', outline: 'none' }}
                            />
                            {enhanceQuestions.length > 1 && (
                              <button onClick={() => setEnhanceQuestions(enhanceQuestions.filter((_, idx) => idx !== i))}
                                style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '0 6px', fontSize: '16px' }}>
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {enhanceQuestions.length < 9 && (
                        <button onClick={() => setEnhanceQuestions([...enhanceQuestions, ''])}
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>
                          + Add question
                        </button>
                      )}
                      <div className="mb-3">
                        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                          Source Material <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', opacity: 0.6 }}>(optional — articles, URLs, or excerpts agents must cite)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={enhanceSources}
                          onChange={(e) => setEnhanceSources(e.target.value)}
                          placeholder="https://example.com/article&#10;Or paste excerpt text"
                          style={{ width: '100%', background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="flex gap-3 items-center">
                        <ActionBtn onClick={launchEnhance} disabled={!enhanceQuestions.some((q) => q.trim())} variant="gold">
                          Launch Enhancement →
                        </ActionBtn>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                          Runs 3–5 min. Awaits review before updating article.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Deep Dive */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <MonoLabel>Deep Dive</MonoLabel>
                    <ActionBtn onClick={() => { setDeepDiveOpen(!deepDiveOpen); setEnhanceOpen(false); }}>
                      {deepDiveOpen ? '− Close' : '⬧ Targeted Rabbit Hole'}
                    </ActionBtn>
                    {deepDiveStatus && <StatusMsg msg={deepDiveStatus} />}
                  </div>
                  {deepDiveOpen && (
                    <div style={{ background: 'var(--color-teal-dim)', border: '1px solid var(--color-teal)', borderRadius: '3px', padding: '14px', marginTop: '8px' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-teal)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                        Deep Dive — Targeted Rabbit Holes
                      </p>
                      <div className="mb-3">
                        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                          Focus Areas
                        </label>
                        <textarea
                          rows={4}
                          value={deepDiveFocus}
                          onChange={(e) => setDeepDiveFocus(e.target.value)}
                          placeholder="Names, books, events, claims to investigate specifically"
                          style={{ width: '100%', background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="mb-3">
                        <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                          Research Questions <span style={{ fontWeight: 'normal', textTransform: 'none', letterSpacing: 'normal', opacity: 0.6 }}>(one per line — blank to auto-generate)</span>
                        </label>
                        <textarea
                          rows={3}
                          value={deepDiveQuestions}
                          onChange={(e) => setDeepDiveQuestions(e.target.value)}
                          placeholder="Optional — leave blank to generate automatically"
                          style={{ width: '100%', background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div className="flex gap-3 items-center">
                        <ActionBtn onClick={launchDeepDive} disabled={!deepDiveFocus.trim()} variant="teal">
                          Launch Deep Dive →
                        </ActionBtn>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                          Runs 3–5 min. Synthesis includes all prior sessions.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── EDITORIAL TAB ────────────────────────────────────────────── */}
            {activeTab === 'editorial' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <MonoLabel>Editorial Review</MonoLabel>
                  <ActionBtn onClick={runEditorialReview} disabled={editorialRunning || !dossier.published}>
                    {editorialRunning ? 'Running…' : dossier.published ? '↺ Re-run Review' : 'Publish first'}
                  </ActionBtn>
                  {editorialMsg && <StatusMsg msg={editorialMsg} />}
                </div>

                {editorialData === null && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>Loading…</p>
                )}
                {editorialData !== null && editorialData.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    {dossier.published ? 'No editorial review found for this dossier. Run a review to generate flags.' : 'Publish this dossier first, then run an editorial review.'}
                  </p>
                )}
                {editorialData !== null && editorialData.length > 0 && (() => {
                  const item = editorialData[0];
                  const flags = item.editorial_review?.flags ?? [];
                  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                  const sorted = [...flags].sort((a, b) => (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2));
                  return (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                          Quality: <span style={{ color: item.quality_level === 'high' ? 'var(--status-complete)' : item.quality_level === 'medium' ? 'var(--status-running)' : 'var(--status-failed)' }}>
                            {item.quality_level ?? 'unknown'}
                          </span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                          · {flags.length} flag{flags.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {flags.length === 0 ? (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--status-complete)' }}>No flags — editorial review clean.</p>
                      ) : (
                        <div className="space-y-2">
                          {sorted.map((flag, i) => {
                            const sevColor = flag.severity === 'high' ? 'var(--status-failed)' : flag.severity === 'medium' ? 'var(--status-running)' : 'var(--color-text-tertiary)';
                            return (
                              <div key={i} style={{ border: `1px solid ${sevColor}`, background: 'var(--color-ground-light)', borderRadius: '3px', padding: '10px 12px' }}>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: sevColor, border: `1px solid ${sevColor}`, padding: '1px 5px', borderRadius: '2px' }}>
                                    {flag.severity}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-secondary)' }}>{flag.type}</span>
                                  {flag.section && (
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)' }}>§ {flag.section}</span>
                                  )}
                                </div>
                                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>
                                  {flag.issue}
                                </p>
                                {flag.excerpt && (
                                  <blockquote style={{ borderLeft: '2px solid var(--color-border)', paddingLeft: '8px', fontFamily: 'var(--font-serif)', fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-tertiary)', margin: '0 0 6px' }}>
                                    "{flag.excerpt}"
                                  </blockquote>
                                )}
                                {flag.suggested_fix && (
                                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-teal)', marginTop: '4px' }}>
                                    Fix: {flag.suggested_fix}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── MEDIA TAB ────────────────────────────────────────────────── */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {/* Action bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionBtn onClick={searchImages} disabled={searching}>
                    {searching ? 'Searching…' : '⊕ Search Archives'}
                  </ActionBtn>
                  <ActionBtn onClick={generateHeroImages} disabled={generating}>
                    {generating ? 'Generating…' : '✦ Generate AI Hero'}
                  </ActionBtn>
                  <label
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
                  >
                    ↑ Upload
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                    />
                  </label>
                  <ActionBtn onClick={reloadImages}>↺ Refresh</ActionBtn>
                </div>

                {/* Hero generation steering — keywords + optional reference image.
                    House style/art direction is always preserved; these only influence subject/composition. */}
                <div style={{ border: '1px solid var(--color-border)', borderRadius: '3px', padding: '10px', background: 'var(--color-ground-light)' }}>
                  <MonoLabel>AI Hero — steering (optional)</MonoLabel>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={heroKeywords}
                      onChange={(e) => setHeroKeywords(e.target.value)}
                      placeholder="Keywords to influence subject/mood (e.g. towering winged figures, ziggurat, ominous)"
                      style={{ flex: '1 1 320px', minWidth: '240px', fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-text-primary)', background: 'var(--color-ground)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '6px 8px' }}
                    />
                    <label
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', padding: '6px 10px', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      ↑ Reference image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const r = new FileReader();
                          r.onload = () => setHeroReference({ dataUrl: String(r.result), name: f.name });
                          r.readAsDataURL(f);
                        }}
                      />
                    </label>
                    {heroReference && (
                      <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-secondary)' }}>
                        <img src={heroReference.dataUrl} alt="reference" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '2px' }} />
                        <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{heroReference.name}</span>
                        <button onClick={() => setHeroReference(null)} style={{ color: 'var(--color-text-tertiary)' }}>✕</button>
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                    Upload only images you have the right to use — the reference guides composition; the output is a new AI image in the house style.
                  </p>
                </div>

                {(searchMsg || generateMsg || uploadMsg) && (
                  <StatusMsg msg={searchMsg || generateMsg || uploadMsg} />
                )}

                {/* Images grid */}
                {images === null && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>Loading…</p>}
                {images !== null && images.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    No images yet. Search archives or generate AI hero images.
                  </p>
                )}
                {images !== null && images.length > 0 && (() => {
                  const suggested = images.filter((i) => i.status === 'suggested');
                  const approved  = images.filter((i) => i.status === 'approved');
                  const sections: Array<{ label: string; items: TopicImage[] }> = [
                    { label: `Approved (${approved.length})`, items: approved },
                    { label: `Suggested (${suggested.length})`, items: suggested },
                  ].filter((s) => s.items.length > 0);
                  return sections.map((section) => (
                    <div key={section.label}>
                      <MonoLabel>{section.label}</MonoLabel>
                      <div className="space-y-2 mt-2">
                        {section.items.map((img) => (
                          <div key={img.id} style={{ display: 'flex', gap: '12px', border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '10px', alignItems: 'flex-start' }}>
                            {(img.thumbnail_url || img.image_url) && (
                              <button
                                onClick={() => setModalImage(img)}
                                title="Click to enlarge and see prompt + context"
                                style={{ position: 'relative', padding: 0, border: 0, background: 'none', cursor: 'zoom-in', flexShrink: 0, borderRadius: '2px', overflow: 'hidden' }}
                              >
                                <img
                                  src={img.cropped_url || img.thumbnail_url || img.image_url}
                                  alt={img.title}
                                  style={{ width: '80px', height: '60px', objectFit: 'cover', display: 'block', borderRadius: '2px' }}
                                />
                                <span style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '9px', lineHeight: 1, padding: '2px 3px', borderRadius: '2px' }}>⤢</span>
                              </button>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {img.title}
                              </p>
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                {img.source}{img.width && img.height ? ` · ${img.width}×${img.height}` : ''}{img.quality_score ? ` · Q${img.quality_score}` : ''}
                              </p>
                              {img.gemini_caption && (
                                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--admin-label)', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginBottom: '4px' }}>{img.gemini_caption}</p>
                              )}
                              {img.gemini_tweaks && img.gemini_tweaks.includes('crop:') && (
                                <div style={{ marginBottom: '4px' }}>
                                  <ActionBtn onClick={() => applyCrop(img)} disabled={cropStatus[img.id] === 'cropping…'}>
                                    {cropStatus[img.id] ?? '✂ Apply Crop Hint'}
                                  </ActionBtn>
                                </div>
                              )}
                              <div className="flex gap-2 flex-wrap mt-1">
                                {img.status === 'suggested' && (
                                  <ActionBtn onClick={() => updateImage(img.id, { status: 'approved' })} variant="gold">
                                    ✓ Approve
                                  </ActionBtn>
                                )}
                                {img.status === 'approved' && (
                                  <ActionBtn onClick={() => updateImage(img.id, { status: 'suggested' })}>
                                    ↩ Unset
                                  </ActionBtn>
                                )}
                                <ActionBtn onClick={() => updateImage(img.id, { featured: !img.featured })} variant={img.featured ? 'gold' : 'default'}>
                                  {img.featured ? '★ Hero' : '☆ Set Hero'}
                                </ActionBtn>
                                {img.source_page_url && (
                                  <a href={img.source_page_url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '5px 10px', borderRadius: '3px' }}>
                                    Source →
                                  </a>
                                )}
                              </div>
                              {img.license && (
                                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: img.license.toLowerCase().includes('public domain') ? 'var(--status-complete)' : 'var(--color-text-tertiary)', marginTop: '4px' }}>
                                  {img.license}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* ── ENTITIES TAB ─────────────────────────────────────────────── */}
            {activeTab === 'entities' && (
              <div className="space-y-4">
                {/* Extract / refresh */}
                <div className="flex items-center gap-3 flex-wrap">
                  {sessionId ? (
                    <>
                      <ActionBtn onClick={extractEntities} disabled={extracting} variant="gold">
                        {extracting ? 'Extracting…' : '⬦ Extract Entities'}
                      </ActionBtn>
                      <ActionBtn onClick={loadEntities}>↺ Refresh</ActionBtn>
                    </>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                      No complete session found for this topic — run research first.
                    </p>
                  )}
                  {extractMsg && <StatusMsg msg={extractMsg} />}
                </div>

                {/* People */}
                {entities !== null && entities.people.length > 0 && (
                  <div>
                    <MonoLabel>People ({entities.people.length})</MonoLabel>
                    <div className="space-y-2 mt-2">
                      {entities.people.map((p) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '10px 12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{p.full_name}</span>
                              <StatusBadge status={p.status} />
                            </div>
                            {p.topic_role && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-gold)', marginBottom: '2px' }}>{p.topic_role}</div>}
                            {p.short_bio && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{p.short_bio}</div>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
                            {p.status === 'needs_review' && (
                              <>
                                <ActionBtn onClick={() => researchAndAddEntity('person', p)} disabled={Boolean(researchStatus[p.id]) && !researchStatus[p.id].includes('failed')}>
                                  {researchStatus[p.id] ?? 'Research & Add'}
                                </ActionBtn>
                                <ActionBtn onClick={() => promoteEntity('person', p.id)} disabled={entityStatuses[p.id] === 'saving…'} variant="teal">
                                  {entityStatuses[p.id] ?? 'To Draft'}
                                </ActionBtn>
                              </>
                            )}
                            {p.status === 'published' && p.slug && (
                              <a href={`/people/${p.slug}`} target="_blank" rel="noopener noreferrer"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--status-complete)', border: '1px solid var(--status-complete)', padding: '4px 8px', borderRadius: '3px', textDecoration: 'none' }}>
                                View →
                              </a>
                            )}
                            <ActionBtn onClick={() => skipEntity('person', p.id)} variant="danger">Skip</ActionBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Institutions */}
                {entities !== null && entities.institutions.length > 0 && (
                  <div>
                    <MonoLabel>Institutions ({entities.institutions.length})</MonoLabel>
                    <div className="space-y-2 mt-2">
                      {entities.institutions.map((inst) => (
                        <div key={inst.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '10px 12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{inst.name}</span>
                              <StatusBadge status={inst.status} />
                            </div>
                            {inst.topic_role && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-gold)', marginBottom: '2px' }}>{inst.topic_role}</div>}
                            {inst.short_bio && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{inst.short_bio}</div>}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', flexShrink: 0 }}>
                            {inst.status === 'needs_review' && (
                              <>
                                <ActionBtn onClick={() => researchAndAddEntity('institution', inst)} disabled={Boolean(researchStatus[inst.id]) && !researchStatus[inst.id].includes('failed')}>
                                  {researchStatus[inst.id] ?? 'Research & Add'}
                                </ActionBtn>
                                <ActionBtn onClick={() => promoteEntity('institution', inst.id)} disabled={entityStatuses[inst.id] === 'saving…'} variant="teal">
                                  {entityStatuses[inst.id] ?? 'To Draft'}
                                </ActionBtn>
                              </>
                            )}
                            {inst.status === 'published' && inst.slug && (
                              <a href={`/institutions/${inst.slug}`} target="_blank" rel="noopener noreferrer"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--status-complete)', border: '1px solid var(--status-complete)', padding: '4px 8px', borderRadius: '3px', textDecoration: 'none' }}>
                                View →
                              </a>
                            )}
                            <ActionBtn onClick={() => skipEntity('institution', inst.id)} variant="danger">Skip</ActionBtn>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entities !== null && entities.people.length === 0 && entities.institutions.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    No entities extracted yet. Click "Extract Entities" above.
                  </p>
                )}
                {entities === null && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    {sessionId ? 'Loading entities…' : 'No complete session found.'}
                  </p>
                )}
              </div>
            )}

            {/* ── AUDIO TAB ────────────────────────────────────────────────── */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                {audioUrl ? (
                  <div className="space-y-3">
                    <audio controls src={audioUrl} style={{ width: '100%', height: '40px' }} />
                    {audioGeneratedAt && (
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)' }}>
                        Generated {new Date(audioGeneratedAt).toLocaleDateString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <ActionBtn onClick={generateAudio} disabled={audioGenerating}>
                        {audioGenerating ? 'Regenerating…' : '↻ Regenerate'}
                      </ActionBtn>
                      <ActionBtn onClick={deleteAudio} variant="danger">Delete</ActionBtn>
                    </div>
                  </div>
                ) : audioUrl === undefined ? (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>Loading…</p>
                ) : (
                  <ActionBtn onClick={generateAudio} disabled={audioGenerating} variant="gold">
                    {audioGenerating ? '⏳ Generating…' : '▶ Generate Podcast Audio'}
                  </ActionBtn>
                )}
                {audioMsg && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: audioMsg.startsWith('Failed') ? 'var(--status-failed)' : 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
                    {audioMsg}
                  </p>
                )}
              </div>
            )}

            {/* ── SOCIAL TAB ───────────────────────────────────────────────── */}
            {activeTab === 'social' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <ActionBtn onClick={generateSocial} disabled={socialGenerating} variant="gold">
                    {socialGenerating ? 'Generating…' : socialPieces && socialPieces.length > 0 ? '↺ Regenerate Social Package' : '✦ Generate Social Package'}
                  </ActionBtn>
                  <a href="/admin" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', textDecoration: 'none', border: '1px solid var(--color-border)', padding: '5px 10px', borderRadius: '3px' }}>
                    → Manage in Social Queue
                  </a>
                  {socialMsg && <StatusMsg msg={socialMsg} />}
                </div>

                {socialPieces === null && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>Loading…</p>
                )}
                {socialPieces !== null && socialPieces.length === 0 && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label)', color: 'var(--color-text-tertiary)' }}>
                    No social content yet. Generate a package above.
                  </p>
                )}
                {socialPieces !== null && socialPieces.length > 0 && (() => {
                  const byPlatform = socialPieces.reduce<Record<string, SocialPiece[]>>((acc, p) => {
                    (acc[p.platform] = acc[p.platform] ?? []).push(p);
                    return acc;
                  }, {});
                  const byStatus = socialPieces.reduce<Record<string, number>>((acc, p) => {
                    acc[p.status] = (acc[p.status] ?? 0) + 1;
                    return acc;
                  }, {});
                  return (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {Object.entries(byStatus).map(([st, count]) => (
                          <div key={st} style={{ border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '8px 12px', textAlign: 'center' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{count}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{st}</div>
                          </div>
                        ))}
                      </div>
                      {/* Per platform */}
                      {Object.entries(byPlatform).map(([platform, pieces]) => (
                        <div key={platform}>
                          <MonoLabel>{platform} ({pieces.length})</MonoLabel>
                          <div className="space-y-1 mt-2">
                            {pieces.map((piece) => (
                              <div key={piece.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '8px 12px' }}>
                                <StatusBadge status={piece.status} />
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                                  {piece.content_type}
                                </span>
                                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: 'var(--color-text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {piece.text_content?.slice(0, 120) ?? '—'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── SETTINGS TAB ─────────────────────────────────────────────── */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Visual Strategy */}
                {typeof output?.visual_strategy === 'string' ? (
                  <div>
                    <MonoLabel>Visual Strategy — Hero Image Prompts</MonoLabel>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--admin-label)', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: 'var(--color-ground-light)', border: '1px solid var(--color-border)', borderRadius: '3px', padding: '12px', maxHeight: '300px', overflowY: 'auto', marginTop: '8px' }}>
                      {output.visual_strategy as string}
                    </pre>
                    <div className="mt-2">
                      <ActionBtn onClick={async () => {
                        await navigator.clipboard.writeText(output.visual_strategy as string);
                      }}>
                        Copy All
                      </ActionBtn>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                        Paste into Grok Imagine or Gemini. All prompts are 16:9.
                      </p>
                    </div>
                  </div>
                ) : output ? (
                  <div>
                    <MonoLabel>Visual Strategy</MonoLabel>
                    <div className="flex items-center gap-3 mt-2">
                      <ActionBtn onClick={async () => {
                        const res = await fetch('/api/admin/visual-strategy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ topic }),
                        });
                        if (res.ok) loadDossier();
                      }}>
                        + Generate Visual Strategy
                      </ActionBtn>
                    </div>
                  </div>
                ) : null}

                {/* Component Recommendations */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <MonoLabel>Interactive Components</MonoLabel>
                    {(dossier.recommended_components ?? []).length === 0 ? (
                      <ActionBtn onClick={generateComponentRecs} disabled={componentGenStatus === 'generating…'}>
                        {componentGenStatus === 'generating…' ? 'Generating…' : '+ Generate Recommendations'}
                      </ActionBtn>
                    ) : null}
                    {componentGenStatus === 'error' && <StatusMsg msg="error" />}
                  </div>
                  {(dossier.recommended_components ?? []).length > 0 && (
                    <div className="space-y-2">
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}>
                        Enable to show on the published report.
                      </p>
                      {(dossier.selected_components?.length ? dossier.selected_components : dossier.recommended_components ?? []).map((comp) => (
                        <div key={comp.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', border: '1px solid var(--color-border)', background: 'var(--color-ground-light)', borderRadius: '3px', padding: '10px 12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-primary)' }}>{comp.label}</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px', lineHeight: 1.4 }}>{comp.reason}</p>
                            {componentStatus[comp.id] && (
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-teal)', marginTop: '4px' }}>{componentStatus[comp.id]}</p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleComponent(comp.id, !comp.enabled)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', flexShrink: 0, background: comp.enabled ? 'var(--color-teal-dim)' : 'transparent', color: comp.enabled ? 'var(--color-teal)' : 'var(--color-text-tertiary)', borderColor: comp.enabled ? 'var(--color-teal)' : 'var(--color-border)' }}
                          >
                            {comp.enabled ? 'Enabled ✓' : 'Disabled'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right panel: Publish Readiness Checklist */}
          <div
            style={{
              width: '220px',
              flexShrink: 0,
              borderLeft: '1px solid var(--color-border)',
              padding: '24px 16px',
              position: 'sticky',
              top: 0,
              height: '100vh',
              overflowY: 'auto',
              background: 'var(--color-ground-light)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
              Publish Readiness
            </p>
            <ReadinessChecklist items={checklist} />
            {checklist.length > 0 && (
              <div style={{ marginTop: '16px', padding: '8px 10px', background: allPass ? 'var(--status-complete-bg)' : 'var(--color-ground)', border: `1px solid ${allPass ? 'var(--status-complete)' : 'var(--color-border)'}`, borderRadius: '3px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: allPass ? 'var(--status-complete)' : 'var(--color-text-tertiary)' }}>
                  {allPass ? 'All systems go.' : 'Review items above before publishing.'}
                </p>
              </div>
            )}

            {/* Quick links */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>
                Actions
              </p>
              {[
                ['overview',  'Edit Overview'],
                ['research',  'Research'],
                ['media',     'Media'],
                ['entities',  'Entities'],
                ['audio',     'Audio'],
                ['social',    'Social'],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as WorkshopTab)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-sm)', color: activeTab === tab ? 'var(--color-gold)' : 'var(--color-text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '3px 0', transition: 'color 0.1s' }}
                  onMouseEnter={(e) => { if (activeTab !== tab) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={(e) => { if (activeTab !== tab) (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-secondary)'; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </AdminShell>
    </div>
  );
}
