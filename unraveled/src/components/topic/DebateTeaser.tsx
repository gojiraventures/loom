import Link from 'next/link';

interface DebateTeaserProps {
  advocateCase: string;
  skepticCase: string;
  slug: string;
  advocateSummary?: string | null;
  skepticSummary?: string | null;
  debateIntro?: string | null;
  transitionIn?: string | null;
}

function twoSentences(text: string): string {
  const clean = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n\n/g, ' ');
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [];
  return sentences.slice(0, 2).join(' ').trim();
}

export function DebateTeaser({
  advocateCase,
  skepticCase,
  slug,
  advocateSummary,
  skepticSummary,
  debateIntro,
  transitionIn,
}: DebateTeaserProps) {
  const advocateText = advocateSummary ?? twoSentences(advocateCase);
  const skepticText = skepticSummary ?? twoSentences(skepticCase);

  if (!advocateText && !skepticText) return null;

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8">
        {transitionIn && (
          <p className="text-base text-text-secondary leading-[1.85] mb-6 max-w-2xl">
            {transitionIn}
          </p>
        )}
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-2">
          The Debate
        </span>
        <h2 className="font-serif text-xl sm:text-2xl mb-4">Two Cases. You Decide.</h2>
        {debateIntro && (
          <p className="text-sm text-text-secondary leading-[1.85] mb-6 max-w-2xl">
            {debateIntro}
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-px border border-border">
          <div className="p-5 bg-ground-light/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-teal">
                The Case For
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-[1.8]">{advocateText}</p>
          </div>
          <div className="p-5 bg-ground-light/20 border-t sm:border-t-0 sm:border-l border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold">
                The Case Against
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-[1.8]">{skepticText}</p>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href={`/topics/${slug}?view=deep#the-debate`}
            className="font-mono text-[10px] tracking-[0.15em] uppercase text-gold/70 hover:text-gold transition-colors"
          >
            Read the full debate →
          </Link>
        </div>
      </div>
    </section>
  );
}
