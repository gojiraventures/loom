'use client';

import { useState, useEffect } from 'react';

export interface TocSection {
  id: string;
  label: string;
}

interface TopicTOCProps {
  sections: TocSection[];
}

export function TopicTOC({ sections }: TopicTOCProps) {
  const [active, setActive] = useState<string>('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-80px 0px -55% 0px', threshold: 0 }
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <>
      {/* Desktop: fixed left sidebar */}
      <nav className="hidden xl:flex flex-col fixed left-6 top-1/2 -translate-y-1/2 z-10 max-h-[70vh] overflow-y-auto w-[148px]">
        <p className="font-mono text-[7px] tracking-[0.25em] uppercase text-text-tertiary mb-3 shrink-0">
          Contents
        </p>
        <div className="space-y-0 flex-1">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`block font-mono text-[9px] leading-snug py-1.5 border-l-2 pl-3 transition-colors ${
                active === id
                  ? 'border-gold text-gold'
                  : 'border-border/30 text-text-tertiary hover:text-text-secondary hover:border-border'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      {/* Mobile: floating button + dropdown */}
      <div className="xl:hidden fixed bottom-4 right-4 z-20">
        <button
          onClick={() => setOpen((o) => !o)}
          className="font-mono text-[9px] tracking-[0.15em] uppercase bg-ground border border-border px-3 py-2 text-text-secondary hover:text-text-primary transition-colors shadow-lg"
          aria-label="Table of contents"
        >
          {open ? '× Close' : '≡ Contents'}
        </button>
        {open && (
          <div className="absolute bottom-full right-0 mb-2 bg-ground border border-border min-w-[200px] py-1 shadow-xl max-h-[60vh] overflow-y-auto">
            {sections.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className={`block font-mono text-[9px] tracking-wide px-4 py-2.5 transition-colors border-l-2 ${
                  active === id
                    ? 'text-gold border-gold'
                    : 'text-text-secondary hover:text-text-primary border-transparent hover:border-border'
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
