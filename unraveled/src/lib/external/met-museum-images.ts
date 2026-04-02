/**
 * Metropolitan Museum of Art Open Access image search.
 *
 * Free, no API key required.
 * All results are public domain (isPublicDomain=true filter).
 * Two-step: search returns objectIDs, then fetch each object for image URLs.
 *
 * Rate limit: be polite — max 80 req/s per their guidelines.
 * https://metmuseum.github.io/
 */

import type { WikimediaImage } from './wikimedia-images';

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const UA = 'Unraveled/1.0 (https://unraveled.ai; contact@unraveled.ai)';

interface MetObject {
  objectID: number;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  primaryImage: string;
  primaryImageSmall: string;
  objectURL: string;
  isPublicDomain: boolean;
  department: string;
  creditLine: string;
  // dimensions aren't always present
}

async function metFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MET_API}${path}`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function scoreMetImage(obj: MetObject): number {
  // All Met results are public domain — top license score
  const licScore = 0.4; // max

  // Image availability
  if (!obj.primaryImage) return 0;

  // Description quality
  const descScore = obj.title && obj.title.length > 5 ? 0.15 : 0.05;

  // Author/attribution
  const authorScore = obj.artistDisplayName ? 0.15 : 0.05;

  // Resolution unknown until we fetch — assume good for Met images
  const resScore = obj.primaryImageSmall ? 0.2 : 0.1;

  return Math.min(1, licScore + descScore + authorScore + resScore);
}

export async function searchMetMuseumImages(
  query: string,
  limit = 10,
): Promise<(WikimediaImage & { search_query?: string })[]> {
  // Step 1: search for object IDs
  const searchData = await metFetch<{ total: number; objectIDs: number[] | null }>(
    `/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`
  );

  if (!searchData?.objectIDs || searchData.objectIDs.length === 0) return [];

  // Take a sample from the results (first `limit` IDs)
  const ids = searchData.objectIDs.slice(0, Math.min(limit * 2, 30));

  // Step 2: fetch object details in parallel
  const objects = await Promise.all(
    ids.map((id) => metFetch<MetObject>(`/objects/${id}`).catch(() => null))
  );

  const results: (WikimediaImage & { search_query?: string })[] = [];

  for (const obj of objects) {
    if (!obj) continue;
    if (!obj.isPublicDomain) continue;
    if (!obj.primaryImage) continue;

    // Skip objects without a usable image URL
    const imageUrl = obj.primaryImage;
    const thumbUrl = obj.primaryImageSmall || obj.primaryImage;

    const attribution = [
      obj.artistDisplayName || 'Unknown artist',
      obj.objectDate || '',
      '/ The Metropolitan Museum of Art — Public Domain',
      obj.creditLine ? `/ ${obj.creditLine}` : '',
    ].filter(Boolean).join(' ');

    results.push({
      title: obj.title || `Met Object ${obj.objectID}`,
      image_url: imageUrl,
      thumbnail_url: thumbUrl,
      source_page_url: obj.objectURL,
      description: [obj.medium, obj.department].filter(Boolean).join(' · ') || null,
      author: obj.artistDisplayName || null,
      date_created: obj.objectDate || null,
      license: 'Public Domain',
      license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
      attribution,
      width: 0,   // Met API doesn't return dimensions in search results
      height: 0,
      mime_type: 'image/jpeg',
      quality_score: scoreMetImage(obj),
      search_query: query,
    });

    if (results.length >= limit) break;
  }

  return results.sort((a, b) => b.quality_score - a.quality_score);
}
