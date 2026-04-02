/**
 * Library of Congress Free-to-Use image search.
 *
 * Free, no API key required.
 * Filters to online images only. Most results are public domain or
 * "No known copyright restrictions."
 *
 * https://www.loc.gov/apis/json-and-yaml/
 */

import type { WikimediaImage } from './wikimedia-images';

const LOC_API = 'https://www.loc.gov/search/';
const UA = 'Unraveled/1.0 (https://unraveled.ai; contact@unraveled.ai)';

interface LocResult {
  id: string;
  title: string | string[];
  image_url?: string[];
  url: string;
  description?: string[];
  contributor?: string[];
  date?: string;
  dates?: { start?: number; end?: number }[];
  rights?: string;
  aka?: string[];
}

interface LocResponse {
  results?: LocResult[];
}

function resolveTitle(raw: string | string[]): string {
  return Array.isArray(raw) ? raw[0] : raw;
}

function scoreLOCImage(result: LocResult): number {
  // LOC images are mostly public domain — high license score
  const licScore = 0.38;

  const imgs = result.image_url ?? [];
  if (imgs.length === 0) return 0;

  // Pick largest available (last in array)
  // Description quality
  const desc = result.description?.join(' ') ?? '';
  const descScore = desc.length > 20 ? 0.15 : 0.05;

  // Contributor (author)
  const authorScore = result.contributor && result.contributor.length > 0 ? 0.15 : 0.05;

  // Assume decent resolution for LOC digitized items
  const resScore = 0.22;

  return Math.min(1, licScore + resScore + descScore + authorScore);
}

export async function searchLocImages(
  query: string,
  limit = 10,
): Promise<(WikimediaImage & { search_query?: string })[]> {
  try {
    const url = new URL(LOC_API);
    url.searchParams.set('q', query);
    url.searchParams.set('fo', 'json');
    url.searchParams.set('c', String(Math.min(limit * 2, 25)));
    url.searchParams.set('at', 'results');
    url.searchParams.set('fa', 'online-format:image');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as LocResponse;
    if (!data?.results?.length) return [];

    const results: (WikimediaImage & { search_query?: string })[] = [];

    for (const item of data.results) {
      const imgs = item.image_url ?? [];
      if (imgs.length === 0) continue;

      // LOC returns multiple sizes — largest is usually last; prefer at least 3rd
      const imageUrl = imgs[imgs.length - 1];
      const thumbUrl = imgs[0]; // smallest for thumbnail

      if (!imageUrl) continue;

      const title = resolveTitle(item.title);
      const description = item.description?.join(' ').slice(0, 300) ?? null;
      const author = item.contributor?.[0] ?? null;
      const dateRaw = item.date ?? item.dates?.[0]?.start?.toString() ?? null;

      const attribution = [
        author ?? 'Unknown',
        dateRaw ?? '',
        '/ Library of Congress — Public Domain',
      ].filter(Boolean).join(' ');

      results.push({
        title,
        image_url: imageUrl,
        thumbnail_url: thumbUrl,
        source_page_url: item.url,
        description,
        author,
        date_created: dateRaw,
        license: 'Public Domain',
        license_url: 'https://www.loc.gov/free-to-use/',
        attribution,
        width: 0,
        height: 0,
        mime_type: 'image/jpeg',
        quality_score: scoreLOCImage(item),
        search_query: query,
      });

      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.quality_score - a.quality_score);
  } catch {
    return [];
  }
}
