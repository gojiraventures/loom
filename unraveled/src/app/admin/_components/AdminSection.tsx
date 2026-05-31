import React from 'react';

interface AdminSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Titled content section — semantic wrapper used by each workspace view.
 */
export function AdminSection({ title, description, action, className = '', children }: AdminSectionProps) {
  return (
    <section className={`space-y-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="font-serif text-xl text-text-primary">{title}</h2>
            )}
            {description && (
              <p
                className="mt-0.5"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-tertiary)' }}
              >
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
