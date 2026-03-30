export const dynamic = 'force-dynamic';

import { listInstitutions } from '@/lib/institutions';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  museum: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  university: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
  intelligence: 'text-red-400 border-red-400/30 bg-red-400/5',
  secret_society: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  government_agency: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  military: 'text-red-400 border-red-400/30 bg-red-400/5',
  religious: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  think_tank: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  research_institute: 'text-teal-400 border-teal-400/30 bg-teal-400/5',
};

const TIER_COLORS: Record<string, string> = {
  open: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  standard: 'text-text-tertiary border-border bg-ground-light',
  opaque: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  classified: 'text-red-400 border-red-400/30 bg-red-400/5',
  defunct_classified: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
};

const DEFAULT_BADGE = 'text-text-tertiary border-border bg-ground-light';

export default async function InstitutionsPage() {
  const all = await listInstitutions();
  const institutions = all.filter((i) => i.status === 'published');

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      <div className="max-w-5xl mx-auto px-6 py-16">

        <div className="mb-4">
          <a href="/" className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
            ← Home
          </a>
        </div>

        <div className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold mb-3">Institutions Index</p>
          <h1 className="font-serif text-4xl mb-4">Institutions</h1>
          <p className="text-text-secondary max-w-2xl">
            Agencies, societies, universities, and organizations at the center of history&apos;s most contested events.
            Each entry maps their programs, departments, and known personnel.
          </p>
        </div>

        {institutions.length === 0 ? (
          <p className="text-text-tertiary font-mono text-sm">No institutions published yet.</p>
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
                    <img
                      src={inst.logo_storage_path
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/institution-logos/${inst.logo_storage_path}`
                        : inst.logo_url!}
                      alt={inst.name}
                      className="w-12 h-12 rounded flex-shrink-0 object-contain border border-border bg-ground p-1"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded flex-shrink-0 bg-ground border border-border flex items-center justify-center">
                      <span className="font-serif text-lg text-text-tertiary">
                        {inst.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-base group-hover:text-gold transition-colors leading-tight truncate">
                      {inst.name}
                    </h2>
                    {inst.short_name && inst.short_name !== inst.name && (
                      <p className="font-mono text-[9px] text-text-tertiary truncate">
                        {inst.short_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2">
                  {inst.institution_type && (
                    <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${TYPE_COLORS[inst.institution_type] ?? DEFAULT_BADGE}`}>
                      {inst.institution_type.replace(/_/g, ' ')}
                    </span>
                  )}
                  {inst.transparency_tier && (
                    <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${TIER_COLORS[inst.transparency_tier] ?? DEFAULT_BADGE}`}>
                      {inst.transparency_tier.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {inst.short_bio && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {inst.short_bio}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
                  {inst.founded_year && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      est. {inst.founded_year}
                    </span>
                  )}
                  {(inst.headquarters_city || inst.headquarters_country) && (
                    <span className="font-mono text-[9px] text-text-tertiary truncate">
                      {[inst.headquarters_city, inst.headquarters_country].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {(inst.people_count ?? 0) > 0 && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      {inst.people_count} people
                    </span>
                  )}
                  {(inst.relationship_count ?? 0) > 0 && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      {inst.relationship_count} connections
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
