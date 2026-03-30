/**
 * YouTube Data API v3 client
 *
 * Requires: YOUTUBE_API_KEY in env (Google Cloud Console → YouTube Data API v3)
 * Free tier: 10,000 units/day. Search = 100 units, video detail = 1 unit.
 *
 * Quota strategy: search once (100 units), batch video details (1 unit each),
 * batch channel details (1 unit each). A full topic search uses ~200–300 units.
 */

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  durationSeconds: number;
  embedUrl: string;
  watchUrl: string;
  channelSubscriberCount: number;
  channelVideoCount: number;
  channelPublishedAt: string;
  /** Composite quality score: log(views) × channel_authority × recency_weight */
  qualityScore: number;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0');
}

function qualityScore(v: Omit<YouTubeVideo, 'qualityScore'>): number {
  const logViews = v.viewCount > 0 ? Math.log10(v.viewCount) : 0;
  const subAuth = v.channelSubscriberCount > 0 ? Math.min(Math.log10(v.channelSubscriberCount) / 7, 1) : 0;
  const ageYears = (Date.now() - new Date(v.publishedAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
  const recency = Math.max(0, 1 - ageYears / 10); // decays over 10 years
  return Math.round((logViews * 0.5 + subAuth * 0.3 + recency * 0.2) * 100) / 100;
}

async function ytFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!API_KEY) throw new Error('YOUTUBE_API_KEY is not set');
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function searchYouTube(query: string, maxResults = 20): Promise<YouTubeVideo[]> {
  if (!API_KEY) {
    console.warn('[youtube] YOUTUBE_API_KEY not set — skipping');
    return [];
  }

  // Step 1: Search
  const searchData = await ytFetch<{ items: { id: { videoId: string }; snippet: { title: string; description: string; channelId: string; channelTitle: string; publishedAt: string; thumbnails: { high?: { url: string }; default?: { url: string } } } }[] }>(
    '/search',
    { part: 'snippet', q: query, type: 'video', maxResults: String(maxResults), order: 'relevance', videoEmbeddable: 'true' }
  );

  if (!searchData.items?.length) return [];

  const videoIds = searchData.items.map((i) => i.id.videoId).join(',');
  const channelIds = [...new Set(searchData.items.map((i) => i.snippet.channelId))].join(',');

  // Step 2: Video stats + details (batch)
  const [videoData, channelData] = await Promise.all([
    ytFetch<{ items: { id: string; contentDetails: { duration: string }; statistics: { viewCount: string; likeCount?: string; commentCount?: string } }[] }>(
      '/videos',
      { part: 'statistics,contentDetails', id: videoIds }
    ),
    ytFetch<{ items: { id: string; statistics: { subscriberCount: string; videoCount: string }; snippet: { publishedAt: string } }[] }>(
      '/channels',
      { part: 'statistics,snippet', id: channelIds }
    ),
  ]);

  const videoStats = new Map(videoData.items.map((v) => [v.id, v]));
  const channelStats = new Map(channelData.items.map((c) => [c.id, c]));

  const videos: YouTubeVideo[] = searchData.items.map((item) => {
    const stats = videoStats.get(item.id.videoId);
    const channel = channelStats.get(item.snippet.channelId);
    const base: Omit<YouTubeVideo, 'qualityScore'> = {
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
      viewCount: parseInt(stats?.statistics.viewCount ?? '0'),
      likeCount: parseInt(stats?.statistics.likeCount ?? '0'),
      commentCount: parseInt(stats?.statistics.commentCount ?? '0'),
      durationSeconds: parseDuration(stats?.contentDetails.duration ?? 'PT0S'),
      embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channelSubscriberCount: parseInt(channel?.statistics.subscriberCount ?? '0'),
      channelVideoCount: parseInt(channel?.statistics.videoCount ?? '0'),
      channelPublishedAt: channel?.snippet.publishedAt ?? '',
    };
    return { ...base, qualityScore: qualityScore(base) };
  });

  return videos.sort((a, b) => b.qualityScore - a.qualityScore);
}
