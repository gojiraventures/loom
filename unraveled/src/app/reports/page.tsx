import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getPublishedTopics } from '@/lib/topics';
import { createServerSupabaseClient } from '@/lib/supabase';
import { TopicsGrid } from './TopicsGrid';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports — UnraveledTruth',
  robots: { index: false, follow: false },
};

async function getStats() {
  const supabase = createServerSupabaseClient();

  const [topicsResult, findingsResult] = await Promise.all([
    supabase
      .from('topic_dossiers')
      .select('key_traditions', { count: 'exact' })
      .eq('published', true),
    supabase
      .from('agent_findings')
      .select('*', { count: 'exact', head: true }),
  ]);

  const traditions = new Set<string>();
  for (const row of topicsResult.data ?? []) {
    for (const t of row.key_traditions ?? []) {
      traditions.add(t);
    }
  }

  return {
    topicCount: topicsResult.count ?? 0,
    findingCount: findingsResult.count ?? 0,
    traditionCount: traditions.size,
  };
}

type ImageMap = Record<string, { url: string; position: string }>;

async function getHeroImages(topics: Awaited<ReturnType<typeof getPublishedTopics>>): Promise<ImageMap> {
  const supabase = createServerSupabaseClient();
  const topicStrings = topics.map((t) => t.topic);
  if (topicStrings.length === 0) return {};

  const { data } = await supabase
    .from('topic_images')
    .select('topic, image_url, cropped_url, hero_position, featured')
    .in('topic', topicStrings)
    .eq('status', 'approved')
    .order('featured', { ascending: false });

  // Keep only the best image per topic (featured first, then first encountered)
  const map: ImageMap = {};
  for (const row of data ?? []) {
    if (!map[row.topic]) {
      const url = row.cropped_url ?? row.image_url;
      if (url) {
        map[row.topic] = {
          url,
          position: row.hero_position ?? 'center',
        };
      }
    }
  }
  return map;
}

export default async function ReportsPage() {
  const [topics, stats] = await Promise.all([
    getPublishedTopics(),
    getStats(),
  ]);

  const heroImages = await getHeroImages(topics);

  const topicsWithImages = topics.map((t) => ({
    ...t,
    heroImageUrl: heroImages[t.topic]?.url ?? null,
    heroPosition: heroImages[t.topic]?.position ?? 'center',
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Compact header — stats inline so cards are visible without scrolling */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-5 flex items-center justify-between gap-8">
          <div>
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary">Cross-Tradition Evidence Index</span>
            <h1 className="font-serif text-xl mt-0.5">All Reports</h1>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{stats.topicCount}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">Reports</div>
            </div>
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{stats.findingCount}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">Findings</div>
            </div>
            <div className="text-right">
              <div className="font-serif text-2xl text-gold">{stats.traditionCount}</div>
              <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-text-tertiary">Traditions</div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="px-6 py-8 flex-1">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <TopicsGrid topics={topicsWithImages} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
