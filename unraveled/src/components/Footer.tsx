import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Research
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/topics/the-great-flood" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  The Great Flood
                </Link>
              </li>
              <li>
                <Link href="/topics/biblically-accurate-angels" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Angels
                </Link>
              </li>
              <li>
                <Link href="/topics/watchers-nephilim" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Watchers / Nephilim
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              About
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/methodology" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/sources" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Sources
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Community
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/support" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Support the Research
                </Link>
              </li>
              <li>
                <Link href="/signal" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  The Signal
                </Link>
              </li>
            </ul>
          </div>
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
