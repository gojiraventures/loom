import { AdminThemeForcer } from './_components/AdminThemeForcer';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Force permanent light mode for the entire /admin subtree.
  // AdminThemeForcer sets data-theme="light" on <html> (overrides any site dark-mode preference).
  // The wrapper div also carries data-theme="light" as a CSS-variable fallback.
  return (
    <div data-theme="light">
      <AdminThemeForcer />
      {children}
    </div>
  );
}
