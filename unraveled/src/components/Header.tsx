'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useRole } from '@/hooks/useRole';

const NAV_LINKS = [
  { href: '/reports', label: 'Reports' },
  { href: '/people', label: 'Dossiers' },
  { href: '/explore', label: 'Relationships' },
  { href: '/vote', label: 'Vote' },
];

export function Header() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { role } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? null;

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-ground/90">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-serif text-[1.05rem] font-medium tracking-[-0.01em]">
            Unraveled<span className="text-gold">Truth</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors"
            >
              {label}
            </Link>
          ))}
          <ThemeToggle />
          {!loading && (
            user ? (
              <div className="flex items-center gap-4">
                {displayName && (
                  <span className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-text-tertiary">
                    {displayName}
                  </span>
                )}
                {role === 'registered' && (
                  <Link
                    href="/upgrade"
                    className="font-mono text-[0.65rem] tracking-[0.08em] uppercase px-4 py-1.5 bg-gold text-ground hover:bg-gold/90 transition-colors"
                  >
                    Upgrade
                  </Link>
                )}
                <Link
                  href="/account"
                  className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-text-secondary hover:text-gold transition-colors"
                >
                  Account
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-text-secondary hover:text-gold transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/join"
                  className="font-mono text-[0.65rem] tracking-[0.08em] uppercase px-5 py-2 border border-[rgba(200,149,108,0.4)] text-gold hover:bg-gold hover:text-ground transition-colors"
                >
                  Join
                </Link>
              </div>
            )
          )}
        </div>

        {/* Mobile right: theme toggle + hamburger */}
        <div className="flex sm:hidden items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Toggle menu"
            className="flex flex-col justify-center items-center w-8 h-8 gap-[5px]"
          >
            <span
              className="block h-px w-5 bg-text-secondary transition-all duration-200 origin-center"
              style={menuOpen ? { transform: 'translateY(6px) rotate(45deg)' } : {}}
            />
            <span
              className="block h-px w-5 bg-text-secondary transition-all duration-200"
              style={menuOpen ? { opacity: 0 } : {}}
            />
            <span
              className="block h-px w-5 bg-text-secondary transition-all duration-200 origin-center"
              style={menuOpen ? { transform: 'translateY(-6px) rotate(-45deg)' } : {}}
            />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-border bg-ground/95 backdrop-blur-xl">
          <div className="flex flex-col px-6 py-4 gap-0">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors py-3 border-b border-border/50"
              >
                {label}
              </Link>
            ))}
            {!loading && (
              user ? (
                <>
                  {displayName && (
                    <span className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-text-tertiary py-3 border-b border-border/50">
                      {displayName}
                    </span>
                  )}
                  {role === 'registered' && (
                    <Link
                      href="/upgrade"
                      onClick={() => setMenuOpen(false)}
                      className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-gold hover:text-gold/70 transition-colors py-3 border-b border-border/50"
                    >
                      Upgrade to Member
                    </Link>
                  )}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors py-3 border-b border-border/50"
                  >
                    Account
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); signOut(); }}
                    className="font-mono text-[0.65rem] tracking-[0.08em] uppercase text-text-tertiary hover:text-gold transition-colors py-3 text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors py-3 border-b border-border/50"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/join"
                    onClick={() => setMenuOpen(false)}
                    className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-gold hover:text-gold/70 transition-colors py-3"
                  >
                    Join
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}
