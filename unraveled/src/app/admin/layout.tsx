export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Force permanent light mode for the entire /admin subtree.
  // globals.css responds to both html[data-theme="light"] and [data-theme="light"],
  // so this wrapper div overrides all CSS custom properties for its descendants.
  return <div data-theme="light">{children}</div>;
}
