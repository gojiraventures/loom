'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Shared colour maps ─────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  academic: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  journalist: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  independent_researcher: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  whistleblower: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  public_figure: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
  historical_figure: 'text-text-tertiary border-border bg-ground-light',
  witness: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  unclassified: 'text-text-tertiary border-border bg-ground-light',
};

const TIER_LABELS: Record<string, string> = {
  academic: 'Academic',
  journalist: 'Journalist',
  independent_researcher: 'Independent Researcher',
  whistleblower: 'Whistleblower',
  public_figure: 'Public Figure',
  historical_figure: 'Historical Figure',
  witness: 'Witness',
  unclassified: 'Unclassified',
};

// All institution_type badges render with identical neutral styling.
// Discourse entries carry the editorial context — badge colors do not.
const INST_TYPE_DEFAULT = 'text-text-tertiary border-border bg-ground-light';

const LOC_TYPE_COLORS: Record<string, string> = {
  sacred_site: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  facility: 'text-red-400 border-red-400/30 bg-red-400/5',
  city: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  country: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  archaeological_site: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  research_station: 'text-teal-400 border-teal-400/30 bg-teal-400/5',
  region: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  institution_hq: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
};

const CLASS_COLORS: Record<string, string> = {
  classified: 'text-red-400 border-red-400/30 bg-red-400/5',
  declassified: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  restricted: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  open: '',
};

const DEFAULT_BADGE = 'text-text-tertiary border-border bg-ground-light';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Person {
  id: string;
  slug: string;
  full_name: string;
  known_as?: string[] | null;
  credibility_tier?: string | null;
  short_bio?: string | null;
  photo_url?: string | null;
  photo_storage_path?: string | null;
  current_role?: string | null;
  relationship_count?: number;
  media_count?: number;
}

interface Institution {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  institution_type?: string | null;
  transparency_tier?: string | null;
  short_bio?: string | null;
  logo_url?: string | null;
  logo_storage_path?: string | null;
  founded_year?: number | null;
  headquarters_city?: string | null;
  headquarters_country?: string | null;
  people_count?: number;
  relationship_count?: number;
}

interface Location {
  id: string;
  slug: string;
  name: string;
  short_name?: string | null;
  location_type: string;
  short_bio?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  classification_status?: string;
  declassified_year?: number | null;
  active?: boolean;
  people_count?: number;
  group_count?: number;
  topic_count?: number;
}

interface Props {
  people: Person[];
  institutions: Institution[];
  locations: Location[];
  supabaseUrl: string;
}

type Tab = 'people' | 'groups' | 'locations';

export function PeopleGrid({ people, institutions, locations, supabaseUrl }: Props) {
  const [tab, setTab] = useState<Tab>('people');

  const TAB_LABELS: Record<Tab, string> = {
    people: `People (${people.length})`,
    groups: `Groups (${institutions.length})`,
    locations: `Locations (${locations.length})`,
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border mb-8">
        {(['people', 'groups', 'locations'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-mono text-[10px] uppercase tracking-widest px-5 py-3 border-b-2 transition-colors ${
              tab === t
                ? 'border-gold text-gold'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── People grid ───────────────────────────────────────────────────── */}
      {tab === 'people' && (
        <>
          {people.length === 0 ? (
            <p className="text-text-tertiary font-mono text-sm">No people published yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.slug}`}
                  className="group block border border-border bg-ground-light hover:border-gold/30 transition-colors rounded p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {person.photo_url || person.photo_storage_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={person.photo_storage_path
                          ? `${supabaseUrl}/storage/v1/object/public/people-photos/${person.photo_storage_path}`
                          : person.photo_url!}
                        alt={person.full_name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex-shrink-0 bg-ground border border-border flex items-center justify-center">
                        <span className="font-serif text-lg text-text-tertiary">{person.full_name[0]}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-base group-hover:text-gold transition-colors leading-tight truncate">
                        {person.full_name}
                      </h2>
                      {person.known_as && person.known_as.length > 0 && person.known_as[0] !== person.full_name && (
                        <p className="font-mono text-[9px] text-text-tertiary truncate">{person.known_as[0]}</p>
                      )}
                    </div>
                  </div>

                  {person.credibility_tier && (
                    <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded mb-2 ${TIER_COLORS[person.credibility_tier] ?? DEFAULT_BADGE}`}>
                      {TIER_LABELS[person.credibility_tier] ?? person.credibility_tier}
                    </span>
                  )}

                  {person.short_bio && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{person.short_bio}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex gap-4 flex-wrap">
                    {(person.relationship_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{person.relationship_count} connections</span>
                    )}
                    {(person.media_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{person.media_count} media</span>
                    )}
                    {person.current_role && (
                      <span className="font-mono text-[9px] text-text-tertiary truncate">{person.current_role}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Groups grid ───────────────────────────────────────────────────── */}
      {tab === 'groups' && (
        <>
          {institutions.length === 0 ? (
            <p className="text-text-tertiary font-mono text-sm">No groups published yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {institutions.map((inst) => (
                <Link
                  key={inst.id}
                  href={`/institutions/${inst.slug}`}
                  className="group block border border-border bg-ground-light hover:border-gold/30 transition-colors rounded p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {inst.logo_url || inst.logo_storage_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inst.logo_storage_path
                          ? `${supabaseUrl}/storage/v1/object/public/institution-logos/${inst.logo_storage_path}`
                          : inst.logo_url!}
                        alt={inst.name}
                        className="w-12 h-12 rounded flex-shrink-0 object-contain border border-border bg-ground p-1"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded flex-shrink-0 bg-ground border border-border flex items-center justify-center">
                        <span className="font-serif text-lg text-text-tertiary">{inst.name[0]}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-base group-hover:text-gold transition-colors leading-tight truncate">
                        {inst.name}
                      </h2>
                      {inst.short_name && inst.short_name !== inst.name && (
                        <p className="font-mono text-[9px] text-text-tertiary truncate">{inst.short_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {inst.institution_type && (
                      <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${INST_TYPE_DEFAULT}`}>
                        {inst.institution_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    {inst.transparency_tier && (
                      <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${DEFAULT_BADGE}`}>
                        {inst.transparency_tier.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  {inst.short_bio && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{inst.short_bio}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                    {inst.founded_year && (
                      <span className="font-mono text-[9px] text-text-tertiary">est. {inst.founded_year}</span>
                    )}
                    {(inst.headquarters_city || inst.headquarters_country) && (
                      <span className="font-mono text-[9px] text-text-tertiary">
                        {[inst.headquarters_city, inst.headquarters_country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {(inst.people_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{inst.people_count} people</span>
                    )}
                    {(inst.relationship_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{inst.relationship_count} connections</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Locations grid ────────────────────────────────────────────────── */}
      {tab === 'locations' && (
        <>
          {locations.length === 0 ? (
            <p className="text-text-tertiary font-mono text-sm">No locations published yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/locations/${loc.slug}`}
                  className="group block border border-border bg-ground-light hover:border-gold/30 transition-colors rounded p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded flex-shrink-0 bg-ground border border-border flex items-center justify-center">
                      <span className="font-serif text-lg text-text-tertiary">{loc.name[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-base group-hover:text-gold transition-colors leading-tight truncate">
                        {loc.name}
                      </h2>
                      {loc.short_name && loc.short_name !== loc.name && (
                        <p className="font-mono text-[9px] text-text-tertiary truncate">{loc.short_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${LOC_TYPE_COLORS[loc.location_type] ?? DEFAULT_BADGE}`}>
                      {loc.location_type.replace(/_/g, ' ')}
                    </span>
                    {loc.classification_status && loc.classification_status !== 'open' && (
                      <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${CLASS_COLORS[loc.classification_status] ?? DEFAULT_BADGE}`}>
                        {loc.classification_status}
                        {loc.declassified_year ? ` ${loc.declassified_year}` : ''}
                      </span>
                    )}
                  </div>

                  {loc.short_bio && (
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{loc.short_bio}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                    {[loc.city, loc.region, loc.country].filter(Boolean).length > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">
                        {[loc.city, loc.region, loc.country].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {(loc.people_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{loc.people_count} people</span>
                    )}
                    {(loc.group_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{loc.group_count} groups</span>
                    )}
                    {(loc.topic_count ?? 0) > 0 && (
                      <span className="font-mono text-[9px] text-text-tertiary">{loc.topic_count} topics</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
