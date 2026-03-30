import Link from 'next/link';
import { getPublishedTopics } from '@/lib/topics';

export async function Footer() {
  const topics = await getPublishedTopics();
  const researchLinks = topics.slice(0, 5);

  return (
    <footer className="border-t border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {/* Research — dynamic published topics */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Research
            </h4>
            <ul className="space-y-2">
              {researchLinks.length > 0 ? (
                researchLinks.map((topic) => (
                  <li key={topic.slug}>
                    <Link
                      href={`/topics/${topic.slug}`}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {topic.title}
                    </Link>
                  </li>
                ))
              ) : (
                <li>
                  <span className="text-sm text-text-tertiary">Coming soon.</span>
                </li>
              )}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              About
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/people"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  People
                </Link>
              </li>
              <li>
                <Link
                  href="/explore"
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Explore the Graph
                </Link>
              </li>
            </ul>
          </div>

          {/* Placeholder third column */}
          <div />

          {/* Stay Updated */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Stay Updated
            </h4>
            <p className="text-sm text-text-secondary mb-3">
              Join the research.
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-ground-light border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
              />
              <button
                type="submit"
                className="font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded hover:bg-gold/20 transition-colors"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-border text-center">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
            No ads. No sponsors. Just evidence.
          </p>
        </div>
      </div>
    </footer>
  );
}
