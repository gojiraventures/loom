/**
 * X (Twitter) API v2 client — OAuth 1.0a, no external dependencies.
 *
 * Covers:
 *   - Single tweets
 *   - Threads (reply chains)
 *   - Media upload via v1.1 simple upload (< 5 MB images)
 *
 * Required env vars:
 *   X_API_KEY            — Consumer Key (API Key)
 *   X_API_SECRET         — Consumer Secret (API Key Secret)
 *   X_ACCESS_TOKEN       — Access Token
 *   X_ACCESS_TOKEN_SECRET — Access Token Secret
 */

import { createHmac, randomBytes } from 'crypto';

// ── RFC 3986 percent-encoding ─────────────────────────────────────────────────
// encodeURIComponent leaves !'()* unencoded; OAuth 1.0a requires them encoded.

function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

// ── OAuth 1.0a header builder ─────────────────────────────────────────────────

interface OAuthCreds {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

/**
 * Builds the OAuth 1.0a `Authorization` header for a request.
 *
 * @param method     HTTP method (GET/POST/etc.)
 * @param url        Base URL — no query string
 * @param creds      OAuth credentials
 * @param extraParams Additional key/value pairs to include in the signature base
 *                    (use for URL query params; do NOT include JSON body params)
 */
function buildOAuthHeader(
  method: string,
  url: string,
  creds: OAuthCreds,
  extraParams: Record<string, string> = {},
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key:     creds.consumerKey,
    oauth_nonce:            randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        Math.floor(Date.now() / 1000).toString(),
    oauth_token:            creds.accessToken,
    oauth_version:          '1.0',
  };

  // All params (oauth + extras) are included in the signature base string
  const allParams = { ...oauthParams, ...extraParams };

  const paramString = Object.entries(allParams)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => `${pct(k)}=${pct(v)}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    pct(url),
    pct(paramString),
  ].join('&');

  const signingKey = `${pct(creds.consumerSecret)}&${pct(creds.accessTokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams['oauth_signature'] = signature;

  return 'OAuth ' + Object.entries(oauthParams)
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([k, v]) => `${pct(k)}="${pct(v)}"`)
    .join(', ');
}

// ── Credentials loader ────────────────────────────────────────────────────────

function loadCreds(): OAuthCreds {
  const consumerKey        = process.env.X_API_KEY;
  const consumerSecret     = process.env.X_API_SECRET;
  const accessToken        = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret  = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      'X API credentials missing. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET in .env.local'
    );
  }

  return { consumerKey, consumerSecret, accessToken, accessTokenSecret };
}

export function xApiAvailable(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_TOKEN_SECRET
  );
}

// ── Media upload (v1.1 simple upload) ────────────────────────────────────────
// Handles PNG/JPEG images up to 5 MB. Returns the media_id_string.

export async function uploadMedia(
  imageBuffer: Buffer,
  mimeType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' = 'image/png',
): Promise<string> {
  const creds = loadCreds();
  const url = 'https://upload.twitter.com/1.1/media/upload.json';

  const authHeader = buildOAuthHeader('POST', url, creds);

  // Simple upload: POST multipart/form-data with 'media' field
  const form = new FormData();
  form.append('media', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), 'card.png');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X media upload failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { media_id_string: string };
  return data.media_id_string;
}

// ── GET helper ────────────────────────────────────────────────────────────────
// Signed GET request to X API v2. queryParams are included in OAuth signature.

async function xGet<T>(endpoint: string, queryParams: Record<string, string> = {}): Promise<T> {
  const creds = loadCreds();
  const baseUrl = `https://api.twitter.com/2/${endpoint}`;
  const authHeader = buildOAuthHeader('GET', baseUrl, creds, queryParams);
  const qs = new URLSearchParams(queryParams).toString();
  const url = qs ? `${baseUrl}?${qs}` : baseUrl;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: authHeader },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X GET ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Get authenticated user ────────────────────────────────────────────────────

export interface XUser {
  id: string;
  name: string;
  username: string;
}

export async function getMe(): Promise<XUser> {
  const data = await xGet<{ data: XUser }>('users/me', { 'user.fields': 'username,name' });
  return data.data;
}

// ── Get mentions ──────────────────────────────────────────────────────────────
// Returns up to 100 recent mentions of the authenticated user.

export interface XTweetWithAuthor {
  id: string;
  text: string;
  author_id: string;
  conversation_id: string;
  in_reply_to_user_id?: string;
  created_at: string;
  referenced_tweets?: { type: string; id: string }[];
  // Expanded from includes
  author_username?: string;
  author_name?: string;
}

export async function getMentions(userId: string, sinceId?: string): Promise<XTweetWithAuthor[]> {
  const params: Record<string, string> = {
    'tweet.fields': 'author_id,conversation_id,created_at,in_reply_to_user_id,referenced_tweets',
    'expansions': 'author_id',
    'user.fields': 'username,name',
    'max_results': '100',
  };
  if (sinceId) params.since_id = sinceId;

  const data = await xGet<{
    data?: { id: string; text: string; author_id: string; conversation_id: string; in_reply_to_user_id?: string; created_at: string; referenced_tweets?: { type: string; id: string }[] }[];
    includes?: { users?: { id: string; username: string; name: string }[] };
  }>(`users/${userId}/mentions`, params);

  if (!data.data) return [];
  const userMap: Record<string, { username: string; name: string }> = {};
  for (const u of data.includes?.users ?? []) userMap[u.id] = u;

  return data.data.map(t => ({
    ...t,
    author_username: userMap[t.author_id]?.username,
    author_name: userMap[t.author_id]?.name,
  }));
}

// ── Search for replies to a specific tweet ────────────────────────────────────

export async function getReplies(tweetId: string): Promise<XTweetWithAuthor[]> {
  const params: Record<string, string> = {
    'query': `conversation_id:${tweetId} is:reply`,
    'tweet.fields': 'author_id,conversation_id,created_at,in_reply_to_user_id',
    'expansions': 'author_id',
    'user.fields': 'username,name',
    'max_results': '100',
  };

  const data = await xGet<{
    data?: { id: string; text: string; author_id: string; conversation_id: string; in_reply_to_user_id?: string; created_at: string }[];
    includes?: { users?: { id: string; username: string; name: string }[] };
  }>('tweets/search/recent', params);

  if (!data.data) return [];
  const userMap: Record<string, { username: string; name: string }> = {};
  for (const u of data.includes?.users ?? []) userMap[u.id] = u;

  return data.data.map(t => ({
    ...t,
    author_username: userMap[t.author_id]?.username,
    author_name: userMap[t.author_id]?.name,
  }));
}

// ── Post a single tweet ───────────────────────────────────────────────────────

export interface TweetResult {
  id: string;
  text: string;
}

export interface PostTweetOptions {
  mediaIds?: string[];      // up to 4 media IDs per tweet (1 for images)
  replyToId?: string;       // parent tweet ID for thread replies
}

export async function postTweet(
  text: string,
  opts: PostTweetOptions = {},
): Promise<TweetResult> {
  const creds = loadCreds();
  const url = 'https://api.twitter.com/2/tweets';

  const authHeader = buildOAuthHeader('POST', url, creds);

  const body: Record<string, unknown> = { text };
  if (opts.mediaIds?.length) {
    body.media = { media_ids: opts.mediaIds };
  }
  if (opts.replyToId) {
    body.reply = { in_reply_to_tweet_id: opts.replyToId };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X post tweet failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { data: TweetResult };
  return data.data;
}

// ── Delete a tweet ───────────────────────────────────────────────────────────
// DELETE /2/tweets/:id — returns { data: { deleted: true } } on success.

export async function deleteTweet(tweetId: string): Promise<void> {
  const creds = loadCreds();
  const url = `https://api.twitter.com/2/tweets/${tweetId}`;
  const authHeader = buildOAuthHeader('DELETE', url, creds);

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: authHeader },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X delete tweet ${tweetId} failed (${res.status}): ${text}`);
  }
}

// ── Post a thread ─────────────────────────────────────────────────────────────
// Posts each tweet in sequence as a reply chain.
// The first tweet optionally attaches a media card.
// Returns all tweet IDs in order.

export async function postThread(
  posts: string[],
  mediaId?: string,
): Promise<TweetResult[]> {
  if (posts.length === 0) throw new Error('postThread: posts array is empty');

  const results: TweetResult[] = [];

  for (let i = 0; i < posts.length; i++) {
    const text = posts[i];
    const opts: PostTweetOptions = {};

    if (i === 0 && mediaId) {
      opts.mediaIds = [mediaId];
    }
    if (i > 0) {
      opts.replyToId = results[i - 1].id;
    }

    const result = await postTweet(text, opts);
    results.push(result);

    // Small delay between tweets to avoid rate-limit issues on long threads
    if (i < posts.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}
