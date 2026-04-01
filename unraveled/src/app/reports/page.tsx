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

export default async function ReportsPage() {
  const [topics, stats] = await Promise.all([
    getPublishedTopics(),
    getStats(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Stats bar */}
      <section className="border-b border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8 grid grid-cols-3 gap-6">
          <div>
            <div className="font-serif text-3xl text-gold">{stats.topicCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">Reports</div>
          </div>
          <div>
            <div className="font-serif text-3xl text-gold">{stats.findingCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">Findings</div>
          </div>
          <div>
            <div className="font-serif text-3xl text-gold">{stats.traditionCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">Traditions</div>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <div className="mb-10">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Cross-Tradition Evidence Index
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl mt-2 mb-3">All Reports</h1>
            <p className="text-text-secondary max-w-xl text-sm leading-relaxed">
              Topics where multiple independent traditions describe the same phenomena — scored by
              source independence, structural specificity, physical corroboration, and chronological consistency.
            </p>
          </div>
          <TopicsGrid topics={topics} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
