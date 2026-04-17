/**
 * Meta Graph API client — Facebook Page posts + Instagram single-image posts.
 *
 * Required env vars:
 *   META_PAGE_ACCESS_TOKEN  — long-lived Page access token
 *   FACEBOOK_PAGE_ID        — numeric Facebook Page ID
 *   INSTAGRAM_ACCOUNT_ID    — numeric Instagram Business Account ID
 */

const GRAPH = 'https://graph.facebook.com/v19.0';

export function metaApiAvailable(): boolean {
  return !!(
    process.env.META_PAGE_ACCESS_TOKEN &&
    process.env.FACEBOOK_PAGE_ID &&
    process.env.INSTAGRAM_ACCOUNT_ID
  );
}

async function graphPost(path: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const token = process.env.META_PAGE_ACCESS_TOKEN!;
  const res = await fetch(`${GRAPH}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok || data.error) {
    const err = (data.error as Record<string, unknown> | undefined)?.message ?? JSON.stringify(data);
    throw new Error(`Meta API error (${res.status}): ${err}`);
  }
  return data;
}

/**
 * Post a photo to the Facebook Page feed.
 * Returns the post ID.
 */
export async function postFacebookPhoto(imageUrl: string, caption: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID!;
  const data = await graphPost(`${pageId}/photos`, { url: imageUrl, caption });
  return (data.post_id ?? data.id) as string;
}

/**
 * Post a link (no image) to the Facebook Page feed.
 * Used as fallback when no image is available.
 */
export async function postFacebookLink(message: string, link: string): Promise<string> {
  const pageId = process.env.FACEBOOK_PAGE_ID!;
  const data = await graphPost(`${pageId}/feed`, { message, link });
  return data.id as string;
}

/**
 * Publish a single-image post to Instagram.
 * Returns the Instagram media ID.
 */
export async function postInstagramPhoto(imageUrl: string, caption: string): Promise<string> {
  const igId = process.env.INSTAGRAM_ACCOUNT_ID!;

  // Step 1: create media container
  const container = await graphPost(`${igId}/media`, {
    image_url: imageUrl,
    caption,
  });
  const creationId = container.id as string;

  // Step 2: publish
  const published = await graphPost(`${igId}/media_publish`, {
    creation_id: creationId,
  });
  return published.id as string;
}
