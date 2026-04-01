import Link from 'next/link';
import { getFeaturedTopics, getPublishedTopics } from '@/lib/topics';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  AdvocateSkepticToggle,
  CommunitySignal,
  EmailSignup,
} from './HomePageClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UnraveledTruth — Cross-Tradition Evidence Index',
  description:
    "When geographically isolated civilizations independently describe the same phenomena — that's not coincidence. A cross-tradition evidence index.",
  robots: { index: false, follow: false },
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featured, published] = await Promise.all([
    getFeaturedTopics(),
    getPublishedTopics(),
  ]);

  // Featured hero report (single large card)
  const heroReport = featured[0] ?? published[0] ?? null;

  // Report grid — rest of featured, padded with published, capped at 6
  const gridPool = featured.length > 1
    ? [...featured.slice(1), ...published.filter((p) => !featured.find((f) => f.slug === p.slug))]
    : published.filter((p) => p.slug !== heroReport?.slug);
  const reportGrid = gridPool.slice(0, 6);

  return (
    <div className="min-h-screen bg-ground text-text-primary flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-border sticky top-0 z-50 backdrop-blur-xl bg-ground/90">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_12px_rgba(200,149,108,0.4)]" />
            <span className="font-mono text-xs font-bold tracking-[0.2em] uppercase">
              UnraveledTruth
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/browse"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-text-primary transition-colors"
            >
              Reports
            </Link>
            <Link
              href="/people"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-text-primary transition-colors"
            >
              Dossiers
            </Link>
            <Link
              href="/explore"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-gold transition-colors"
            >
              Graph
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-gold transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* ── §1 Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg,   transparent, transparent 40px, rgba(200,149,108,0.6) 40px, rgba(200,149,108,0.6) 41px),
              repeating-linear-gradient(90deg,  transparent, transparent 40px, rgba(200,149,108,0.6) 40px, rgba(200,149,108,0.6) 41px)
            `,
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 50% 50%, rgba(200,149,108,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-10">
            <div className="w-8 h-px bg-gold/40" />
            <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-text-tertiary">
              Cross-Tradition Evidence Index
            </span>
            <div className="w-8 h-px bg-gold/40" />
          </div>

          <h1 className="font-serif text-[clamp(48px,9vw,88px)] font-normal leading-[0.95] tracking-tight mb-8">
            When the myths<br />
            <span className="text-gold italic">agree.</span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-lg mx-auto mb-3">
            When geographically isolated civilizations independently describe the
            same phenomena — that&apos;s not coincidence.
          </p>
          <p className="text-base text-text-secondary/55 leading-relaxed max-w-md mx-auto mb-12">
            No verdicts. Just patterns — and the tension between those who believe
            them and those who don&apos;t.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-gold/40 text-gold px-7 py-3 hover:bg-gold/10 transition-colors"
            >
              Browse Reports <span>→</span>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-border text-text-tertiary px-7 py-3 hover:border-border-hover hover:text-text-secondary transition-colors"
            >
              Explore the Graph
            </Link>
          </div>
        </div>
      </section>

      {/* ── §2 Mission / Method strip ─────────────────────────────────────── */}
      <section className="border-y border-border">
        <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-12 grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border gap-0">
          {[
            {
              step: '01',
              label: 'Primary Sources',
              body: 'Sacred texts, archaeological reports, and academic publications — not Wikipedia summaries.',
            },
            {
              step: '02',
              label: 'Advocate & Skeptic',
              body: 'Every claim is argued at full strength from both sides. Neither agent wins. You decide.',
            },
            {
              step: '03',
              label: 'Open Questions',
              body: 'We publish what neither side can fully explain. The unresolved tension is the point.',
            },
          ].map((item) => (
            <div key={item.step} className="px-6 py-8 first:pl-0 last:pr-0">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold/50 block mb-3">
                {item.step}
              </span>
              <h3 className="font-mono text-[11px] tracking-[0.15em] uppercase mb-2">
                {item.label}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── §3 Featured Report ───────────────────────────────────────────── */}
      {heroReport && (
        <section className="px-6 py-20">
          <div className="max-w-[var(--spacing-content)] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
                Featured Report
              </span>
              <Link
                href="/browse"
                className="font-mono text-[9px] tracking-[0.15em] uppercase text-gold/60 hover:text-gold transition-colors"
              >
                All reports →
              </Link>
            </div>

            <Link
              href={`/topics/${heroReport.slug}`}
              className="group block border border-border bg-ground-light/40 hover:bg-ground-light/70 transition-colors p-8 sm:p-12"
            >
              {/* Traditions */}
              {heroReport.key_traditions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {heroReport.key_traditions.slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="font-mono text-[8px] uppercase tracking-wide text-text-tertiary border border-border/60 px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                  {heroReport.key_traditions.length > 5 && (
                    <span className="font-mono text-[8px] uppercase tracking-wide text-text-tertiary px-1">
                      +{heroReport.key_traditions.length - 5}
                    </span>
                  )}
                </div>
              )}

              <h2 className="font-serif text-[clamp(28px,5vw,52px)] font-normal leading-[1.05] tracking-tight mb-4 group-hover:text-gold transition-colors">
                {heroReport.title}
              </h2>

              {heroReport.summary && (
                <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl mb-8">
                  {heroReport.summary}
                </p>
              )}

              {/* Convergence signal */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-32 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold/70 rounded-full transition-all"
                      style={{ width: `${heroReport.convergence_score}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-gold">
                    {heroReport.convergence_score} convergence
                  </span>
                </div>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-gold group-hover:gap-3 transition-all">
                  Read the evidence →
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── §4 Report Grid ───────────────────────────────────────────────── */}
      {reportGrid.length > 0 && (
        <section className="px-6 pb-20">
          <div className="max-w-[var(--spacing-content)] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
                All Reports
              </span>
              <span className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-tertiary">
                {published.length} published
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px border border-border">
              {reportGrid.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="p-6 bg-ground border-border hover:bg-ground-light transition-colors group"
                >
                  {/* Convergence bar */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-0.5 flex-1 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold/50 rounded-full"
                        style={{ width: `${topic.convergence_score}%` }}
                      />
                    </div>
                    <span className="font-mono text-[8px] text-gold/70 shrink-0">
                      {topic.convergence_score}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg leading-snug mb-3 group-hover:text-gold transition-colors">
                    {topic.title}
                  </h3>

                  {topic.summary && (
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-4">
                      {topic.summary}
                    </p>
                  )}

                  {topic.key_traditions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topic.key_traditions.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="font-mono text-[8px] uppercase tracking-wide text-text-tertiary border border-border/60 px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                      {topic.key_traditions.length > 3 && (
                        <span className="font-mono text-[8px] uppercase tracking-wide text-text-tertiary px-1">
                          +{topic.key_traditions.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            {published.length > reportGrid.length + 1 && (
              <div className="mt-8 text-center">
                <Link
                  href="/browse"
                  className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary hover:text-gold transition-colors border border-border hover:border-gold/30 px-8 py-3 inline-flex"
                >
                  View all {published.length} reports →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── §5 Advocate vs Skeptic ───────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20">
        <div className="max-w-[var(--spacing-content)] mx-auto mb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-3">
            The Method
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-snug mb-3">
            We don&apos;t tell you what to believe.
          </h2>
          <p className="text-text-secondary max-w-xl">
            Every report runs a dedicated Advocate agent and a Skeptic agent in
            parallel — both instructed to make the strongest possible case. You get
            both arguments, unmediated.
          </p>
        </div>

        <AdvocateSkepticToggle />
      </section>

      {/* ── §6 Dossiers Preview ──────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20 bg-ground-light/20">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-3">
            Dossiers
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-snug mb-3">
            The people &amp; institutions<br />
            <span className="text-gold">shaping the narrative.</span>
          </h2>
          <p className="text-text-secondary max-w-xl mb-10">
            Researchers, authors, institutions, and media outlets — mapped by
            what they claim, where they get funding, and how their positions
            have shifted over time.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 mb-8">
            {/* Researchers teaser */}
            <div className="border border-border p-6 bg-ground">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-teal block mb-4">
                Researchers
              </span>
              <div className="space-y-3">
                {['Graham Hancock', 'Zahi Hawass', 'Robert Schoch', 'David Childress'].map((name) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-ground-lighter border border-border flex items-center justify-center">
                      <span className="font-mono text-[8px] text-text-tertiary">{name[0]}</span>
                    </div>
                    <span className="text-sm text-text-secondary">{name}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <span className="font-mono text-[8px] tracking-wider uppercase text-text-tertiary">
                    + more coming soon
                  </span>
                </div>
              </div>
            </div>

            {/* Institutions teaser */}
            <div className="border border-border p-6 bg-ground">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold/70 block mb-4">
                Institutions
              </span>
              <div className="space-y-3">
                {['Smithsonian Institution', 'Oxford Archaeology', 'MIT Press', 'Göbekli Tepe Project'].map((name) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-1 h-1 rounded-full bg-gold/40 shrink-0 mt-0.5" />
                    <span className="text-sm text-text-secondary">{name}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <span className="font-mono text-[8px] tracking-wider uppercase text-text-tertiary">
                    + more coming soon
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/people"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-tertiary hover:text-gold transition-colors border border-border hover:border-gold/30 px-8 py-3 inline-flex"
          >
            Browse Dossiers →
          </Link>
        </div>
      </section>

      {/* ── §7 Relationships Preview ─────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <div className="grid sm:grid-cols-2 gap-12 items-center">
            <div>
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-3">
                Relationships
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-snug mb-4">
                Nothing exists<br />in isolation.
              </h2>
              <p className="text-text-secondary leading-relaxed mb-8">
                Every report, researcher, institution, and tradition is a node.
                The graph shows how they connect — influence, contradiction,
                corroboration, and contested territory.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-gold/40 text-gold px-6 py-3 hover:bg-gold/10 transition-colors"
              >
                Explore the Graph <span>→</span>
              </Link>
            </div>

            {/* Abstract graph preview */}
            <div className="relative h-48 sm:h-64 border border-border bg-ground-light/30 overflow-hidden">
              {/* Static decorative node graph */}
              <svg
                viewBox="0 0 400 240"
                className="w-full h-full opacity-40"
                aria-hidden="true"
              >
                {/* Edges */}
                {[
                  [80, 60, 200, 120], [200, 120, 320, 60], [200, 120, 140, 180],
                  [200, 120, 280, 180], [80, 60, 140, 180], [320, 60, 280, 180],
                  [140, 180, 280, 180], [200, 120, 80, 120], [200, 120, 360, 120],
                ].map(([x1, y1, x2, y2], i) => (
                  <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(200,149,108,0.25)"
                    strokeWidth="1"
                  />
                ))}
                {/* Nodes */}
                {[
                  [200, 120, 6, '#C8956C'],
                  [80, 60, 4, '#6AADAD'],
                  [320, 60, 4, '#6AADAD'],
                  [140, 180, 3.5, 'rgba(255,255,255,0.3)'],
                  [280, 180, 3.5, 'rgba(255,255,255,0.3)'],
                  [80, 120, 2.5, 'rgba(255,255,255,0.2)'],
                  [360, 120, 2.5, 'rgba(255,255,255,0.2)'],
                ].map(([cx, cy, r, fill], i) => (
                  <circle key={i} cx={cx} cy={cy} r={r} fill={fill as string} />
                ))}
              </svg>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="font-mono text-[8px] tracking-wider uppercase text-text-tertiary">
                  Relationship graph
                </span>
                <span className="font-mono text-[8px] tracking-wider uppercase text-gold/50">
                  Live →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── §8 Community Signal ──────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20 bg-ground-light/20">
        <div className="max-w-[var(--spacing-content)] mx-auto mb-10">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-3">
            Community Signal
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-snug mb-3">
            See something we missed?
          </h2>
          <p className="text-text-secondary max-w-xl">
            Submit leads, suggest topics, or share primary sources. The best
            contributions get incorporated into new and updated reports.
          </p>
        </div>

        <CommunitySignal />
      </section>

      {/* ── §9 Email CTA ─────────────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-20">
        <div className="max-w-[var(--spacing-content)] mx-auto">
          <div className="grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-3">
                Stay Updated
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-normal leading-snug mb-3">
                New reports. No noise.
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
                Get notified when new research is published. No newsletters,
                no marketing — just the signal.
              </p>
            </div>
            <div>
              <EmailSignup />
              <p className="text-xs text-text-tertiary mt-3">
                No ads. No sponsors. Just evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── §10 Footer ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
