/**
 * Media URL Validator
 *
 * Checks that a media URL actually resolves to live, accessible content
 * before storing it. LLM-suggested URLs are frequently stale or hallucinated.
 *
 * YouTube: oEmbed endpoint — returns 404 for deleted/private/unavailable videos.
 *          No API key required.
 * Spotify: HEAD request to the episode URL.
 * Generic: HEAD request, accepts 200/301/302.
 *
 * Returns { valid: boolean; reason?: string }
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const TIMEOUT_MS = 8_000;

async function headCheck(url: string): Promise<ValidationResult> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'UnraveledTruth-Validator/1.0' },
    });
    if (res.ok || res.status === 301 || res.status === 302) {
      return { valid: true };
    }
    return { valid: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Network error' };
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

async function validateYouTube(url: string): Promise<ValidationResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return { valid: false, reason: 'Could not extract YouTube video ID' };

  // oEmbed returns 404 for deleted/private/unavailable — no API key needed
  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  try {
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'UnraveledTruth-Validator/1.0' },
    });
    if (res.ok) return { valid: true };
    if (res.status === 404 || res.status === 403 || res.status === 401) {
      return { valid: false, reason: `Video unavailable (oEmbed ${res.status})` };
    }
    return { valid: false, reason: `oEmbed HTTP ${res.status}` };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Network error' };
  }
}

async function validateSpotify(url: string): Promise<ValidationResult> {
  // Extract episode ID and hit the oembed endpoint
  const match = url.match(/episode\/([a-zA-Z0-9]+)/);
  if (!match) return { valid: false, reason: 'Could not extract Spotify episode ID' };

  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'UnraveledTruth-Validator/1.0' },
    });
    if (res.ok) return { valid: true };
    return { valid: false, reason: `Spotify oEmbed HTTP ${res.status}` };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Network error' };
  }
}

export async function validateMediaUrl(url: string, type?: string): Promise<ValidationResult> {
  if (!url) return { valid: false, reason: 'No URL provided' };

  try {
    new URL(url); // basic parse check
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return validateYouTube(url);
  }
  if (url.includes('open.spotify.com') || url.includes('spotify.com')) {
    return validateSpotify(url);
  }
  // Generic fallback
  return headCheck(url);
}

/**
 * Validate a batch of URLs concurrently (max 5 at a time to avoid hammering).
 * Returns a map of url → ValidationResult.
 */
export async function validateMediaUrls(
  items: { id: string; url: string; type?: string }[],
  concurrency = 5,
): Promise<Map<string, ValidationResult & { id: string; url: string }>> {
  const results = new Map<string, ValidationResult & { id: string; url: string }>();

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const settled = await Promise.all(
      batch.map(async (item) => {
        const result = await validateMediaUrl(item.url, item.type);
        return { id: item.id, url: item.url, ...result };
      })
    );
    for (const r of settled) {
      results.set(r.id, r);
    }
  }

  return results;
}
