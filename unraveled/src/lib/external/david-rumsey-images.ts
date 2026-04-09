/**
 * David Rumsey Map Collection image search.
 *
 * Free, no API key required. Uses the LUNA platform JSON endpoint.
 * The gold standard for historical maps, earth grids, ancient trade routes,
 * post-glacial coastlines, and ley-line-adjacent cartography.
 *
 * ⚠️  LICENSE: CC BY-NC-SA 3.0 — NonCommercial restriction applies.
 * Safe for editorial website display. NOT safe for print sales or image licensing.
 * Contact Rumsey Foundation for a commercial license if needed.
 * All images from this source are stored with source='david_rumsey' so they
 * can be flagged in the UI.
 *
 * https://www.davidrumsey.com/about/api
 */

import type { WikimediaImage } from './wikimedia-images';

const LUNA_API = 'https://www.davidrumsey.com/luna/servlet/as/search';
const UA = 'Unraveled/1.0 (https://unraveledtruth.com; contact@unraveledtruth.com)';

interface LunaField {
  name: string;
  value: string;
}

interface LunaResult {
  id: string;
  urlSize4?: string;   // ~2000px (largest commonly available)
  urlSize3?: string;   // ~1000px
  urlSize2?: string;   // ~500px
  urlSize1?: string;   // thumbnail
  displayName?: string;
  fieldValues?: LunaField[];
}

interface LunaResponse {
  totalResults?: number;
  results?: LunaResult[];
}

function getField(fields: LunaField[] | undefined, name: string): string | null {
  return fields?.find((f) => f.name === name)?.value ?? null;
}

function scoreRumsey(result: LunaResult): number {
  // NC license — lower base score to surface free alternatives first
  const licScore = 0.25;
  const hasLargeImage = !!(result.urlSize4 || result.urlSize3);
  const resScore = hasLargeImage ? 0.25 : 0.12;
  const hasTitle = !!result.displayName;
  const descScore = hasTitle ? 0.15 : 0.05;
  return Math.min(0.75, licScore + resScore + descScore + 0.1); // capped at 0.75 — prefer free sources
}

export async function searchDavidRumseyImages(
  query: string,
  limit = 8,
): Promise<(WikimediaImage & { search_query?: string })[]> {
  try {
    const url = new URL(LUNA_API);
    url.searchParams.set('lc', 'RUMSEY~8~1');
    url.searchParams.set('q', query);
    url.searchParams.set('sort', 'score desc');
    url.searchParams.set('bs', String(Math.min(limit * 2, 20)));
    url.searchParams.set('pn', '1');
    url.searchParams.set('re', 'N');
    url.searchParams.set('tn', 'T');
    url.searchParams.set('os', '0');
    url.searchParams.set('ifs', 'true');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': UA,
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as LunaResponse;
    if (!data?.results?.length) return [];

    const results: (WikimediaImage & { search_query?: string })[] = [];

    for (const item of data.results) {
      const imageUrl = item.urlSize4 ?? item.urlSize3 ?? item.urlSize2;
      const thumbUrl = item.urlSize1 ?? item.urlSize2;
      if (!imageUrl || !thumbUrl) continue;

      const fields = item.fieldValues;
      const title = item.displayName ?? getField(fields, 'TITLE') ?? `Rumsey Map ${item.id}`;
      const author = getField(fields, 'AUTHOR') ?? getField(fields, 'PUBLISHER');
      const date = getField(fields, 'DATE') ?? getField(fields, 'YEAR');
      const description = getField(fields, 'SHORT_TITLE') ?? getField(fields, 'LIST_NO');

      // Construct the Rumsey page URL from the item ID
      const sourcePageUrl = `https://www.davidrumsey.com/luna/servlet/detail/${item.id}`;

      const attribution = [
        author ?? 'Unknown cartographer',
        date ?? '',
        '/ David Rumsey Map Collection — CC BY-NC-SA 3.0',
      ].filter(Boolean).join(' ');

      results.push({
        title,
        image_url: imageUrl,
        thumbnail_url: thumbUrl,
        source_page_url: sourcePageUrl,
        description: description?.slice(0, 300) ?? null,
        author,
        date_created: date,
        license: 'CC BY-NC-SA 3.0',
        license_url: 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
        attribution,
        width: 0,
        height: 0,
        mime_type: 'image/jpeg',
        quality_score: scoreRumsey(item),
        search_query: query,
      });

      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.quality_score - a.quality_score);
  } catch {
    return [];
  }
}
