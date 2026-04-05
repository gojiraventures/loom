'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <h1 className="font-serif text-3xl font-normal">
              Unraveled<span className="text-gold">Truth</span>
            </h1>
          </a>
          <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-text-tertiary mt-2">
            Reset your password
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="border border-emerald-400/30 bg-emerald-400/5 px-4 py-4">
              <p className="font-mono text-[11px] text-emerald-400 uppercase tracking-widest mb-1">Email sent</p>
              <p className="text-sm text-text-secondary">
                Check your inbox for a password reset link. It expires in 1 hour.
              </p>
            </div>
            <a href="/login" className="block font-mono text-[10px] text-text-tertiary hover:text-gold transition-colors">
              ← Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
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

            {error && (
              <p className="font-mono text-[10px] text-red-400 border border-red-400/20 bg-red-400/5 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold py-3 hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <a href="/login" className="font-mono text-[10px] text-text-tertiary hover:text-gold transition-colors">
                ← Back to sign in
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
