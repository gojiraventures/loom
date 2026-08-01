import { DEFAULT_CONVERGENCE_CONFIG } from '@/lib/research/scoring/convergence-config';
import type { ConvergenceBreakdown } from '@/lib/research/scoring/convergence';

interface AIConsensusTeaserProps {
  score: number;
  traditionsCount: number;
  breakdown?: ConvergenceBreakdown | null;
}

function bandLabel(score: number): string {
  const band = DEFAULT_CONVERGENCE_CONFIG.bands.find((b) => score >= b.min);
  return band?.label ?? DEFAULT_CONVERGENCE_CONFIG.bands[DEFAULT_CONVERGENCE_CONFIG.bands.length - 1].label;
}

function verdictColor(score: number): string {
  if (score >= 80) return 'var(--color-teal)';
  if (score >= 60) return 'var(--color-gold)';
  if (score >= 40) return 'rgba(200,149,108,0.7)';
  return 'rgba(255,255,255,0.4)';
}

// Not a hero metric — demoted size, label leads, number is supporting detail,
// and the "not a truth score" disclaimer is always visible (never tooltip-only).
export function AIConsensusTeaser({ score, traditionsCount, breakdown }: AIConsensusTeaserProps) {
  // Single-subject investigations don't get a convergence score — nothing to show.
  if (breakdown && !breakdown.applicable) return null;

  return (
    <section className="border-b border-border bg-ground-light/10">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-6">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-4">
          Where It Lands
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-base font-medium text-text-primary mb-1">
              {bandLabel(score)}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-semibold tabular-nums" style={{ color: verdictColor(score) }}>
                {score}<span className="text-sm font-normal text-text-tertiary">/100</span>
              </span>
              <span className="font-mono text-[10px] text-text-tertiary">
                {traditionsCount} tradition{traditionsCount !== 1 ? 's' : ''} analyzed
                {breakdown ? ` · ${breakdown.convergingElements}/${breakdown.totalElements} elements converge` : ''}
              </span>
            </div>
          </div>
        </div>
        <p className="font-mono text-[9px] text-text-tertiary/70 mt-4 max-w-lg leading-relaxed">
          Not a truth score. This measures how consistently unconnected cultures describe the same specific
          narrative elements — nothing more.{' '}
          <a href="/method#convergence" className="text-gold/70 hover:text-gold underline underline-offset-2">
            How it&apos;s calculated →
          </a>
        </p>
      </div>
    </section>
  );
}
