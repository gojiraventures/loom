/**
 * Smithsonian Open Access image search.
 *
 * Requires a free API key: https://edan.si.edu/openaccess/apidocs/
 * Set SMITHSONIAN_API_KEY in .env.local
 *
 * All results filtered to open access / CC0 images.
 * Covers: NMNH, NMAAHC, Freer/Sackler, Air & Space, American History, etc.
 *
 * https://edan.si.edu/openaccess/apidocs/
 */

import type { WikimediaImage } from './wikimedia-images';

const SI_API = 'https://api.si.edu/openaccess/api/v1.0';
const UA = 'Unraveled/1.0 (https://unraveledtruth.com; contact@unraveledtruth.com)';

interface SIMedia {
  type: string;
  content: string;    // image URL
  thumbnail?: string;
  caption?: string;
}

interface SIRow {
  id: string;
  title: string;
  unitCode: string;
  content: {
    descriptiveNonRepeating?: {
      title?: { content: string };
      online_media?: { media?: SIMedia[] };
      record_link?: string;
      data_source?: string;
    };
    freetext?: {
      date?: { content: string }[];
      notes?: { content: string }[];
      name?: { content: string }[];
      physicalDescription?: { content: string }[];
      creditLine?: { content: string }[];
    };
  };
}

interface SIResponse {
  response?: {
    rows?: SIRow[];
  };
}

function extractSIImageUrl(row: SIRow): { image: string; thumb: string } | null {
  const media = row.content?.descriptiveNonRepeating?.online_media?.media ?? [];
  const imageMedia = media.find((m) => m.type === 'Images' && m.content);
  if (!imageMedia) return null;
  return {
    image: imageMedia.content,
    thumb: imageMedia.thumbnail ?? imageMedia.content,
  };
}

function extractSIText(items?: { content: string }[]): string | null {
  if (!items?.length) return null;
  return items.map((i) => i.content).join('; ') || null;
}

function scoreSI(row: SIRow): number {
  const licScore = 0.38; // CC0 open access
  const hasDesc = !!extractSIText(row.content?.freetext?.notes);
  const hasAuthor = !!extractSIText(row.content?.freetext?.name);
  return Math.min(1, licScore + 0.22 + (hasDesc ? 0.15 : 0.05) + (hasAuthor ? 0.15 : 0.05));
}

export async function searchSmithsonianImages(
  query: string,
  limit = 10,
): Promise<(WikimediaImage & { search_query?: string })[]> {
  const apiKey = process.env.SMITHSONIAN_API_KEY;
  if (!apiKey) return []; // silently skip if not configured

  try {
    const url = new URL(`${SI_API}/search`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('rows', String(Math.min(limit * 2, 20)));
    url.searchParams.set('media_type', 'Images');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as SIResponse;
    const rows = data?.response?.rows ?? [];

    const results: (WikimediaImage & { search_query?: string })[] = [];

    for (const row of rows) {
      const urls = extractSIImageUrl(row);
      if (!urls) continue;

      const dnr = row.content?.descriptiveNonRepeating;
      const ft = row.content?.freetext;

      const title = dnr?.title?.content ?? row.title ?? `SI Object ${row.id}`;
      const description = extractSIText(ft?.notes) ?? extractSIText(ft?.physicalDescription);
      const author = extractSIText(ft?.name);
      const date = extractSIText(ft?.date);
      const dataSource = dnr?.data_source ?? row.unitCode ?? 'Smithsonian Institution';
      const recordLink = dnr?.record_link ?? `https://www.si.edu/object/${row.id}`;
      const credit = extractSIText(ft?.creditLine);

      const attribution = [
        author ?? dataSource,
        date ?? '',
        `/ ${dataSource} — CC0`,
        credit ? `/ ${credit}` : '',
      ].filter(Boolean).join(' ');

      results.push({
        title,
        image_url: urls.image,
        thumbnail_url: urls.thumb,
        source_page_url: recordLink,
        description: description?.slice(0, 300) ?? null,
        author,
        date_created: date,
        license: 'CC0',
        license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
        attribution,
        width: 0,
        height: 0,
        mime_type: 'image/jpeg',
        quality_score: scoreSI(row),
        search_query: query,
      });

      if (results.length >= limit) break;
    }

    return results.sort((a, b) => b.quality_score - a.quality_score);
  } catch {
    return [];
  }
}
