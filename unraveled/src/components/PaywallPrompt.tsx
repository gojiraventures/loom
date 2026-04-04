'use client';

import { useState } from 'react';
import { useRole } from '@/hooks/useRole';

interface Props {
  feature: string; // short description of what's gated, e.g. "full source bibliography"
}

export function PaywallPrompt({ feature }: Props) {
  const { role, loading } = useRole();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  if (loading) return null;

  const checkout = async () => {
    setError('');
    setWorking(true);
    const res = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      const { url } = await res.json() as { url: string };
      window.location.href = url;
    } else {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Something went wrong.');
      setWorking(false);
    }
  };

  // Anonymous — prompt to sign up first
  if (role === 'anonymous') {
    return (
      <div className="border border-border bg-ground-light/40 px-6 py-8 text-center space-y-4 my-6">
        <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">Members only</p>
        <p className="font-serif text-lg">
          {feature} is available to members.
        </p>
        <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
          Create a free account to access full source bibliographies, save articles, and rate research.
          Upgrade to unlock the full graph, dossiers, and raw research files.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <a
            href="/signup"
            className="font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold px-6 py-2.5 hover:bg-gold/20 transition-colors"
          >
            Create free account
          </a>
          <a
            href="/login"
            className="font-mono text-[11px] uppercase tracking-widest border border-border text-text-secondary px-6 py-2.5 hover:border-border/80 transition-colors"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // Registered (free) — prompt to upgrade
  return (
    <div className="border border-border bg-ground-light/40 px-6 py-8 text-center space-y-4 my-6">
      <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">Member upgrade</p>
      <p className="font-serif text-lg">
        {feature} is available to paid members.
      </p>
      <p className="text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
        Full relationship graph, all dossiers, raw research files, deep reports, and topic voting.
      </p>

      {/* Plan toggle */}
      <div className="flex justify-center gap-2 pt-2">
        <button
          onClick={() => setPlan('monthly')}
          className={`font-mono text-[11px] uppercase tracking-widest px-4 py-2 border transition-colors ${
            plan === 'monthly'
              ? 'border-gold/60 text-gold bg-gold/10'
              : 'border-border text-text-tertiary hover:border-border/80'
          }`}
        >
          $8 / month
        </button>
        <button
          onClick={() => setPlan('annual')}
          className={`font-mono text-[11px] uppercase tracking-widest px-4 py-2 border transition-colors ${
            plan === 'annual'
              ? 'border-gold/60 text-gold bg-gold/10'
              : 'border-border text-text-tertiary hover:border-border/80'
          }`}
        >
          $80 / year
          <span className="ml-1.5 text-[9px] text-green-400">save 17%</span>
        </button>
      </div>

      {error && (
        <p className="font-mono text-[10px] text-red-400">{error}</p>
      )}

      <button
        onClick={checkout}
        disabled={working}
        className="font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold px-8 py-2.5 hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {working ? 'Redirecting to Stripe…' : `Unlock with ${plan === 'annual' ? 'Annual' : 'Monthly'} plan`}
      </button>

      <p className="font-mono text-[9px] text-text-tertiary">
        Secure checkout via Stripe. Cancel anytime.
      </p>
    </div>
  );
}
