'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const res = await fetch('/api/redeem-promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await res.json() as { ok?: boolean; error?: string; permanent?: boolean; expiresAt?: string | null };
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to redeem code');
      return;
    }

    const msg = data.permanent
      ? 'Code redeemed — you now have permanent member access!'
      : `Code redeemed — access active until ${new Date(data.expiresAt!).toLocaleDateString()}.`;
    setSuccess(msg);
    setTimeout(() => router.refresh(), 1500);
  }

  return (
    <div>
      <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">Have a promo code?</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter code"
          className="flex-1 bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="font-mono text-[9px] uppercase tracking-widest px-5 py-2 border border-border text-text-secondary hover:text-gold hover:border-gold/40 transition-colors disabled:opacity-50"
        >
          {loading ? 'Redeeming…' : 'Redeem'}
        </button>
      </form>
      {error && <p className="font-mono text-[10px] text-red-400 mt-2">{error}</p>}
      {success && <p className="font-mono text-[10px] text-emerald-400 mt-2">{success}</p>}
    </div>
  );
}
