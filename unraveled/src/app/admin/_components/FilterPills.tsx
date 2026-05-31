'use client';

import React from 'react';

interface FilterPill {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  options: FilterPill[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterPills({ options, active, onChange, className = '' }: FilterPillsProps) {
  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {options.map((opt) => {
        const isActive = opt.id === active;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="rounded transition-colors"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '3px 8px',
              color: isActive ? 'var(--color-gold)' : 'var(--color-text-tertiary)',
              background: isActive ? 'var(--color-gold-dim)' : 'transparent',
              border: isActive
                ? '1px solid var(--color-gold)'
                : '1px solid var(--color-border)',
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className="ml-1 opacity-60">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
