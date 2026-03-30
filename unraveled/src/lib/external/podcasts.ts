/**
 * Podcast search clients
 *
 * Two sources:
 * 1. iTunes Search API — completely free, no key required, searches Apple Podcasts
 * 2. Listen Notes API — free tier (100 req/month), LISTENNOTES_API_KEY env var
 *
 * iTunes is the primary source. Listen Notes supplements with ratings/reviews.
 */

const LISTEN_NOTES_KEY = process.env.LISTENNOTES_API_KEY;

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  showName: string;
  showUrl: string;
  episodeUrl: string;
  embedUrl: string | null;
  thumbnailUrl: string;
  publishedAt: string;
  durationSeconds: number;
  source: 'itunes' | 'listennotes';
}

// ── iTunes Search API (free, no key) ─────────────────────────────────────────

interface ITunesResult {
  trackId: number;
  trackName: string;
  description: string;
  collectionName: string;
  collectionViewUrl: string;
  trackViewUrl: string;
  artworkUrl600: string;
  releaseDate: string;
  trackTimeMillis: number;
  episodeUrl?: string;
}

export async function searchPodcastsiTunes(query: string, limit = 15): Promise<PodcastEpisode[]> {
  try {
    const url = new URL('https://itunes.apple.com/search');
    url.searchParams.set('term', query);
    url.searchParams.set('media', 'podcast');
    url.searchParams.set('entity', 'podcastEpisode');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json() as { results: ITunesResult[] };

    return (data.results ?? []).map((r) => ({
      id: String(r.trackId),
      title: r.trackName ?? '',
      description: r.description ?? '',
      showName: r.collectionName ?? '',
      showUrl: r.collectionViewUrl ?? '',
      episodeUrl: r.trackViewUrl ?? '',
      embedUrl: null, // iTunes doesn't provide embed URLs
      thumbnailUrl: r.artworkUrl600 ?? '',
      publishedAt: r.releaseDate ?? '',
      durationSeconds: Math.round((r.trackTimeMillis ?? 0) / 1000),
      source: 'itunes' as const,
    }));
  } catch (err) {
    console.error('[podcasts] iTunes search error:', err);
    return [];
  }
}

// ── Listen Notes API (free tier: 100 req/month) ───────────────────────────────

interface ListenNotesEpisode {
  id: string;
  title: string;
  description: string;
  podcast: { title: string; website: string; listennotes_url: string; image: string };
  listennotes_url: string;
  audio: string;
  image: string;
  pub_date_ms: number;
  audio_length_sec: number;
}

export async function searchPodcastsListenNotes(query: string, limit = 10): Promise<PodcastEpisode[]> {
  if (!LISTEN_NOTES_KEY) return [];
  try {
    const url = new URL('https://listen-api.listennotes.com/api/v2/search');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'episode');
    url.searchParams.set('len_min', '10'); // at least 10 min episodes
    url.searchParams.set('page_size', String(limit));
    url.searchParams.set('sort_by_date', '0'); // sort by relevance

    const res = await fetch(url.toString(), {
      headers: { 'X-ListenAPI-Key': LISTEN_NOTES_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json() as { results: ListenNotesEpisode[] };

    return (data.results ?? []).map((r) => ({
      id: r.id,
      title: r.title ?? '',
      description: r.description?.slice(0, 400) ?? '',
      showName: r.podcast?.title ?? '',
      showUrl: r.podcast?.website ?? r.podcast?.listennotes_url ?? '',
      episodeUrl: r.listennotes_url ?? '',
      embedUrl: `https://www.listennotes.com/embedded/e/${r.id}/`,
      thumbnailUrl: r.image ?? r.podcast?.image ?? '',
      publishedAt: r.pub_date_ms ? new Date(r.pub_date_ms).toISOString() : '',
      durationSeconds: r.audio_length_sec ?? 0,
      source: 'listennotes' as const,
    }));
  } catch (err) {
    console.error('[podcasts] ListenNotes search error:', err);
    return [];
  }
}

/** Search both sources and deduplicate by title similarity */
export async function searchPodcasts(query: string): Promise<PodcastEpisode[]> {
  const [itunes, listenNotes] = await Promise.all([
    searchPodcastsiTunes(query, 15),
    searchPodcastsListenNotes(query, 10),
  ]);

  // Deduplicate by title (first 40 chars)
  const seen = new Set<string>();
  const combined: PodcastEpisode[] = [];
  for (const ep of [...listenNotes, ...itunes]) {
    const key = ep.title.slice(0, 40).toLowerCase();
    if (!seen.has(key)) { seen.add(key); combined.push(ep); }
  }

  return combined;
}
