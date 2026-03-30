import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About — UnraveledTruth',
  description:
    'UnraveledTruth is a cross-tradition evidence index. Learn how the Advocate/Skeptic model and 65-agent AI pipeline produce structured research, not opinion.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 px-6 pt-24 pb-24">
        <div className="max-w-[var(--spacing-content)] mx-auto">

          {/* Label */}
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            About
          </span>

          {/* Title */}
          <h1 className="font-serif text-[clamp(32px,6vw,56px)] font-normal leading-[1.1] tracking-tight mt-4 mb-6">
            What is Unraveled<span className="text-gold">Truth</span>?
          </h1>

          <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mb-16">
            A cross-tradition evidence index. We gather, cross-reference, and
            publish structured research on phenomena described independently by
            geographically isolated civilizations — ancient flood narratives,
            angelic hierarchies, celestial mechanics, cosmological origins, and
            more. The question is not whether these traditions are true. The
            question is why they converge.
          </p>

          {/* Section: Research Model */}
          <div className="border-t border-border pt-12 mb-12">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
              Methodology
            </span>
            <h2 className="font-serif text-3xl mt-3 mb-6">
              The Advocate / Skeptic Model
            </h2>
            <div className="grid sm:grid-cols-2 gap-8 max-w-3xl">
              <div className="p-6 border border-border bg-ground-light/40">
                <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold mb-3">
                  Advocate
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Builds the strongest possible case for convergence. Marshals
                  primary sources, archaeological evidence, linguistic parallels,
                  and cross-cultural corroboration without hedging.
                </p>
              </div>
              <div className="p-6 border border-border bg-ground-light/40">
                <h3 className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold mb-3">
                  Skeptic
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Builds the strongest possible counter-case. Challenges source
                  reliability, identifies diffusionist explanations, and exposes
                  gaps in the evidence — without dismissing data.
                </p>
              </div>
            </div>
            <p className="text-text-secondary mt-8 max-w-2xl leading-relaxed">
              Neither agent wins. Both cases are published in full. The open
              questions — what neither side can explain — are surfaced
              deliberately. You weigh the evidence.
            </p>
          </div>

          {/* Section: AI Pipeline */}
          <div className="border-t border-border pt-12 mb-12">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
              The Engine
            </span>
            <h2 className="font-serif text-3xl mt-3 mb-6">
              65-Agent Research Pipeline
            </h2>
            <p className="text-text-secondary mb-8 max-w-2xl leading-relaxed">
              Each published topic runs through an automated multi-agent pipeline
              before any human review. The stages, in order:
            </p>
            <ol className="space-y-4 max-w-2xl">
              {[
                {
                  step: '01',
                  label: 'Primary Source Research',
                  desc: 'Agents pull from sacred texts, peer-reviewed archaeology, academic journals, and verified archives — not secondary summaries.',
                },
                {
                  step: '02',
                  label: 'Cross-Tradition Validation',
                  desc: 'Independent tradition agents compare structural elements: narrative sequence, geographic specificity, cosmological framing, and numerical precision.',
                },
                {
                  step: '03',
                  label: 'Convergence Scoring',
                  desc: 'A scoring model rates each topic on source independence, structural specificity, physical corroboration, and chronological consistency.',
                },
                {
                  step: '04',
                  label: 'Adversarial Debate',
                  desc: 'Advocate and Skeptic agents run full debate passes on each claim. Contested points are flagged; resolved points are marked with confidence levels.',
                },
                {
                  step: '05',
                  label: 'Synthesis',
                  desc: 'A synthesis agent produces the final dossier: open questions, convergence map, tradition breakdown, and a summary designed to inform — not persuade.',
                },
              ].map(({ step, label, desc }) => (
                <li key={step} className="flex gap-6">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-gold shrink-0 pt-0.5">
                    {step}
                  </span>
                  <div>
                    <h4 className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-primary mb-1">
                      {label}
                    </h4>
                    <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-text-tertiary text-sm mt-8 max-w-2xl leading-relaxed border-l-2 border-border pl-4">
              All AI output is structured research, not opinion. The pipeline
              does not conclude. It organizes. Conclusions are yours to draw.
            </p>
          </div>

          {/* Section: Independence */}
          <div className="border-t border-border pt-12 mb-12">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
              Independence
            </span>
            <h2 className="font-serif text-3xl mt-3 mb-6">
              No Ads. No Sponsors.
            </h2>
            <p className="text-text-secondary max-w-2xl leading-relaxed">
              UnraveledTruth carries no advertising, no sponsored content, and no
              institutional funding. Research direction is not influenced by
              external interests. The only criterion for publishing a topic is
              whether the cross-tradition evidence meets the convergence threshold.
            </p>
          </div>

          {/* CTA links */}
          <div className="border-t border-border pt-12 flex flex-wrap gap-4">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 font-mono text-sm tracking-wide text-gold border border-gold/30 bg-gold/5 px-6 py-3 rounded hover:bg-gold/10 transition-colors"
            >
              Explore the Graph
            </Link>
            <Link
              href="/people"
              className="inline-flex items-center gap-2 font-mono text-sm tracking-wide text-text-secondary border border-border px-6 py-3 rounded hover:border-gold/30 hover:text-text-primary transition-colors"
            >
              View Researchers & Sources
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
