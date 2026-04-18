/**
 * LinkedText
 *
 * Renders a plain-text string with entity mentions auto-linked to their
 * dossier pages. Pass pre-computed segments from `segmentText()`.
 *
 * Usage (server component):
 *   const index = await loadEntityIndex();
 *   const segments = segmentText(someText, index);
 *   <LinkedText segments={segments} className="..." />
 */

import Link from 'next/link';
import type { TextSegment } from '@/lib/entity-linker';

interface Props {
  segments: TextSegment[];
  className?: string;
}

const TYPE_STYLES = {
  person: 'text-gold/80 hover:text-gold border-b border-gold/30 hover:border-gold/60 transition-colors',
  institution: 'text-sky-400/80 hover:text-sky-400 border-b border-sky-400/30 hover:border-sky-400/60 transition-colors',
  topic: 'text-emerald-400/80 hover:text-emerald-400 border-b border-emerald-400/30 hover:border-emerald-400/60 transition-colors',
};

export function LinkedText({ segments, className }: Props) {
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.entity ? (
          <Link
            key={i}
            href={seg.entity.href}
            className={TYPE_STYLES[seg.entity.type]}
          >
            {seg.text}
          </Link>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
}
