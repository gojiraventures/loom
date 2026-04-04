'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center px-6">

      {/* Radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 40%, rgba(200,149,108,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <h1 className="font-serif text-3xl font-normal">
              Unraveled<span className="text-gold">Truth</span>
            </h1>
          </a>
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-tertiary mt-2">
            Sign in to your account
          </p>
        </div>

        {/* Email / Password — primary */}
        <form onSubmit={signIn} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-mono text-[10px] text-red-400 border border-red-400/20 bg-red-400/5 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold py-3 hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 border-t border-border" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* OAuth providers */}
        <OAuthButtons next={next} mode="signin" />

        {/* Privacy note */}
        <p className="text-center font-mono text-[9px] text-text-tertiary mt-8 leading-relaxed">
          We only collect your email and display name. Nothing else. Ever.
        </p>

        <p className="text-center font-mono text-[9px] text-text-tertiary mt-4">
          No account?{' '}
          <a href={`/signup?next=${encodeURIComponent(next)}`} className="text-gold hover:underline">
            Create one free
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
