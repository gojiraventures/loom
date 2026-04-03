import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ConvergenceScore } from '@/components/ui/ConvergenceScore';
import { ConvergenceMap } from '@/components/viz/ConvergenceMap';
import { NarrativeTimeline } from '@/components/viz/NarrativeTimeline';
import { SharedElementsGrid } from '@/components/viz/SharedElementsGrid';
import { TraditionNetwork } from '@/components/viz/TraditionNetwork';
import { getDossier } from '@/lib/research/storage/dossiers';
import { slugToTopic } from '@/lib/topics';
import { FLOOD_NARRATIVES } from '@/lib/viz/topics/flood';
import { getTopicMedia } from '@/lib/research/intelligence/gatherer';
import { MediaSection } from '@/components/media/MediaSection';
import type { SynthesizedOutput } from '@/lib/research/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await slugToTopic(slug);
  if (!topic) return {};
  const dossier = await getDossier(topic);
  if (!dossier) return {};
  return {
    title: dossier.title ? `${dossier.title} — UnraveledTruth` : topic,
    description: dossier.summary?.slice(0, 160),
  };
}

// Pick the right viz data per topic
function getVizNarratives(slug: string) {
  switch (slug) {
    case 'the-great-flood':
    case 'the-great-flood-cross-civilizational-evidence':
      return FLOOD_NARRATIVES;
    default: return [];
  }
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await slugToTopic(slug);
  if (!topic) notFound();

  const dossier = await getDossier(topic);
  if (!dossier) notFound();

  const output = dossier.synthesized_output as SynthesizedOutput;
  if (!output) notFound();

  // Fetch approved media (anchors + discovered) — ordered: anchors first, then by quality
  const mediaItems = await getTopicMedia(topic);

  // Fetch approved images + audio
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const [{ data: topicImages }, { data: dossierAudio }] = await Promise.all([
    supabase
      .from('topic_images')
      .select('id, title, description, image_url, thumbnail_url, cropped_url, source_page_url, license, license_url, attribution, author, width, height, featured, hero_position, gemini_caption')
      .eq('topic', topic)
      .eq('status', 'approved')
      .order('featured', { ascending: false })
      .order('quality_score', { ascending: false })
      .limit(12),
    supabase
      .from('topic_dossiers')
      .select('audio_url')
      .eq('topic', topic)
      .single(),
  ]);

  const approvedImages = topicImages ?? [];
  // Hero: featured image or first approved; excluded from the gallery grid below
  const heroImage = approvedImages.find((i) => i.featured) ?? approvedImages[0] ?? null;
  const galleryImages = heroImage
    ? approvedImages.filter((i) => i.id !== heroImage.id)
    : [];
  const audioUrl = dossierAudio?.audio_url ?? null;

  const vizNarratives = getVizNarratives(slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {heroImage ? (
        <section className="relative border-b border-border overflow-hidden" style={{ aspectRatio: '16/7' }}>
          {/* Hero image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroImage.cropped_url ?? heroImage.image_url}
            alt={heroImage.gemini_caption ?? heroImage.title}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: heroImage.hero_position ?? 'center' }}
          />

          {/* Always-dark scrim — mode-independent, ensures legibility on any image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-end px-6 pb-6 pt-16">
            <div className="max-w-[var(--spacing-content)] mx-auto w-full">
              <div className="flex items-end justify-between gap-8">
                {/* Text block — frosted glass card for extra legibility on busy images */}
                <div className="flex-1 rounded bg-black/40 backdrop-blur-[2px] px-5 py-4 max-w-3xl">
                  <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-white/50 block mb-2">
                    Convergence Topic
                  </span>
                  <h1 className="font-serif text-[clamp(20px,3.8vw,46px)] font-normal leading-[1.05] tracking-tight mb-2 text-white drop-shadow-sm">
                    {output.title}
                  </h1>
                  <p className="text-sm text-white/75 leading-relaxed mb-3 max-w-2xl">
                    {output.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {output.traditions_analyzed.map((t) => (
                      <span key={t} className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 border border-white/20 text-white/55 bg-white/5">
                        {t}
                      </span>
                    ))}
                  </div>
                  {/* Attribution */}
                  <p className="font-mono text-[7px] text-white/25 mt-3">
                    {heroImage.author ? `${heroImage.author} · ` : ''}{heroImage.license ?? 'Open license'}
                    {heroImage.source_page_url && (
                      <a href={heroImage.source_page_url} target="_blank" rel="noopener noreferrer" className="ml-1 hover:text-white/45 transition-colors">↗</a>
                    )}
                  </p>
                </div>
                {/* Convergence score — frosted pill */}
                <div className="shrink-0 flex flex-col items-center gap-1.5 pb-1 bg-black/40 backdrop-blur-[2px] rounded px-4 py-3">
                  <ConvergenceScore score={output.convergence_score} size={64} />
                  <span className="font-mono text-[7px] tracking-[0.15em] uppercase text-white/50 text-center">
                    Convergence<br />Score
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="px-6 pt-16 pb-12 border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Convergence Topic
            </span>
            <div className="flex items-start justify-between gap-8 mt-4">
              <div className="flex-1">
                <h1 className="font-serif text-[clamp(28px,5vw,54px)] font-normal leading-[1.05] tracking-tight mb-3">
                  {output.title}
                </h1>
                <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mb-5">
                  {output.subtitle}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {output.traditions_analyzed.map((t) => (
                    <span key={t} className="font-mono text-[9px] tracking-wider uppercase px-2 py-0.5 border border-border text-text-tertiary">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-center gap-1.5 pt-2">
                <ConvergenceScore score={output.convergence_score} size={72} />
                <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary text-center">
                  Convergence<br />Score
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Podcast Audio ────────────────────────────────────────────────── */}
      {audioUrl && (
        <section className="border-b border-border bg-ground-light/20">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-5 flex items-center gap-4">
            <div className="shrink-0">
              <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Listen</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-gold">Audio Overview</span>
            </div>
            <audio
              controls
              src={audioUrl}
              className="flex-1 h-9 accent-gold"
              preload="metadata"
            />
          </div>
        </section>
      )}

      {/* Images are distributed inline between content sections below */}

      {/* ── World Map ─────────────────────────────────────────────────────── */}
      {vizNarratives.length > 0 && (
        <section className="border-b border-border" data-dark>
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-6">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Geographic Spread
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-3">
              Watch the Narratives Light Up Across the Globe
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-6">
              If flood narratives spread by cultural contact, they should cluster along known trade and migration routes. Instead they appear in geographically isolated populations — Aboriginal Australia, the American Southwest, sub-Saharan Africa, and the Andes — separated by oceans and millennia. Drag the time scrubber to watch when each tradition first documented the event. Click any marker for the source.
            </p>
          </div>
          <div className="max-w-5xl mx-auto px-6 pb-12">
            <ConvergenceMap narratives={vizNarratives} />
          </div>
        </section>
      )}

      {/* ── Timeline ────────────────────────────────────────────────────── */}
      {vizNarratives.length > 0 && (
        <section className="border-b border-border" data-dark>
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-6">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Chronology
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-3">
              When Each Tradition Documented the Event
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-6">
              For diffusion to explain shared narrative structure, the story must travel before it's recorded. This timeline shows the documented dates for each tradition — including oral traditions whose geological corroboration allows independent dating. Scroll right for the full picture. Click any marker to see the source.
            </p>
          </div>
          <div className="px-6 pb-12">
            <div className="border border-border">
              <NarrativeTimeline narratives={vizNarratives} />
            </div>
          </div>
        </section>
      )}

      {/* ── Jaw-Drop Layers ──────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            The Evidence
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-2">
            What Should Surprise You
          </h2>
          <p className="text-text-secondary mb-8 max-w-xl text-sm">
            Ordered by how difficult each finding is to explain away.
          </p>
          <div className="space-y-px">
            {output.jaw_drop_layers.map((layer, i) => (
              <div key={i} className="flex gap-0 border border-border bg-ground-light/20">
                {/* Level indicator bar */}
                <div
                  className="w-1 shrink-0"
                  style={{
                    background: layer.level <= 2
                      ? 'var(--color-gold)'
                      : layer.level <= 4
                      ? 'rgba(200,149,108,0.5)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
                <div className="flex-1 p-5">
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-[11px] text-gold shrink-0 mt-0.5 w-5">
                      {String(layer.level).padStart(2, '0')}
                    </span>
                    <div className="flex-1">
                      <h3 className="font-serif text-lg sm:text-xl mb-2.5">{layer.title}</h3>
                      <p className="text-sm text-text-secondary leading-[1.8] mb-3">
                        {layer.content}
                      </p>
                      <p className="font-mono text-[11px] text-gold/80 border-l-2 border-gold/25 pl-3 italic">
                        {layer.evidence_hook}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inline image 1 — after Evidence ─────────────────────────────── */}
      {galleryImages[0] && (
        <figure className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-6">
            <a href={galleryImages[0].source_page_url ?? galleryImages[0].image_url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden">
              <div className="aspect-[16/7] overflow-hidden bg-ground-light/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryImages[0].cropped_url ?? galleryImages[0].image_url}
                  alt={galleryImages[0].gemini_caption ?? galleryImages[0].title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ objectPosition: galleryImages[0].hero_position ?? 'center' }}
                />
              </div>
            </a>
            <figcaption className="py-3 flex items-start justify-between gap-4">
              <p className="text-xs text-text-secondary leading-snug max-w-2xl">
                {galleryImages[0].gemini_caption ?? galleryImages[0].title}
              </p>
              <p className="font-mono text-[8px] text-text-tertiary shrink-0 text-right">
                {galleryImages[0].author ? `${galleryImages[0].author} · ` : ''}{galleryImages[0].license ?? 'Open license'}
              </p>
            </figcaption>
          </div>
        </figure>
      )}

      {/* ── Executive Summary ────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            Research Summary
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-6">What the Pipeline Found</h2>
          <div className="space-y-4">
            {output.executive_summary.split('\n\n').map((p, i) => (
              <p key={i} className="text-sm text-text-secondary leading-[1.85]">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inline image 2 — after Summary ──────────────────────────────── */}
      {galleryImages[1] && (
        <figure className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-6">
            <a href={galleryImages[1].source_page_url ?? galleryImages[1].image_url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden">
              <div className="aspect-[16/7] overflow-hidden bg-ground-light/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryImages[1].cropped_url ?? galleryImages[1].image_url}
                  alt={galleryImages[1].gemini_caption ?? galleryImages[1].title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ objectPosition: galleryImages[1].hero_position ?? 'center' }}
                />
              </div>
            </a>
            <figcaption className="py-3 flex items-start justify-between gap-4">
              <p className="text-xs text-text-secondary leading-snug max-w-2xl">
                {galleryImages[1].gemini_caption ?? galleryImages[1].title}
              </p>
              <p className="font-mono text-[8px] text-text-tertiary shrink-0 text-right">
                {galleryImages[1].author ? `${galleryImages[1].author} · ` : ''}{galleryImages[1].license ?? 'Open license'}
              </p>
            </figcaption>
          </div>
        </figure>
      )}

      {/* ── Advocate vs Skeptic ──────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            The Debate
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-8">Two Cases. You Decide.</h2>
          <div className="grid sm:grid-cols-2 gap-px border border-border">
            <div className="p-6 bg-ground-light/20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-teal" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-teal">The Advocate</span>
              </div>
              <div className="space-y-3">
                {(output.advocate_case ?? '').split('\n\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="text-sm text-text-secondary leading-[1.8]">
                    {p.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                ))}
              </div>
            </div>
            <div className="p-6 bg-ground-light/20 border-t sm:border-t-0 sm:border-l border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold">The Skeptic</span>
              </div>
              <div className="space-y-3">
                {(output.skeptic_case ?? '').split('\n\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="text-sm text-text-secondary leading-[1.8]">
                    {p.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Inline image 3 — after Debate ───────────────────────────────── */}
      {galleryImages[2] && (
        <figure className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-6">
            <a href={galleryImages[2].source_page_url ?? galleryImages[2].image_url} target="_blank" rel="noopener noreferrer" className="block group overflow-hidden">
              <div className="aspect-[16/7] overflow-hidden bg-ground-light/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryImages[2].cropped_url ?? galleryImages[2].image_url}
                  alt={galleryImages[2].gemini_caption ?? galleryImages[2].title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ objectPosition: galleryImages[2].hero_position ?? 'center' }}
                />
              </div>
            </a>
            <figcaption className="py-3 flex items-start justify-between gap-4">
              <p className="text-xs text-text-secondary leading-snug max-w-2xl">
                {galleryImages[2].gemini_caption ?? galleryImages[2].title}
              </p>
              <p className="font-mono text-[8px] text-text-tertiary shrink-0 text-right">
                {galleryImages[2].author ? `${galleryImages[2].author} · ` : ''}{galleryImages[2].license ?? 'Open license'}
              </p>
            </figcaption>
          </div>
        </figure>
      )}

      {/* ── Shared Elements + Network ─────────────────────────────────────── */}
      {output.shared_elements_matrix.length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Pattern Analysis
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-3">Shared Structural Elements</h2>
            <p className="text-text-secondary mb-8 max-w-xl text-sm">
              Theme alone is not convergence — structure is. These specific narrative elements appear independently across isolated traditions.
            </p>

            {/* Grid */}
            <div className="border border-border overflow-x-auto mb-10">
              <div className="p-4">
                <SharedElementsGrid matrix={output.shared_elements_matrix} />
              </div>
            </div>

            {/* Network */}
            <div className="grid sm:grid-cols-2 gap-6 items-start">
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-3">
                  Tradition Connections
                </p>
                <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                  Node size = number of shared elements. Edge thickness = strength of connection. Click any tradition to see what it shares.
                </p>
                <div className="border border-border p-4">
                  <TraditionNetwork matrix={output.shared_elements_matrix} />
                </div>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-3">
                  Key Findings
                </p>
                <div className="space-y-2">
                  {output.key_findings.map((kf, i) => (
                    <div key={i} className="flex gap-3 p-3 border border-border bg-ground-light/20">
                      <span
                        className="font-mono text-[11px] font-bold shrink-0 mt-0.5"
                        style={{
                          color: kf.confidence >= 0.75 ? 'var(--color-teal)' : kf.confidence >= 0.5 ? 'var(--color-gold)' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {Math.round(kf.confidence * 100)}%
                      </span>
                      <div>
                        <p className="text-xs text-text-secondary leading-relaxed">{kf.finding}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {kf.evidence_types.map((et) => (
                            <span key={et} className="font-mono text-[8px] tracking-wider uppercase text-text-tertiary border border-border/60 px-1">
                              {et}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How Cultures Describe ────────────────────────────────────────── */}
      {Object.keys(output.how_cultures_describe).length > 0 && (
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              In Their Own Words
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-8">How Each Tradition Tells It</h2>
            <div className="grid sm:grid-cols-2 gap-px border border-border">
              {Object.entries(output.how_cultures_describe).map(([tradition, description]) => (
                <div key={tradition} className="p-5 bg-ground-light/20 border-b border-r border-border">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-2">
                    {tradition}
                  </span>
                  <p className="text-sm text-text-secondary leading-[1.75]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Watch & Listen ───────────────────────────────────────────────── */}
      {mediaItems.length > 0 && (
        <MediaSection items={mediaItems.map((m) => ({
          id: m.id,
          type: m.type as 'youtube' | 'podcast' | 'article' | 'reddit_thread' | 'documentary',
          title: m.title,
          description: m.description ?? null,
          url: m.url,
          embed_url: m.embed_url ?? null,
          thumbnail_url: m.thumbnail_url ?? null,
          channel_name: m.channel_name ?? null,
          channel_subscriber_count: m.channel_subscriber_count ?? null,
          view_count: m.view_count ?? null,
          duration_seconds: m.duration_seconds ?? null,
          published_at: m.published_at ?? null,
          quality_score: m.quality_score ?? 0.5,
          is_anchor: m.is_anchor ?? false,
          featured: m.featured ?? false,
        }))} />
      )}

      {/* ── Open Questions ───────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            Unresolved
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-3">Open Questions</h2>
          <p className="text-text-secondary mb-6 max-w-xl text-sm">
            What neither the Advocate nor the Skeptic can fully explain.
          </p>
          <div className="space-y-px">
            {output.open_questions.map((q, i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-border/50 last:border-b-0">
                <span className="font-mono text-[9px] text-gold shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Remaining images — small grid before sources ─────────────────── */}
      {galleryImages.length > 3 && (
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-8 pb-6">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Primary Sources
            </span>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {galleryImages.slice(3).map((img) => (
                <a
                  key={img.id}
                  href={img.source_page_url ?? img.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden border border-border"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-ground-light/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.cropped_url ?? img.thumbnail_url ?? img.image_url}
                      alt={img.gemini_caption ?? img.title}
                      className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ objectPosition: img.hero_position ?? 'center' }}
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                    <p className="font-mono text-[7px] text-white/60 leading-tight line-clamp-1">
                      {img.author ? `${img.author} · ` : ''}{img.license ?? 'Open license'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
            <p className="font-mono text-[8px] text-text-tertiary/50 mt-3">
              Images sourced under open licenses. Click any image for full attribution and source.
            </p>
          </div>
        </section>
      )}

      {/* ── Sources ──────────────────────────────────────────────────────── */}
      {output.sources.length > 0 && (
        <section>
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-16">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Sources
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-6">Primary References</h2>
            <div className="space-y-0">
              {output.sources.map((s, i) => (
                <div key={i} className="flex items-start gap-4 py-3 border-b border-border/40 last:border-b-0">
                  <span className="font-mono text-[9px] text-text-tertiary shrink-0 w-5 mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-secondary">
                      {s.author && <span className="text-text-primary">{s.author}. </span>}
                      <span className="italic">{s.title}</span>
                      {s.year && <span className="text-text-tertiary"> ({s.year})</span>}
                      {s.page_or_section && <span className="text-text-tertiary">, {s.page_or_section}</span>}
                    </span>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-[8px] tracking-wider uppercase text-text-tertiary border border-border px-1">
                        {(s.source_type ?? '').replace(/_/g, ' ')}
                      </span>
                      <CredibilityDots tier={s.credibility_tier} />
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[9px] text-gold/60 hover:text-gold truncate max-w-[200px]">
                          {s.url}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Creator attribution callout ──────────────────────────────────── */}
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 pb-10">
        <div className="border-t border-border/40 pt-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-mono text-[9px] text-text-tertiary">
            Want to use this research? Everything here is free with attribution.
          </p>
          <a
            href="/creators"
            className="font-mono text-[9px] text-gold/70 hover:text-gold transition-colors shrink-0"
          >
            See how →
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function CredibilityDots({ tier }: { tier: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: i <= tier ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </span>
  );
}
