import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ConvergenceCard } from '@/components/ConvergenceCard';
import { ArrowDown, BookOpen, Scale, HelpCircle } from 'lucide-react';
import { getPublishedTopics } from '@/lib/topics';

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

export default async function BrowsePage() {
  const publishedTopics = await getPublishedTopics();

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
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {[
            { value: '268+', label: 'Flood Narratives' },
            { value: '142', label: 'Cultures Documented' },
            { value: '6', label: 'Continents' },
            { value: '47', label: 'Independent Sources' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-serif text-3xl text-gold">{stat.value}</div>
              <div className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-tertiary mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Convergence Cards */}
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
          <div className="space-y-px">
            {publishedTopics.map((topic, i) => (
              <ConvergenceCard
                key={topic.slug}
                index={i}
                title={topic.title}
                score={topic.convergence_score}
                traditions={topic.key_traditions}
                jawDrop={topic.summary ?? ''}
                href={`/topics/${topic.slug}`}
              />
            ))}
            {publishedTopics.length === 0 && (
              <div className="py-16 text-center text-text-tertiary text-sm">
                No published topics yet.
              </div>
            )}
          </div>
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
