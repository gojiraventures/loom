/**
 * Wikimedia Commons image search client
 *
 * Free, no API key required.
 * Rate limit: be polite — add User-Agent header.
 * Searches File: namespace (ns=6) for openly licensed images.
 *
 * License priority: Public Domain > CC0 > CC BY > CC BY-SA
 */

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'Unraveled/1.0 (https://unraveled.ai; contact@unraveled.ai)';

export interface WikimediaImage {
  title: string;           // e.g. "File:Stonehenge_at_sunset.jpg"
  image_url: string;       // full resolution
  thumbnail_url: string;   // 600px wide
  source_page_url: string; // Wikimedia Commons page
  description: string | null;
  author: string | null;
  date_created: string | null;
  license: string | null;  // e.g. "CC BY-SA 4.0"
  license_url: string | null;
  attribution: string;     // ready-to-display credit line
  width: number;
  height: number;
  mime_type: string;
  quality_score: number;   // 0–1
}

interface WikimediaImageInfo {
  url: string;
  thumburl?: string;
  descriptionurl: string;
  width: number;
  height: number;
  size: number;
  mime: string;
  extmetadata?: {
    LicenseShortName?: { value: string };
    LicenseUrl?: { value: string };
    Artist?: { value: string };
    ImageDescription?: { value: string };
    DateTimeOriginal?: { value: string };
  };
}

interface WikimediaPage {
  pageid: number;
  ns: number;
  title: string;
  imageinfo?: WikimediaImageInfo[];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function scoreLicense(license: string | null): number {
  if (!license) return 0.3;
  const l = license.toLowerCase();
  if (l.includes('public domain') || l === 'pd') return 1.0;
  if (l.includes('cc0')) return 0.95;
  if (l.includes('cc by') && !l.includes('sa') && !l.includes('nc')) return 0.85;
  if (l.includes('cc by-sa')) return 0.8;
  if (l.includes('cc by')) return 0.75;
  return 0.4;
}

function scoreImage(page: WikimediaPage): number {
  const info = page.imageinfo?.[0];
  if (!info) return 0;

  // Resolution score (0–0.3): reward high-res images
  const pixels = info.width * info.height;
  const resScore = Math.min(0.3, (pixels / (4000 * 3000)) * 0.3);

  // License score (0–0.4)
  const license = info.extmetadata?.LicenseShortName?.value ?? null;
  const licScore = scoreLicense(license) * 0.4;

  // Description score (0–0.15): penalize no description
  const desc = info.extmetadata?.ImageDescription?.value;
  const descScore = desc && stripHtml(desc).length > 20 ? 0.15 : 0.05;

  // Author score (0–0.15): reward attributed images
  const artist = info.extmetadata?.Artist?.value;
  const authorScore = artist ? 0.15 : 0.05;

  return Math.min(1, resScore + licScore + descScore + authorScore);
}

function buildAttribution(info: WikimediaImageInfo, title: string): string {
  const rawArtist = info.extmetadata?.Artist?.value ?? null;
  const artist = rawArtist ? stripHtml(rawArtist) : 'Unknown author';
  const license = info.extmetadata?.LicenseShortName?.value ?? 'Unknown license';
  const filename = title.replace('File:', '');
  return `${artist} / Wikimedia Commons — ${license} — "${filename}"`;
}

async function commonsFetch<T>(params: Record<string, string>): Promise<T | null> {
  const url = new URL(COMMONS_API);
  for (const [k, v] of Object.entries({ ...params, format: 'json', origin: '*' })) {
    url.searchParams.set(k, v);
  }
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export async function searchWikimediaImages(
  query: string,
  limit = 15,
): Promise<WikimediaImage[]> {
  const data = await commonsFetch<{
    query?: { pages?: Record<string, WikimediaPage> };
  }>({
    action: 'query',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata|canonicaltitle',
    iiurlwidth: '700',
    iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|ImageDescription|DateTimeOriginal',
  });

  if (!data?.query?.pages) return [];

  const results: WikimediaImage[] = [];

  for (const page of Object.values(data.query.pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;

    // Skip non-image mimetypes (PDFs, audio, etc.)
    if (!info.mime.startsWith('image/')) continue;
    // Skip very small images
    if (info.width < 400 || info.height < 300) continue;

    const license = info.extmetadata?.LicenseShortName?.value ?? null;
    const licenseUrl = info.extmetadata?.LicenseUrl?.value ?? null;
    const rawDesc = info.extmetadata?.ImageDescription?.value ?? null;
    const rawArtist = info.extmetadata?.Artist?.value ?? null;
    const dateRaw = info.extmetadata?.DateTimeOriginal?.value ?? null;

    results.push({
      title: page.title.replace('File:', ''),
      image_url: info.url,
      thumbnail_url: info.thumburl ?? info.url,
      source_page_url: info.descriptionurl,
      description: rawDesc ? stripHtml(rawDesc) : null,
      author: rawArtist ? stripHtml(rawArtist) : null,
      date_created: dateRaw ? stripHtml(dateRaw).slice(0, 10) : null,
      license,
      license_url: licenseUrl,
      attribution: buildAttribution(info, page.title),
      width: info.width,
      height: info.height,
      mime_type: info.mime,
      quality_score: scoreImage(page),
    });
  }

  // Sort by quality score descending
  return results.sort((a, b) => b.quality_score - a.quality_score);
}
