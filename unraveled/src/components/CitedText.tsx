'use client';

import React from 'react';
import { useRole } from '@/hooks/useRole';
import { stripCitationMarkers } from '@/lib/citation-markers';

const stripMarkers = stripCitationMarkers;

/**
 * Renders prose that may contain [n] citation markers.
 *
 * - Paid subscribers: markers become superscript links to the bibliography
 *   (#source-n).
 * - Everyone else (and while the role is loading): markers are stripped so the
 *   prose reads cleanly with no leftover brackets.
 *
 * Drop-in replacement for a plain {text} render inside a <p>.
 */
export function CitedText({ text }: { text: string }) {
  const { role, loading } = useRole();
  const isPaid = role === 'paid' || role === 'admin';

  if (loading || !isPaid) {
    return <>{stripMarkers(text)}</>;
  }

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = /\[(\d+)\]/g; // local instance — no shared lastIndex state
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const n = m[1];
    parts.push(
      <sup key={`${m.index}-${n}`} className="citation-marker">
        <a
          href={`#source-${n}`}
          className="text-gold/70 hover:text-gold no-underline"
          style={{ fontSize: '0.7em', padding: '0 1px' }}
        >
          {n}
        </a>
      </sup>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <>{parts}</>;
}
