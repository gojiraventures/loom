import { createServerSupabaseClient } from '@/lib/supabase';
import type { SynthesizedOutput } from '@/lib/research/types';

interface RelatedResearchProps {
  currentSlug: string;
  traditions: string[];
}

interface RelatedDossier {
  slug: string;
  topic: string;
  title: string;
  summary: string | null;
  score: number;
  traditions: string[];
  overlap: number;
  imageUrl: string | null;
}

export async function RelatedResearch({ currentSlug, traditions }: RelatedResearchProps) {
  if (traditions.length === 0) return null;

  const supabase = createServerSupabaseClient();

  const { data: rows } = await supabase
    .from('topic_dossiers')
    .select('topic, slug, title, summary, synthesized_output')
    .eq('published', true)
    .neq('slug', currentSlug)
    .limit(30);

  if (!rows || rows.length === 0) return null;

  // Compute overlap score
  const currentSet = new Set(traditions.map((t) => t.toLowerCase()));

  const candidates: RelatedDossier[] = rows
    .map((row) => {
      const output = row.synthesized_output as SynthesizedOutput | null;
      if (!output) return null;
      const rowTraditions = output.traditions_analyzed ?? [];
      const overlap = rowTraditions.filter((t) => currentSet.has(t.toLowerCase())).length;
      return {
        slug: row.slug as string,
        topic: row.topic as string,
        title: row.title ?? output.title,
        summary: row.summary,
        score: output.convergence_score ?? 0,
        traditions: rowTraditions,
        overlap,
        imageUrl: null as string | null,
      };
    })
    .filter((r): r is RelatedDossier => r !== null && r.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.score - a.score)
    .slice(0, 4);

  if (candidates.length === 0) return null;

  // Fetch hero images using the canonical topic strings (not slug-derived)
  const topics = candidates.map((c) => c.topic);
  const { data: images } = await supabase
    .from('topic_images')
    .select('image_url, cropped_url, thumbnail_url, topic')
    .eq('status', 'approved')
    .eq('featured', true)
    .in('topic', topics);

  const imageMap = new Map<string, string>();
  for (const img of images ?? []) {
    imageMap.set(img.topic as string, img.cropped_url ?? img.thumbnail_url ?? img.image_url);
  }

  for (const c of candidates) {
    c.imageUrl = imageMap.get(c.topic) ?? null;
  }

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
          Related Research
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-6">
          Topics That Share These Threads
        </h2>
        <div className="grid sm:grid-cols-2 gap-px border border-border">
          {candidates.map((item) => (
            <a
              key={item.slug}
              href={`/topics/${item.slug}`}
              className="group flex flex-col bg-ground-light hover:bg-ground-lighter transition-colors"
            >
              {/* Thumbnail */}
              <div className="relative h-[140px] overflow-hidden bg-ground-lighter">
                {item.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </>
                ) : null}
                {/* Score badge */}
                <div className="absolute top-3 right-3 font-mono text-[10px] bg-black/60 px-2 py-1 text-gold">
                  {item.score}/100
                </div>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col gap-2">
                <p className="font-serif text-base leading-snug group-hover:text-gold transition-colors">
                  {item.title}
                </p>
                {item.summary && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                  {item.traditions.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[7px] tracking-wider uppercase px-1.5 py-0.5 border border-border/60 text-text-tertiary"
                    >
                      {t}
                    </span>
                  ))}
                  {item.traditions.length > 4 && (
                    <span className="font-mono text-[7px] text-text-tertiary px-1">
                      +{item.traditions.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
