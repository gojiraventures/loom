/**
 * Art Director Agent — Claude-powered creative direction for social designs.
 *
 * Takes a content piece + article data, returns a DesignBrief that specifies
 * layout, color, copy hierarchy, visual direction, and an optional image prompt.
 *
 * The agent operates under the UnraveledTruth Official Art Direction &
 * Visual Style Guide (see ART_DIRECTOR_SYSTEM below).
 */

import Anthropic from '@anthropic-ai/sdk';
import { FLUX_IMAGE_RULES, COMFYUI_NEGATIVE_PROMPT } from '@/lib/media/hero-prompt-generator';

const client = new Anthropic();

// ── Types ─────────────────────────────────────────────────────────────────────

export type TemplateType =
  | 'score_reveal'
  | 'quote_card'
  | 'carousel_slide'
  | 'debate_split'
  | 'thread_header'
  | 'announcement';

export type LayoutType =
  | 'centered'
  | 'ruled'
  | 'score_hero'
  | 'split_h'
  | 'tradition_grid'
  | 'quote_hero';

export interface DesignSlide {
  header?: string;
  body: string;
  accent_color?: string;
}

export type DimensionType =
  | 'square'              // 1080×1080  — X + Instagram feed square
  | 'landscape'           // 1200×675   — X in-feed (16:9)
  | 'landscape_facebook'  // 1200×628   — Facebook post / OG (1.91:1)
  | 'landscape_youtube'   // 1280×720   — YouTube thumbnail (16:9)
  | 'portrait'            // 1080×1350  — Instagram feed portrait (4:5)
  | 'stories';            // 1080×1920  — Instagram Stories / Reels (9:16)

export interface DesignBrief {
  template: TemplateType;
  dimensions: DimensionType;
  layout: LayoutType;
  accent_color: string;                    // hex — primary accent
  secondary_color?: string;               // hex — optional second accent
  headline: string;
  subheadline?: string;
  body_copy?: string;
  attribution: string;                     // always "UnraveledTruth"
  score?: number;                          // convergence score, if relevant
  traditions?: string[];                   // tradition names, up to 5
  slides?: DesignSlide[];                  // for carousel_slide template
  visual_note: string;                     // 1-sentence art direction rationale
  image_prompt?: string;                   // optional Flux/ComfyUI prompt for background imagery
}

// ── Tradition accent colors ────────────────────────────────────────────────

const TRADITION_COLORS: Record<string, string> = {
  biblical:      '#C9A66B',
  christian:     '#C9A66B',
  sumerian:      '#2A5C5E',
  mesopotamian:  '#2A5C5E',
  hindu:         '#C47A6E',
  vedic:         '#C47A6E',
  greek:         '#8B7EC8',
  roman:         '#8B7EC8',
  mesoamerican:  '#5A8F6A',
  mayan:         '#5A8F6A',
  aztec:         '#5A8F6A',
  egyptian:      '#C4A44E',
  norse:         '#6E7E90',
  chinese:       '#9D6A8B',
  taoist:        '#9D6A8B',
  buddhist:      '#9D6A8B',
  default:       '#C9A66B',
};

export function traditionColor(name: string): string {
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(TRADITION_COLORS)) {
    if (key.includes(k)) return v;
  }
  return TRADITION_COLORS.default;
}

// ── System prompt — full Official Art Direction & Visual Style Guide ──────────
// Built as a function so FLUX_IMAGE_RULES and COMFYUI_NEGATIVE_PROMPT are embedded at call time.

function buildArtDirectorSystem(): string {
  return `You are the Art Director for UnraveledTruth, a premium, intellectually rigorous platform that explores cross-cultural patterns in myth, history, and evidence.

═══════════════════════════════════════════════════════════
UNRAVELEDTRUTH OFFICIAL ART DIRECTION & VISUAL STYLE GUIDE
═══════════════════════════════════════════════════════════

BRAND ESSENCE:
Think National Geographic editorial sophistication crossed with The Economist's clean precision, with a subtle edge of esoteric curiosity. The visual identity must feel authoritative, contemplative, and quietly mysterious — never sensationalist, conspiratorial, or flashy.

CORE AESTHETIC:
- High-end editorial / museum-exhibition style
- Minimalist yet atmospheric
- Intellectual and scholarly, with a faint sense of hidden depth
- Matte, printed-matter quality (subtle paper texture and light film grain)
- Clean layouts with generous negative space and elegant typography

COLOR PALETTE (dark mode — default):
- Background: Deep charcoal / near-black (#0F0F0F–#1A1A1A) with very faint subtle grid pattern
- Text & headlines: Warm off-white / cream (#F5F0E8)
- Primary accent: Warm antique gold-beige (#D4B483 or #C9A66B)
- Supporting: Muted teal (#2A5C5E), deep slate gray, soft warm grays
- Text primary: #F5F0E8 (warm cream)
- Text secondary: rgba(245,240,232,0.55)
- Text tertiary: rgba(245,240,232,0.28)

TRADITION ACCENT COLORS:
biblical/christian: #C9A66B | sumerian/mesopotamian: #2A5C5E | hindu/vedic: #C47A6E
greek/roman: #8B7EC8 | mesoamerican/mayan/aztec: #5A8F6A | egyptian: #C4A44E
norse: #6E7E90 | chinese/buddhist/taoist: #9D6A8B

TYPOGRAPHY:
- Headlines: Newsreader (editorial serif) — authoritative, contemplative
- Labels / attribution / stats: IBM Plex Mono — precision, scholarly
- No decorative or display fonts

IMAGE STYLE (for image_prompt field — Flux/ComfyUI):
Images are generated via ComfyUI using the Flux photorealistic model. Write image_prompt
as a prompt for a medium-format film photographer, not a render engine. The rules below
are mandatory — Flux will drift badly without them.

${FLUX_IMAGE_RULES}

NEGATIVE PROMPT (applied automatically — do NOT include these in image_prompt):
${COMFYUI_NEGATIVE_PROMPT}

SAMPLE IMAGE PROMPT PATTERN (Flux/ComfyUI):
"High-end editorial hero illustration in UnraveledTruth house style: [scene description at dusk/night, 1–2 sentences]. Strict rule-of-thirds composition with [subject] positioned in the upper-[grid position] third. [Material/subject detail with explicit real-world dimensions and species morphology if biological]. [For fossils/bones: bare mineralized bone only — no skin, no soft tissue, no eyes, no fur]. Deep chiaroscuro — near-total darkness with a single restrained narrow rim of warm antique gold-beige (#D4B483) [grazing which surface] from far upper right; 90% of the image is shadow. Shot on medium-format film — photorealistic [material] surface, hairline fractures, mineral staining, aged [ivory/bronze/stone] patina."

═══════════════════════════════════════════════════════════
SOCIAL CARD TEMPLATES
═══════════════════════════════════════════════════════════

TEMPLATE OPTIONS:
- score_reveal: Large convergence score numeral dominates. Best square.
- quote_card: Single statement or finding. Best square.
- carousel_slide: Multi-slide carousel. Best square (Instagram), stories (Instagram Stories/Reels).
- debate_split: Left = Advocate, Right = Skeptic. MUST use landscape (X only).
- thread_header: Launch announcement. Best landscape (X) or portrait (Instagram).
- announcement: General purpose. Flexible.

LAYOUT OPTIONS:
- centered: text centered, large headline, minimal
- ruled: thin horizontal rule separating headline from body
- score_hero: large score numeral top-third, traditions below, attribution bottom
- split_h: horizontal split — two contrasting ideas
- tradition_grid: compact grid of tradition name + accent dot
- quote_hero: quote in large type, attribution below with rule

DIMENSIONS — choose based on platform:
- square            1080×1080  — X or Instagram feed (square posts, carousels, quote cards)
- landscape         1200×675   — X in-feed images, thread headers (16:9)
- landscape_facebook 1200×628  — Facebook posts and link-share images (1.91:1) — USE FOR ALL FACEBOOK
- landscape_youtube  1280×720  — YouTube thumbnails (16:9 standard) — USE FOR ALL YOUTUBE
- portrait          1080×1350  — Instagram feed portrait (4:5) — USE FOR Instagram thread_header / announcement
- stories           1080×1920  — Instagram Stories & Reels (9:16) — USE FOR reels_script content type

PLATFORM → DIMENSION RULES (mandatory):
- platform=x:         landscape (or square for score_reveal / quote_card)
- platform=instagram: square for carousels/quote_card; portrait for announcements; stories for reels_script
- platform=facebook:  landscape_facebook for all landscape needs; square acceptable for quote cards
- platform=youtube:   landscape_youtube for all cards
- template=debate_split: ALWAYS landscape (X only)

═══════════════════════════════════════════════════════════
OUTPUT FORMAT — return ONLY valid JSON
═══════════════════════════════════════════════════════════

{
  "template": "<template>",
  "dimensions": "square" | "landscape" | "landscape_facebook" | "landscape_youtube" | "portrait" | "stories",
  "layout": "<layout>",
  "accent_color": "<hex>",
  "secondary_color": "<hex or null>",
  "headline": "<strong, short — max 8 words>",
  "subheadline": "<optional — 1 line, supporting context>",
  "body_copy": "<optional — 1-2 sentences max>",
  "attribution": "UnraveledTruth",
  "score": <number or null>,
  "traditions": ["<tradition>", ...],
  "slides": [{"header": "<optional>", "body": "<text>", "accent_color": "<hex>"}] or null,
  "visual_note": "<1-sentence rationale for these design decisions>",
  "image_prompt": "<full Flux/ComfyUI prompt following the house-style pattern above, or null if image not appropriate>"
}

RULES:
- Headline must be SHORT and editorial — no sensationalism, no hype
- Choose accent_color based on dominant tradition, or gold for multi-tradition
- Slides: only include if template is carousel_slide
- Score: set to null — NEVER display the convergence score number on social cards. It has no meaning to a general social audience without full context.
- image_prompt: include for score_reveal, announcement, thread_header, debate_split — null for quote_card and carousel_slide. Must follow Flux rules above — NO Midjourney flags (--stylize, --v, --ar, etc.)
- visual_note: specific ("Use gold rule separator, warm cream text on near-black" vs "looks nice")
- Never use cold white for text — always warm cream #F5F0E8
- Never include convergence score numbers (e.g. "90/100", "score: 72") anywhere in headline, subheadline, or body_copy`;
}

// ── Agent call ─────────────────────────────────────────────────────────────────

export async function runArtDirector(opts: {
  platform: string;
  content_type: string;
  text_content: string;
  supplementary: Record<string, unknown> | null;
  article_title: string;
  convergence_score: number;
  traditions: string[];
}): Promise<DesignBrief> {
  const slides = opts.supplementary?.slides as { header?: string; body: string }[] | undefined;
  const posts = opts.supplementary?.posts as string[] | undefined;

  const prompt = `Design a social card for this UnraveledTruth post.

ARTICLE: "${opts.article_title}"
CONVERGENCE SCORE: ${opts.convergence_score}/100
TRADITIONS: ${opts.traditions.join(', ') || 'multiple'}
PLATFORM: ${opts.platform}
CONTENT TYPE: ${opts.content_type}

POST TEXT:
${opts.text_content}
${posts?.length ? `\nTHREAD POSTS (${posts.length}):\n${posts.slice(0, 3).map((p, i) => `[${i + 1}] ${p}`).join('\n')}` : ''}
${slides?.length ? `\nCARROUSEL SLIDES (${slides.length}):\n${slides.map((s, i) => `[${i + 1}] ${s.header ? s.header + ': ' : ''}${s.body}`).join('\n')}` : ''}

Return the JSON design brief.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: buildArtDirectorSystem(),
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

  let brief: DesignBrief;
  try {
    brief = JSON.parse(cleaned) as DesignBrief;
  } catch {
    brief = buildFallbackBrief(opts);
  }

  brief.attribution = 'UnraveledTruth';
  // Hard-enforce: debate_split always renders at landscape (1200×675) regardless of what the agent returned
  if (brief.template === 'debate_split') {
    brief.dimensions = 'landscape';
  }
  return brief;
}

// ── Fallback ──────────────────────────────────────────────────────────────────

function buildFallbackBrief(opts: {
  content_type: string;
  article_title: string;
  convergence_score: number;
  traditions: string[];
}): DesignBrief {
  const isScore = opts.content_type === 'score_reveal';
  const accent = opts.traditions[0] ? traditionColor(opts.traditions[0]) : '#C9A66B';

  return {
    template: isScore ? 'score_reveal' : 'quote_card',
    dimensions: 'square',
    layout: isScore ? 'score_hero' : 'ruled',
    accent_color: accent,
    headline: opts.article_title.slice(0, 60),
    attribution: 'UnraveledTruth',
    score: isScore ? opts.convergence_score : undefined,
    traditions: opts.traditions.slice(0, 5),
    visual_note: 'Fallback brief — art director parse failed',
  };
}
