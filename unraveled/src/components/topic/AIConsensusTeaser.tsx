interface AIConsensusTeaserProps {
  score: number;
  traditionsCount: number;
}

function verdictLabel(score: number): string {
  if (score >= 80) return 'Strong convergence across independent traditions';
  if (score >= 60) return 'Moderate convergence — multiple independent sources';
  if (score >= 40) return 'Mixed evidence — some convergence, significant variation';
  return 'Weak convergence — limited cross-cultural agreement';
}

function verdictColor(score: number): string {
  if (score >= 80) return 'var(--color-teal)';
  if (score >= 60) return 'var(--color-gold)';
  if (score >= 40) return 'rgba(200,149,108,0.7)';
  return 'rgba(255,255,255,0.3)';
}

export function AIConsensusTeaser({ score, traditionsCount }: AIConsensusTeaserProps) {
  return (
    <section className="border-b border-border bg-ground-light/10">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-6">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-4">
          Where It Lands
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="font-mono text-4xl font-bold tabular-nums"
            style={{ color: verdictColor(score) }}
          >
            {score}
            <span className="text-lg font-normal text-text-tertiary">/100</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {verdictLabel(score)}
            </p>
            <p className="font-mono text-[10px] text-text-tertiary">
              {traditionsCount} tradition{traditionsCount !== 1 ? 's' : ''} analyzed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
