/**
 * POST /api/admin/social/sentiment
 * Claude analyzes comment tone and extracts themes for a published post.
 *
 * Body: {
 *   published_post_id: string
 *   comments: string[]           — raw comment text array (from n8n scrape)
 * }
 *
 * Returns sentiment analysis and stores it in social_comment_sentiment.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 60;

const client = new Anthropic();

const SENTIMENT_SYSTEM = `You are a social media analytics agent for UnraveledTruth, a research publication on cross-cultural mythology and ancient history.

Analyze a batch of comments from a social media post and return a structured assessment.

OUTPUT FORMAT — return ONLY valid JSON:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "score": <number from -1.0 (very negative) to 1.0 (very positive)>,
  "themes": ["<theme>", ...],
  "tone_notes": "<1-2 sentence summary of comment tone, notable patterns, or standout reactions>",
  "sample_comments": [
    { "text": "<verbatim comment>", "sentiment": "positive"|"negative"|"neutral", "notable": true|false }
  ]
}

Rules:
- themes: extract 3-6 short topic/sentiment labels (e.g. "skeptical of claims", "cultural respect", "wants more sources", "loved the debate framing")
- sample_comments: include 3-5 most representative or insightful comments
- notable: true if the comment reveals an unexpected reaction, controversy, or particularly strong engagement signal
- Be specific — vague assessments are useless`;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    published_post_id?: string;
    comments?: string[];
  };

  if (!body.published_post_id || !body.comments?.length) {
    return NextResponse.json({ error: 'published_post_id and comments required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Verify the published post exists and get context
  const { data: post } = await supabase
    .from('social_published_posts')
    .select('topic, platform, content_piece_id')
    .eq('id', body.published_post_id)
    .single();

  if (!post) {
    return NextResponse.json({ error: 'Published post not found' }, { status: 404 });
  }

  // Get content context
  const { data: piece } = await supabase
    .from('social_content_pieces')
    .select('content_type, text_content')
    .eq('id', post.content_piece_id)
    .single();

  const commentBlock = body.comments
    .slice(0, 100) // cap at 100 comments
    .map((c, i) => `[${i + 1}] ${c}`)
    .join('\n');

  const prompt = `Analyze comments on this ${post.platform.toUpperCase()} post about "${post.topic}".

POST TYPE: ${piece?.content_type ?? 'unknown'}
POST TEXT (excerpt): ${(piece?.text_content ?? '').slice(0, 300)}

COMMENTS (${body.comments.length} total):
${commentBlock}

Return the JSON sentiment analysis.`;

  let analysis;
  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SENTIMENT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    analysis = JSON.parse(cleaned);
  } catch (err) {
    return NextResponse.json({ error: `Analysis failed: ${String(err)}` }, { status: 500 });
  }

  // Upsert sentiment result
  const { error: storeErr } = await supabase
    .from('social_comment_sentiment')
    .upsert({
      published_post_id: body.published_post_id,
      analyzed_at: new Date().toISOString(),
      sentiment: analysis.sentiment,
      score: analysis.score,
      themes: analysis.themes ?? [],
      tone_notes: analysis.tone_notes ?? '',
      sample_comments: analysis.sample_comments ?? [],
    }, { onConflict: 'published_post_id' });

  if (storeErr) {
    return NextResponse.json({ error: storeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, analysis });
}
