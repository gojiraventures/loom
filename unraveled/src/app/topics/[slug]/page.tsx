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
    title: dossier.title ?? topic,
    description: dossier.summary?.slice(0, 160),
  };
}

// Pick the right viz data per topic
function getVizNarratives(slug: string) {
  switch (slug) {
    case 'the-great-flood': return FLOOD_NARRATIVES;
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

  const vizNarratives = getVizNarratives(slug);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            {output.jaw_drop_layers.map((layer) => (
              <div key={layer.level} className="flex gap-0 border border-border bg-ground-light/20">
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
                {output.advocate_case.split('\n\n').filter(Boolean).map((p, i) => (
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
                {output.skeptic_case.split('\n\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="text-sm text-text-secondary leading-[1.8]">
                    {p.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
                        {s.source_type.replace(/_/g, ' ')}
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
