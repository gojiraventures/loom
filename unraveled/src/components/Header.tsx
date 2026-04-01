'use client';

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();

  const signOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl bg-ground/90">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-gold shadow-[0_0_12px_rgba(200,149,108,0.4)]" />
          <span className="font-mono text-xs font-bold tracking-[0.2em] uppercase">
            UnraveledTruth
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/reports"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-text-primary transition-colors"
          >
            Reports
          </Link>
          <Link
            href="/people"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-text-primary transition-colors"
          >
            People
          </Link>
          <Link
            href="/explore"
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-gold transition-colors"
          >
            Graph
          </Link>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="font-mono text-[10px] tracking-[0.12em] uppercase text-text-tertiary hover:text-gold transition-colors"
          >
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}
