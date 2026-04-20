/**
 * Buffer GraphQL API client.
 *
 * Handles Instagram, Facebook, and single X posts.
 * X threads (launch_thread) are handled by the direct X API.
 *
 * Required env vars:
 *   BUFFER_ACCESS_TOKEN          — OIDC token from buffer.com/publish/settings/api
 *   BUFFER_INSTAGRAM_CHANNEL_ID  — Buffer channel ID for Instagram
 *   BUFFER_FACEBOOK_CHANNEL_ID   — Buffer channel ID for Facebook page
 *   BUFFER_TWITTER_CHANNEL_ID    — Buffer channel ID for X / Twitter
 */

const BUFFER_GRAPHQL = 'https://api.buffer.com/graphql';

// 'x' is the DB platform name; Buffer uses 'twitter'. Both are accepted.
export type BufferPlatform = 'instagram' | 'facebook' | 'twitter' | 'x';

function normalizePlatform(platform: BufferPlatform): 'instagram' | 'facebook' | 'twitter' {
  return platform === 'x' ? 'twitter' : platform;
}

export function bufferAvailable(platform?: BufferPlatform): boolean {
  if (!process.env.BUFFER_ACCESS_TOKEN) return false;
  if (!platform) return true;
  const channelVar: Record<string, string> = {
    instagram: 'BUFFER_INSTAGRAM_CHANNEL_ID',
    facebook:  'BUFFER_FACEBOOK_CHANNEL_ID',
    twitter:   'BUFFER_TWITTER_CHANNEL_ID',
  };
  return !!process.env[channelVar[normalizePlatform(platform)]];
}

function channelId(platform: BufferPlatform): string {
  const norm = normalizePlatform(platform);
  const ids: Record<string, string | undefined> = {
    instagram: process.env.BUFFER_INSTAGRAM_CHANNEL_ID,
    facebook:  process.env.BUFFER_FACEBOOK_CHANNEL_ID,
    twitter:   process.env.BUFFER_TWITTER_CHANNEL_ID,
  };
  const id = ids[norm];
  if (!id) throw new Error(`BUFFER_${norm.toUpperCase()}_CHANNEL_ID not set`);
  return id;
}

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  if (!token) throw new Error('BUFFER_ACCESS_TOKEN not set');

  const res = await fetch(BUFFER_GRAPHQL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json() as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${json.errors.map(e => e.message).join(', ')}`);
  }
  if (!res.ok) throw new Error(`Buffer API HTTP ${res.status}`);

  return json.data as T;
}

// ── Create post ───────────────────────────────────────────────────────────────

const CREATE_POST_MUTATION = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post { id status dueAt }
      }
      ... on MutationError {
        message
      }
    }
  }
`;

interface CreatePostResult {
  createPost: {
    post?: { id: string; status: string; dueAt: string };
    message?: string;
  };
}

/**
 * Send a post to Buffer.
 *
 * @param platform   - instagram | facebook | twitter
 * @param text       - caption / tweet text
 * @param imageUrl   - optional image (required for Instagram)
 * @param scheduledAt - ISO 8601 UTC string; omit to post immediately (shareNow)
 */
export async function postViaBuffer(
  platform: BufferPlatform,
  text: string,
  imageUrl?: string,
  scheduledAt?: string,
): Promise<string> {
  const chId = channelId(platform);

  const input: Record<string, unknown> = {
    channelId: chId,
    text,
    mode: scheduledAt ? 'customScheduled' : 'shareNow',
    schedulingType: 'automatic',
  };

  if (scheduledAt) input.dueAt = scheduledAt;

  if (imageUrl) {
    input.assets = { images: [{ url: imageUrl }] };
  }

  if (platform === 'instagram') {
    input.metadata = {
      instagram: { type: 'post', shouldShareToFeed: true },
    };
  }

  const data = await gql<CreatePostResult>(CREATE_POST_MUTATION, { input });

  if (data.createPost.message) {
    throw new Error(`Buffer rejected post: ${data.createPost.message}`);
  }
  if (!data.createPost.post) {
    throw new Error('Buffer createPost returned no post');
  }

  return data.createPost.post.id;
}

// ── Get post status ───────────────────────────────────────────────────────────

const GET_POST_QUERY = `
  query GetPost($id: String!) {
    post(id: $id) {
      id
      status
      sentAt
    }
  }
`;

interface GetPostResult {
  post: { id: string; status: string; sentAt?: string } | null;
}

export type BufferPostStatus = 'sent' | 'scheduled' | 'draft' | 'error' | 'unknown';

export async function getBufferPostStatus(postId: string): Promise<BufferPostStatus> {
  try {
    const data = await gql<GetPostResult>(GET_POST_QUERY, { id: postId });
    const status = data.post?.status?.toLowerCase() ?? 'unknown';
    if (status === 'sent' || status === 'service_update_sent') return 'sent';
    if (status === 'scheduled' || status === 'buffer') return 'scheduled';
    if (status === 'error' || status === 'failed') return 'error';
    return status as BufferPostStatus;
  } catch {
    return 'unknown';
  }
}
