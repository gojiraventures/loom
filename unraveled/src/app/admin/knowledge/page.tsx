'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';
import { DataList } from '../_components/DataList';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PersonRow {
  id: string;
  slug: string | null;
  full_name: string;
  known_as: string[] | null;
  short_bio: string | null;
  credibility_tier: string;
  current_role: string | null;
  nationality?: string | null;
  born_date?: string | null;
  died_date?: string | null;
  wikipedia_url?: string | null;
  grokipedia_url?: string | null;
  status: string | null;
  featured: boolean;
  last_researched_at: string | null;
  relationship_count?: number;
  media_count?: number;
  topic_count?: number;
}

interface InstitutionRow {
  id: string;
  slug: string;
  name: string;
  short_name?: string;
  institution_type: string;
  transparency_tier: string;
  status: string;
  short_bio?: string | null;
  headquarters_city?: string | null;
  headquarters_country?: string | null;
  website_url?: string | null;
  wikipedia_url?: string | null;
  people_count?: number;
  relationship_count?: number;
}

interface AIResearchResult {
  full_name: string;
  known_as?: string[];
  short_bio?: string;
  bio?: string;
  born_date?: string;
  born_location?: string;
  died_date?: string;
  nationality?: string;
  credibility_tier?: string;
  current_role?: string;
  website_url?: string;
  twitter_handle?: string;
  wikipedia_url?: string;
  bio_sections?: { section_type: string; title: string; content: string; sort_order: number }[];
  suggested_relationships?: { person_name: string; relationship_type: string; description: string; strength: number; bidirectional: boolean }[];
  suggested_books?: unknown[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STALE_DAYS = 90;

const DIFF_FIELDS: { key: keyof AIResearchResult; label: string }[] = [
  { key: 'short_bio',        label: 'Short bio' },
  { key: 'credibility_tier', label: 'Tier' },
  { key: 'current_role',     label: 'Current role' },
  { key: 'nationality',      label: 'Nationality' },
  { key: 'born_date',        label: 'Born' },
  { key: 'born_location',    label: 'Born location' },
  { key: 'died_date',        label: 'Died' },
  { key: 'website_url',      label: 'Website' },
  { key: 'twitter_handle',   label: 'X / Twitter' },
  { key: 'wikipedia_url',    label: 'Wikipedia' },
];

const CREDIBILITY_TIERS = [
  'academic', 'journalist', 'independent_researcher', 'whistleblower',
  'public_figure', 'historical_figure', 'witness', 'unclassified',
];

const KNOWN_BAD_ROLE_VALUES = new Set([
  'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'string', 'null', 'undefined',
  'n/a', 'unknown', 'tbd', 'none', 'placeholder', 'example', 'test',
]);
const PLACEHOLDER_PATTERNS = /^(string|null|undefined|N\/A|unknown|TBD|none|example|test|\[.*\])$/i;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isStale(lastResearched: string | null | undefined): boolean {
  if (!lastResearched) return true;
  const ms = Date.now() - new Date(lastResearched).getTime();
  return ms > STALE_DAYS * 24 * 60 * 60 * 1000;
}

function validateAIResult(r: AIResearchResult): string[] {
  const warnings: string[] = [];
  if (r.current_role) {
    const roleNorm = r.current_role.toLowerCase().trim();
    if (KNOWN_BAD_ROLE_VALUES.has(roleNorm))
      warnings.push(`current_role looks like a placeholder: "${r.current_role}"`);
  }
  if (r.credibility_tier && !CREDIBILITY_TIERS.includes(r.credibility_tier))
    warnings.push(`credibility_tier "${r.credibility_tier}" is not in the allowed list`);
  for (const field of ['short_bio', 'nationality', 'born_location'] as const) {
    const val = r[field];
    if (typeof val === 'string' && PLACEHOLDER_PATTERNS.test(val.trim()))
      warnings.push(`${field} looks like a placeholder: "${val}"`);
  }
  if (r.short_bio && r.short_bio.trim().length < 10)
    warnings.push('short_bio is suspiciously short');
  if (r.born_date) {
    const year = parseInt(r.born_date.slice(0, 4));
    if (isNaN(year) || year < 1200 || year > 2010)
      warnings.push(`born_date "${r.born_date}" looks invalid`);
  }
  return warnings;
}

function missingPersonFields(p: PersonRow): string[] {
  const m: string[] = [];
  if (!p.short_bio) m.push('bio');
  if (!p.nationality) m.push('nationality');
  if (!p.born_date) m.push('born');
  if (!p.wikipedia_url) m.push('wiki');
  if (!p.current_role) m.push('role');
  return m;
}

function missingInstitutionFields(i: InstitutionRow): string[] {
  const m: string[] = [];
  if (!i.short_bio) m.push('bio');
  if (!i.headquarters_city) m.push('hq');
  if (!i.wikipedia_url) m.push('wiki');
  return m;
}

// ── Status badge ───────────────────────────────────────────────────────────────

function statusColor(status: string | null): string {
  switch (status) {
    case 'published':    return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5';
    case 'needs_review': return 'text-amber-400 border-amber-400/30 bg-amber-400/5';
    case 'archived':     return 'text-text-tertiary border-border';
    default:             return 'text-text-tertiary border-border'; // draft
  }
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

type KnowledgeView = 'entities' | 'review' | 'add';

const KNOWLEDGE_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command', label: 'Command Center', href: '/admin' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio', label: 'Studio', href: '/admin/studio' },
      { id: 'thread', label: 'Discovery', href: '/admin' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'entities', label: 'Global Entities' },
      { id: 'add',      label: 'Add Entities' },
      { id: 'review',   label: 'Enrichment Review' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'distribution', label: 'Distribution Desk', href: '/admin/distribution' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'admin', label: 'Admin Home', href: '/admin' },
    ],
  },
];

// ── Enhanced PersonDiffPanel ───────────────────────────────────────────────────

function EnhancedDiffPanel({
  person,
  fresh,
  applyingDiff,
  onApply,
  onDismiss,
}: {
  person: PersonRow;
  fresh: AIResearchResult;
  applyingDiff: boolean;
  onApply: (fields: Record<string, unknown>) => Promise<void>;
  onDismiss: () => void;
}) {
  const changed = DIFF_FIELDS.filter(({ key }) => {
    const fv = String(fresh[key] ?? '').trim();
    const cv = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
    return fv !== '' && fv !== cv;
  });
  const unchanged = DIFF_FIELDS.filter(({ key }) => {
    const fv = String(fresh[key] ?? '').trim();
    const cv = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
    return fv === '' || fv === cv;
  });

  // Per-field selection state — all changed fields selected by default
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(changed.map(({ key }) => [key as string, true]))
  );

  // Re-initialize selection when fresh result changes
  const changedKeys = changed.map(f => f.key as string).sort().join(',');
  useEffect(() => {
    setSelected(Object.fromEntries(changed.map(({ key }) => [key as string, true])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedKeys]);

  const warnings = validateAIResult(fresh);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const allChanged = Object.fromEntries(changed.map(({ key }) => [key, fresh[key]])) as Record<string, unknown>;
  const selectedFields = Object.fromEntries(
    changed.filter(({ key }) => selected[key as string]).map(({ key }) => [key, fresh[key]])
  ) as Record<string, unknown>;

  function toggleAll(val: boolean) {
    setSelected(Object.fromEntries(changed.map(({ key }) => [key as string, val])));
  }

  return (
    <div className="border border-sky-400/20 bg-sky-400/5 rounded p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-sky-400">
            {changed.length} field{changed.length !== 1 ? 's' : ''} changed
          </p>
          {changed.length > 0 && (
            <div className="flex gap-1">
              <button onClick={() => toggleAll(true)}
                className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-border text-text-tertiary hover:text-text-primary px-1.5 py-0.5 transition-colors">
                Select All
              </button>
              <button onClick={() => toggleAll(false)}
                className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-border text-text-tertiary hover:text-text-primary px-1.5 py-0.5 transition-colors">
                Deselect All
              </button>
            </div>
          )}
        </div>
        <button onClick={onDismiss}
          className="font-mono text-[var(--admin-label-xs)] text-text-tertiary hover:text-text-secondary transition-colors">
          ✕ dismiss
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded p-2 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="font-mono text-[var(--admin-label-sm)] text-amber-400/80">⚠ {w}</p>
          ))}
        </div>
      )}

      {changed.length === 0 ? (
        <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">No differences found — data looks current.</p>
      ) : (
        <div>
          {/* Column headers */}
          <div className="grid grid-cols-[16px_80px_1fr_1fr] gap-2 mb-1.5 px-0.5">
            <span />
            <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Field</span>
            <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Current</span>
            <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-sky-400">Proposed</span>
          </div>
          <div className="space-y-1.5">
            {changed.map(({ key, label }) => {
              const freshVal = String(fresh[key] ?? '').trim();
              const currentVal = String((person as unknown as Record<string, string>)[key as string] ?? '').trim();
              const isSelected = selected[key as string] ?? false;
              return (
                <label key={key}
                  className={`grid grid-cols-[16px_80px_1fr_1fr] gap-2 items-start cursor-pointer rounded px-0.5 py-0.5 transition-colors ${isSelected ? 'bg-sky-400/5' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => setSelected(s => ({ ...s, [key as string]: e.target.checked }))}
                    className="mt-0.5 accent-sky-400"
                  />
                  <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary pt-1 truncate">{label}</span>
                  <span className="text-xs text-text-tertiary line-clamp-2 bg-ground rounded px-2 py-1">{currentVal || '—'}</span>
                  <span className="text-xs text-text-primary line-clamp-2 bg-ground rounded px-2 py-1 border border-sky-400/20">{freshVal}</span>
                </label>
              );
            })}
          </div>
          {unchanged.length > 0 && (
            <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary mt-2">
              {unchanged.length} field{unchanged.length !== 1 ? 's' : ''} unchanged — {unchanged.map(f => f.label).join(', ')}
            </p>
          )}
        </div>
      )}

      {changed.length > 0 && (
        <div className="flex items-center gap-2 pt-1 border-t border-sky-400/10 flex-wrap">
          <button
            onClick={() => onApply(allChanged)}
            disabled={applyingDiff}
            className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-sky-400 border border-sky-400/30 px-3 py-1.5 rounded hover:bg-sky-400/5 transition-colors disabled:opacity-40"
          >
            {applyingDiff ? 'Applying...' : `Accept All (${changed.length})`}
          </button>
          {selectedCount > 0 && selectedCount < changed.length && (
            <button
              onClick={() => onApply(selectedFields)}
              disabled={applyingDiff}
              className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded hover:bg-emerald-400/5 transition-colors disabled:opacity-40"
            >
              {applyingDiff ? 'Applying...' : `Accept Selected (${selectedCount})`}
            </button>
          )}
          {selectedCount === changed.length && selectedCount > 0 && (
            <button
              onClick={() => onApply(selectedFields)}
              disabled={applyingDiff}
              className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-emerald-400 border border-emerald-400/30 px-3 py-1.5 rounded hover:bg-emerald-400/5 transition-colors disabled:opacity-40"
            >
              {applyingDiff ? 'Applying...' : `Accept Selected (${selectedCount})`}
            </button>
          )}
          <button
            onClick={onDismiss}
            className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary px-3 py-1.5 rounded hover:text-text-secondary transition-colors"
          >
            Discard
          </button>
        </div>
      )}
    </div>
  );
}

// ── Global Entities View ───────────────────────────────────────────────────────

type TypeFilter = 'all' | 'people' | 'institutions';
type StatusFilter = 'all' | 'draft' | 'published' | 'needs_review' | 'stale';

type EntityItem =
  | { _type: 'person'; _id: string; _name: string; _status: string | null; data: PersonRow }
  | { _type: 'institution'; _id: string; _name: string; _status: string | null; data: InstitutionRow };

function GlobalEntitiesView() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [nameQuery, setNameQuery] = useState('');
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState('');
  const [rowStatus, setRowStatus] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, iRes] = await Promise.all([
        fetch('/api/admin/people'),
        fetch('/api/admin/institutions'),
      ]);
      const [pd, id] = await Promise.all([pRes.json(), iRes.json()]);
      setPeople(pd.people ?? []);
      setInstitutions(id.institutions ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function enrichPerson(p: PersonRow) {
    setRowStatus(s => ({ ...s, [p.id]: 'researching…' }));
    try {
      const res = await fetch('/api/admin/people/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: p.full_name }),
      });
      const data = await res.json() as { person?: AIResearchResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Research failed');
      // Apply top-level scalar fields directly (omit nested arrays)
      const pr = data.person;
      const scalarFields = {
        short_bio:        pr?.short_bio,
        credibility_tier: pr?.credibility_tier,
        current_role:     pr?.current_role,
        nationality:      pr?.nationality,
        born_date:        pr?.born_date,
        wikipedia_url:    pr?.wikipedia_url,
        twitter_handle:   pr?.twitter_handle,
        website_url:      pr?.website_url,
      };
      await fetch('/api/admin/people', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, ...scalarFields, last_researched_at: new Date().toISOString() }),
      });
      setRowStatus(s => ({ ...s, [p.id]: 'enriched ✓' }));
      await load();
    } catch (err) {
      setRowStatus(s => ({ ...s, [p.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }

  async function enrichInstitution(inst: InstitutionRow) {
    setRowStatus(s => ({ ...s, [inst.id]: 'researching…' }));
    try {
      const res = await fetch('/api/admin/institutions/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inst.name }),
      });
      const data = await res.json() as { institution?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Research failed');
      const { name: _n, bio_sections: _bs, suggested_relationships: _sr, ...scalarFields } = data.institution ?? {};
      await fetch('/api/admin/institutions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inst.id, ...scalarFields }),
      });
      setRowStatus(s => ({ ...s, [inst.id]: 'enriched ✓' }));
      await load();
    } catch (err) {
      setRowStatus(s => ({ ...s, [inst.id]: `error: ${err instanceof Error ? err.message : String(err)}` }));
    }
  }

  async function batchEnrich() {
    setEnriching(true);
    setEnrichResult('');
    try {
      const res = await fetch('/api/admin/thread/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      });
      const data = await res.json();
      if (res.ok) {
        setEnrichResult(`Enriched ${data.enriched ?? 0} people. Reload to see updates.`);
        await load();
      } else {
        setEnrichResult(`Error: ${data.error ?? 'Enrich failed'}`);
      }
    } catch (err) {
      setEnrichResult(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    setEnriching(false);
  }

  // Build merged entity list
  const allEntities: EntityItem[] = [
    ...people.map(p => ({ _type: 'person' as const, _id: p.id, _name: p.full_name, _status: p.status, data: p })),
    ...institutions.map(i => ({ _type: 'institution' as const, _id: i.id, _name: i.name, _status: i.status, data: i })),
  ];

  // Apply filters
  const filtered = allEntities.filter(e => {
    if (typeFilter !== 'all' && e._type !== typeFilter.replace('s', '').replace('people', 'person').replace('institutions', 'institution')) {
      // type filter: 'people' matches 'person', 'institutions' matches 'institution'
      if (typeFilter === 'people' && e._type !== 'person') return false;
      if (typeFilter === 'institutions' && e._type !== 'institution') return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'stale') {
        if (e._type === 'person') {
          if (!isStale((e.data as PersonRow).last_researched_at)) return false;
        } else {
          return false; // institutions don't have staleness
        }
      } else if (statusFilter === 'needs_review') {
        if (e._status !== 'needs_review') return false;
      } else {
        if (e._status !== statusFilter) return false;
      }
    }
    if (nameQuery.trim()) {
      const q = nameQuery.trim().toLowerCase();
      if (!e._name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    people:       allEntities.filter(e => e._type === 'person').length,
    institutions: allEntities.filter(e => e._type === 'institution').length,
    stale:        allEntities.filter(e => e._type === 'person' && isStale((e.data as PersonRow).last_researched_at)).length,
    needsReview:  allEntities.filter(e => e._status === 'needs_review').length,
  };

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="flex gap-6 border border-border bg-ground-light/20 px-4 py-3">
        <div>
          <div className="font-serif text-xl text-gold">{counts.people}</div>
          <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">People</div>
        </div>
        <div>
          <div className="font-serif text-xl text-text-primary">{counts.institutions}</div>
          <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Institutions</div>
        </div>
        {counts.stale > 0 && (
          <div>
            <div className="font-serif text-xl text-amber-400">{counts.stale}</div>
            <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Stale</div>
          </div>
        )}
        {counts.needsReview > 0 && (
          <div>
            <div className="font-serif text-xl text-sky-400">{counts.needsReview}</div>
            <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">Needs Review</div>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Name search */}
        <input
          value={nameQuery}
          onChange={e => setNameQuery(e.target.value)}
          placeholder="Search by name..."
          className="bg-ground-light border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/40 w-48"
        />

        {/* Type filter */}
        <div className="flex gap-0 border border-border">
          {(['all', 'people', 'institutions'] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border-r border-border last:border-r-0 transition-colors ${typeFilter === t ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-0 border border-border">
          {(['all', 'draft', 'published', 'needs_review', 'stale'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border-r border-border last:border-r-0 transition-colors ${statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {s === 'needs_review' ? 'Review' : s}
            </button>
          ))}
        </div>

        {/* Batch enrich */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={batchEnrich} disabled={enriching}
            className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border border-amber-400/40 text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-50">
            {enriching ? '⊙ Enriching...' : '⊙ Enrich People (10)'}
          </button>
          <button onClick={load} className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-2 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors">
            ↺
          </button>
        </div>
      </div>

      {enrichResult && (
        <p className={`font-mono text-[var(--admin-label-sm)] border-l-2 pl-3 ${enrichResult.startsWith('Error') || enrichResult.startsWith('Request') ? 'text-red-400 border-red-400/40' : 'text-emerald-400 border-emerald-400/40'}`}>
          {enrichResult}
        </p>
      )}

      {/* Entity list */}
      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading...</p>
      ) : (
        <DataList
          items={filtered}
          keyExtractor={e => `${e._type}-${e._id}`}
          pageSize={25}
          emptyMessage="No entities match the current filters."
          renderItem={(e) => {
            if (e._type === 'person') {
              const p = e.data as PersonRow;
              const missing = missingPersonFields(p);
              const stale = isStale(p.last_researched_at);
              return (
                <div className="border-b border-border/40 py-3 px-1 flex items-start gap-3 hover:bg-ground-light/10 transition-colors">
                  {/* Type badge */}
                  <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 mt-0.5 text-gold border-gold/30 bg-gold/5">
                    Person
                  </span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-serif text-[var(--admin-title-sm)] text-text-primary">{p.full_name}</span>
                      <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${statusColor(p.status)}`}>
                        {p.status ?? 'draft'}
                      </span>
                      {stale && (
                        <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-amber-400/30 text-amber-400 px-1.5 py-0.5">
                          stale
                        </span>
                      )}
                      {p.credibility_tier && p.credibility_tier !== 'unclassified' && (
                        <span className="font-mono text-[var(--admin-label-xs)] border border-border text-text-tertiary px-1.5 py-0.5">
                          {p.credibility_tier}
                        </span>
                      )}
                    </div>
                    {p.short_bio && (
                      <p className="text-[var(--admin-body)] text-text-secondary leading-snug line-clamp-2 mt-0.5">{p.short_bio}</p>
                    )}
                    {/* Missing field chips */}
                    {missing.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {missing.map(f => (
                          <span key={f} className="font-mono text-[var(--admin-label-xs)] border border-red-400/20 text-red-400/70 px-1 py-0.5">
                            missing: {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: stats + enrich + link */}
                  <div className="shrink-0 flex items-center gap-3 text-right">
                    {(p.topic_count ?? 0) > 0 && (
                      <div>
                        <div className="font-serif text-sm text-text-primary">{p.topic_count}</div>
                        <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">dossiers</div>
                      </div>
                    )}
                    {(p.relationship_count ?? 0) > 0 && (
                      <div>
                        <div className="font-serif text-sm text-text-secondary">{p.relationship_count}</div>
                        <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">links</div>
                      </div>
                    )}
                    {rowStatus[p.id] ? (
                      <span className={`font-mono text-[var(--admin-label-xs)] ${rowStatus[p.id].startsWith('error') ? 'text-red-400' : rowStatus[p.id] === 'researching…' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                        {rowStatus[p.id]}
                      </span>
                    ) : (
                      <button
                        onClick={() => void enrichPerson(p)}
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 px-2 py-1 transition-colors"
                      >
                        Enrich
                      </button>
                    )}
                    {p.slug && (
                      <a href={`/people/${p.slug}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1 transition-colors">
                        View
                      </a>
                    )}
                  </div>
                </div>
              );
            } else {
              // Institution
              const inst = e.data as InstitutionRow;
              const missing = missingInstitutionFields(inst);
              return (
                <div className="border-b border-border/40 py-3 px-1 flex items-start gap-3 hover:bg-ground-light/10 transition-colors">
                  {/* Type badge */}
                  <span className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 shrink-0 mt-0.5 text-sky-400 border-sky-400/30 bg-sky-400/5">
                    Inst
                  </span>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-serif text-[var(--admin-title-sm)] text-text-primary">{inst.name}</span>
                      <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${statusColor(inst.status)}`}>
                        {inst.status}
                      </span>
                      {inst.institution_type && (
                        <span className="font-mono text-[var(--admin-label-xs)] border border-border text-text-tertiary px-1.5 py-0.5">
                          {inst.institution_type}
                        </span>
                      )}
                      {inst.transparency_tier && inst.transparency_tier !== 'standard' && (
                        <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${
                          inst.transparency_tier === 'classified' || inst.transparency_tier === 'defunct_classified'
                            ? 'text-red-400 border-red-400/30' :
                          inst.transparency_tier === 'opaque'
                            ? 'text-amber-400 border-amber-400/30'
                            : 'text-emerald-400 border-emerald-400/30'
                        }`}>
                          {inst.transparency_tier}
                        </span>
                      )}
                    </div>
                    {inst.short_bio && (
                      <p className="text-[var(--admin-body)] text-text-secondary leading-snug line-clamp-2 mt-0.5">{inst.short_bio}</p>
                    )}
                    {inst.headquarters_city && (
                      <p className="font-mono text-[var(--admin-label-xs)] text-text-tertiary mt-0.5">
                        {inst.headquarters_city}{inst.headquarters_country ? `, ${inst.headquarters_country}` : ''}
                      </p>
                    )}
                    {/* Missing field chips */}
                    {missing.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {missing.map(f => (
                          <span key={f} className="font-mono text-[var(--admin-label-xs)] border border-red-400/20 text-red-400/70 px-1 py-0.5">
                            missing: {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: stats + enrich + link */}
                  <div className="shrink-0 flex items-center gap-3 text-right">
                    {(inst.people_count ?? 0) > 0 && (
                      <div>
                        <div className="font-serif text-sm text-text-primary">{inst.people_count}</div>
                        <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">people</div>
                      </div>
                    )}
                    {(inst.relationship_count ?? 0) > 0 && (
                      <div>
                        <div className="font-serif text-sm text-text-secondary">{inst.relationship_count}</div>
                        <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">links</div>
                      </div>
                    )}
                    {rowStatus[inst.id] ? (
                      <span className={`font-mono text-[var(--admin-label-xs)] ${rowStatus[inst.id].startsWith('error') ? 'text-red-400' : rowStatus[inst.id] === 'researching…' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                        {rowStatus[inst.id]}
                      </span>
                    ) : (
                      <button
                        onClick={() => void enrichInstitution(inst)}
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-sky-400/30 text-sky-400 hover:bg-sky-400/10 px-2 py-1 transition-colors"
                      >
                        Enrich
                      </button>
                    )}
                    {inst.slug && (
                      <a href={`/institutions/${inst.slug}`} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1 transition-colors">
                        View
                      </a>
                    )}
                  </div>
                </div>
              );
            }
          }}
        />
      )}
    </div>
  );
}

// ── Add Entities View ──────────────────────────────────────────────────────────

interface WishlistItem {
  id: string;
  person_name: string;
  relationship_type: string;
  source_person_name: string | null;
  description: string | null;
}

type AddTab = 'person' | 'institution' | 'wishlist';

const INSTITUTION_TYPES = ['academic', 'government', 'ngo', 'media', 'corporate', 'religious', 'military', 'research', 'other'];
const TRANSPARENCY_TIERS = ['transparent', 'standard', 'opaque', 'classified', 'defunct_classified'];

function AddEntitiesView() {
  const [tab, setTab] = useState<AddTab>('person');

  // ── Person form ────
  const [personForm, setPersonForm] = useState({
    full_name: '', short_bio: '', credibility_tier: 'unclassified',
    current_role: '', nationality: '', born_date: '', wikipedia_url: '', twitter_handle: '',
  });
  const [personResearching, setPersonResearching] = useState(false);
  const [personSaving, setPersonSaving] = useState(false);
  const [personStatus, setPersonStatus] = useState('');
  const [personResearchName, setPersonResearchName] = useState('');

  // ── Institution form ────
  const [instForm, setInstForm] = useState({
    name: '', institution_type: '', transparency_tier: 'standard',
    short_bio: '', headquarters_city: '', headquarters_country: '', website_url: '', wikipedia_url: '',
  });
  const [instResearching, setInstResearching] = useState(false);
  const [instSaving, setInstSaving] = useState(false);
  const [instStatus, setInstStatus] = useState('');
  const [instResearchName, setInstResearchName] = useState('');

  // ── Logo upload ────
  const [logoInstName, setLogoInstName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoStatus, setLogoStatus] = useState('');

  // ── Wishlist ────
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [wishlistStatus, setWishlistStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tab === 'wishlist') void loadWishlist();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadWishlist() {
    setLoadingWishlist(true);
    try {
      const res = await fetch('/api/admin/people/wishlist');
      const data = await res.json() as { items?: WishlistItem[] };
      setWishlist(data.items ?? []);
    } finally {
      setLoadingWishlist(false);
    }
  }

  // ── Person helpers ────

  async function researchPerson() {
    if (!personResearchName.trim()) return;
    setPersonResearching(true);
    setPersonStatus('Researching…');
    try {
      const res = await fetch('/api/admin/people/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: personResearchName.trim() }),
      });
      const data = await res.json() as { person?: AIResearchResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Research failed');
      const p: AIResearchResult | undefined = data.person;
      setPersonForm(f => ({
        ...f,
        full_name:        p?.full_name || f.full_name,
        short_bio:        p?.short_bio || f.short_bio,
        credibility_tier: p?.credibility_tier || f.credibility_tier,
        current_role:     p?.current_role || f.current_role,
        nationality:      p?.nationality || f.nationality,
        born_date:        p?.born_date || f.born_date,
        wikipedia_url:    p?.wikipedia_url || f.wikipedia_url,
        twitter_handle:   p?.twitter_handle || f.twitter_handle,
      }));
      setPersonStatus('Research complete — review and save below');
    } catch (err) {
      setPersonStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPersonResearching(false);
    }
  }

  async function savePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!personForm.full_name.trim()) { setPersonStatus('Full name is required'); return; }
    setPersonSaving(true);
    setPersonStatus('Saving…');
    try {
      const res = await fetch('/api/admin/people', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: { ...personForm, full_name: personForm.full_name.trim() }, bio_sections: [], suggested_relationships: [] }),
      });
      const data = await res.json() as { person?: { full_name: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setPersonStatus(`Saved ✓ — ${data.person?.full_name ?? personForm.full_name}`);
      setPersonForm({ full_name: '', short_bio: '', credibility_tier: 'unclassified', current_role: '', nationality: '', born_date: '', wikipedia_url: '', twitter_handle: '' });
      setPersonResearchName('');
    } catch (err) {
      setPersonStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setPersonSaving(false);
    }
  }

  // ── Institution helpers ────

  async function researchInstitution() {
    if (!instResearchName.trim()) return;
    setInstResearching(true);
    setInstStatus('Researching…');
    try {
      const res = await fetch('/api/admin/institutions/research', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: instResearchName.trim() }),
      });
      const data = await res.json() as { institution?: Record<string, string>; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Research failed');
      const inst = data.institution ?? {};
      setInstForm(f => ({
        ...f,
        name:                 (inst.name as string) || f.name,
        institution_type:     (inst.institution_type as string) || f.institution_type,
        transparency_tier:    (inst.transparency_tier as string) || f.transparency_tier,
        short_bio:            (inst.short_bio as string) || f.short_bio,
        headquarters_city:    (inst.headquarters_city as string) || f.headquarters_city,
        headquarters_country: (inst.headquarters_country as string) || f.headquarters_country,
        website_url:          (inst.website_url as string) || f.website_url,
        wikipedia_url:        (inst.wikipedia_url as string) || f.wikipedia_url,
      }));
      setInstStatus('Research complete — review and save below');
    } catch (err) {
      setInstStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInstResearching(false);
    }
  }

  async function saveInstitution(e: React.FormEvent) {
    e.preventDefault();
    if (!instForm.name.trim()) { setInstStatus('Name is required'); return; }
    setInstSaving(true);
    setInstStatus('Saving…');
    try {
      const res = await fetch('/api/admin/institutions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution: { ...instForm, name: instForm.name.trim() }, bio_sections: [], suggested_relationships: [] }),
      });
      const data = await res.json() as { institution?: { name: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      setInstStatus(`Saved ✓ — ${data.institution?.name ?? instForm.name}`);
      setInstForm({ name: '', institution_type: '', transparency_tier: 'standard', short_bio: '', headquarters_city: '', headquarters_country: '', website_url: '', wikipedia_url: '' });
      setInstResearchName('');
    } catch (err) {
      setInstStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInstSaving(false);
    }
  }

  // ── Logo upload ────

  async function uploadLogo(e: React.FormEvent) {
    e.preventDefault();
    if (!logoFile || !logoInstName.trim()) { setLogoStatus('Institution name and file are required'); return; }
    setLogoUploading(true);
    setLogoStatus('Uploading…');
    try {
      const fd = new FormData();
      fd.append('file', logoFile);
      fd.append('topic', logoInstName.trim().toLowerCase().replace(/\s+/g, '-'));
      fd.append('title', `${logoInstName.trim()} logo`);
      const res = await fetch('/api/admin/images/upload', { method: 'POST', body: fd });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setLogoStatus(`Uploaded ✓ — ${data.url ?? ''}`);
      setLogoFile(null);
      setLogoInstName('');
    } catch (err) {
      setLogoStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLogoUploading(false);
    }
  }

  // ── Wishlist actions ────

  async function removeWishlistItem(id: string) {
    setWishlistStatus(s => ({ ...s, [id]: 'removing…' }));
    try {
      await fetch('/api/admin/people/wishlist', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setWishlist(w => w.filter(i => i.id !== id));
    } catch {
      setWishlistStatus(s => ({ ...s, [id]: 'error' }));
    }
  }

  function researchWishlistItem(item: WishlistItem) {
    setTab('person');
    setPersonResearchName(item.person_name);
    setPersonForm(f => ({ ...f, full_name: item.person_name }));
  }

  const inputCls = 'w-full bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-gold/40 rounded';
  const labelCls = 'font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary block mb-1';

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-0 border border-border w-fit">
        {(['person', 'institution', 'wishlist'] as AddTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border-r border-border last:border-r-0 transition-colors ${tab === t ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
            {t === 'person' ? 'Add Person' : t === 'institution' ? 'Add Institution' : 'Wishlist'}
          </button>
        ))}
      </div>

      {/* ── Add Person ── */}
      {tab === 'person' && (
        <div className="space-y-6">
          {/* Research & Add */}
          <div className="border border-border bg-ground-light/20 p-4 rounded space-y-3">
            <h3 className="font-mono font-medium text-[var(--admin-label)] text-sky-400">Research & Add</h3>
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Look up a person by name and pre-fill the form with AI research results.</p>
            <div className="flex gap-2">
              <input
                value={personResearchName}
                onChange={e => setPersonResearchName(e.target.value)}
                placeholder="Person name…"
                className="flex-1 bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-sky-400/40 rounded"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void researchPerson(); } }}
              />
              <button
                onClick={() => void researchPerson()}
                disabled={personResearching || !personResearchName.trim()}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-1.5 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 rounded transition-colors disabled:opacity-40"
              >
                {personResearching ? '⊙ Researching…' : 'Research →'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={e => void savePerson(e)} className="space-y-4">
            <h3 className="font-mono font-medium text-[var(--admin-label)] text-gold">Person Details</h3>
            <div>
              <label className={labelCls}>Full name *</label>
              <input value={personForm.full_name} onChange={e => setPersonForm(f => ({ ...f, full_name: e.target.value }))} required className={inputCls} placeholder="Full name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Credibility tier</label>
                <select value={personForm.credibility_tier} onChange={e => setPersonForm(f => ({ ...f, credibility_tier: e.target.value }))}
                  className={inputCls}>
                  {CREDIBILITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Current role</label>
                <input value={personForm.current_role} onChange={e => setPersonForm(f => ({ ...f, current_role: e.target.value }))} className={inputCls} placeholder="Role / title" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Short bio</label>
              <textarea value={personForm.short_bio} onChange={e => setPersonForm(f => ({ ...f, short_bio: e.target.value }))}
                className={`${inputCls} resize-none`} rows={2} placeholder="Brief biography" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Nationality</label>
                <input value={personForm.nationality} onChange={e => setPersonForm(f => ({ ...f, nationality: e.target.value }))} className={inputCls} placeholder="e.g. American" />
              </div>
              <div>
                <label className={labelCls}>Born date</label>
                <input value={personForm.born_date} onChange={e => setPersonForm(f => ({ ...f, born_date: e.target.value }))} className={inputCls} placeholder="YYYY-MM-DD" />
              </div>
              <div>
                <label className={labelCls}>X / Twitter</label>
                <input value={personForm.twitter_handle} onChange={e => setPersonForm(f => ({ ...f, twitter_handle: e.target.value }))} className={inputCls} placeholder="@handle" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Wikipedia URL</label>
              <input value={personForm.wikipedia_url} onChange={e => setPersonForm(f => ({ ...f, wikipedia_url: e.target.value }))} className={inputCls} placeholder="https://en.wikipedia.org/…" />
            </div>
            {personStatus && (
              <p className={`font-mono text-[var(--admin-label-sm)] ${personStatus.startsWith('Error') ? 'text-red-400' : personStatus.includes('✓') ? 'text-emerald-400' : 'text-sky-400'}`}>
                {personStatus}
              </p>
            )}
            <button type="submit" disabled={personSaving}
              className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-5 py-2 bg-gold text-ground hover:bg-gold/90 rounded transition-colors disabled:opacity-50">
              {personSaving ? 'Saving…' : 'Save Person'}
            </button>
          </form>
        </div>
      )}

      {/* ── Add Institution ── */}
      {tab === 'institution' && (
        <div className="space-y-6">
          {/* Research & Add */}
          <div className="border border-border bg-ground-light/20 p-4 rounded space-y-3">
            <h3 className="font-mono font-medium text-[var(--admin-label)] text-sky-400">Research & Add</h3>
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Look up an institution by name and pre-fill the form with AI research results.</p>
            <div className="flex gap-2">
              <input
                value={instResearchName}
                onChange={e => setInstResearchName(e.target.value)}
                placeholder="Institution name…"
                className="flex-1 bg-ground border border-border px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-sky-400/40 rounded"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void researchInstitution(); } }}
              />
              <button
                onClick={() => void researchInstitution()}
                disabled={instResearching || !instResearchName.trim()}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-1.5 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 rounded transition-colors disabled:opacity-40"
              >
                {instResearching ? '⊙ Researching…' : 'Research →'}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={e => void saveInstitution(e)} className="space-y-4">
            <h3 className="font-mono font-medium text-[var(--admin-label)] text-gold">Institution Details</h3>
            <div>
              <label className={labelCls}>Name *</label>
              <input value={instForm.name} onChange={e => setInstForm(f => ({ ...f, name: e.target.value }))} required className={inputCls} placeholder="Institution name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Type</label>
                <select value={instForm.institution_type} onChange={e => setInstForm(f => ({ ...f, institution_type: e.target.value }))} className={inputCls}>
                  <option value="">— Select type —</option>
                  {INSTITUTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Transparency tier</label>
                <select value={instForm.transparency_tier} onChange={e => setInstForm(f => ({ ...f, transparency_tier: e.target.value }))} className={inputCls}>
                  {TRANSPARENCY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Short bio</label>
              <textarea value={instForm.short_bio} onChange={e => setInstForm(f => ({ ...f, short_bio: e.target.value }))}
                className={`${inputCls} resize-none`} rows={2} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>HQ city</label>
                <input value={instForm.headquarters_city} onChange={e => setInstForm(f => ({ ...f, headquarters_city: e.target.value }))} className={inputCls} placeholder="City" />
              </div>
              <div>
                <label className={labelCls}>HQ country</label>
                <input value={instForm.headquarters_country} onChange={e => setInstForm(f => ({ ...f, headquarters_country: e.target.value }))} className={inputCls} placeholder="Country" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Website URL</label>
                <input value={instForm.website_url} onChange={e => setInstForm(f => ({ ...f, website_url: e.target.value }))} className={inputCls} placeholder="https://…" />
              </div>
              <div>
                <label className={labelCls}>Wikipedia URL</label>
                <input value={instForm.wikipedia_url} onChange={e => setInstForm(f => ({ ...f, wikipedia_url: e.target.value }))} className={inputCls} placeholder="https://en.wikipedia.org/…" />
              </div>
            </div>
            {instStatus && (
              <p className={`font-mono text-[var(--admin-label-sm)] ${instStatus.startsWith('Error') ? 'text-red-400' : instStatus.includes('✓') ? 'text-emerald-400' : 'text-sky-400'}`}>
                {instStatus}
              </p>
            )}
            <button type="submit" disabled={instSaving}
              className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-5 py-2 bg-gold text-ground hover:bg-gold/90 rounded transition-colors disabled:opacity-50">
              {instSaving ? 'Saving…' : 'Save Institution'}
            </button>
          </form>

          {/* Logo upload */}
          <div className="border border-border bg-ground-light/20 p-4 rounded space-y-3">
            <h3 className="font-mono font-medium text-[var(--admin-label)] text-violet-400">Upload Institution Logo</h3>
            <form onSubmit={e => void uploadLogo(e)} className="space-y-3">
              <div>
                <label className={labelCls}>Institution name</label>
                <input value={logoInstName} onChange={e => setLogoInstName(e.target.value)} className={inputCls} placeholder="Institution name (used as topic)" />
              </div>
              <div>
                <label className={labelCls}>Logo file (max 10 MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
                  className="w-full font-mono text-[var(--admin-label-sm)] text-text-secondary file:mr-3 file:font-mono file:text-[var(--admin-label-sm)] file:uppercase file:tracking-widest file:border file:border-border file:text-text-tertiary file:bg-ground file:px-3 file:py-1 file:rounded file:transition-colors hover:file:text-gold"
                />
              </div>
              {logoStatus && (
                <p className={`font-mono text-[var(--admin-label-sm)] ${logoStatus.startsWith('Error') ? 'text-red-400' : logoStatus.includes('✓') ? 'text-emerald-400' : 'text-text-tertiary'}`}>
                  {logoStatus}
                </p>
              )}
              <button type="submit" disabled={logoUploading || !logoFile || !logoInstName.trim()}
                className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-4 py-2 border border-violet-400/40 text-violet-400 hover:bg-violet-400/10 rounded transition-colors disabled:opacity-40">
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Wishlist ── */}
      {tab === 'wishlist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
              People suggested for research based on their appearance in existing profiles.
            </p>
            <button onClick={() => void loadWishlist()} className="font-mono text-[var(--admin-label-sm)] text-text-tertiary hover:text-gold transition-colors">↺ Refresh</button>
          </div>
          {loadingWishlist ? (
            <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary animate-pulse">Loading…</p>
          ) : wishlist.length === 0 ? (
            <div className="border border-border bg-ground-light/20 p-8 text-center">
              <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary">Wishlist is empty</p>
            </div>
          ) : (
            <div className="border border-border divide-y divide-border/40">
              {wishlist.map(item => {
                const ws = wishlistStatus[item.id];
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-ground-light/10 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-serif text-sm text-text-primary">{item.person_name}</span>
                        {item.relationship_type && (
                          <span className="font-mono text-[var(--admin-label-xs)] uppercase border border-border text-text-tertiary px-1.5 py-0.5">
                            {item.relationship_type}
                          </span>
                        )}
                      </div>
                      {item.source_person_name && (
                        <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">via {item.source_person_name}</p>
                      )}
                      {item.description && (
                        <p className="text-[var(--admin-body)] text-text-secondary leading-snug line-clamp-2 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {ws ? (
                        <span className={`font-mono text-[var(--admin-label-sm)] ${ws.startsWith('error') ? 'text-red-400' : 'text-text-tertiary'}`}>{ws}</span>
                      ) : (
                        <>
                          <button
                            onClick={() => { researchWishlistItem(item); }}
                            className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 rounded transition-colors"
                          >
                            Research Now
                          </button>
                          <button
                            onClick={() => void removeWishlistItem(item.id)}
                            className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest px-2 py-1 border border-border text-text-tertiary hover:text-red-400 hover:border-red-400/30 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Enrichment Review View ─────────────────────────────────────────────────────

function EnrichmentReviewView() {
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [researching, setResearching] = useState<Record<string, boolean>>({});
  const [diffResults, setDiffResults] = useState<Record<string, AIResearchResult>>({});
  const [applyingDiff, setApplyingDiff] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'needs_review' | 'stale' | 'all'>('needs_review');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/people');
      const data = await res.json();
      setPeople(data.people ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter to people that need enrichment review
  const reviewQueue = people.filter(p => {
    if (statusFilter === 'needs_review') return p.status === 'needs_review';
    if (statusFilter === 'stale') return isStale(p.last_researched_at);
    return p.status === 'needs_review' || isStale(p.last_researched_at);
  });

  const selectedPerson = reviewQueue.find(p => p.id === selectedId) ?? null;
  const selectedDiff = selectedId ? diffResults[selectedId] ?? null : null;

  async function runReresearch(person: PersonRow) {
    setResearching(r => ({ ...r, [person.id]: true }));
    setSelectedId(person.id);
    try {
      const res = await fetch('/api/admin/people/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: person.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Re-research failed');
      setDiffResults(d => ({ ...d, [person.id]: data.person }));
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setResearching(r => ({ ...r, [person.id]: false }));
    }
  }

  async function applyDiff(personId: string, fields: Record<string, unknown>) {
    setApplyingDiff(true);
    try {
      await fetch('/api/admin/people', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, ...fields, last_researched_at: new Date().toISOString() }),
      });
      setDiffResults(d => { const copy = { ...d }; delete copy[personId]; return copy; });
      await load();
    } finally {
      setApplyingDiff(false);
    }
  }

  const staleCount    = people.filter(p => isStale(p.last_researched_at)).length;
  const reviewCount   = people.filter(p => p.status === 'needs_review').length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex gap-6 border border-border bg-ground-light/20 px-4 py-3">
        <div>
          <div className="font-serif text-xl text-amber-400">{staleCount}</div>
          <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Stale</div>
        </div>
        <div>
          <div className="font-serif text-xl text-sky-400">{reviewCount}</div>
          <div className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">Needs Review</div>
        </div>
        <div>
          <div className="font-serif text-xl text-text-secondary">{people.length}</div>
          <div className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary">Total People</div>
        </div>
      </div>

      {/* Filter + refresh */}
      <div className="flex items-center gap-3">
        <div className="flex gap-0 border border-border">
          {(['needs_review', 'stale', 'all'] as const).map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelectedId(null); }}
              className={`font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-3 py-1.5 border-r border-border last:border-r-0 transition-colors ${statusFilter === s ? 'text-gold bg-gold/5' : 'text-text-tertiary hover:text-text-secondary'}`}>
              {s === 'needs_review' ? 'Needs Review' : s === 'stale' ? `Stale (${staleCount})` : 'All'}
            </button>
          ))}
        </div>
        <button onClick={load}
          className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest px-2 py-1.5 border border-border text-text-tertiary hover:text-text-secondary transition-colors ml-auto">
          ↺ Refresh
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-sm text-text-tertiary animate-pulse">Loading...</p>
      ) : reviewQueue.length === 0 ? (
        <div className="border border-border bg-ground-light/20 p-8 text-center">
          <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary">
            {statusFilter === 'needs_review' ? 'No people flagged for review' :
             statusFilter === 'stale' ? 'No stale profiles' :
             'Nothing in the enrichment queue'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[280px_1fr] gap-4">
          {/* Queue list */}
          <div className="space-y-1 border-r border-border pr-4 overflow-y-auto max-h-[600px]">
            <p className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest text-text-tertiary mb-2">
              {reviewQueue.length} in queue
            </p>
            {reviewQueue.map(p => {
              const hasDiff = !!diffResults[p.id];
              const isResearching = researching[p.id];
              const isSelected = selectedId === p.id;
              return (
                <button key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left border rounded px-3 py-2 transition-colors ${
                    isSelected
                      ? 'border-gold/40 bg-gold/5'
                      : hasDiff ? 'border-sky-400/30 bg-sky-400/3'
                      : 'border-border/40 hover:border-border'
                  }`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-serif text-sm text-text-primary truncate flex-1">{p.full_name}</span>
                    {isResearching && <span className="font-mono text-[var(--admin-label-xs)] text-amber-400 animate-pulse">⊙</span>}
                    {hasDiff && !isResearching && <span className="font-mono text-[var(--admin-label-xs)] text-sky-400">diff</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className={`font-mono text-[var(--admin-label-xs)] uppercase border px-1 py-0 ${statusColor(p.status)}`}>
                      {p.status ?? 'draft'}
                    </span>
                    {isStale(p.last_researched_at) && (
                      <span className="font-mono text-[var(--admin-label-xs)] text-amber-400/70">stale</span>
                    )}
                    {p.topic_count != null && p.topic_count > 0 && (
                      <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">{p.topic_count}d</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail / diff panel */}
          <div>
            {!selectedPerson ? (
              <div className="border border-border/40 p-8 text-center">
                <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">Select a person from the queue to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Person header */}
                <div className="border border-border bg-ground-light/20 px-4 py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-serif text-xl text-text-primary">{selectedPerson.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border px-1.5 py-0.5 ${statusColor(selectedPerson.status)}`}>
                          {selectedPerson.status ?? 'draft'}
                        </span>
                        {selectedPerson.credibility_tier && selectedPerson.credibility_tier !== 'unclassified' && (
                          <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary border border-border px-1.5 py-0.5">
                            {selectedPerson.credibility_tier}
                          </span>
                        )}
                        {isStale(selectedPerson.last_researched_at) && (
                          <span className="font-mono text-[var(--admin-label-xs)] text-amber-400 border border-amber-400/30 px-1.5 py-0.5">
                            stale{selectedPerson.last_researched_at
                              ? ` — ${new Date(selectedPerson.last_researched_at).toLocaleDateString()}`
                              : ' — never enriched'}
                          </span>
                        )}
                      </div>
                      {selectedPerson.short_bio && (
                        <p className="text-sm text-text-secondary mt-2 leading-relaxed">{selectedPerson.short_bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {selectedPerson.slug && (
                        <a href={`/people/${selectedPerson.slug}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1.5 transition-colors">
                          View
                        </a>
                      )}
                      <button
                        onClick={() => runReresearch(selectedPerson)}
                        disabled={researching[selectedPerson.id]}
                        className="font-mono text-[var(--admin-label-xs)] uppercase tracking-widest border border-sky-400/40 text-sky-400 hover:bg-sky-400/10 px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {researching[selectedPerson.id] ? '⊙ Researching...' : '↻ Re-research'}
                      </button>
                    </div>
                  </div>

                  {/* Missing fields */}
                  {(() => {
                    const missing = missingPersonFields(selectedPerson);
                    if (missing.length === 0) return null;
                    return (
                      <div className="flex flex-wrap gap-1 mt-3">
                        <span className="font-mono text-[var(--admin-label-xs)] text-text-tertiary">Missing:</span>
                        {missing.map(f => (
                          <span key={f} className="font-mono text-[var(--admin-label-xs)] border border-red-400/20 text-red-400/70 px-1.5 py-0.5">
                            {f}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Diff panel — shown when re-research result is available */}
                {selectedDiff ? (
                  <EnhancedDiffPanel
                    person={selectedPerson}
                    fresh={selectedDiff}
                    applyingDiff={applyingDiff}
                    onApply={(fields) => applyDiff(selectedPerson.id, fields)}
                    onDismiss={() => setDiffResults(d => { const copy = { ...d }; delete copy[selectedPerson.id]; return copy; })}
                  />
                ) : (
                  <div className="border border-border/40 bg-ground-light/10 p-6 text-center">
                    <p className="font-mono text-[var(--admin-label-sm)] text-text-tertiary">
                      Click &quot;Re-research&quot; to generate a fresh AI profile and review proposed changes.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function KnowledgePage() {
  const [view, setView] = useState<KnowledgeView>('entities');

  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={KNOWLEDGE_SIDEBAR_GROUPS}
          activeView={view}
          onSelect={(v) => setView(v as KnowledgeView)}
          siteHref="/"
          feedbackHref="/admin/feedback"
        />
      }
    >
      <div className="px-6 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-text-primary">Knowledge</h1>
          <p className="font-mono text-[var(--admin-label-sm)] uppercase tracking-widest text-text-tertiary mt-1">
            {view === 'entities' && 'Global Entities — merged people + institutions'}
            {view === 'add'      && 'Add Entities — create people, institutions & wishlist'}
            {view === 'review'   && 'Enrichment Review — approve AI-proposed updates'}
          </p>
        </div>

        {view === 'entities' && <GlobalEntitiesView />}
        {view === 'add'      && <AddEntitiesView />}
        {view === 'review'   && <EnrichmentReviewView />}
      </div>
    </AdminShell>
  );
}
