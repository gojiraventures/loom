'use client';

import React from 'react';

interface AdminShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Two-column admin layout: fixed sidebar + scrollable content pane.
 * Expects the parent (layout.tsx) to have set data-theme="light".
 */
export function AdminShell({ sidebar, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-ground text-text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside
        className="w-52 shrink-0 border-r border-border bg-ground-light flex flex-col"
        style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
