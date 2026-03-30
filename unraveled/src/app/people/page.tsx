export const dynamic = 'force-dynamic';

import { listPeople } from '@/lib/people';
import Link from 'next/link';

const TIER_LABELS: Record<string, string> = {
  academic: 'Academic',
  journalist: 'Journalist',
  independent_researcher: 'Independent Researcher',
  whistleblower: 'Whistleblower',
  public_figure: 'Public Figure',
  historical_figure: 'Historical Figure',
  witness: 'Witness',
  controversial: 'Controversial',
  unclassified: 'Unclassified',
};

const TIER_COLORS: Record<string, string> = {
  academic: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
  journalist: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  independent_researcher: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  whistleblower: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  public_figure: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
  historical_figure: 'text-text-tertiary border-border bg-ground-light',
  witness: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
  controversial: 'text-red-400 border-red-400/30 bg-red-400/5',
  unclassified: 'text-text-tertiary border-border bg-ground-light',
};

export default async function PeoplePage() {
  const people = await listPeople({ status: 'published' });

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gold mb-3">People Index</p>
          <h1 className="font-serif text-4xl mb-4">Who&apos;s involved</h1>
          <p className="text-text-secondary max-w-2xl">
            Researchers, whistleblowers, journalists, and figures at the center of the most contested questions.
            Each profile maps their claims, connections, and credibility across topics.
          </p>
        </div>

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
                    <img
                      src={person.photo_storage_path
                        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people-photos/${person.photo_storage_path}`
                        : person.photo_url!}
                      alt={person.full_name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex-shrink-0 bg-ground border border-border flex items-center justify-center">
                      <span className="font-serif text-lg text-text-tertiary">
                        {person.full_name[0]}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-base group-hover:text-gold transition-colors leading-tight truncate">
                      {person.full_name}
                    </h2>
                    {person.known_as && person.known_as.length > 0 && person.known_as[0] !== person.full_name && (
                      <p className="font-mono text-[9px] text-text-tertiary truncate">
                        {person.known_as[0]}
                      </p>
                    )}
                  </div>
                </div>

                {person.credibility_tier && (
                  <span className={`inline-block font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded mb-2 ${TIER_COLORS[person.credibility_tier] ?? TIER_COLORS.unclassified}`}>
                    {TIER_LABELS[person.credibility_tier] ?? person.credibility_tier}
                  </span>
                )}

                {person.short_bio && (
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {person.short_bio}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-border flex gap-4">
                  {(person.relationship_count ?? 0) > 0 && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      {person.relationship_count} connections
                    </span>
                  )}
                  {(person.media_count ?? 0) > 0 && (
                    <span className="font-mono text-[9px] text-text-tertiary">
                      {person.media_count} media
                    </span>
                  )}
                  {person.current_role && (
                    <span className="font-mono text-[9px] text-text-tertiary truncate">
                      {person.current_role}
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
