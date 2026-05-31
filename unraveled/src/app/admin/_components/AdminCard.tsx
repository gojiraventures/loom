import React from 'react';

interface AdminCardProps {
  className?: string;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  children: React.ReactNode;
}

const PADDING = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
} as const;

/**
 * Standard bordered card used across all admin workspaces.
 */
export function AdminCard({ className = '', padding = 'md', children }: AdminCardProps) {
  return (
    <div className={`border border-border rounded bg-ground-light ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
