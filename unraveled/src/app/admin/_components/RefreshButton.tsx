'use client';

import React from 'react';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

export function RefreshButton({ onClick, loading = false, className = '' }: RefreshButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`font-mono uppercase tracking-widest rounded border border-border transition-opacity disabled:opacity-40 px-2.5 py-1 ${className}`}
      style={{
        fontSize: '9px',
        color: 'var(--color-text-tertiary)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: loading ? 'spin 1s linear infinite' : 'none',
        }}
      >
        ↻
      </span>
      {' '}Refresh
    </button>
  );
}
