'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import type { User } from '@supabase/supabase-js';

interface Profile {
  display_name: string | null;
  username: string | null;
  role: string;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  stripe_customer_id: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  anonymous: 'Anonymous',
  registered: 'Free Member',
  paid: 'Member',
  admin: 'Admin',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get('upgraded') === '1';

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalWorking, setPortalWorking] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?next=/account');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, role, subscription_status, subscription_expires_at, stripe_customer_id, created_at')
        .eq('id', user.id)
        .single();

      setProfile(profile as Profile | null);
      setLoading(false);
    }

    load();
  }, [router]);

  const openPortal = async () => {
    setPortalError('');
    setPortalWorking(true);
    const res = await fetch('/api/stripe-portal', { method: 'POST' });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } else {
      const json = await res.json().catch(() => ({}));
      setPortalError((json as { error?: string }).error ?? 'Something went wrong.');
      setPortalWorking(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">Loading…</span>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = profile?.role === 'paid' || profile?.role === 'admin';
  const name = profile?.display_name || user?.email?.split('@')[0] || 'Member';
  const roleLabel = ROLE_LABEL[profile?.role ?? 'registered'] ?? profile?.role;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-[var(--spacing-content)] mx-auto px-6 py-16 w-full">
        <div className="max-w-lg mx-auto space-y-8">

          {/* Upgraded success banner */}
          {upgraded && (
            <div className="border border-teal/30 bg-teal/5 px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-teal mb-1">Welcome to membership</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                Your subscription is now active. Enjoy the full relationship graph, all dossiers, and raw research files.
              </p>
            </div>
          )}

          {/* Profile card */}
          <div className="border border-border bg-ground-light/20 px-6 py-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">Account</span>
                <h1 className="font-serif text-2xl mt-1">{name}</h1>
                <p className="text-sm text-text-secondary mt-0.5">{user?.email}</p>
              </div>
              <span
                className={`font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 border shrink-0 ${
                  isPaid
                    ? 'border-gold/40 text-gold bg-gold/5'
                    : 'border-border text-text-tertiary'
                }`}
              >
                {roleLabel}
              </span>
            </div>

            <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Member since</span>
                <span className="text-sm text-text-secondary">{formatDate(profile?.created_at ?? null)}</span>
              </div>
              {isPaid && (
                <div>
                  <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Access until</span>
                  <span className="text-sm text-text-secondary">{formatDate(profile?.subscription_expires_at ?? null)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription management */}
          {isPaid ? (
            <div className="border border-border bg-ground-light/20 px-6 py-6 space-y-4">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">Subscription</span>

              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                <span className="text-sm text-text-secondary capitalize">
                  {profile?.subscription_status ?? 'active'}
                </span>
              </div>

              <p className="text-xs text-text-tertiary leading-relaxed">
                Manage your plan, update payment method, download invoices, or cancel via the Stripe billing portal.
              </p>

              {portalError && (
                <p className="font-mono text-[10px] text-red-400">{portalError}</p>
              )}

              <button
                onClick={openPortal}
                disabled={portalWorking}
                className="font-mono text-[11px] uppercase tracking-widest border border-border text-text-secondary px-5 py-2.5 hover:border-border/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalWorking ? 'Opening portal…' : 'Manage subscription →'}
              </button>
            </div>
          ) : (
            <div className="border border-border bg-ground-light/20 px-6 py-6 space-y-3">
              <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">Membership</span>
              <p className="text-sm text-text-secondary leading-relaxed">
                Upgrade to unlock the full relationship graph, all dossiers, raw research files, deep reports, and topic voting.
              </p>
              <a
                href="/upgrade"
                className="inline-block font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold px-6 py-2.5 hover:bg-gold/20 transition-colors"
              >
                Upgrade to member →
              </a>
            </div>
          )}

          {/* Sign out */}
          <div className="border-t border-border/40 pt-4">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountContent />
    </Suspense>
  );
}
