'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sends the recovery token as a URL hash fragment.
  // onAuthStateChange fires with PASSWORD_RECOVERY event once it's processed.
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push('/login?reset=1');
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
            Set new password
          </p>
        </div>

        {!ready ? (
          <p className="font-mono text-[11px] text-text-tertiary text-center">
            Verifying reset link…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                New Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Repeat password"
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
              {loading ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
