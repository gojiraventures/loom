'use client';

import React, { useState } from 'react';

interface DataListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Paginated list — replaces silent 50/500-row hard caps with
 * explicit pagination controls.
 */
export function DataList<T>({
  items,
  renderItem,
  pageSize = 25,
  keyExtractor,
  emptyMessage = 'No items.',
  className = '',
}: DataListProps<T>) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const start = page * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  if (items.length === 0) {
    return (
      <p
        className="py-6 text-center font-mono uppercase tracking-widest"
        style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={className}>
      <ul className="space-y-0">
        {pageItems.map((item, i) => (
          <li key={keyExtractor ? keyExtractor(item, start + i) : start + i}>
            {renderItem(item, start + i)}
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--color-text-tertiary)' }}>
            {start + 1}–{Math.min(start + pageSize, items.length)} of {items.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="font-mono uppercase tracking-widest rounded border border-border px-2 py-1 disabled:opacity-30 transition-opacity"
              style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="font-mono uppercase tracking-widest rounded border border-border px-2 py-1 disabled:opacity-30 transition-opacity"
              style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
