/**
 * Wikipedia API client — free, no key required
 *
 * Uses the MediaWiki Action API and the REST API (newer, cleaner).
 * Pulls article summary, sections, categories, talk page flags.
 */

const REST_BASE = 'https://en.wikipedia.org/api/rest_v1';
const ACTION_BASE = 'https://en.wikipedia.org/w/api.php';

export interface WikiSummary {
  title: string;
  extract: string;         // plain-text article introduction
  url: string;
  thumbnail: string | null;
  categories: string[];
  disputed: boolean;       // has {disputed}, {POV}, or {reliability} template
  talkFlags: string[];     // issues flagged on talk page
}

async function wikiFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'unraveled-ai/1.0' } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function getWikipediaSummary(query: string): Promise<WikiSummary | null> {
  // Search for the best matching article
  const searchData = await wikiFetch<{ query: { search: { title: string }[] } }>(
    `${ACTION_BASE}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`
  );
  const title = searchData?.query?.search?.[0]?.title;
  if (!title) return null;

  // Get article summary via REST API
  const summaryData = await wikiFetch<{
    title: string;
    extract: string;
    content_urls: { desktop: { page: string } };
    thumbnail?: { source: string };
  }>(`${REST_BASE}/page/summary/${encodeURIComponent(title)}`);
  if (!summaryData) return null;

  // Get categories to detect disputed articles
  const catData = await wikiFetch<{ query: { pages: Record<string, { categories?: { title: string }[] }> } }>(
    `${ACTION_BASE}?action=query&prop=categories&titles=${encodeURIComponent(title)}&cllimit=50&format=json&origin=*`
  );
  const pages = catData?.query?.pages ?? {};
  const categories = Object.values(pages).flatMap((p) => (p.categories ?? []).map((c) => c.title));

  const disputePatterns = ['disputed', 'accuracy', 'neutrality', 'reliability', 'verif', 'fringe'];
  const disputed = categories.some((c) => disputePatterns.some((p) => c.toLowerCase().includes(p)));
  const talkFlags = categories
    .filter((c) => disputePatterns.some((p) => c.toLowerCase().includes(p)))
    .map((c) => c.replace('Category:', ''));

  return {
    title: summaryData.title,
    extract: summaryData.extract?.slice(0, 1500) ?? '',
    url: summaryData.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: summaryData.thumbnail?.source ?? null,
    categories: categories.slice(0, 20),
    disputed,
    talkFlags,
  };
}
