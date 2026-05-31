'use client';

import { useEffect } from 'react';

/**
 * Forces data-theme="light" on <html> for the entire /admin subtree.
 * Restores the previous value when navigating away (on unmount).
 */
export function AdminThemeForcer() {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      if (prev == null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', prev);
      }
    };
  }, []);
  return null;
}
