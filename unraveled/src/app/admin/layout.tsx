import type { CSSProperties } from 'react';
import { AdminThemeForcer } from './_components/AdminThemeForcer';

// Repoint all three font roles to Inter for the /admin subtree only — the public
// site keeps IBM Plex + Newsreader. Overriding the CSS vars cascades to every
// `font-sans/mono/serif` utility and inline `var(--font-*)` used by admin components.
const ADMIN_FONT: CSSProperties = {
  ['--font-sans' as string]: 'var(--font-inter)',
  ['--font-mono' as string]: 'var(--font-inter)',
  ['--font-serif' as string]: 'var(--font-inter)',
  fontFamily: 'var(--font-inter)',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Force permanent light mode for the entire /admin subtree.
  // AdminThemeForcer sets data-theme="light" on <html> (overrides any site dark-mode preference).
  // The wrapper div also carries data-theme="light" as a CSS-variable fallback.
  return (
    <div data-theme="light" style={ADMIN_FONT}>
      <AdminThemeForcer />
      {children}
    </div>
  );
}
