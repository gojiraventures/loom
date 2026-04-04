'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName || email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
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
            Create your account
          </p>
        </div>

        {done ? (
          <div className="border border-gold/20 bg-gold/5 px-6 py-8 text-center space-y-3">
            <p className="font-serif text-lg">Check your email</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              We sent a confirmation link to <strong className="text-text-primary">{email}</strong>.
              Click it to activate your account.
            </p>
            <p className="font-mono text-[9px] text-text-tertiary pt-2">
              Apple relay addresses may take a few minutes longer.
            </p>
          </div>
        ) : (
          <>
            {/* Email / Password form — primary CTA */}
            <form onSubmit={signUp} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                  Display Name <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="How you'd like to appear"
                />
              </div>

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
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="8+ characters"
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
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 border-t border-border" />
              <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* OAuth providers */}
            <OAuthButtons next={next} mode="signup" />

            {/* Privacy note */}
            <p className="text-center font-mono text-[9px] text-text-tertiary mt-8 leading-relaxed">
              We only collect your email and display name. Nothing else. Ever.
            </p>
          </>
        )}

        <p className="text-center font-mono text-[9px] text-text-tertiary mt-8">
          Already have an account?{' '}
          <a href={`/login?next=${encodeURIComponent(next)}`} className="text-gold hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
