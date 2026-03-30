import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ArrowDown, BookOpen, Scale, HelpCircle } from 'lucide-react';
import { getPublishedTopics } from '@/lib/topics';
import { createServerSupabaseClient } from '@/lib/supabase';
import { TopicsGrid } from './TopicsGrid';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Browse — UnraveledTruth',
  robots: { index: false, follow: false },
};

const METHODOLOGY_STEPS = [
  {
    icon: BookOpen,
    label: 'Primary Sources',
    description: 'Sacred texts, archaeological reports, and academic publications — not Wikipedia summaries.',
  },
  {
    icon: Scale,
    label: 'Advocate & Skeptic',
    description: 'Every claim is argued at full strength from both sides. Neither agent wins. You decide.',
  },
  {
    icon: HelpCircle,
    label: 'Open Questions',
    description: 'We publish what neither side can fully explain. The unresolved tension is the point.',
  },
];

async function getDbStats() {
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

  const topicCount = topicsResult.count ?? 0;
  const findingCount = findingsResult.count ?? 0;

  // Count distinct traditions across all published topics
  const traditions = new Set<string>();
  for (const row of topicsResult.data ?? []) {
    for (const t of row.key_traditions ?? []) {
      traditions.add(t);
    }
  }

  return {
    topicCount,
    findingCount,
    traditionCount: traditions.size,
  };
}

export default async function BrowsePage() {
  const [publishedTopics, stats] = await Promise.all([
    getPublishedTopics(),
    getDbStats(),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pt-24 pb-16">
        <div className="max-w-[var(--spacing-content)] mx-auto w-full">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            Cross-Tradition Evidence Index
          </span>
          <h1 className="font-serif text-[clamp(40px,8vw,72px)] font-normal leading-[1.05] tracking-tight mt-4 mb-6">
            Unraveled<span className="text-gold">Truth</span>
          </h1>
          <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl mb-4">
            Where ancient threads meet.
          </p>
          <p className="text-base text-text-secondary/70 leading-relaxed max-w-xl mb-12">
            When geographically isolated civilizations independently describe the same
            phenomena with structural specificity — that&apos;s not coincidence.
            That&apos;s a pattern worth investigating.
          </p>
          {publishedTopics.length > 0 ? (
            <a
              href={`/topics/${publishedTopics[0].slug}`}
              className="inline-flex items-center gap-2 font-mono text-sm tracking-wide text-gold border border-gold/30 bg-gold/5 px-6 py-3 rounded hover:bg-gold/10 transition-colors"
            >
              {publishedTopics[0].title}
              <ArrowDown size={16} />
            </a>
          ) : (
            <a
              href="/explore"
              className="inline-flex items-center gap-2 font-mono text-sm tracking-wide text-gold border border-gold/30 bg-gold/5 px-6 py-3 rounded hover:bg-gold/10 transition-colors"
            >
              Explore the Graph
              <ArrowDown size={16} />
            </a>
          )}
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8 grid grid-cols-3 gap-6">
          <div>
            <div className="font-serif text-3xl text-gold">{stats.topicCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">
              Topics
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl text-gold">{stats.findingCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">
              Findings
            </div>
          </div>
          <div>
            <div className="font-serif text-3xl text-gold">{stats.traditionCount}</div>
            <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">
              Traditions
            </div>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="px-6 py-20">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            The Pattern
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-3">
            Convergence Points
          </h2>
          <p className="text-text-secondary mb-10 max-w-xl">
            Topics where multiple independent traditions describe the same phenomena.
            Scored by source independence, structural specificity, physical
            corroboration, and chronological consistency.
          </p>
          <TopicsGrid topics={publishedTopics} />
        </div>
      </section>

      {/* Methodology */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            How We Work
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl mt-2 mb-3">
            The Advocate / Skeptic Model
          </h2>
          <p className="text-text-secondary mb-12 max-w-xl">
            We don&apos;t tell you what to believe. We show you what we found.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            {METHODOLOGY_STEPS.map((step) => (
              <div key={step.label} className="p-6 border border-border bg-ground-light/50">
                <step.icon size={20} className="text-gold mb-4" strokeWidth={1.5} />
                <h3 className="font-mono text-xs tracking-wider uppercase mb-2">{step.label}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-text-tertiary">
            {['Primary Sources', 'Cross-Reference', 'Advocate Case', 'Skeptic Case', 'You Decide'].map(
              (step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] tracking-wider uppercase whitespace-nowrap">{step}</span>
                  {i < 4 && <span className="text-gold">→</span>}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
