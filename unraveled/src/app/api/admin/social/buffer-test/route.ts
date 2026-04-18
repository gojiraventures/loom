/**
 * GET /api/admin/social/buffer-test
 * Diagnostic endpoint — tests Buffer token and channel IDs without creating any posts.
 */

import { NextResponse } from 'next/server';

const BUFFER_GRAPHQL = 'https://api.buffer.com/graphql';

export async function GET() {
  const token = process.env.BUFFER_ACCESS_TOKEN;

  const envCheck = {
    BUFFER_ACCESS_TOKEN: token ? `set (${token.slice(0, 8)}...)` : 'MISSING',
    BUFFER_INSTAGRAM_CHANNEL_ID: process.env.BUFFER_INSTAGRAM_CHANNEL_ID ?? 'MISSING',
    BUFFER_FACEBOOK_CHANNEL_ID: process.env.BUFFER_FACEBOOK_CHANNEL_ID ?? 'MISSING',
    BUFFER_TWITTER_CHANNEL_ID: process.env.BUFFER_TWITTER_CHANNEL_ID ?? 'MISSING',
  };

  if (!token) {
    return NextResponse.json({ ok: false, env: envCheck, error: 'BUFFER_ACCESS_TOKEN not set' });
  }

  async function gql(query: string, variables: Record<string, unknown> = {}) {
    const res = await fetch(BUFFER_GRAPHQL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    return { status: res.status, json };
  }

  // 1. Query channels — confirms token is valid
  const channelRes = await gql(`query { channels { id name service isConnected } }`);
  const channelErrors = channelRes.json.errors?.map((e: { message: string }) => e.message).join(', ');
  const channels = channelRes.json.data?.channels ?? null;

  // 2. Try creating a single draft post to the Instagram channel — confirms write permission
  const igChannelId = process.env.BUFFER_INSTAGRAM_CHANNEL_ID;
  let draftTest: unknown = null;
  let draftError: string | null = null;

  if (igChannelId && !channelErrors) {
    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          ... on PostActionSuccess { post { id status } }
          ... on MutationError { message }
        }
      }
    `;
    const draftRes = await gql(mutation, {
      input: {
        channelId: igChannelId,
        text: 'Buffer API test post — safe to delete',
        mode: 'draft',
      },
    });
    if (draftRes.json.errors?.length) {
      draftError = draftRes.json.errors.map((e: { message: string }) => e.message).join(', ');
    } else {
      draftTest = draftRes.json.data?.createPost;
      if (draftTest && (draftTest as { message?: string }).message) {
        draftError = (draftTest as { message: string }).message;
      }
    }
  }

  return NextResponse.json({
    ok: !channelErrors && !draftError,
    env: envCheck,
    channel_query_error: channelErrors ?? null,
    channels,
    draft_post_test: draftTest,
    draft_post_error: draftError,
  });
}
