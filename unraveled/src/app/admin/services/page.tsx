'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';

// ── Sidebar ────────────────────────────────────────────────────────────────────

const SERVICES_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [{ id: 'studio', label: 'Studio', href: '/admin/studio' }],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
      { id: 'health', label: 'Content Health', href: '/admin/health' },
    ],
  },
  {
    label: 'Knowledge',
    items: [{ id: 'knowledge', label: 'Knowledge Hub', href: '/admin/knowledge' }],
  },
  {
    label: 'Distribution',
    items: [{ id: 'distribution', label: 'Distribution Desk', href: '/admin/distribution' }],
  },
  {
    label: 'System',
    items: [{ id: 'services', label: 'Service Health', href: '/admin/services' }],
  },
];

// ── Types (mirror src/lib/admin/service-health.ts) ───────────────────────────────

interface ExpectedModel {
  model: string;
  present: boolean;
}
interface ServiceStatus {
  id: string;
  name: string;
  category: 'llm' | 'database' | 'email';
  configured: boolean;
  ok: boolean;
  httpStatus?: number;
  latencyMs?: number;
  detail: string;
  expectedModels?: ExpectedModel[];
  usedFor: string;
  checkedAt: string;
}
interface Summary {
  total: number;
  ok: number;
  down: number;
  unconfigured: number;
  deprecationWarnings: number;
}
interface HealthResponse {
  services: ServiceStatus[];
  summary: Summary;
  checkedAt: string;
}

// ── Status helpers ───────────────────────────────────────────────────────────────

type Tone = 'ok' | 'warn' | 'down' | 'off';

function toneOf(s: ServiceStatus): Tone {
  if (!s.configured) return 'off';
  if (!s.ok) return 'down';
  if (s.expectedModels?.some((m) => !m.present)) return 'warn';
  return 'ok';
}

const TONE_STYLE: Record<Tone, { color: string; label: string; dot: string }> = {
  ok:   { color: 'var(--status-complete)', label: 'Operational', dot: '●' },
  warn: { color: 'var(--status-approval)', label: 'Degraded',    dot: '▲' },
  down: { color: 'var(--status-failed)',   label: 'Down',        dot: '✕' },
  off:  { color: 'var(--color-text-tertiary)', label: 'Not Configured', dot: '○' },
};

const CATEGORY_LABEL: Record<ServiceStatus['category'], string> = {
  llm: 'LLM Provider',
  database: 'Database',
  email: 'Email',
};

// ── View ─────────────────────────────────────────────────────────────────────────

function ServicesView() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/service-health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [auto, load]);

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-text-primary">Service Health</h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
            Live status of every external dependency
            {data?.checkedAt && ` · checked ${new Date(data.checkedAt).toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAuto((a) => !a)}
            className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border transition-colors"
            style={{
              color: auto ? 'var(--color-gold)' : 'var(--color-text-tertiary)',
              borderColor: auto ? 'var(--color-gold)' : 'var(--color-border)',
            }}
          >
            Auto {auto ? 'On' : 'Off'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="font-mono text-[8px] uppercase tracking-widest px-3 py-1.5 border border-border text-text-tertiary hover:text-gold hover:border-gold/30 transition-colors disabled:opacity-40"
          >
            {loading ? 'Checking…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap gap-8 border border-border bg-ground-light/10 px-6 py-4">
          <Stat label="Operational" value={summary.ok} color="var(--status-complete)" />
          <Stat label="Degraded" value={summary.deprecationWarnings} color="var(--status-approval)" />
          <Stat label="Down" value={summary.down} color="var(--status-failed)" />
          <Stat label="Not Configured" value={summary.unconfigured} color="var(--color-text-tertiary)" />
        </div>
      )}

      {error && (
        <div className="border border-red-400/30 bg-red-400/5 px-4 py-3 font-mono text-[11px] text-red-400">
          Failed to load service health: {error}
        </div>
      )}

      {/* Service cards */}
      <div className="space-y-3">
        {data?.services.map((s) => (
          <ServiceRow key={s.id} s={s} />
        ))}
        {loading && !data && (
          <p className="font-mono text-[11px] text-text-tertiary">Running probes…</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="font-serif text-2xl" style={{ color }}>{value}</div>
      <div className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mt-0.5">{label}</div>
    </div>
  );
}

function ServiceRow({ s }: { s: ServiceStatus }) {
  const tone = toneOf(s);
  const ts = TONE_STYLE[tone];
  return (
    <div className="border border-border bg-ground-light/10 px-4 py-3" style={{ borderLeft: `3px solid ${ts.color}` }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ color: ts.color, fontSize: '10px' }}>{ts.dot}</span>
            <span className="font-serif text-base text-text-primary">{s.name}</span>
            <span className="font-mono text-[7px] uppercase tracking-widest border border-border px-1.5 py-0.5 text-text-tertiary">
              {CATEGORY_LABEL[s.category]}
            </span>
          </div>
          <p className="mt-1 font-mono text-[10px] text-text-secondary">{s.detail}</p>
          <p className="mt-1 font-mono text-[9px] text-text-tertiary">Used for: {s.usedFor}</p>
          {s.expectedModels && s.expectedModels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.expectedModels.map((m) => (
                <span
                  key={m.model}
                  className="font-mono text-[8px] px-1.5 py-0.5 border"
                  style={{
                    color: m.present ? 'var(--status-complete)' : 'var(--status-failed)',
                    borderColor: m.present ? 'var(--status-complete)' : 'var(--status-failed)',
                  }}
                >
                  {m.present ? '✓' : '✕'} {m.model}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[8px] uppercase tracking-widest" style={{ color: ts.color }}>{ts.label}</div>
          {typeof s.latencyMs === 'number' && (
            <div className="font-mono text-[9px] text-text-tertiary mt-1">{s.latencyMs} ms</div>
          )}
          {typeof s.httpStatus === 'number' && (
            <div className="font-mono text-[9px] text-text-tertiary">HTTP {s.httpStatus}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={SERVICES_SIDEBAR_GROUPS}
          activeView="services"
          onSelect={() => {}}
          siteHref="/"
          feedbackHref="/admin/feedback"
        />
      }
    >
      <div className="px-6 py-8 max-w-4xl">
        <ServicesView />
      </div>
    </AdminShell>
  );
}
