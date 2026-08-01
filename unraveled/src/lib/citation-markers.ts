/**
 * Shared, framework-agnostic helpers for inline [n] citation markers.
 * Lives outside any 'use client' module so BOTH server components (LinkedText)
 * and client components (CitedText) can import it without crossing the
 * server/client boundary.
 */

/** Remove [n] citation markers and tidy the whitespace they leave behind. */
export function stripCitationMarkers(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1');
}
