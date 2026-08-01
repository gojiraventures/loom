/**
 * Source Link Resolver
 *
 * Turns a SourceReference into a real, clickable URL — WITHOUT fabricating.
 * A URL is only returned when an authoritative registry actually returns a match:
 *   DOI       → https://doi.org/<doi>            (constructed from a real DOI)
 *   journal   → Crossref best match → its DOI    (similarity-gated)
 *   book      → Open Library work key            (similarity-gated)
 *   canonical → Wikipedia REST search → page URL (primary/sacred texts)
 *   url        → kept as-is if already present
 *
 * If nothing resolves, returns null. Never guesses a URL. This upholds the
 * hard constraint: every source link must be real and resolvable.
 *
 * Pairs with citation-gate.ts (which validates existence); this one captures
 * the resolved URL so the bibliography can link out.
 */
import type { SourceReference } from '../types';
import { parseCitation } from './citation-gate';

const UA = { 'User-Agent': 'Unraveled/1.0 (mailto:admin@unraveledtruth.com)' };
const SIM_THRESHOLD = 0.5;

export interface ResolvedLink {
  url: string;
  via: 'existing' | 'doi' | 'crossref' | 'openlibrary' | 'wikipedia';
}

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
}
function similarity(a: string, b: string): number {
  const ta = tokenize(a), tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

async function timedFetch(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: UA, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function crossrefDoi(title: string): Promise<string | null> {
  try {
    const res = await timedFetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(title)}&rows=3&select=DOI,title`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { items?: Array<{ DOI?: string; title?: string[] }> } };
    const items = data.message?.items ?? [];
    let best: { doi: string; sim: number } | null = null;
    for (const it of items) {
      const cand = it.title?.[0] ?? '';
      const sim = similarity(title, cand);
      if (it.DOI && (!best || sim > best.sim)) best = { doi: it.DOI, sim };
    }
    return best && best.sim >= SIM_THRESHOLD ? `https://doi.org/${best.doi}` : null;
  } catch {
    return null;
  }
}

async function openLibrary(title: string, author?: string | null): Promise<string | null> {
  try {
    const q = author
      ? `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
      : `title=${encodeURIComponent(title)}`;
    const res = await timedFetch(`https://openlibrary.org/search.json?${q}&fields=key,title&limit=3`);
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: Array<{ key?: string; title?: string }> };
    const docs = data.docs ?? [];
    for (const d of docs) {
      if (d.key && similarity(title, d.title ?? '') >= SIM_THRESHOLD) {
        return `https://openlibrary.org${d.key}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function wikipedia(title: string): Promise<string | null> {
  try {
    const res = await timedFetch(
      `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(title)}&limit=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { pages?: Array<{ key?: string; title?: string }> };
    const page = data.pages?.[0];
    if (page?.key) return `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`;
    return null;
  } catch {
    return null;
  }
}

/** Resolve a single source to a real URL, or null if none can be verified. */
export async function resolveSourceLink(source: SourceReference): Promise<ResolvedLink | null> {
  // Already has a usable URL — keep it.
  if (source.url && /^https?:\/\//i.test(source.url)) {
    return { url: source.url, via: 'existing' };
  }

  const parsed = parseCitation(source);
  const title = source.title ?? '';

  switch (parsed.type) {
    case 'doi':
      return { url: `https://doi.org/${parsed.normalized}`, via: 'doi' };
    case 'journal': {
      const doi = await crossrefDoi(parsed.normalized || title);
      return doi ? { url: doi, via: 'crossref' } : null;
    }
    case 'book': {
      const ol = await openLibrary(parsed.normalized || title, source.author);
      if (ol) return { url: ol, via: 'openlibrary' };
      // Books also often live on Wikipedia (esp. famous/primary works)
      const wiki = await wikipedia(title);
      return wiki ? { url: wiki, via: 'wikipedia' } : null;
    }
    case 'canonical': {
      const wiki = await wikipedia(title || parsed.normalized);
      return wiki ? { url: wiki, via: 'wikipedia' } : null;
    }
    default:
      return null;
  }
}

/**
 * Resolve links for a list of sources (mutates a copy). Runs with light
 * concurrency to stay polite to the free registries. Sources that already
 * have a URL are untouched; unresolvable ones keep url = null.
 */
export async function resolveSourceLinks(
  sources: SourceReference[],
  { concurrency = 4 } = {},
): Promise<{ sources: SourceReference[]; resolved: number }> {
  const out = sources.map((s) => ({ ...s }));
  let resolved = 0;
  for (let i = 0; i < out.length; i += concurrency) {
    const batch = out.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (s) => {
        if (s.url) return;
        const link = await resolveSourceLink(s);
        if (link && link.via !== 'existing') {
          s.url = link.url;
          resolved++;
        }
      }),
    );
  }
  return { sources: out, resolved };
}
