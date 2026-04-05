'use client';

import { useEffect, useState } from 'react';

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  max_uses: number | null;
  uses_count: number;
  duration_days: number | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

function badge(active: boolean) {
  return active
    ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
    : 'text-text-tertiary border-border bg-ground-light';
}

export function PromoCodesTab() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    max_uses: '',
    duration_days: '',
    expires_at: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/promo-codes');
    const data = await res.json() as { codes: PromoCode[] };
    setCodes(data.codes ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    const res = await fetch('/api/admin/promo-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.code,
        description: form.description || null,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
        expires_at: form.expires_at || null,
      }),
    });

    const data = await res.json() as { code?: PromoCode; error?: string };
    setCreating(false);

    if (!res.ok) {
      setError(data.error ?? 'Failed to create code');
      return;
    }

    setSuccess(`Code "${data.code!.code}" created`);
    setForm({ code: '', description: '', max_uses: '', duration_days: '', expires_at: '' });
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    });
    setCodes((prev) => prev.map((c) => c.id === id ? { ...c, active: !active } : c));
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setForm((f) => ({ ...f, code }));
  }

  return (
    <div className="space-y-10">

      {/* Create form */}
      <section>
        <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-6">Create Promo Code</h2>
        <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="LAUNCH2026"
                required
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={generateCode}
                className="font-mono text-[9px] uppercase tracking-widest px-3 py-2 border border-border text-text-tertiary hover:text-gold hover:border-gold/40 transition-colors"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Influencer collab — April 2026"
              className="w-full bg-ground border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Max uses</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited"
                min="1"
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Duration (days)</label>
              <input
                type="number"
                value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
                placeholder="Permanent"
                min="1"
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
              />
            </div>
            <div>
              <label className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-1">Code expires</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-ground border border-border px-3 py-2 font-mono text-sm text-text-primary focus:outline-none focus:border-gold/40"
              />
            </div>
          </div>

          {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
          {success && <p className="font-mono text-[10px] text-emerald-400">{success}</p>}

          <button
            type="submit"
            disabled={creating}
            className="font-mono text-[9px] uppercase tracking-widest px-5 py-2 bg-gold text-ground hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Code'}
          </button>
        </form>
      </section>

      {/* Code list */}
      <section>
        <h2 className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">All Codes</h2>
        {loading ? (
          <p className="font-mono text-[10px] text-text-tertiary">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="font-mono text-[10px] text-text-tertiary">No codes yet.</p>
        ) : (
          <div className="border border-border divide-y divide-border/40">
            {/* Header */}
            <div className="grid grid-cols-[140px_1fr_80px_80px_90px_80px_70px] gap-3 px-4 py-2 bg-ground-light/20">
              {['Code', 'Description', 'Uses', 'Duration', 'Expires', 'Status', ''].map((h) => (
                <span key={h} className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary">{h}</span>
              ))}
            </div>
            {codes.map((c) => {
              const expired = c.expires_at && new Date(c.expires_at) < new Date();
              return (
                <div key={c.id} className="grid grid-cols-[140px_1fr_80px_80px_90px_80px_70px] gap-3 px-4 py-3 items-center hover:bg-ground-light/10 transition-colors">
                  <span className="font-mono text-[11px] text-gold tracking-wider">{c.code}</span>
                  <span className="text-xs text-text-secondary truncate">{c.description ?? '—'}</span>
                  <span className="font-mono text-[10px] text-text-secondary">
                    {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ''}
                  </span>
                  <span className="font-mono text-[10px] text-text-secondary">
                    {c.duration_days ? `${c.duration_days}d` : 'Forever'}
                  </span>
                  <span className={`font-mono text-[10px] ${expired ? 'text-red-400' : 'text-text-tertiary'}`}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                  </span>
                  <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 ${badge(c.active && !expired)}`}>
                    {!c.active ? 'Disabled' : expired ? 'Expired' : 'Active'}
                  </span>
                  <button
                    onClick={() => toggleActive(c.id, c.active)}
                    className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors"
                  >
                    {c.active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
