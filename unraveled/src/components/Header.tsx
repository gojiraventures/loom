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
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-serif text-[1.05rem] font-medium tracking-[-0.01em]">
            Unraveled<span className="text-gold">Truth</span>
          </span>
        </Link>
        <div className="flex items-center gap-8">
          <Link
            href="/reports"
            className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block"
          >
            Reports
          </Link>
          <Link
            href="/people"
            className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block"
          >
            Dossiers
          </Link>
          <Link
            href="/explore"
            className="font-mono text-[0.7rem] tracking-[0.06em] uppercase text-text-secondary hover:text-gold transition-colors hidden sm:block"
          >
            Relationships
          </Link>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="font-mono text-[0.65rem] tracking-[0.08em] uppercase px-5 py-2 border border-[rgba(200,149,108,0.4)] text-gold hover:bg-gold hover:text-ground transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
