interface OverviewSummaryProps {
  summary: string;
}

export function OverviewSummary({ summary }: OverviewSummaryProps) {
  // Split on double-newlines; cap at 3 paragraphs so fallback content doesn't overflow
  const paragraphs = summary.split('\n\n').filter(Boolean).slice(0, 3);

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold block mb-5">
          What This Is About
        </span>
        <div className="max-w-2xl space-y-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base text-text-secondary leading-[1.85]">
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
