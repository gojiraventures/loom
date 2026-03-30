/**
 * Reddit API client
 *
 * Requires env vars:
 *   REDDIT_CLIENT_ID     — from reddit.com/prefs/apps (script app)
 *   REDDIT_CLIENT_SECRET — from the same app
 *   REDDIT_USER_AGENT    — e.g. "unraveled-ai/1.0 by YourUsername"
 *
 * To create credentials:
 *   1. Go to reddit.com/prefs/apps
 *   2. Click "create another app"
 *   3. Choose "script" type
 *   4. Redirect URI: http://localhost:3000 (doesn't matter for script apps)
 *   5. Copy client ID (under app name) and client secret
 *
 * Rate limit: 60 requests/minute with OAuth.
 */

const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const USER_AGENT = process.env.REDDIT_USER_AGENT ?? 'unraveled-ai/1.0';

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are not set');
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`Reddit auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
  return cachedToken.access_token;
}

async function redditFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`https://oauth.reddit.com${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`Reddit API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export interface RedditSubreddit {
  name: string;
  displayName: string;
  title: string;
  description: string;
  subscribers: number;
  url: string;
  over18: boolean;
  publicDescription: string;
}

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  selftext: string;
  author: string;
  createdUtc: number;
  isExternal: boolean;        // link post (not self-post)
  externalUrl: string | null; // the actual linked URL
  flair: string | null;
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  permalink: string;
  createdUtc: number;
  depth: number;
}

type RedditListing<T> = { data: { children: { data: T }[] } };

export async function searchSubreddits(query: string, limit = 10): Promise<RedditSubreddit[]> {
  if (!CLIENT_ID || !CLIENT_SECRET) { console.warn('[reddit] credentials not set'); return []; }
  try {
    const data = await redditFetch<RedditListing<{
      display_name: string; title: string; public_description: string; description: string;
      subscribers: number; url: string; over18: boolean;
    }>>('/subreddits/search', { q: query, limit: String(limit), sort: 'relevance' });

    return data.data.children.map((c) => ({
      name: c.data.display_name,
      displayName: c.data.display_name,
      title: c.data.title,
      description: c.data.description?.slice(0, 500) ?? '',
      subscribers: c.data.subscribers,
      url: `https://reddit.com${c.data.url}`,
      over18: c.data.over18,
      publicDescription: c.data.public_description?.slice(0, 300) ?? '',
    }));
  } catch (err) {
    console.error('[reddit] searchSubreddits error:', err);
    return [];
  }
}

export async function searchPosts(
  query: string,
  opts: { subreddit?: string; sort?: 'relevance' | 'top' | 'controversial' | 'new'; limit?: number; time?: 'all' | 'year' | 'month' } = {}
): Promise<RedditPost[]> {
  if (!CLIENT_ID || !CLIENT_SECRET) { console.warn('[reddit] credentials not set'); return []; }
  try {
    const path = opts.subreddit ? `/r/${opts.subreddit}/search` : '/search';
    const data = await redditFetch<RedditListing<{
      id: string; title: string; subreddit: string; url: string; permalink: string;
      score: number; upvote_ratio: number; num_comments: number; selftext: string;
      author: string; created_utc: number; is_self: boolean; link_flair_text: string | null;
    }>>(path, {
      q: query,
      sort: opts.sort ?? 'top',
      limit: String(opts.limit ?? 25),
      t: opts.time ?? 'all',
      ...(opts.subreddit ? { restrict_sr: 'true' } : {}),
    });

    return data.data.children.map((c) => ({
      id: c.data.id,
      title: c.data.title,
      subreddit: c.data.subreddit,
      url: `https://reddit.com${c.data.permalink}`,
      permalink: c.data.permalink,
      score: c.data.score,
      upvoteRatio: c.data.upvote_ratio,
      numComments: c.data.num_comments,
      selftext: c.data.selftext?.slice(0, 800) ?? '',
      author: c.data.author,
      createdUtc: c.data.created_utc,
      isExternal: !c.data.is_self,
      externalUrl: !c.data.is_self ? c.data.url : null,
      flair: c.data.link_flair_text,
    }));
  } catch (err) {
    console.error('[reddit] searchPosts error:', err);
    return [];
  }
}

export async function getControversialPosts(query: string, limit = 15): Promise<RedditPost[]> {
  return searchPosts(query, { sort: 'controversial', limit, time: 'all' });
}

/** Extract all external URLs being shared in a set of posts */
export function extractCitedLinks(posts: RedditPost[]): { url: string; title: string; count: number }[] {
  const urlMap = new Map<string, { title: string; count: number }>();
  for (const post of posts) {
    if (post.externalUrl) {
      const existing = urlMap.get(post.externalUrl);
      if (existing) existing.count++;
      else urlMap.set(post.externalUrl, { title: post.title, count: 1 });
    }
  }
  return [...urlMap.entries()]
    .map(([url, { title, count }]) => ({ url, title, count }))
    .sort((a, b) => b.count - a.count);
}
