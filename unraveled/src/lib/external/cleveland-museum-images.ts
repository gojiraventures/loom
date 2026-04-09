/**
 * Cleveland Museum of Art Open Access image search.
 *
 * Free, no API key required.
 * Filters to CC0 licensed images with images available.
 * https://openaccess-api.clevelandart.org/
 */

import type { WikimediaImage } from './wikimedia-images';

const CMA_API = 'https://openaccess-api.clevelandart.org/api';
const UA = 'Unraveled/1.0 (https://unraveledtruth.com; contact@unraveledtruth.com)';

interface CMAImage {
  url: string;
  width: number;
  height: number;
  filesize: number;
}

interface CMACreator {
  description: string;
  role: string;
}

interface CMArtwork {
  id: number;
  title: string;
  creation_date: string | null;
  creators: CMACreator[];
  images: {
    web?: CMAImage;
    print?: CMAImage;
    full?: CMAImage;
  } | null;
  url: string;
  license: string;
  description: string | null;
  technique: string | null;
  type: string | null;
  department: string | null;
  culture: string[] | null;
}

interface CMAResponse {
  data: CMArtwork[];
}

function scoreClevelendImage(art: CMArtwork): number {
  // CC0 license
  const licScore = 0.38;

  const img = art.images?.web ?? art.images?.print;
  if (!img) return 0;

  // Resolution score (0–0.3)
  const pixels = (img.width ?? 0) * (img.height ?? 0);
  const resScore = Math.min(0.3, (pixels / (2000 * 1500)) * 0.3);

  // Description
  const descScore = art.description && art.description.length > 20 ? 0.15 : 0.06;

  // Author
  const authorScore = art.creators?.length > 0 ? 0.15 : 0.06;

  return Math.min(1, licScore + resScore + descScore + authorScore);
}

export async function searchClevelandMuseumImages(
  query: string,
  limit = 10,
): Promise<(WikimediaImage & { search_query?: string })[]> {
  try {
    const url = new URL(`${CMA_API}/artworks/`);
    url.searchParams.set('q', query);
    url.searchParams.set('has_image', '1');
    url.searchParams.set('cc0', '1');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('skip', '0');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as CMAResponse;
    if (!data?.data?.length) return [];

    const results: (WikimediaImage & { search_query?: string })[] = [];

    for (const art of data.data) {
      const img = art.images?.web ?? art.images?.print ?? art.images?.full;
      if (!img?.url) continue;

      // Skip very small images
      if ((img.width ?? 0) < 400 || (img.height ?? 0) < 300) continue;

      const primaryCreator = art.creators?.[0]?.description ?? null;
      const cultures = art.culture?.join(', ') ?? null;

      const attribution = [
        primaryCreator ?? 'Unknown artist',
        art.creation_date ?? '',
        '/ Cleveland Museum of Art — CC0',
        cultures ? `/ ${cultures}` : '',
      ].filter(Boolean).join(' ');

      results.push({
        title: art.title || `CMA Object ${art.id}`,
        image_url: img.url,
        thumbnail_url: art.images?.web?.url ?? img.url,
        source_page_url: art.url,
        description: [art.description, art.technique, art.type, art.department].filter(Boolean).join(' · ').slice(0, 300) || null,
        author: primaryCreator,
        date_created: art.creation_date,
        license: 'CC0',
        license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
        attribution,
        width: img.width ?? 0,
        height: img.height ?? 0,
        mime_type: 'image/jpeg',
        quality_score: scoreClevelendImage(art),
        search_query: query,
      });
    }

    return results.sort((a, b) => b.quality_score - a.quality_score);
  } catch {
    return [];
  }
}
