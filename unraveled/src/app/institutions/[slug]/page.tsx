export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import {
  getInstitutionBySlug,
  getBioSections,
  getInstitutionConnections,
  getInstitutionEvents,
  getInstitutionDepartments,
  getPeopleAtInstitution,
} from '@/lib/institutions';

const TYPE_COLORS: Record<string, string> = {
  museum: 'text-sky-400 border-sky-400/30',
  university: 'text-violet-400 border-violet-400/30',
  intelligence: 'text-red-400 border-red-400/30',
  secret_society: 'text-amber-400 border-amber-400/30',
  government_agency: 'text-orange-400 border-orange-400/30',
  military: 'text-red-400 border-red-400/30',
  religious: 'text-purple-400 border-purple-400/30',
  think_tank: 'text-emerald-400 border-emerald-400/30',
  research_institute: 'text-teal-400 border-teal-400/30',
};

const TIER_COLORS: Record<string, string> = {
  open: 'text-emerald-400 border-emerald-400/30',
  standard: 'text-text-tertiary border-border',
  opaque: 'text-amber-400 border-amber-400/30',
  classified: 'text-red-400 border-red-400/30',
  defunct_classified: 'text-orange-400 border-orange-400/30',
};

const DEFAULT_BADGE = 'text-text-tertiary border-border';

const EVENT_TYPE_COLORS: Record<string, string> = {
  founding: 'text-emerald-400 border-emerald-400/30',
  operation: 'text-sky-400 border-sky-400/30',
  scandal: 'text-red-400 border-red-400/30',
  dissolution: 'text-text-tertiary border-border',
  reorganization: 'text-amber-400 border-amber-400/30',
  legislation: 'text-violet-400 border-violet-400/30',
  publication: 'text-teal-400 border-teal-400/30',
  other: 'text-text-tertiary border-border',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  employee: 'Employee',
  director: 'Director',
  founder: 'Founder',
  member: 'Member',
  contractor: 'Contractor',
  advisor: 'Advisor',
  operative: 'Operative',
  asset: 'Asset',
  handler: 'Handler',
  subject: 'Subject',
  whistleblower: 'Whistleblower',
  other: 'Other',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InstitutionPage({ params }: Props) {
  const { slug } = await params;

  const [institution, bioSections, connections, events, departments, people] = await Promise.all([
    getInstitutionBySlug(slug),
    getInstitutionBySlug(slug).then((i) => i ? getBioSections(i.id) : []),
    getInstitutionBySlug(slug).then((i) => i ? getInstitutionConnections(i.id) : []),
    getInstitutionBySlug(slug).then((i) => i ? getInstitutionEvents(i.id) : []),
    getInstitutionBySlug(slug).then((i) => i ? getInstitutionDepartments(i.id) : []),
    getInstitutionBySlug(slug).then((i) => i ? getPeopleAtInstitution(i.id) : []),
  ]);

  if (!institution || institution.status !== 'published') notFound();

  const logoUrl = institution.logo_storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/institution-logos/${institution.logo_storage_path}`
    : institution.logo_url;

  const hqLocation = [institution.headquarters_city, institution.headquarters_state, institution.headquarters_country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-ground text-text-primary">
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Breadcrumb */}
        <div className="mb-10">
          <a href="/institutions" className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors">
            ← Institutions
          </a>
        </div>

        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-8 mb-12">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={institution.name}
              className="w-28 h-28 sm:w-36 sm:h-36 rounded object-contain border border-border bg-ground-light p-3 flex-shrink-0"
            />
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded bg-ground-light border border-border flex items-center justify-center flex-shrink-0">
              <span className="font-serif text-5xl text-text-tertiary">{institution.name[0]}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-3xl sm:text-4xl mb-1">{institution.name}</h1>
            {institution.short_name && institution.short_name !== institution.name && (
              <p className="font-mono text-xs text-text-tertiary mb-3">
                {institution.short_name}
              </p>
            )}
            {institution.known_as && institution.known_as.length > 0 && (
              <p className="font-mono text-xs text-text-tertiary mb-3">
                Also known as: {institution.known_as.join(', ')}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {institution.institution_type && (
                <span className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded ${TYPE_COLORS[institution.institution_type] ?? DEFAULT_BADGE}`}>
                  {institution.institution_type.replace(/_/g, ' ')}
                </span>
              )}
              {institution.transparency_tier && (
                <span className={`font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded ${TIER_COLORS[institution.transparency_tier] ?? DEFAULT_BADGE}`}>
                  {institution.transparency_tier.replace(/_/g, ' ')}
                </span>
              )}
              {institution.founded_year && (
                <span className="font-mono text-[8px] text-text-tertiary border border-border px-2 py-0.5 rounded">
                  est. {institution.founded_year}
                </span>
              )}
              {!institution.active && (
                <span className="font-mono text-[8px] text-text-tertiary border border-border px-2 py-0.5 rounded">
                  Defunct
                </span>
              )}
            </div>

            {hqLocation && (
              <p className="text-sm text-text-secondary mb-3">{hqLocation}</p>
            )}
            {institution.short_bio && (
              <p className="text-text-secondary leading-relaxed">{institution.short_bio}</p>
            )}

            {/* Links */}
            {(institution.website_url || institution.wikipedia_url) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {institution.website_url && (
                  <a
                    href={institution.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    Website →
                  </a>
                )}
                {institution.wikipedia_url && (
                  <a
                    href={institution.wikipedia_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    Wikipedia →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Bio */}
            {institution.bio && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Overview</p>
                <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed whitespace-pre-line">
                  {institution.bio}
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

            {/* Events / Programs */}
            {events.length > 0 && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Key Programs &amp; Events</p>
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div key={ev.id} className="border border-border bg-ground-light rounded p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`font-mono text-[8px] uppercase tracking-widest border px-1.5 py-0.5 rounded ${EVENT_TYPE_COLORS[ev.event_type] ?? DEFAULT_BADGE}`}>
                              {ev.event_type.replace(/_/g, ' ')}
                            </span>
                            {ev.classified && !ev.declassified && (
                              <span className="font-mono text-[8px] uppercase tracking-widest text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded">
                                Classified
                              </span>
                            )}
                            {ev.declassified && (
                              <span className="font-mono text-[8px] uppercase tracking-widest text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">
                                Declassified
                              </span>
                            )}
                            {ev.event_date && (
                              <span className="font-mono text-[8px] text-text-tertiary">
                                {ev.event_date}{ev.end_date ? ` – ${ev.end_date}` : ''}
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-base">{ev.title}</p>
                          {ev.description && (
                            <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{ev.description}</p>
                          )}
                          {ev.declassified && ev.declassified_source && (
                            <p className="font-mono text-[8px] text-text-tertiary mt-1">
                              Source: {ev.declassified_source}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Departments */}
            {departments.length > 0 && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Departments &amp; Divisions</p>
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div key={dept.id} className="border border-border bg-ground-light rounded p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-serif text-sm">{dept.name}</span>
                            {dept.short_name && (
                              <span className="font-mono text-[8px] text-text-tertiary border border-border px-1.5 py-0.5 rounded">
                                {dept.short_name}
                              </span>
                            )}
                          </div>
                          {dept.relevance_summary && (
                            <p className="text-xs text-text-tertiary leading-relaxed">{dept.relevance_summary}</p>
                          )}
                        </div>
                        {dept.founded_year && (
                          <span className="font-mono text-[8px] text-text-tertiary flex-shrink-0">est. {dept.founded_year}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {people.length > 0 && (
              <section>
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Known Personnel</p>
                <div className="space-y-2">
                  {people.map((pi) => (
                    <div key={pi.id} className="flex items-start gap-4 py-3 border-b border-border/50">
                      <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                        {RELATIONSHIP_LABELS[pi.relationship] ?? pi.relationship.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        {pi.person_slug ? (
                          <a href={`/people/${pi.person_slug}`} className="font-serif text-sm hover:text-gold transition-colors">
                            {pi.full_name}
                          </a>
                        ) : (
                          <p className="font-serif text-sm">{pi.full_name}</p>
                        )}
                        {pi.role_title && (
                          <p className="text-xs text-text-tertiary mt-0.5">{pi.role_title}</p>
                        )}
                        {pi.description && (
                          <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{pi.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {(pi.start_year || pi.end_year) && (
                          <span className="font-mono text-[8px] text-text-tertiary">
                            {pi.start_year ?? '?'}{pi.end_year ? ` – ${pi.end_year}` : '–present'}
                          </span>
                        )}
                        {pi.covert && (
                          <span className="font-mono text-[7px] uppercase tracking-widest text-amber-400 border border-amber-400/30 px-1 py-0.5 rounded">
                            Covert
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-8">

            {/* Quick Facts */}
            <div className="border border-border bg-ground-light rounded p-5 space-y-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-4">Quick Facts</p>
              {institution.founded_year && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Founded</p>
                  <p className="text-sm">{institution.founded_year}{institution.founded_location ? ` · ${institution.founded_location}` : ''}</p>
                </div>
              )}
              {institution.founder && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Founder</p>
                  <p className="text-sm">{institution.founder}</p>
                </div>
              )}
              {hqLocation && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Headquarters</p>
                  <p className="text-sm">{hqLocation}</p>
                </div>
              )}
              {institution.institution_type && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Type</p>
                  <p className="text-sm">{institution.institution_type.replace(/_/g, ' ')}</p>
                </div>
              )}
              {institution.transparency_tier && (
                <div>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Transparency</p>
                  <p className="text-sm">{institution.transparency_tier.replace(/_/g, ' ')}</p>
                </div>
              )}
              <div>
                <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-0.5">Status</p>
                <p className="text-sm">{institution.active ? 'Active' : 'Defunct'}</p>
              </div>
              {institution.wikipedia_url && (
                <a href={institution.wikipedia_url} target="_blank" rel="noopener noreferrer"
                  className="block font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-gold transition-colors mt-2">
                  Wikipedia →
                </a>
              )}
              {institution.website_url && (
                <a href={institution.website_url} target="_blank" rel="noopener noreferrer"
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

        {/* Connections list */}
        {connections.length > 0 && (
          <section className="mt-16 border-t border-border pt-12">
            <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">Institutional Connections</p>
            <h2 className="font-serif text-2xl mb-6">Connections</h2>
            <div className="space-y-2">
              {connections.map((c) => {
                const isSelf = c.source_id === institution.id;
                const otherName = isSelf ? c.target_name : c.source_name;
                const otherSlug = isSelf ? c.target_slug : c.source_slug;
                return (
                  <div key={c.id} className="flex items-start gap-4 py-3 border-b border-border/50">
                    <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary border border-border px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {c.relationship_type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      {otherSlug ? (
                        <a href={`/institutions/${otherSlug}`} className="font-serif text-sm hover:text-gold transition-colors">
                          {otherName}
                        </a>
                      ) : (
                        <p className="font-serif text-sm">{otherName}</p>
                      )}
                      {c.description && (
                        <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{c.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {c.start_year && (
                        <span className="font-mono text-[8px] text-text-tertiary">
                          {c.start_year}{c.end_year ? ` – ${c.end_year}` : ''}
                        </span>
                      )}
                      {c.covert && (
                        <span className="font-mono text-[7px] uppercase tracking-widest text-amber-400 border border-amber-400/30 px-1 py-0.5 rounded">
                          Covert
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
