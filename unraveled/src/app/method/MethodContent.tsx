'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const PIPELINE_STEPS = [
  {
    number: '01',
    title: 'Source Collection',
    summary: 'We cast the widest possible net across primary sources.',
    detail: `We begin with primary texts — religious scriptures, academic papers, archaeological reports, declassified documents, and oral tradition transcriptions. We deliberately include sources from traditions that had no historical contact with one another, because our central question is about independent emergence, not diffusion.\n\nEvery source is logged with its tradition, estimated date, language of origin, and credibility tier before any analysis begins.`,
  },
  {
    number: '02',
    title: 'Multi-Agent Research',
    summary: '65 specialized AI agents independently investigate each topic.',
    detail: `Each research session deploys a panel of specialized agents — a comparative mythologist, a biblical scholar, a data scientist, a skeptic, an esoteric historian, and many others. They do not share notes during their research phase.\n\nThis independence is deliberate. We want to know what each lens finds on its own before any synthesis happens. An agent focused on geological evidence should not be influenced by what the philologist found.`,
  },
  {
    number: '03',
    title: 'Cross-Validation',
    summary: 'Agents challenge each other\'s findings before anything is accepted.',
    detail: `After the research phase, findings are submitted to a cross-validation layer where agents actively critique one another. Claims that survive scrutiny from multiple angles — especially from skeptical agents tasked specifically with finding holes — are weighted more heavily.\n\nClaims that only survive within a single interpretive framework are flagged as tradition-specific, not convergent.`,
  },
  {
    number: '04',
    title: 'Adversarial Debate',
    summary: 'An Advocate and a Skeptic make the strongest possible case on each side.',
    detail: `Before any conclusion is published, we run a structured debate. The Advocate builds the strongest possible case for significance. The Skeptic — given full access to the same evidence — builds the strongest possible case against it.\n\nBoth cases are published in full. We don't resolve the debate for you. The convergence score reflects structural agreement across traditions, not whether we find the evidence convincing.`,
  },
  {
    number: '05',
    title: 'Convergence Scoring',
    summary: 'A numerical score reflects how independently the evidence appears.',
    detail: `The convergence score (0–100) measures structural similarity across traditions that had no plausible contact. It weights for: geographic isolation of the source traditions, specificity of the shared narrative elements (theme alone scores low; specific structural details score high), number of independent traditions reporting the same elements, and strength of the skeptical rebuttal.\n\nA high score means the pattern is hard to explain by diffusion or coincidence. It does not mean the claim is true.`,
  },
];

const CONVERGENCE_BANDS = [
  { range: '80–100', label: 'Extraordinary convergence', color: '#5DBCB0' },
  { range: '60–79', label: 'Strong convergence', color: '#C8956C' },
  { range: '40–59', label: 'Moderate convergence', color: '#A8A49A' },
  { range: '20–39', label: 'Weak convergence', color: '#6B6660' },
  { range: '0–19', label: 'Insufficient convergence', color: '#3A3733' },
];

const EDITORIAL_PRINCIPLES = [
  'We publish the evidence and the score. We do not tell you what to conclude.',
  'Every claim is attributed. Anonymous assertions are not admitted.',
  'Skeptical rebuttals are given equal prominence to affirmative cases.',
  'Tradition-specific claims are labelled as such and excluded from convergence scoring.',
  'We distinguish between what the evidence shows and what researchers have interpreted it to mean.',
  'The pipeline is re-run when significant new evidence emerges.',
];

export function MethodContent() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-ground">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border px-6 pt-16 pb-12">
          <div className="max-w-[var(--spacing-content)] mx-auto">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              How It Works
            </span>
            <h1 className="font-serif text-[clamp(32px,5vw,56px)] font-normal leading-[1.05] tracking-tight mt-3 mb-4">
              The Adversarial Method
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed max-w-2xl">
              We don't investigate to confirm. We investigate to find where independent evidence points to the same place — and then we put that evidence through every challenge we can construct.
            </p>
          </div>
        </section>

        {/* Pipeline steps */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              The Pipeline
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-8">
              Five Stages, No Shortcuts
            </h2>
            <div className="space-y-px">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={i} className="border border-border">
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full flex items-center gap-5 px-5 py-4 text-left hover:bg-ground-light/20 transition-colors"
                  >
                    <span className="font-mono text-[11px] text-gold shrink-0">{step.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-lg">{step.title}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{step.summary}</p>
                    </div>
                    <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                      {open === i ? '−' : '+'}
                    </span>
                  </button>
                  {open === i && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/50">
                      {step.detail.split('\n\n').map((p, j) => (
                        <p key={j} className="text-sm text-text-secondary leading-[1.85] mb-3 last:mb-0">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Convergence score */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Convergence Score
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-3">What the Number Means</h2>
            <p className="text-sm text-text-secondary max-w-2xl mb-8 leading-relaxed">
              The score measures structural agreement across geographically isolated traditions — not the probability that a claim is true. A flood narrative that appears in 40 unconnected cultures with the same specific details scores higher than one found in 3 related cultures with vague similarities.
            </p>
            <div className="space-y-px">
              {CONVERGENCE_BANDS.map((band) => (
                <div key={band.range} className="flex items-center gap-4 py-3 border-b border-border/40 last:border-b-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: band.color }} />
                  <span className="font-mono text-[11px] text-text-tertiary w-16 shrink-0">{band.range}</span>
                  <span className="text-sm text-text-secondary">{band.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Editorial principles */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Editorial Standards
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-8">What We Commit To</h2>
            <div className="space-y-px">
              {EDITORIAL_PRINCIPLES.map((p, i) => (
                <div key={i} className="flex gap-4 py-4 border-b border-border/40 last:border-b-0">
                  <span className="font-mono text-[9px] text-gold shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <p className="text-sm text-text-secondary leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What we don't do */}
        <section>
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-16">
            <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
              Boundaries
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-8">What We Don't Do</h2>
            <div className="grid sm:grid-cols-2 gap-px border border-border">
              {[
                ['Confirm existing beliefs', 'We run every topic through a skeptic. If the evidence doesn\'t survive, the score reflects that.'],
                ['Publish anonymous claims', 'Every source is attributed. Unsigned assertions don\'t enter the pipeline.'],
                ['Conflate correlation with causation', 'Convergence means independent agreement. It does not mean one caused the other.'],
                ['Suppress inconvenient findings', 'If the skeptic\'s case is stronger, that appears in the report. We don\'t bury it.'],
              ].map(([title, desc]) => (
                <div key={title} className="p-6 bg-ground-light/20">
                  <p className="font-serif text-base mb-2">{title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
