import Link from 'next/link';
import { NewsletterForm } from './NewsletterForm';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">

          {/* Explore — no header, just links */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link href="/reports" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Research
                </Link>
              </li>
              <li>
                <Link href="/people" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Dossiers
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Relationships
                </Link>
              </li>
            </ul>
          </div>

          {/* About — no header, just links */}
          <div>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/method" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Method
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Creators */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Creators
            </h4>
            <p className="text-sm text-text-secondary mb-2">
              Use our research in your content.
            </p>
            <Link href="/creators" className="text-sm text-gold hover:text-gold/80 transition-colors">
              Just credit us. →
            </Link>
          </div>

          {/* Stay Updated */}
          <div>
            <h4 className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              Stay Updated
            </h4>
            <p className="text-sm text-text-secondary mb-3">
              Join the research.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Logo */}
            <Link href="/" className="font-serif text-[1rem] font-medium tracking-[-0.01em] hover:opacity-80 transition-opacity">
              Unraveled<span className="text-gold">Truth</span>
            </Link>
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
              No ads. No sponsors. Just evidence.
            </p>
            <p className="font-mono text-[9px] tracking-[0.1em] text-text-tertiary">
              © 2026 UnraveledTruth. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://instagram.com/unraveledtruth" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
              className="text-gold/70 hover:text-gold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a href="https://x.com/unraveledtruth" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)"
              className="text-gold/70 hover:text-gold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://youtube.com/@unraveledtruth" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
              className="text-gold/70 hover:text-gold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
            <a href="https://facebook.com/unraveledtruth" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
              className="text-gold/70 hover:text-gold transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
