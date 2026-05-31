'use client';

import React from 'react';

export interface SidebarSubItem {
  id: string;
  label: string;
  /** If set, clicking navigates to this URL (full-page nav) instead of calling onSelect. */
  href?: string;
}

export interface SidebarItem {
  /** Navigates to this view when clicked (or to first subItem if present) */
  id: string;
  label: string;
  subItems?: SidebarSubItem[];
  /** If set, clicking navigates to this URL (full-page nav) instead of calling onSelect. */
  href?: string;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  groups: SidebarGroup[];
  activeView: string;
  onSelect: (view: string) => void;
  /** Site URL for the back-link */
  siteHref?: string;
  feedbackHref?: string;
}

function isItemActive(item: SidebarItem, activeView: string): boolean {
  if (item.subItems) {
    return item.subItems.some((s) => s.id === activeView);
  }
  return item.id === activeView;
}

export function AdminSidebar({
  groups,
  activeView,
  onSelect,
  siteHref = '/',
  feedbackHref = '/admin/feedback',
}: AdminSidebarProps) {
  function handleItemClick(item: SidebarItem) {
    if (item.subItems && item.subItems.length > 0) {
      // Navigate to the parent's default (its own id, which maps to a sub-item)
      onSelect(item.id);
    } else {
      onSelect(item.id);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Wordmark */}
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-base text-text-primary">Unraveled</span>
          <span
            className="font-mono text-[8px] uppercase tracking-widest border border-border px-1 py-px rounded"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Admin
          </span>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2">
        {groups.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
            {/* Group header */}
            <div
              className="font-mono uppercase tracking-widest px-2 mb-1"
              style={{ fontSize: '8px', color: 'var(--color-text-tertiary)' }}
            >
              {group.label}
            </div>

            {group.items.map((item) => {
              const active = isItemActive(item, activeView);
              const itemStyle = {
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: active ? 'var(--color-gold)' : 'var(--color-text-secondary)',
                background: active ? 'var(--color-gold-dim)' : 'transparent',
                borderLeft: active ? '2px solid var(--color-gold)' : '2px solid transparent',
              };
              const hoverIn = (el: HTMLElement) => {
                if (!active) {
                  el.style.color = 'var(--color-text-primary)';
                  el.style.background = 'var(--color-border)';
                }
              };
              const hoverOut = (el: HTMLElement) => {
                if (!active) {
                  el.style.color = 'var(--color-text-secondary)';
                  el.style.background = 'transparent';
                }
              };
              return (
                <div key={item.id}>
                  {/* Top-level item — href renders as anchor, otherwise button */}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors block"
                      style={itemStyle}
                      onMouseEnter={(e) => hoverIn(e.currentTarget as HTMLElement)}
                      onMouseLeave={(e) => hoverOut(e.currentTarget as HTMLElement)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      onClick={() => handleItemClick(item)}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors"
                      style={itemStyle}
                      onMouseEnter={(e) => hoverIn(e.currentTarget as HTMLElement)}
                      onMouseLeave={(e) => hoverOut(e.currentTarget as HTMLElement)}
                    >
                      {item.label}
                    </button>
                  )}

                  {/* Sub-items — always visible when parent is active */}
                  {item.subItems && active && (
                    <div className="ml-3 mt-0.5 mb-1">
                      {item.subItems.map((sub) => {
                        const subActive = sub.id === activeView;
                        const subStyle = {
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: subActive ? 'var(--color-gold)' : 'var(--color-text-tertiary)',
                          background: subActive ? 'var(--color-gold-dim)' : 'transparent',
                          borderLeft: subActive ? '1px solid var(--color-gold)' : '1px solid transparent',
                        };
                        return sub.href ? (
                          <a
                            key={sub.id}
                            href={sub.href}
                            className="w-full text-left px-2 py-1 rounded transition-colors block"
                            style={subStyle}
                            onMouseEnter={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
                            onMouseLeave={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                          >
                            {sub.label}
                          </a>
                        ) : (
                          <button
                            key={sub.id}
                            onClick={() => onSelect(sub.id)}
                            className="w-full text-left px-2 py-1 rounded transition-colors block"
                            style={subStyle}
                            onMouseEnter={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
                            onMouseLeave={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer links */}
      <div className="px-4 py-4 border-t border-border space-y-1">
        <a
          href={feedbackHref}
          className="block font-mono uppercase tracking-widest transition-colors"
          style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-gold)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-tertiary)'; }}
        >
          ⚑ Feedback
        </a>
        <a
          href={siteHref}
          className="block font-mono uppercase tracking-widest transition-colors"
          style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-gold)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-text-tertiary)'; }}
        >
          ← Site
        </a>
      </div>
    </div>
  );
}
