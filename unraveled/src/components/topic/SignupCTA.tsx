import Link from 'next/link';

interface SignupCTAProps {
  topicTitle: string;
  slug: string;
  findingsCount?: number;
  traditionsCount?: number;
}

export function SignupCTA({ topicTitle, slug, findingsCount, traditionsCount }: SignupCTAProps) {
  const bullets: string[] = [];
  if (findingsCount && findingsCount > 0) bullets.push(`${findingsCount} finding${findingsCount === 1 ? '' : 's'}`);
  if (traditionsCount && traditionsCount > 0) bullets.push(`${traditionsCount} cultural perspective${traditionsCount === 1 ? '' : 's'}`);
  bullets.push('full debate', 'timeline', 'sources with credibility ratings');

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-10">
        {/* Inverted card — warm parchment on dark background, the one break from the dark scheme */}
        <div
          className="p-6 sm:p-8"
          style={{ background: '#EDE8DF' }}
        >
          <span
            className="font-mono text-[9px] tracking-[0.25em] uppercase block mb-3"
            style={{ color: '#9A6235' }}
          >
            Go Deeper
          </span>
          <h2
            className="font-serif text-xl sm:text-2xl mb-3"
            style={{ color: '#1A1712' }}
          >
            The full picture on {topicTitle} is free.
          </h2>
          <p
            className="text-sm leading-[1.8] mb-6 max-w-xl"
            style={{ color: '#4A3F35' }}
          >
            {bullets.join(', ')} — everything, free with an account. No ads, no sponsors.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Primary — sign up first (the conversion action) */}
            <Link
              href="/signup"
              className="font-mono text-[10px] tracking-[0.15em] uppercase px-5 py-3 text-center transition-opacity hover:opacity-90"
              style={{ background: '#9A6235', color: '#FFF8F0' }}
            >
              Create Free Account
            </Link>
            {/* Secondary — already signed in, just go to deep dive */}
            <Link
              href={`/topics/${slug}?view=deep`}
              className="font-mono text-[10px] tracking-[0.15em] uppercase px-5 py-3 text-center transition-colors"
              style={{ border: '1px solid rgba(26,23,18,0.25)', color: '#4A3F35' }}
            >
              Read the Full Research
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
