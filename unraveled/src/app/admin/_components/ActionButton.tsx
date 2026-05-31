'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-gold)',
    color: '#fff',
    border: '1px solid var(--color-gold)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-gold)',
    border: '1px solid var(--color-gold)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
  destructive: {
    background: 'transparent',
    color: 'var(--status-failed)',
    border: '1px solid var(--status-failed)',
  },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-2.5 py-1',
  md: 'px-3.5 py-1.5',
};

export function ActionButton({
  variant = 'secondary',
  size = 'sm',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ActionButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`font-mono uppercase tracking-widest rounded transition-opacity disabled:opacity-40 ${SIZE_CLASSES[size]} ${className}`}
      style={{
        fontSize: '9px',
        ...VARIANT_STYLES[variant],
        opacity: disabled || loading ? 0.4 : 1,
      }}
    >
      {loading ? '…' : children}
    </button>
  );
}
