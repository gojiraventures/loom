export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import {
  getPersonBySlug,
  getBioSections,
  getPersonConnections,
  getPersonMedia,
  getPersonSocials,
  getPersonBooks,
  getPersonInstitutions,
} from '@/lib/people';
import RelationshipGraph from '@/components/people/RelationshipGraph';

const TIER_LABELS: Record<string, string> = {
  academic: 'Academic', journalist: 'Journalist', independent_researcher: 'Independent Researcher',
  whistleblower: 'Whistleblower', public_figure: 'Public Figure', historical_figure: 'Historical Figure',
  witness: 'Witness', controversial: 'Controversial', unclassified: 'Unclassified',
};

const TIER_COLORS: Record<string, string> = {
  academic: 'text-sky-400 border-sky-400/30',
  journalist: 'text-amber-400 border-amber-400/30',
  independent_researcher: 'text-emerald-400 border-emerald-400/30',
  whistleblower: 'text-orange-400 border-orange-400/30',
  public_figure: 'text-violet-400 border-violet-400/30',
  historical_figure: 'text-text-tertiary border-border',
  witness: 'text-pink-400 border-pink-400/30',
  controversial: 'text-red-400 border-red-400/30',
  unclassified: 'text-text-tertiary border-border',
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  podcast: 'Podcast', youtube: 'YouTube', documentary: 'Documentary',
  lecture: 'Lecture', interview: 'Interview', news_segment: 'News', conference_talk: 'Talk',
  debate: 'Debate', other: 'Media',
};

const BOOK_REL_LABELS: Record<string, string> = {
  author: 'Author', co_author: 'Co-Author', subject: 'Subject', mentioned: 'Mentioned',
  foreword: 'Foreword', endorsed: 'Endorsed', reviewed: 'Reviewed',
  debunked_by: 'Debunked By', supported_by: 'Supported By', edited: 'Editor', translated: 'Translator',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;

  const [person, bioSections, connections, media, socials, books, affiliations] = await Promise.all([
    getPersonBySlug(slug),
    getPersonBySlug(slug).then((p) => p ? getBioSections(p.id) : []),
    getPersonBySlug(slug).then((p) => p ? getPersonConnections(p.id) : []),
    getPersonBySlug(slug).then((p) => p ? getPersonMedia(p.id) : []),
    getPersonBySlug(slug).then((p) => p ? getPersonSocials(p.id) : []),
    getPersonBySlug(slug).then((p) => p ? getPersonBooks(p.id) : []),
    getPersonBySlug(slug).then((p) => p ? getPersonInstitutions(p.id) : []),
  ]);

  if (!person || person.status !== 'published') notFound();

  const photoUrl = person.photo_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people-photos/${person.photo_storage_path}`
    : person.photo_url;

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Breadcrumb */}
        <div className="mb-10">
          <a href="/people" className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
            ← People
          </a>
        </div>

        {/* Disclaimer */}
        <p className="font-mono text-[0.65rem] text-text-tertiary border-l-2 border-border pl-3 mb-10">
          This profile aggregates publicly documented information and makes no unsubstantiated claims about motive or character.
        </p>

        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-8 mb-12">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={person.full_name}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-ground-light border border-border flex items-center justify-center flex-shrink-0">
              <span className="font-serif text-5xl text-text-tertiary">{person.full_name[0]}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl mb-1">{person.full_name}</h1>
            {person.known_as && person.known_as.length > 0 && person.known_as[0] !== person.full_name && (
              <p className="font-mono text-xs text-text-tertiary mb-3">
                Known as: {person.known_as.join(', ')}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {person.credibility_tier && (
                <span className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded ${TIER_COLORS[person.credibility_tier] ?? TIER_COLORS.unclassified}`}>
                  {TIER_LABELS[person.credibility_tier] ?? person.credibility_tier}
                </span>
              )}
              {person.nationality && (
                <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-0.5 rounded">
                  {person.nationality}
                </span>
              )}
              {person.born_date && (
                <span className="font-mono text-[8px] text-text-tertiary border border-border px-2 py-0.5 rounded">
                  b. {person.born_date}
                </span>
              )}
            </div>

            {person.current_role && (
              <p className="text-sm text-text-secondary mb-3">{person.current_role}</p>
            )}
            {person.short_bio && (
              <p className="text-text-secondary leading-relaxed">{person.short_bio}</p>
            )}

            {/* Socials */}
            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    {s.platform_name ?? s.platform}
                    {s.handle ? ` ${s.handle}` : ''}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Key positions */}
        {person.key_positions && person.key_positions.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2">
            {person.key_positions.map((pos) => (
              <span key={pos} className="font-mono text-[9px] text-text-tertiary border border-border bg-ground-light px-2 py-1 rounded">
                {pos}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Bio */}
            {person.bio && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Biography</p>
                <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
                  {person.bio}
                </div>
              </section>
            )}

            {/* Bio sections */}
            {bioSections.map((section) => (
              <section key={section.id}>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">
                  {section.section_type.replace(/_/g, ' ')}
                </p>
                <h2 className="font-serif text-xl mb-4">{section.title}</h2>
                <div
                  className="text-text-secondary leading-relaxed space-y-4 text-sm"
                  dangerouslySetInnerHTML={{
                    __html: section.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-gold/30 pl-4 italic text-text-tertiary">$1</blockquote>')
                      .replace(/^- (.+)$/gm, '<li class="list-disc list-inside">$1</li>')
                      .replace(/\n\n/g, '</p><p class="mt-4">')
                      .replace(/^/, '<p>')
                      .replace(/$/, '</p>'),
                  }}
                />
              </section>
            ))}

            {/* Media */}
            {media.length > 0 && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Media Appearances</p>
                <div className="space-y-3">
                  {media.map((m) => (
                    <div key={m.id} className="border border-border bg-ground-light rounded p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                              {MEDIA_TYPE_LABELS[m.media_type] ?? m.media_type}
                            </span>
                            {m.platform && (
                              <span className="font-mono text-[8px] text-text-tertiary">{m.platform}</span>
                            )}
                            {m.published_date && (
                              <span className="font-mono text-[8px] text-text-tertiary">{m.published_date}</span>
                            )}
                          </div>
                          {m.url ? (
                            <a href={m.url} target="_blank" rel="noopener noreferrer"
                              className="font-serif text-base hover:text-gold transition-colors">
                              {m.title}
                            </a>
                          ) : (
                            <p className="font-serif text-base">{m.title}</p>
                          )}
                          {m.description && (
                            <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{m.description}</p>
                          )}
                        </div>
                        {m.featured && (
                          <span className="font-mono text-[7px] uppercase tracking-widest text-gold border border-gold/30 px-1.5 py-0.5 rounded flex-shrink-0">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Books */}
            {books.length > 0 && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Books</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {books.map((b) => (
                    <div key={b.id} className="border border-border bg-ground-light rounded p-4">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded mb-2 inline-block">
                        {BOOK_REL_LABELS[b.relationship] ?? b.relationship}
                      </span>
                      {b.amazon_url ? (
                        <a href={b.amazon_url} target="_blank" rel="noopener noreferrer"
                          className="block font-serif text-sm hover:text-gold transition-colors mt-1">
                          {b.title}
                        </a>
                      ) : (
                        <p className="font-serif text-sm mt-1">{b.title}</p>
                      )}
                      <p className="font-mono text-[9px] text-text-tertiary mb-2">
                        {b.author_name}{b.published_year ? ` · ${b.published_year}` : ''}
                      </p>
                      {b.context && (
                        <p className="text-xs text-text-tertiary leading-relaxed">{b.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {/* Facts */}
            <div className="border border-border bg-ground-light rounded p-5 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Quick Facts</p>
              {person.born_date && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Born</p>
                  <p className="text-sm">{person.born_date}{person.born_location ? ` · ${person.born_location}` : ''}</p>
                </div>
              )}
              {person.died_date && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Died</p>
                  <p className="text-sm">{person.died_date}</p>
                </div>
              )}
              {person.nationality && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Nationality</p>
                  <p className="text-sm">{person.nationality}</p>
                </div>
              )}
              {person.current_role && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Current Role</p>
                  <p className="text-sm">{person.current_role}</p>
                </div>
              )}
              {person.faith && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Faith</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm">{person.faith}</p>
                    {person.faith_status && person.faith_status !== 'unknown' && (
                      <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0.5 rounded ${person.faith_status === 'professed' ? 'text-emerald-400 border-emerald-400/30' : 'text-amber-400 border-amber-400/30'}`}>
                        {person.faith_status}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {person.political_party && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Political Party</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm">{person.political_party}</p>
                    {person.political_party_status && person.political_party_status !== 'unknown' && (
                      <span className={`font-mono text-[7px] uppercase tracking-widest border px-1 py-0.5 rounded ${person.political_party_status === 'registered' ? 'text-emerald-400 border-emerald-400/30' : 'text-amber-400 border-amber-400/30'}`}>
                        {person.political_party_status}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {person.wikipedia_url && (
                <a href={person.wikipedia_url} target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors mt-2">
                  Wikipedia →
                </a>
              )}
              {person.website_url && (
                <a href={person.website_url} target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
                  Website →
                </a>
              )}
            </div>

            {/* Connection count */}
            {connections.length > 0 && (
              <div className="border border-border bg-ground-light rounded p-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-3">Connections</p>
                <p className="font-mono text-2xl text-text-primary mb-1">{connections.length}</p>
                <p className="font-mono text-[9px] text-text-tertiary">mapped relationships</p>
              </div>
            )}
          </div>
        </div>

        {/* Relationship graph */}
        {connections.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">Relationship Map</p>
            <h2 className="font-serif text-2xl mb-6">Connections</h2>
            <RelationshipGraph
              centerPersonId={person.id}
              centerPersonName={person.full_name}
              relationships={connections}
            />

            {/* Connection list */}
            <div className="mt-8 space-y-2">
              {connections.map((c) => (
                <div key={c.id} className="flex items-start gap-4 py-3 border-b border-border/50">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {c.relationship_type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex-1 min-w-0">
                    {c.target_slug ? (
                      <a href={`/people/${c.target_slug}`} className="font-serif text-sm hover:text-gold transition-colors">
                        {c.target_name}
                      </a>
                    ) : (
                      <p className="font-serif text-sm">{c.target_name}</p>
                    )}
                    {c.description && (
                      <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{c.description}</p>
                    )}
                  </div>
                  {c.start_year && (
                    <span className="font-mono text-[8px] text-text-tertiary flex-shrink-0">{c.start_year}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {/* Institutional affiliations */}
        {affiliations.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">Affiliations</p>
            <h2 className="font-serif text-2xl mb-6">Institutional Connections</h2>
            <div className="space-y-2">
              {affiliations.map((aff) => (
                <div key={aff.id} className="flex items-start gap-4 py-3 border-b border-border/50">
                  <div className="flex flex-col gap-1 flex-shrink-0 min-w-[120px]">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                      {aff.relationship.replace(/_/g, ' ')}
                    </span>
                    {aff.institution_type === 'secret_society' || aff.covert ? (
                      <span className={`font-mono text-[7px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${aff.membership_status === 'confirmed' ? 'text-emerald-400 border-emerald-400/30' : aff.membership_status === 'assumed' ? 'text-amber-400 border-amber-400/30' : 'text-text-tertiary border-border'}`}>
                        {aff.membership_status}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    {aff.institution_slug ? (
                      <a href={`/institutions/${aff.institution_slug}`} className="font-serif text-sm hover:text-gold transition-colors">
                        {aff.institution_name}
                      </a>
                    ) : (
                      <p className="font-serif text-sm">{aff.institution_name}</p>
                    )}
                    {aff.role_title && (
                      <p className="font-mono text-[9px] text-text-tertiary mt-0.5">{aff.role_title}</p>
                    )}
                    {aff.description && (
                      <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{aff.description}</p>
                    )}
                  </div>
                  {(aff.start_year || aff.end_year) && (
                    <span className="font-mono text-[8px] text-text-tertiary flex-shrink-0">
                      {aff.start_year ?? '?'}{aff.end_year ? `–${aff.end_year}` : '–'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
