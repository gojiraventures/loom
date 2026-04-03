/**
 * PublicDiscourseSection
 *
 * Shared component for rendering public_discourse entries on both
 * people and institution profile pages. Shows documented claims
 * grouped by sentiment (negative → mixed → positive) with inline
 * response blocks where available.
 *
 * No editorial framing — the reader evaluates.
 */

export interface DiscourseEntry {
  id: string;
  sentiment: 'positive' | 'negative' | 'mixed';
  claim: string;
  claim_source: string;
  claim_source_url: string | null;
  response_summary: string | null;
  response_source: string | null;
  response_source_url: string | null;
  extracted_by: string | null;
}

const SENTIMENT_CONFIG: Record<
  DiscourseEntry['sentiment'],
  { label: string; borderClass: string; labelClass: string }
> = {
  negative: {
    label: 'Criticism & scrutiny',
    borderClass: 'border-red-400/20',
    labelClass: 'text-red-400',
  },
  mixed: {
    label: 'Mixed reception',
    borderClass: 'border-amber-400/20',
    labelClass: 'text-amber-400',
  },
  positive: {
    label: 'Positive reception',
    borderClass: 'border-emerald-400/20',
    labelClass: 'text-emerald-400',
  },
};

interface Props {
  entries: DiscourseEntry[];
  subjectLabel?: string; // "their response" or "institution's response"
}

export function PublicDiscourseSection({ entries, subjectLabel = 'Their response' }: Props) {
  if (entries.length === 0) return null;

  return (
    <section>
      <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-2">Public Discourse</p>
      <h2 className="font-serif text-xl mb-2">How this subject is discussed publicly</h2>
      <p className="font-mono text-[0.65rem] text-text-tertiary border-l-2 border-border pl-3 mb-6">
        Documented public claims — sourced and attributed — with responses where available. The reader evaluates.
      </p>

      <div className="space-y-8">
        {(['negative', 'mixed', 'positive'] as DiscourseEntry['sentiment'][]).map((sentiment) => {
          const group = entries.filter((e) => e.sentiment === sentiment);
          if (group.length === 0) return null;
          const cfg = SENTIMENT_CONFIG[sentiment];

          return (
            <div key={sentiment}>
              <p className={`font-mono text-[8px] uppercase tracking-widest mb-3 ${cfg.labelClass}`}>
                {cfg.label}
              </p>
              <div className="space-y-4">
                {group.map((entry) => (
                  <div key={entry.id} className={`border-l-2 pl-4 ${cfg.borderClass}`}>
                    <p className="text-sm text-text-primary leading-relaxed mb-1">
                      {entry.claim}
                    </p>
                    <p className="font-mono text-[9px] text-text-tertiary">
                      Source:{' '}
                      {entry.claim_source_url ? (
                        <a
                          href={entry.claim_source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-gold transition-colors"
                        >
                          {entry.claim_source}
                        </a>
                      ) : (
                        entry.claim_source
                      )}
                    </p>

                    {entry.response_summary && (
                      <div className="mt-3 bg-ground rounded p-3 border border-border">
                        <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mb-1">
                          {subjectLabel}
                        </p>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {entry.response_summary}
                        </p>
                        {entry.response_source && (
                          <p className="font-mono text-[9px] text-text-tertiary mt-1">
                            {entry.response_source_url ? (
                              <a
                                href={entry.response_source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-gold transition-colors"
                              >
                                {entry.response_source}
                              </a>
                            ) : (
                              entry.response_source
                            )}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
