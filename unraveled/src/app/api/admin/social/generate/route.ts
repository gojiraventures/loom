/**
 * POST /api/admin/social/generate
 * Body: { topic: string }
 *
 * Reads the topic's synthesized_output, runs Claude with both voice profiles,
 * and inserts a full week of content pieces for X, Instagram, and Facebook.
 * Existing draft/rejected pieces for the topic are replaced; approved/published
 * pieces are left untouched.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM = `You are the content strategist for UnraveledTruth, a research publication that examines cross-cultural convergence patterns in mythology, archaeology, and ancient history with genuine scholarly rigor.

Brand voice rules that apply to ALL content:
- Never: "mind-blowing", "shocking", "what they don't want you to know", "ancient wisdom", "let's dive in", "buckle up", "thread time", "you won't believe"
- Never treat the advocate position as the right answer — the brand's power is holding the tension
- Always: specific names, dates, places, texts over vague generalities
- Always: maintain advocate/skeptic balance; uncertainty where the research shows uncertainty
- Treat every cultural tradition with genuine respect and analytical distance
- PUNCTUATION: NO en dashes (–) or em dashes (—) anywhere. Use hyphens (-) sparingly or rewrite the sentence.

MAGAZINE WRITER voice (Instagram captions, Facebook posts):
- Senior editor register: Aeon, Nautilus, The Atlantic longform
- Intelligent reader assumed, complexity welcomed
- Varied sentence rhythm: short declarative sentences punctuate longer analytical ones
- Direct about what's known and what isn't

SOCIAL WRITER voice (X/Twitter threads, short hooks):
- Same intellectual substance, higher compression
- Leads with the most counterintuitive element
- Comfortable with sentence fragments for emphasis
- Each thread post independently interesting if seen alone
- 1–2 relevant hashtags max, often zero; emoji only when strategic

Return ONLY valid JSON — no markdown fences, no commentary.`;

function buildPrompt(output: SynthesizedOutput, url: string): string {
  const surprises = (output.jaw_drop_layers ?? []).slice(0, 5);
  const voices = Object.entries(output.how_cultures_describe ?? {}).slice(0, 6);
  const openQs = (output.open_questions ?? []).slice(0, 5);
  const advocate = (output.advocate_case ?? '').slice(0, 600);
  const skeptic = (output.skeptic_case ?? '').slice(0, 600);
  const summary = (output.executive_summary ?? '').slice(0, 800);
  const traditions = (output.traditions_analyzed ?? []).join(', ');

  // X has a hard 280-char limit. The URL + separator (\n\n) eats into that budget.
  // body budget = 280 - url.length - 2 (for \n\n before URL)
  const urlLen = url.length;
  const xBodyBudget = 280 - urlLen - 2;

  return `Generate a full week of social media content for this UnraveledTruth research article.

ARTICLE:
Title: ${output.title}
Subtitle: ${output.subtitle ?? ''}
Traditions: ${traditions}
URL: ${url} (${urlLen} characters)

EXECUTIVE SUMMARY:
${summary}

TOP FINDINGS (jaw-drop layers, level = importance, 1 = highest):
${surprises.map((s, i) => `[${i + 1}] ${s.title}: ${s.content?.slice(0, 300) ?? ''}\nPullquote: "${s.evidence_hook}"`).join('\n\n')}

ADVOCATE CASE (strongest argument FOR convergence):
${advocate}

SKEPTIC CASE (strongest argument AGAINST):
${skeptic}

TRADITION VOICES (how each culture tells it):
${voices.map(([t, d]) => `${t}: ${d?.slice(0, 200) ?? ''}`).join('\n')}

OPEN QUESTIONS:
${openQs.map((q, i) => `${i + 1}. ${q}`).join('\n')}

---

⚠️  X CHARACTER LIMIT — READ CAREFULLY:
X has a HARD 280-character limit. The article URL (${urlLen} chars) is appended with \n\n before it.
That leaves exactly ${xBodyBudget} characters for the body text of each standalone X post.
Count your characters. Do NOT exceed ${xBodyBudget} chars for body text. The full text_content
(body + \n\n + URL) must be ≤ 280 chars. Violations will cause the post to be rejected.
Thread posts (posts array): each individual post ≤ 280 chars. Only the final post includes the URL.

Return a JSON object with this exact structure:

{
  "x": {
    "launch_thread": {
      "voice_profile": "social_writer",
      "day_offset": 0,
      "sort_order": 0,
      "text_content": "First post of thread (max 270 chars, NO URL here — URL only in final thread post)",
      "supplementary": {
        "posts": ["post 1 (max 270 chars)", "post 2", "...", "final post body (max ${xBodyBudget} chars) then \\n\\n${url}"]
      }
    },
    "surprise_posts": [
      {
        "voice_profile": "social_writer",
        "day_offset": 1,
        "sort_order": 1,
        "text_content": "Body text only — max ${xBodyBudget} chars — then \\n\\n${url}"
      }
    ],
    "tradition_voice_posts": [
      {
        "voice_profile": "social_writer",
        "day_offset": 2,
        "sort_order": 2,
        "text_content": "Body text only — max ${xBodyBudget} chars — then \\n\\n${url}"
      }
    ],
    "debate_posts": [
      {
        "voice_profile": "social_writer",
        "day_offset": 3,
        "sort_order": 3,
        "text_content": "Body text only — max ${xBodyBudget} chars — then \\n\\n${url}"
      }
    ],
    "open_question_posts": [
      {
        "voice_profile": "social_writer",
        "day_offset": 4,
        "sort_order": 4,
        "text_content": "Body text only — max ${xBodyBudget} chars — then \\n\\n${url}"
      }
    ],
    "score_reveal": {
      "voice_profile": "social_writer",
      "day_offset": 5,
      "sort_order": 5,
      "text_content": "Discuss why the convergence is or isn't higher — no raw score number — max ${xBodyBudget} chars — then \\n\\n${url}"
    }
  },
  "instagram": {
    "primary_findings_carousel": {
      "voice_profile": "magazine_writer",
      "day_offset": 0,
      "sort_order": 0,
      "text_content": "Caption for the carousel (150-300 words). First line must hook — truncated at ~125 chars. End with 3-5 relevant hashtags on their own line.",
      "supplementary": {
        "slides": [
          { "header": "SLIDE TITLE (max 8 words)", "body": "Slide body (max 30 words)" }
        ]
      }
    },
    "tradition_voices_carousel": {
      "voice_profile": "magazine_writer",
      "day_offset": 2,
      "sort_order": 1,
      "text_content": "Caption (150-250 words + hashtags)",
      "supplementary": {
        "slides": [
          { "header": "TRADITION NAME", "body": "Key quote or perspective from that tradition (max 30 words)" }
        ]
      }
    },
    "advocate_skeptic_carousel": {
      "voice_profile": "magazine_writer",
      "day_offset": 3,
      "sort_order": 2,
      "text_content": "Caption framing the debate without declaring a winner (150-250 words + hashtags)",
      "supplementary": {
        "slides": [
          { "header": "SLIDE TITLE", "body": "Slide body (max 30 words)" }
        ]
      }
    },
    "quote_cards": [
      {
        "voice_profile": "magazine_writer",
        "day_offset": 1,
        "sort_order": 3,
        "text_content": "The pullquote itself (max 30 words — this is what appears on the image)",
        "supplementary": { "caption": "Short caption for this quote card post (50-100 words + hashtags)" }
      }
    ]
  },
  "facebook": {
    "summary_post": {
      "voice_profile": "magazine_writer",
      "day_offset": 0,
      "sort_order": 0,
      "text_content": "300-500 word summary post adapted from research summary. Include article URL. No hashtags. Invite discussion at end."
    },
    "discussion_prompts": [
      {
        "voice_profile": "magazine_writer",
        "day_offset": 1,
        "sort_order": 1,
        "text_content": "100-200 word discussion prompt from open questions or tension. Framed as genuine question. No hashtags."
      }
    ],
    "tradition_spotlights": [
      {
        "voice_profile": "magazine_writer",
        "day_offset": 2,
        "sort_order": 2,
        "text_content": "200-300 word deep dive into one tradition's perspective. No hashtags."
      }
    ],
    "link_shares": [
      {
        "voice_profile": "magazine_writer",
        "day_offset": 4,
        "sort_order": 3,
        "text_content": "50-100 word post sharing article from a different angle than the summary. Include URL. No hashtags."
      }
    ]
  }
}

Generate ALL items. For arrays (surprise_posts, quote_cards, etc.) generate the full recommended count per the specs:
- x.surprise_posts: 4 items, day_offsets 1,2,4,5
- x.tradition_voice_posts: 2 items, day_offsets 2,5
- x.debate_posts: 1 item, day_offset 3
- x.open_question_posts: 2 items, day_offsets 4,6
- instagram.quote_cards: 2 items, day_offsets 1,4
- facebook.discussion_prompts: 2 items, day_offsets 1,3
- facebook.tradition_spotlights: 1 item, day_offset 2
- facebook.link_shares: 2 items, day_offsets 4,6

The instagram.advocate_skeptic_carousel slides must NOT declare a winner. Present both positions with equal weight.
The launch thread must be 10 posts. Final post must contain the URL: ${url}
ALL standalone X posts (surprise_posts, tradition_voice_posts, debate_posts, open_question_posts, score_reveal) must end with \n\n${url}
HARD RULE: Every X text_content (body + \n\n + URL) must be ≤ 280 characters. The URL alone is ${urlLen} chars.
HARD RULE: No raw convergence score numbers (e.g. "42/100") in X post text.
Return ONLY the JSON object.`;
}

// ── Piece normalizer: flatten generated JSON → DB rows ─────────────────────

interface RawPiece {
  voice_profile: string;
  day_offset: number;
  sort_order: number;
  text_content: string;
  supplementary?: Record<string, unknown>;
}

interface DbPiece {
  topic: string;
  platform: string;
  content_type: string;
  voice_profile: string;
  text_content: string;
  supplementary: Record<string, unknown> | null;
  day_offset: number;
  sort_order: number;
  status: string;
}

// ── X char limit enforcer ─────────────────────────────────────────────────────
// Claude sometimes still exceeds 280. Hard-trim to fit, preserving the URL.

function enforceXLimit(text: string, limit = 280): string {
  if (text.length <= limit) return text;
  // Find URL portion if present (last line starting with https://)
  const urlMatch = text.match(/\n\nhttps?:\/\/\S+$/);
  if (urlMatch) {
    const urlPart = urlMatch[0]; // \n\nhttps://...
    const body = text.slice(0, text.length - urlPart.length);
    const maxBody = limit - urlPart.length;
    // Trim body to last word boundary
    const trimmed = body.slice(0, maxBody).replace(/\s+\S*$/, '');
    return trimmed + urlPart;
  }
  // No URL — just cut at last word boundary
  return text.slice(0, limit).replace(/\s+\S*$/, '');
}

function normalizePieces(topic: string, generated: Record<string, unknown>): DbPiece[] {
  const pieces: DbPiece[] = [];

  function add(platform: string, content_type: string, raw: RawPiece) {
    let text = raw.text_content;
    // Hard-enforce X 280-char limit on all X posts and individual thread posts
    if (platform === 'x') {
      text = enforceXLimit(text);
    }
    // Also trim individual thread posts stored in supplementary.posts
    let supplementary = raw.supplementary ?? null;
    if (platform === 'x' && supplementary?.posts && Array.isArray(supplementary.posts)) {
      supplementary = {
        ...supplementary,
        posts: (supplementary.posts as string[]).map(p => enforceXLimit(p)),
      };
    }
    pieces.push({
      topic,
      platform,
      content_type,
      voice_profile: raw.voice_profile,
      text_content: text,
      supplementary,
      day_offset: raw.day_offset ?? 0,
      sort_order: raw.sort_order ?? 0,
      status: 'draft',
    });
  }

  // ── X ──
  const x = generated.x as Record<string, unknown> | undefined;
  if (x) {
    if (x.launch_thread) add('x', 'launch_thread', x.launch_thread as RawPiece);
    if (x.score_reveal) add('x', 'score_reveal', x.score_reveal as RawPiece);
    for (const p of (x.surprise_posts as RawPiece[] | undefined) ?? []) add('x', 'standalone_surprise', p);
    for (const p of (x.tradition_voice_posts as RawPiece[] | undefined) ?? []) add('x', 'tradition_voice', p);
    for (const p of (x.debate_posts as RawPiece[] | undefined) ?? []) add('x', 'debate_post', p);
    for (const p of (x.open_question_posts as RawPiece[] | undefined) ?? []) add('x', 'open_question', p);
  }

  // ── Instagram ──
  const ig = generated.instagram as Record<string, unknown> | undefined;
  if (ig) {
    if (ig.primary_findings_carousel) add('instagram', 'primary_findings_carousel', ig.primary_findings_carousel as RawPiece);
    if (ig.tradition_voices_carousel) add('instagram', 'tradition_voices_carousel', ig.tradition_voices_carousel as RawPiece);
    if (ig.advocate_skeptic_carousel) add('instagram', 'advocate_skeptic_carousel', ig.advocate_skeptic_carousel as RawPiece);
    for (const p of (ig.quote_cards as RawPiece[] | undefined) ?? []) add('instagram', 'quote_card', p);
  }

  // ── Facebook ──
  const fb = generated.facebook as Record<string, unknown> | undefined;
  if (fb) {
    if (fb.summary_post) add('facebook', 'summary_post', fb.summary_post as RawPiece);
    for (const p of (fb.discussion_prompts as RawPiece[] | undefined) ?? []) add('facebook', 'discussion_prompt', p);
    for (const p of (fb.tradition_spotlights as RawPiece[] | undefined) ?? []) add('facebook', 'tradition_spotlight', p);
    for (const p of (fb.link_shares as RawPiece[] | undefined) ?? []) add('facebook', 'link_share', p);
  }

  return pieces;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { topic } = await req.json() as { topic: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Load synthesized_output
  const { data: dossier, error: loadErr } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output, slug')
    .eq('topic', topic)
    .single();

  if (loadErr || !dossier?.synthesized_output) {
    return NextResponse.json({ error: 'No synthesized article found for this topic' }, { status: 404 });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;
  const slug = dossier.slug ?? topic.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.unraveledtruth.com/topics/${slug}`;

  // Delete existing draft/rejected pieces (leave approved/scheduled/published)
  await supabase
    .from('social_content_pieces')
    .delete()
    .eq('topic', topic)
    .in('status', ['draft', 'rejected']);

  // Generate all content with Claude
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    system: SYSTEM,
    messages: [{ role: 'user', content: buildPrompt(output, url) }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  let generated: Record<string, unknown>;
  try {
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    generated = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Claude returned invalid JSON', raw: raw.slice(0, 500) }, { status: 500 });
  }

  const pieces = normalizePieces(topic, generated);

  const { data: inserted, error: insertErr } = await supabase
    .from('social_content_pieces')
    .insert(pieces)
    .select('id, platform, content_type, status');

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    topic,
    pieces_generated: inserted?.length ?? 0,
    by_platform: {
      x: inserted?.filter(p => p.platform === 'x').length ?? 0,
      instagram: inserted?.filter(p => p.platform === 'instagram').length ?? 0,
      facebook: inserted?.filter(p => p.platform === 'facebook').length ?? 0,
    },
  });
}
