/**
 * GET  /api/admin/social/replies         — list queued replies from DB
 * POST /api/admin/social/replies         — fetch fresh replies from X + classify
 * PATCH /api/admin/social/replies        — update reply status (skip/dismiss)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { xApiAvailable, getMe, getMentions, getReplies } from '@/lib/external/x-api';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const client = new Anthropic();

// ── Voice for response drafts ─────────────────────────────────────────────────

const REPLY_SYSTEM = `You are drafting replies on behalf of UnraveledTruth on X (Twitter).

VOICE: Smart, casual, intellectually confident. Like a researcher who knows the material cold and talks to people normally. Think of the register of a great science writer at a bar — not academic, not dumbed down.

RULES — no exceptions:
- No em dashes (—) or en dashes (–). Rewrite to avoid them.
- No emojis whatsoever.
- No "great question", "fascinating", "thanks for engaging" — no sycophancy.
- No hedging chains ("it could be argued that perhaps...").
- Short. 1-2 sentences maximum for replies. Under 220 characters ideal.
- Intellectually direct. State the point, don't dance around it.
- If the reply is wrong about a fact, correct it crisply without being condescending.
- If the reply raises a genuine question, answer it specifically — not vaguely.
- Never start with "I" as the first word.

SPECIAL CASE — AI criticism:
If someone calls the content AI-generated, AI slop, or questions its authenticity in a non-hostile way:
Draft a reply that: acknowledges the reality honestly (small team, AI assists the research pipeline), pivots to what actually matters (the underlying research and sources are real), and invites specific feedback on what would make it better. Tone: open, not defensive, genuinely curious about their critique.
Example: "Small team, so yes we use AI to help scale the research pipeline. The sources and cross-cultural analysis are real. What specifically felt off? Genuine question — we improve through that kind of feedback."

If someone is purely hostile or vulgar with no substance (just "AI trash", slurs, pure insults with no critique):
- priority: "skip"
- draft_reply: null
Do not engage with hostility that has no productive content.

GOOD examples:
- "The diffusion theory works until you hit Polynesia. No trade route explains that reach."
- "Woolley walked that back himself. His silt layer predates Genesis by centuries and was local."
- "Procedural specificity is the tell. Archetypes don't share seven-day counting sequences."

BAD examples:
- "That's a fascinating point! The evidence is complex and multi-layered..." (sycophantic + vague)
- "Well, it could be argued that — while there are many perspectives..." (hedging)
- "Great question! Let's dive in..." (cliche)`;

// ── Classify a batch of replies ───────────────────────────────────────────────

async function classifyAndDraft(replies: {
  tweet_id: string;
  text: string;
  author_username: string;
  author_name: string;
  parent_text: string;
  topic: string;
}[]): Promise<{ tweet_id: string; priority: string; priority_reason: string; draft_reply: string | null }[]> {
  if (replies.length === 0) return [];

  const prompt = `Classify these replies to UnraveledTruth posts and draft a response for high-priority ones.

For each reply, decide:
- priority: "respond" (genuine question, substantive pushback, good debate point worth engaging publicly, influential thread)
             "consider" (positive but low-value, minor comment, no clear response needed)
             "skip" (spam, troll, off-topic, pure hostility with no substance)
- priority_reason: one sentence explaining why
- draft_reply: for "respond" only — a short, sharp reply under 220 chars. null for others.

REPLIES:
${replies.map((r, i) => `[${i}]
Original post: "${r.parent_text.slice(0, 150)}"
Topic: ${r.topic}
Reply from @${r.author_username}: "${r.text}"`).join('\n\n')}

Return ONLY a JSON array with this structure for each reply (same order as input):
[{"tweet_id":"...","priority":"respond|consider|skip","priority_reason":"...","draft_reply":"...or null"}]`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: REPLY_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(cleaned) as { tweet_id: string; priority: string; priority_reason: string; draft_reply: string | null }[];
  } catch {
    // Return all as pending on parse failure
    return replies.map(r => ({ tweet_id: r.tweet_id, priority: 'pending', priority_reason: 'Classification failed', draft_reply: null }));
  }
}

// ── GET — list replies ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';
  const priority = searchParams.get('priority');
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('social_reply_queue')
    .select('*')
    .order('created_at_x', { ascending: false })
    .limit(limit);

  if (status !== 'all') query = query.eq('reply_status', status);
  if (priority) query = query.eq('priority', priority);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ replies: data ?? [] });
}

// ── POST — fetch from X + classify ───────────────────────────────────────────

export async function POST(_req: NextRequest) {
  if (!xApiAvailable()) {
    return NextResponse.json({ error: 'X API not configured' }, { status: 503 });
  }

  const supabase = createServerSupabaseClient();

  // Get our Twitter user ID
  let myUserId: string;
  try {
    const me = await getMe();
    myUserId = me.id;
  } catch (err) {
    return NextResponse.json({ error: `Could not get X user: ${String(err)}` }, { status: 502 });
  }

  // Load all published tweet IDs + their topics + text
  const { data: published } = await supabase
    .from('social_content_pieces')
    .select('id, topic, text_content, supplementary')
    .eq('status', 'published')
    .eq('platform', 'x')
    .not('supplementary->published_tweet_ids', 'is', null);

  // Collect all tweet IDs and build a lookup: tweetId → { topic, text }
  const tweetMeta: Record<string, { topic: string; text: string }> = {};
  for (const piece of published ?? []) {
    const sup = piece.supplementary as { published_tweet_ids?: string[] } | null;
    for (const tid of sup?.published_tweet_ids ?? []) {
      tweetMeta[tid] = { topic: piece.topic, text: piece.text_content ?? '' };
    }
  }

  const publishedTweetIds = Object.keys(tweetMeta);
  if (publishedTweetIds.length === 0) {
    return NextResponse.json({ ok: true, fetched: 0, classified: 0, message: 'No published tweets found' });
  }

  // Fetch mentions (catches replies that @ us directly)
  let allReplies: typeof import('@/lib/external/x-api').getMentions extends (...args: unknown[]) => Promise<infer R> ? R : never = [];
  try {
    allReplies = await getMentions(myUserId);
  } catch {
    // Non-fatal — continue with conversation replies
  }

  // Fetch replies per published tweet (conversation search)
  for (const tweetId of publishedTweetIds.slice(0, 10)) { // limit to avoid rate limits
    try {
      const replies = await getReplies(tweetId);
      allReplies = [...allReplies, ...replies];
    } catch {
      // Non-fatal per tweet
    }
  }

  if (allReplies.length === 0) {
    return NextResponse.json({ ok: true, fetched: 0, classified: 0, message: 'No replies found yet' });
  }

  // Filter to only replies to our tweets, dedupe
  const seen = new Set<string>();
  const toProcess: typeof allReplies = [];
  for (const reply of allReplies) {
    if (seen.has(reply.id)) continue;
    seen.add(reply.id);

    // Skip our own tweets
    if (reply.author_id === myUserId) continue;

    // Must reference one of our published tweets
    const parentId = reply.referenced_tweets?.find(r => r.type === 'replied_to')?.id
      ?? reply.conversation_id;
    if (!publishedTweetIds.includes(parentId) && !publishedTweetIds.includes(reply.conversation_id)) continue;

    toProcess.push(reply);
  }

  // Check which tweet_ids we already have
  const { data: existing } = await supabase
    .from('social_reply_queue')
    .select('tweet_id')
    .in('tweet_id', toProcess.map(r => r.id));
  const existingIds = new Set((existing ?? []).map(e => e.tweet_id));

  const newReplies = toProcess.filter(r => !existingIds.has(r.id));
  if (newReplies.length === 0) {
    return NextResponse.json({ ok: true, fetched: toProcess.length, classified: 0, message: 'All replies already in queue' });
  }

  // Build classification input
  const classifyInput = newReplies.map(r => {
    const parentId = r.referenced_tweets?.find(ref => ref.type === 'replied_to')?.id ?? r.conversation_id;
    const meta = tweetMeta[parentId] ?? tweetMeta[r.conversation_id] ?? { topic: 'unknown', text: '' };
    return {
      tweet_id: r.id,
      text: r.text,
      author_username: r.author_username ?? r.author_id,
      author_name: r.author_name ?? '',
      parent_text: meta.text,
      topic: meta.topic,
    };
  });

  // Classify in batches of 10
  const classifyResults: Awaited<ReturnType<typeof classifyAndDraft>> = [];
  for (let i = 0; i < classifyInput.length; i += 10) {
    const batch = classifyInput.slice(i, i + 10);
    const results = await classifyAndDraft(batch);
    classifyResults.push(...results);
  }

  const classifyMap = new Map(classifyResults.map(r => [r.tweet_id, r]));

  // Insert into DB
  const rows = newReplies.map(r => {
    const parentId = r.referenced_tweets?.find(ref => ref.type === 'replied_to')?.id ?? r.conversation_id;
    const meta = tweetMeta[parentId] ?? tweetMeta[r.conversation_id] ?? { topic: 'unknown', text: '' };
    const cls = classifyMap.get(r.id);
    return {
      tweet_id: r.id,
      parent_tweet_id: parentId,
      topic: meta.topic,
      author_username: r.author_username ?? r.author_id,
      author_name: r.author_name ?? '',
      author_id: r.author_id,
      text: r.text,
      created_at_x: r.created_at,
      priority: cls?.priority ?? 'pending',
      priority_reason: cls?.priority_reason ?? null,
      draft_reply: cls?.draft_reply ?? null,
      reply_status: 'pending',
    };
  });

  const { error: insertErr } = await supabase
    .from('social_reply_queue')
    .upsert(rows, { onConflict: 'tweet_id', ignoreDuplicates: true });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fetched: toProcess.length,
    new: newReplies.length,
    classified: classifyResults.length,
    by_priority: {
      respond: classifyResults.filter(r => r.priority === 'respond').length,
      consider: classifyResults.filter(r => r.priority === 'consider').length,
      skip: classifyResults.filter(r => r.priority === 'skip').length,
    },
  });
}

// ── PATCH — update reply status or draft ──────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; reply_status?: string; draft_reply?: string };
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const updates: Record<string, unknown> = {};
  if (body.reply_status) updates.reply_status = body.reply_status;
  if (body.draft_reply !== undefined) updates.draft_reply = body.draft_reply;

  const { error } = await supabase
    .from('social_reply_queue')
    .update(updates)
    .eq('id', body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
