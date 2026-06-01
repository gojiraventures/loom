import React from 'react';

interface EmptyStateProps {
  message: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ message, sub, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`py-12 text-center ${className}`}>
      <p
        className="font-mono uppercase tracking-widest"
        style={{ fontSize: 'var(--admin-label-sm)', color: 'var(--color-text-tertiary)' }}
      >
        {message}
      </p>
      {sub && (
        <p
          className="mt-1"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--admin-label-xs)', color: 'var(--color-text-tertiary)' }}
        >
          {sub}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
