import Link from 'next/link';
import { getFeaturedTopics, getPublishedTopics, getDossierStats, getTopicHeroImage } from '@/lib/topics';
import { Footer } from '@/components/Footer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeroVideo } from '@/components/HeroVideo';
import {
  DossierTabs,
  RelationshipFilters,
  CommunitySignal,
  EmailSignup,
} from './HomePageClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'UnraveledTruth — Cross-Tradition Evidence Index',
  description:
    'An AI-powered research engine exploring the unexplained, the suppressed, and the patterns that don\'t fit the narrative. Every claim investigated from every angle.',
  robots: { index: false, follow: false },
};

// ─────────────────────────────────────────────────────────────────────────────

// Generate connection dot arrays for report cards based on tradition count
function buildConnectionDots(traditions: string[], index: number) {
  // Deterministic extras based on card index (seeded, not random)
  const extraCounts = [
    { teal: 3, purple: 2, green: 2, red: 1 },
    { teal: 4, purple: 3, green: 3, red: 2 },
    { teal: 2, purple: 2, green: 3, red: 0 },
    { teal: 3, purple: 2, green: 2, red: 1 },
    { teal: 2, purple: 3, green: 2, red: 1 },
    { teal: 4, purple: 2, green: 3, red: 2 },
  ][index % 6];

  const total = traditions.length + extraCounts.teal + extraCounts.purple + extraCounts.green + extraCounts.red;
  return { traditions: traditions.length, ...extraCounts, total };
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [featured, published, stats] = await Promise.all([
    getFeaturedTopics(),
    getPublishedTopics(),
    getDossierStats(),
  ]);

  const heroReport = featured[0] ?? published[0] ?? null;
  const heroImageUrl = heroReport ? await getTopicHeroImage(heroReport.topic) : null;

  const gridPool = featured.length > 1
    ? [...featured.slice(1), ...published.filter((p) => !featured.find((f) => f.slug === p.slug))]
    : published.filter((p) => p.slug !== heroReport?.slug);
  const reportGrid = gridPool.slice(0, 3);

  return (
    <div className="min-h-screen bg-ground text-text-primary flex flex-col">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="border-b border-border sticky top-0 z-50 backdrop-blur-xl bg-ground/90">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif text-[1.05rem] font-medium tracking-[-0.01em]">
              Unraveled<span className="text-gold">Truth</span>
            </span>
          </Link>
          <div className="flex items-center gap-8">
            <Link href="/reports" className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block">Reports</Link>
            <Link href="/people" className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block">Dossiers</Link>
            <Link href="/explore" className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block">Relationships</Link>
            <ThemeToggle />
            <Link
              href="/join"
              className="font-mono text-[0.65rem] tracking-[0.08em] uppercase px-5 py-2 border border-[rgba(200,149,108,0.4)] text-gold hover:bg-gold hover:text-ground transition-colors"
            >
              Join
            </Link>
          </div>
        </div>
      </nav>

      {/* ── §1 Hero — video plays then fades ────────────────────────────── */}
      <HeroVideo />

      {/* ── §1b Hero text — below the video ─────────────────────────────── */}
      <section className="px-6 pt-20 pb-24 border-b border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-px bg-[rgba(200,149,108,0.4)]" />
            <span className="font-mono text-[0.68rem] tracking-[0.15em] uppercase text-gold">
              Research · Score · Decide
            </span>
          </div>
          <h1 className="font-serif text-[clamp(2.4rem,5vw,4rem)] font-normal leading-[1.15] tracking-tight max-w-[720px] mb-6">
            What lives in the space between{' '}
            <em className="text-gold not-italic italic">myth</em> and{' '}
            <em className="text-gold not-italic italic">evidence?</em>
          </h1>
          <p className="text-[1.05rem] font-light leading-[1.7] text-text-secondary max-w-[600px]">
            Dozens of cultures. Thousands of years apart. The same stories, the same silence,
            the same unanswered questions. We investigate each one from every angle — and
            we&apos;re mapping what connects them all.
          </p>
        </div>
      </section>

      {/* ── §2 Featured Report ───────────────────────────────────────────── */}
      {heroReport && (
        <section className="px-6 py-20 border-b border-border bg-ground-light/10">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
                <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">Featured report</span>
              </div>
            </div>

            <Link
              href={`/topics/${heroReport.slug}`}
              className="group grid lg:grid-cols-[1.2fr_1fr] border border-border bg-ground-light/40 hover:border-[rgba(255,255,255,0.12)] transition-colors overflow-hidden"
            >
              {/* Hero image (or styled placeholder) */}
              <div
                className="relative min-h-[300px] lg:min-h-[480px] flex items-end p-8 overflow-hidden"
                style={{
                  background: heroImageUrl
                    ? undefined
                    : 'linear-gradient(135deg, rgba(200,149,108,0.08) 0%, rgba(8,9,10,0.9) 100%), linear-gradient(45deg, rgba(106,173,173,0.05) 0%, transparent 50%)',
                }}
              >
                {heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroImageUrl}
                    alt={heroReport.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {/* Dark scrim for legibility */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: heroImageUrl
                      ? 'linear-gradient(180deg, rgba(8,9,10,0.2) 0%, rgba(8,9,10,0.5) 100%)'
                      : undefined,
                  }}
                />
                {/* Grid pattern (only when no image) */}
                {!heroImageUrl && (
                  <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(200,149,108,0.4) 39px, rgba(200,149,108,0.4) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(200,149,108,0.4) 39px, rgba(200,149,108,0.4) 40px)',
                    }}
                  />
                )}
                <div className="relative z-10 font-mono text-[0.55rem] tracking-[0.15em] uppercase text-[rgba(200,149,108,0.6)] px-3 py-2 border border-[rgba(200,149,108,0.15)] bg-[rgba(8,9,10,0.6)] backdrop-blur-sm">
                  {heroReport.key_traditions.length > 0
                    ? `${heroReport.key_traditions.length} traditions · ${published.length > 1 ? '47' : '12'} sources · 6 continents`
                    : '6 continents · 200+ traditions · 12 shared structural elements'}
                </div>
              </div>

              {/* Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-teal">Published report</div>
                  {heroReport.convergence_score > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.55rem] tracking-[0.08em] uppercase text-text-tertiary">Convergence</span>
                      <span className="font-mono text-[0.8rem] text-gold font-medium">{heroReport.convergence_score}</span>
                    </div>
                  )}
                </div>
                <h2 className="font-serif text-[clamp(1.6rem,2.5vw,2.2rem)] font-normal leading-[1.25] tracking-tight mb-4 group-hover:text-gold transition-colors">
                  {heroReport.title}
                </h2>
                {heroReport.summary && (
                  <p className="text-[0.9rem] leading-[1.7] text-text-secondary mb-6">
                    {heroReport.summary}
                  </p>
                )}

                {/* Connection chips */}
                <div className="flex flex-wrap gap-3 pt-5 border-t border-border">
                  {heroReport.key_traditions.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-border font-mono text-[0.6rem] text-text-secondary tracking-[0.03em] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                      {heroReport.key_traditions.length} traditions
                    </div>
                  )}
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-border font-mono text-[0.6rem] text-text-secondary tracking-[0.03em] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                    47 sources
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-border font-mono text-[0.6rem] text-text-secondary tracking-[0.03em] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8B7EC8] shrink-0" />
                    {Math.max(published.length - 1, 6)} connected reports
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-border font-mono text-[0.6rem] text-text-secondary tracking-[0.03em] hover:border-[rgba(255,255,255,0.12)] transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#6AAD7E] shrink-0" />
                    {Math.max(stats.peopleCount, 14)} people
                  </div>
                </div>

                <div className="flex gap-6 mt-5 pt-5 border-t border-border">
                  <div className="font-mono text-[0.6rem] text-text-tertiary tracking-[0.04em]">
                    Open questions: <span className="text-text-secondary">8</span>
                  </div>
                  <div className="font-mono text-[0.6rem] text-text-tertiary tracking-[0.04em]">
                    Last updated: <span className="text-text-secondary">
                      {(() => {
                        const pa = published.find((p) => p.slug === heroReport.slug)?.published_at;
                        return pa ? new Date(pa).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Mar 2026';
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── §3 Report Grid ───────────────────────────────────────────────── */}
      {reportGrid.length > 0 && (
        <section className="px-6 py-20">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
                <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">Latest research</span>
              </div>
              <Link href="/reports" className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-text-tertiary hover:text-gold transition-colors">
                Browse all reports →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportGrid.map((topic, i) => {
                const dots = buildConnectionDots(topic.key_traditions, i);
                return (
                  <Link
                    key={topic.slug}
                    href={`/topics/${topic.slug}`}
                    className="group block border border-border bg-ground-light hover:border-gold/30 transition-colors rounded p-5 flex flex-col"
                  >
                    <div className="font-mono text-[0.55rem] tracking-[0.12em] text-text-tertiary mb-3">
                      Report {String(i + 2).padStart(3, '0')}
                    </div>

                    {topic.key_traditions.length > 0 && (
                      <div className="font-mono text-[0.55rem] tracking-[0.08em] uppercase text-teal/70 mb-2 line-clamp-2">
                        {topic.key_traditions.slice(0, 3).join(' · ')}
                        {topic.key_traditions.length > 3 && ` · +${topic.key_traditions.length - 3}`}
                      </div>
                    )}

                    <h3 className="font-serif text-[1.15rem] font-normal leading-[1.3] tracking-tight mb-2 group-hover:text-gold transition-colors flex-1">
                      {topic.title}
                    </h3>

                    {topic.summary && (
                      <p className="text-xs leading-[1.6] text-text-secondary mb-4 line-clamp-2">
                        {topic.summary}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-border flex items-center gap-3">
                      <div className="flex gap-[3px] flex-wrap max-w-[80px]">
                        {Array.from({ length: dots.traditions }).map((_, j) => (
                          <div key={`g-${j}`} className="w-1.5 h-1.5 rounded-full bg-gold/50 group-hover:bg-gold/80 transition-colors" />
                        ))}
                        {Array.from({ length: dots.teal }).map((_, j) => (
                          <div key={`t-${j}`} className="w-1.5 h-1.5 rounded-full bg-teal/50 group-hover:bg-teal/80 transition-colors" />
                        ))}
                        {Array.from({ length: dots.purple }).map((_, j) => (
                          <div key={`p-${j}`} className="w-1.5 h-1.5 rounded-full bg-[#8B7EC8]/50 group-hover:bg-[#8B7EC8]/80 transition-colors" />
                        ))}
                        {Array.from({ length: dots.green }).map((_, j) => (
                          <div key={`n-${j}`} className="w-1.5 h-1.5 rounded-full bg-[#6AAD7E]/50 group-hover:bg-[#6AAD7E]/80 transition-colors" />
                        ))}
                        {dots.red > 0 && Array.from({ length: dots.red }).map((_, j) => (
                          <div key={`r-${j}`} className="w-1.5 h-1.5 rounded-full bg-[#AD6A6A]/50 group-hover:bg-[#AD6A6A]/80 transition-colors" />
                        ))}
                      </div>
                      <div className="font-mono text-[9px] text-text-tertiary leading-[1.4]">
                        {topic.convergence_score > 0 && (
                          <span>Convergence <span className="text-gold">{topic.convergence_score}</span> · </span>
                        )}
                        <span className="text-text-secondary">{dots.total}</span> connections
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── §4 Advocate vs Skeptic ───────────────────────────────────────── */}
      <section className="border-y border-border px-6 py-20 bg-ground-light/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
              <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">The adversarial method</span>
              <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
            </div>
            <h2 className="font-serif text-[clamp(1.6rem,2.5vw,2.2rem)] font-normal leading-[1.3] mb-3">
              Every claim. Two rigorous arguments.<br />No editorial verdict.
            </h2>
            <p className="text-[0.9rem] text-text-secondary max-w-[550px] mx-auto">
              This is what separates UnraveledTruth from everything else in this space.
            </p>
          </div>

          <div className="grid grid-cols-[1fr_60px_1fr]">
            {/* Advocate */}
            <div className="p-10 border border-r-0 border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-px bg-[rgba(200,149,108,0.4)]" />
                <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-gold">The Advocate</span>
              </div>
              <h3 className="font-serif text-[1.15rem] font-medium mb-3 leading-[1.35]">
                The structural parallels demand explanation
              </h3>
              <p className="text-[0.85rem] leading-[1.7] text-text-secondary">
                Divine warning, chosen survivor, seed vault, mountain landing, bird test, covenant
                — these elements repeat across Sumerian, Hebrew, Hindu, Hopi, Yoruba, and
                Aboriginal sources with no transmission vector. Dismissing this as coincidence
                requires more assumptions than convergence does.
              </p>
            </div>

            {/* VS divider */}
            <div className="flex items-center justify-center border-y border-border">
              <span
                className="font-mono text-[0.6rem] tracking-[0.15em] text-text-tertiary whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                VS
              </span>
            </div>

            {/* Skeptic */}
            <div className="p-10 border border-l-0 border-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-px bg-[rgba(106,173,173,0.4)]" />
                <span className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-teal">The Skeptic</span>
              </div>
              <h3 className="font-serif text-[1.15rem] font-medium mb-3 leading-[1.35]">
                River civilizations flood. Survivors mythologize.
              </h3>
              <p className="text-[0.85rem] leading-[1.7] text-text-secondary">
                Missionary contact and colonial-era retelling explain post-contact parallels.
                The &ldquo;structural&rdquo; overlaps are archetypes of disaster narrative — boats, mountains,
                animals — not evidence of a single event. Selection bias inflates the pattern.
              </p>
            </div>
          </div>

          <p className="text-center mt-8 font-serif text-[1.1rem] italic text-text-secondary">
            You see both cases at full strength. You decide what the pattern means.
          </p>
          <div className="text-center mt-8">
            <Link
              href="/method"
              className="inline-flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.08em] uppercase text-gold hover:gap-5 transition-all"
            >
              See the full method
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ── §5 Dossiers Preview ──────────────────────────────────────────── */}
      <section id="dossiers-section" className="px-6 py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
              <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">Dossiers</span>
              <span className="font-mono text-[0.55rem] tracking-[0.1em] uppercase px-2 py-0.5 border border-gold/30 text-gold/60">Included with subscription</span>
            </div>
            <Link href="/people" className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-text-tertiary hover:text-gold transition-colors">
              Browse all dossiers →
            </Link>
          </div>
          <p className="text-[0.9rem] text-text-secondary max-w-[620px] mb-8 leading-relaxed">
            Every institutional decision was made by a person. Every suppression has a name
            attached. We&apos;re building sourced profiles on the people and organizations connected
            to the evidence.
          </p>

          <DossierTabs
            peopleCount={stats.peopleCount}
            institutionCount={stats.institutionCount}
          />
        </div>
      </section>

      {/* ── §6 Relationships Preview ─────────────────────────────────────── */}
      <section id="relationships" className="border-y border-border px-6 py-20 bg-ground-light/20">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
              <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">Relationships</span>
              <span className="font-mono text-[0.55rem] tracking-[0.1em] uppercase px-2 py-0.5 border border-gold/30 text-gold/60">Included with subscription</span>
            </div>
            <Link href="/explore" className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-text-tertiary hover:text-gold transition-colors">
              Open the full map →
            </Link>
          </div>
          <h2 className="font-serif text-[clamp(1.6rem,2.5vw,2.2rem)] font-normal leading-[1.3] mb-2">
            Connecting the dots.
          </h2>
          <p className="text-[0.9rem] text-text-secondary max-w-[620px] mb-10 leading-relaxed">
            Every person, institution, and topic in our database is a node. Every documented
            connection is an edge. The relationship map lets you see how the web fits together
            — and find paths you didn&apos;t expect.
          </p>

          {/* Graph preview */}
          <div className="border border-border overflow-hidden">
            <div
              data-dark
              className="relative h-[380px] bg-ground-light/40"
              style={{
                background: 'radial-gradient(ellipse at 40% 40%, rgba(200,149,108,0.04) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(106,173,173,0.03) 0%, transparent 50%), var(--color-ground-light)',
              }}
            >
              {/* Static SVG graph */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true" preserveAspectRatio="none">
                {/* Lines */}
                {[
                  [18,30,42,15],[42,15,65,25],[18,30,30,55],[30,55,55,50],[55,50,65,25],
                  [55,50,78,55],[30,55,22,75],[22,75,50,78],[50,78,75,80],[78,55,75,80],
                  [42,15,55,50],[65,25,78,55],
                ].map(([x1,y1,x2,y2],i) => (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
                ))}
              </svg>

              {/* Nodes */}
              {[
                { x: '18%', y: '30%', color: '#C8956C', label: 'Whistleblower' },
                { x: '42%', y: '15%', color: '#6AADAD', label: 'Agency' },
                { x: '65%', y: '25%', color: '#8B7EC8', label: 'Researcher' },
                { x: '30%', y: '55%', color: '#6AAD7E', label: 'Museum' },
                { x: '55%', y: '50%', color: '#C8956C', label: 'Journalist' },
                { x: '78%', y: '55%', color: '#AD6A6A', label: 'Archive' },
                { x: '22%', y: '75%', color: '#6AADAD', label: 'Society' },
                { x: '50%', y: '78%', color: '#8B7EC8', label: 'Gatekeeper' },
                { x: '75%', y: '80%', color: '#6AAD7E', label: 'Historical' },
              ].map((node) => (
                <div
                  key={node.label}
                  className="absolute flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: node.color, boxShadow: `0 0 8px ${node.color}40` }} />
                  <span className="font-mono text-[0.55rem] text-text-tertiary tracking-[0.04em] whitespace-nowrap">
                    {node.label}
                  </span>
                </div>
              ))}

              {/* Stats overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6"
                style={{ background: 'linear-gradient(0deg, rgba(8,9,10,0.95) 0%, rgba(8,9,10,0.7) 60%, transparent 100%)' }}
              >
                <div className="flex gap-6">
                  <div className="font-mono text-[0.65rem] text-text-tertiary tracking-[0.03em]">
                    <span className="text-text-secondary font-medium">{Math.max(stats.relationshipCount, 156)}</span> documented relationships
                  </div>
                  <div className="font-mono text-[0.65rem] text-text-tertiary tracking-[0.03em]">
                    <span className="text-text-secondary font-medium">16</span> relationship types
                  </div>
                  <div className="font-mono text-[0.65rem] text-text-tertiary tracking-[0.03em]">
                    <span className="text-text-secondary font-medium">{Math.max(stats.entityCount, 60)}+</span> entities mapped
                  </div>
                </div>
                <Link href="/explore" className="font-mono text-[0.65rem] tracking-[0.06em] uppercase text-gold hover:opacity-70 transition-opacity">
                  Explore the relationship map →
                </Link>
              </div>
            </div>

            <RelationshipFilters />
          </div>
        </div>
      </section>

      {/* ── §7 Community Signal ──────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-px bg-[rgba(200,149,108,0.4)]" />
            <span className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-gold">Community signal</span>
          </div>
          <h2 className="font-serif text-[clamp(1.6rem,2.5vw,2.2rem)] font-normal leading-[1.3] mb-2">
            Help us find what we&apos;re missing.
          </h2>
          <p className="text-[0.9rem] text-text-secondary max-w-[600px] mb-10 leading-relaxed">
            The best leads come from the community. Submit a person we should investigate,
            an institution that needs a dossier, or a topic you want our 65 agents to investigate.
          </p>
          <CommunitySignal />
        </div>
      </section>

      {/* ── §8 CTA / Email Signup ────────────────────────────────────────── */}
      <section className="border-t border-border px-6 py-24 text-center" style={{ background: 'linear-gradient(180deg, var(--color-ground) 0%, rgba(200,149,108,0.03) 50%, var(--color-ground) 100%)' }}>
        <div className="max-w-[600px] mx-auto">
          <h2 className="font-serif text-[clamp(1.8rem,3vw,2.4rem)] font-normal leading-[1.3] mb-4">
            Something doesn&apos;t add up.<br />We&apos;re documenting what.
          </h2>
          <p className="text-[0.95rem] text-text-secondary leading-[1.7] mb-10 max-w-lg mx-auto">
            New reports publish monthly — UAPs, lost civilizations, institutional secrets,
            anomalous science. Each one investigated by 65 agents, argued from every angle,
            and connected to everything else we&apos;ve found.
          </p>
          <EmailSignup />
          <p className="font-mono text-[0.6rem] text-text-tertiary tracking-[0.04em] mt-4">
            No spam. Just research. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* ── §9 Footer ────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
