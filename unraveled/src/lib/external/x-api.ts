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
