import Link from 'next/link';

interface TraditionSamplesProps {
  traditions: [string, string][];
  slug: string;
  totalCount: number;
  transitionIn?: string | null;
}

export function TraditionSamples({ traditions, slug, totalCount, transitionIn }: TraditionSamplesProps) {
  if (traditions.length === 0) return null;

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8">
        {transitionIn && (
          <p className="text-base text-text-secondary leading-[1.85] mb-6 max-w-2xl">
            {transitionIn}
          </p>
        )}
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-2">
          In Their Own Words
        </span>
        <h2 className="font-serif text-xl sm:text-2xl mb-6">How Different Cultures Tell It</h2>
        <div className={`grid gap-px border border-border ${traditions.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {traditions.map(([name, description]) => (
            <div key={name} className="p-5 bg-ground-light/20">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-2">
                {name}
              </span>
              <p className="text-sm text-text-secondary leading-[1.75]">{description}</p>
            </div>
          ))}
        </div>
        {totalCount > 2 && (
          <div className="mt-4">
            <Link
              href={`/topics/${slug}?view=deep#in-their-own-words`}
              className="font-mono text-[10px] tracking-[0.15em] uppercase text-gold/70 hover:text-gold transition-colors"
            >
              {totalCount - 2} more traditions in the full research →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
