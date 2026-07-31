'use client';

import { AdminShell } from '../_components/AdminShell';
import { AdminSidebar } from '../_components/AdminSidebar';
import type { SidebarGroup } from '../_components/AdminSidebar';
import { CommandCenterView } from '../_components/CommandCenterView';

// ── Sidebar ────────────────────────────────────────────────────────────────────

const CC_SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    label: 'Command',
    items: [{ id: 'command', label: 'Command Center', href: '/admin/command-center' }],
  },
  {
    label: 'Research',
    items: [
      { id: 'studio', label: 'Studio', href: '/admin/studio' },
    ],
  },
  {
    label: 'Content',
    items: [
      { id: 'dossiers', label: 'Dossier Workshop', href: '/admin/dossiers' },
      { id: 'health', label: 'Content Health', href: '/admin/health' },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'knowledge', label: 'Knowledge Hub', href: '/admin/knowledge' },
    ],
  },
  {
    label: 'Distribution',
    items: [
      { id: 'distribution', label: 'Distribution Desk', href: '/admin/distribution' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'admin', label: 'All Tools', href: '/admin' },
      { id: 'services', label: 'Service Health', href: '/admin/services' },
    ],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  return (
    <AdminShell
      sidebar={
        <AdminSidebar
          groups={CC_SIDEBAR_GROUPS}
          activeView="command"
          onSelect={() => {}}
          siteHref="/"
          feedbackHref="/admin/feedback"
        />
      }
    >
      <div className="px-6 py-8 max-w-5xl">
        <CommandCenterView />
      </div>
    </AdminShell>
  );
}
