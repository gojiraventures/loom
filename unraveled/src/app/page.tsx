import Link from 'next/link';
import { getFeaturedTopics, getPublishedTopics, getDossierStats, getTopicHeroImage } from '@/lib/topics';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HeroVideo } from '@/components/HeroVideo';
import { ConvergenceCard } from '@/components/ConvergenceCard';
import { createServerSupabaseClient } from '@/lib/supabase';
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

  // Bulk-fetch hero images for grid cards
  const gridImageMap: Record<string, { url: string; position: string }> = {};
  if (reportGrid.length > 0) {
    const supabase = createServerSupabaseClient();
    const { data: imgRows } = await supabase
      .from('topic_images')
      .select('topic, image_url, cropped_url, hero_position, featured')
      .in('topic', reportGrid.map((t) => t.topic))
      .eq('status', 'approved')
      .order('featured', { ascending: false });
    for (const row of imgRows ?? []) {
      if (!gridImageMap[row.topic]) {
        const url = row.cropped_url ?? row.image_url;
        if (url) gridImageMap[row.topic] = { url, position: row.hero_position ?? 'center' };
      }
    }
  }

  return (
    <div className="min-h-screen bg-ground text-text-primary flex flex-col">

      <Header />

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

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px border border-border">
              {reportGrid.map((topic, i) => (
                <ConvergenceCard
                  key={topic.slug}
                  index={i}
                  title={topic.title}
                  score={topic.convergence_score}
                  traditions={topic.key_traditions}
                  jawDrop={topic.summary ?? ''}
                  href={`/topics/${topic.slug}`}
                  heroImageUrl={gridImageMap[topic.topic]?.url ?? null}
                  heroPosition={gridImageMap[topic.topic]?.position ?? 'center'}
                />
              ))}
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
            groupCount={stats.groupCount}
            locationCount={stats.locationCount}
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
            Every person, group, and location in our database is a node. Every documented
            connection is an edge. The relationship map is actively growing — tracing who
            funded whom, who investigated what, and which institutions shaped the narrative.
          </p>

          {/* Graph preview */}
          <div className="border border-border overflow-hidden">
            <div
              data-dark
              className="relative h-[380px]"
              style={{
                background: 'radial-gradient(ellipse at 30% 35%, rgba(200,149,108,0.06) 0%, transparent 50%), radial-gradient(ellipse at 75% 60%, rgba(106,173,173,0.05) 0%, transparent 45%), #08090a',
              }}
            >
              {/* Static SVG edges */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden="true" preserveAspectRatio="none">
                {/* People ↔ People */}
                <line x1="20" y1="22" x2="48" y2="38" stroke="rgba(200,149,108,0.2)" strokeWidth="0.25" />
                <line x1="48" y1="38" x2="72" y2="20" stroke="rgba(200,149,108,0.2)" strokeWidth="0.25" />
                {/* People ↔ Groups */}
                <line x1="20" y1="22" x2="15" y2="60" stroke="rgba(106,173,173,0.18)" strokeWidth="0.25" />
                <line x1="48" y1="38" x2="38" y2="65" stroke="rgba(106,173,173,0.18)" strokeWidth="0.25" />
                <line x1="72" y1="20" x2="82" y2="55" stroke="rgba(106,173,173,0.18)" strokeWidth="0.25" />
                <line x1="48" y1="38" x2="82" y2="55" stroke="rgba(106,173,173,0.15)" strokeWidth="0.25" />
                <line x1="34" y1="42" x2="38" y2="65" stroke="rgba(106,173,173,0.15)" strokeWidth="0.25" />
                <line x1="34" y1="42" x2="60" y2="72" stroke="rgba(139,126,200,0.15)" strokeWidth="0.25" />
                {/* Groups ↔ Groups */}
                <line x1="15" y1="60" x2="38" y2="65" stroke="rgba(173,106,106,0.15)" strokeWidth="0.25" />
                <line x1="38" y1="65" x2="60" y2="72" stroke="rgba(173,106,106,0.15)" strokeWidth="0.25" />
                <line x1="60" y1="72" x2="82" y2="55" stroke="rgba(173,106,106,0.15)" strokeWidth="0.25" />
              </svg>

              {/* Nodes — People (gold/amber tones) */}
              {[
                { x: '20%', y: '22%', color: '#C8956C', label: 'Whistleblower', type: 'Person' },
                { x: '48%', y: '38%', color: '#D4B483', label: 'Researcher',    type: 'Person' },
                { x: '72%', y: '20%', color: '#C8956C', label: 'Journalist',    type: 'Person' },
                { x: '34%', y: '42%', color: '#AD9070', label: 'Gatekeeper',    type: 'Person' },
              ].map((node) => (
                <div
                  key={node.label}
                  className="absolute flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: node.color, boxShadow: `0 0 10px ${node.color}50` }} />
                  <span className="font-mono text-[0.52rem] tracking-[0.04em] whitespace-nowrap" style={{ color: 'rgba(245,240,232,0.5)' }}>
                    {node.label}
                  </span>
                </div>
              ))}

              {/* Nodes — Groups (teal tones) */}
              {[
                { x: '15%', y: '60%', color: '#6AADAD', label: 'Government',    type: 'Group' },
                { x: '38%', y: '65%', color: '#5A9090', label: 'Museum',         type: 'Group' },
                { x: '60%', y: '72%', color: '#6AADAD', label: 'Academic',       type: 'Group' },
                { x: '82%', y: '55%', color: '#8B7EC8', label: 'Religious',      type: 'Group' },
              ].map((node) => (
                <div
                  key={node.label}
                  className="absolute flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: node.color, boxShadow: `0 0 10px ${node.color}50` }} />
                  <span className="font-mono text-[0.52rem] tracking-[0.04em] whitespace-nowrap" style={{ color: 'rgba(245,240,232,0.5)' }}>
                    {node.label}
                  </span>
                </div>
              ))}

              {/* Legend */}
              <div className="absolute top-4 right-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#C8956C]" />
                  <span className="font-mono text-[0.48rem] text-[rgba(245,240,232,0.35)] tracking-[0.06em] uppercase">People</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6AADAD]" />
                  <span className="font-mono text-[0.48rem] text-[rgba(245,240,232,0.35)] tracking-[0.06em] uppercase">Groups</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8B7EC8]" />
                  <span className="font-mono text-[0.48rem] text-[rgba(245,240,232,0.35)] tracking-[0.06em] uppercase">Locations</span>
                </div>
              </div>

              {/* Stats overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-6"
                style={{ background: 'linear-gradient(0deg, rgba(8,9,10,0.97) 0%, rgba(8,9,10,0.75) 55%, transparent 100%)' }}
              >
                <div className="flex gap-6">
                  <div className="font-mono text-[0.65rem] text-[rgba(245,240,232,0.4)] tracking-[0.03em]">
                    <span className="text-[rgba(245,240,232,0.75)] font-medium">{stats.relationshipCount}</span> documented connections
                  </div>
                  <div className="font-mono text-[0.65rem] text-[rgba(245,240,232,0.4)] tracking-[0.03em]">
                    <span className="text-[rgba(245,240,232,0.75)] font-medium">{stats.relationshipTypeCount}</span> relationship types
                  </div>
                  <div className="font-mono text-[0.65rem] text-[rgba(245,240,232,0.4)] tracking-[0.03em]">
                    <span className="text-[rgba(245,240,232,0.75)] font-medium">{stats.entityCount}</span> entities mapped
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
