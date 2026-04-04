'use client';

import { useState } from 'react';
import type { TraditionDeepDiveData } from '@/lib/interactive/types';

interface Props { data: TraditionDeepDiveData }

export function TraditionDeepDiveAccordion({ data }: Props) {
  const { traditions } = data;
  const [open, setOpen]     = useState<number | null>(null);
  const [filter, setFilter] = useState<string>('');

  // Collect all unique motifs across traditions
  const allMotifs = Array.from(new Set(traditions.flatMap((t) => t.motifs))).sort();

  const filtered = filter
    ? traditions.filter((t) => t.motifs.includes(filter))
    : traditions;

  return (
    <div className="border border-border bg-ground-light/20 p-6 sm:p-8">
      <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-2">
        Tradition Deep-Dive
      </span>
      <p className="text-sm text-text-secondary mb-6 max-w-xl leading-relaxed">
        Each tradition tells the story through its own lens. Expand any card to read the full account. Filter by shared motif.
      </p>

      {/* Motif filter pills */}
      {allMotifs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          <button
            onClick={() => setFilter('')}
            className={`font-mono text-[8px] tracking-wider uppercase px-2 py-0.5 border transition-colors ${
              !filter ? 'border-gold text-gold' : 'border-border/50 text-text-tertiary hover:border-border'
            }`}
          >
            All
          </button>
          {allMotifs.map((m) => (
            <button
              key={m}
              onClick={() => setFilter(filter === m ? '' : m)}
              className={`font-mono text-[8px] tracking-wider uppercase px-2 py-0.5 border transition-colors ${
                filter === m ? 'border-teal text-teal' : 'border-border/50 text-text-tertiary hover:border-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* Accordion */}
      <div className="space-y-px">
        {filtered.map((trad, i) => (
          <div key={trad.name} className="border border-border">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-ground-light/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base">{trad.name}</p>
                {trad.motifs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {trad.motifs.map((m) => (
                      <span
                        key={m}
                        className="font-mono text-[7px] tracking-wider uppercase px-1.5 py-0.5 border"
                        style={{
                          borderColor: filter === m ? 'rgba(93,188,176,0.6)' : 'rgba(255,255,255,0.1)',
                          color:       filter === m ? '#5DBCB0' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-mono text-[11px] text-text-tertiary shrink-0">
                {open === i ? '−' : '+'}
              </span>
            </button>

            {open === i && (
              <div className="px-5 pb-5 pt-2 border-t border-border/40">
                {trad.narrative.split('\n\n').map((para, j) => (
                  <p key={j} className="text-sm text-text-secondary leading-[1.85] mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="font-mono text-[9px] text-text-tertiary py-6 text-center">
          No traditions contain this motif.
        </p>
      )}

      <p className="font-mono text-[8px] text-text-tertiary/40 mt-4">
        {traditions.length} traditions documented · {allMotifs.length} shared structural motifs identified
      </p>
    </div>
  );
}
