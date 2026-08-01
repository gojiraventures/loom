/**
 * Slug generation for dossiers — optimized for SEO and GEO (generative-engine
 * optimization: clear, keyword-forward URLs that both search crawlers and AI
 * answer engines can parse into a topic).
 *
 * Two layers:
 *   slugify()          — deterministic, always available, safe fallback.
 *   generateSeoSlug()  — Gemini Flash distills a concise keyword-rich slug from
 *                        the article; falls back to slugify(title) on any error.
 *
 * Rules baked in: lowercase, hyphenated, ASCII only, stop-words trimmed,
 * ~3–7 meaningful words, capped length. Never invents facts — GEO here means
 * legible topic keywords, not stuffing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { queryGemini } from '@/lib/research/llm/gemini';

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'from',
  'how', 'why', 'what', 'who', 'is', 'are', 'was', 'were', 'that', 'this', 'its',
  'their', 'they', 'about', 'into', 'as', 'at', 'by', 'be',
]);

/** Deterministic SEO slug. Trims stop-words but keeps enough words to stay meaningful. */
export function slugify(text: string, { maxWords = 7, maxLen = 65 } = {}): string {
  const words = (text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);

  const meaningful = words.filter((w) => !STOP.has(w));
  // Keep meaningful words if we still have a reasonable phrase, else fall back to all.
  const chosen = (meaningful.length >= 3 ? meaningful : words).slice(0, maxWords);

  let slug = chosen.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (slug.length > maxLen) {
    // trim to last whole word within maxLen
    slug = slug.slice(0, maxLen).replace(/-[^-]*$/, '');
  }
  return slug;
}

/** Ensure the slug is unique across dossiers (ignores the row for `currentTopic`). */
export async function ensureUniqueSlug(
  supabase: SupabaseClient,
  base: string,
  currentTopic?: string,
): Promise<string> {
  let candidate = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await supabase
      .from('topic_dossiers')
      .select('topic')
      .eq('slug', candidate)
      .maybeSingle();
    if (!data || data.topic === currentTopic) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

interface SlugInput {
  title: string;
  topic: string;
  drivingQuestion?: string | null;
  summary?: string | null;
}

const SLUG_SYSTEM = `You write URL slugs for long-form research articles, optimized for search engines AND AI answer engines (GEO).
Rules:
- Lowercase, words separated by single hyphens, ASCII letters/numbers only.
- 3 to 7 words. Concise but keyword-rich — front-load the most searchable, most distinctive terms (proper nouns, the core subject).
- Drop filler words (the, of, and, how, why...) unless removing them hurts meaning.
- Make the topic unmistakable to a crawler or an LLM at a glance. No clickbait, no dates, no years.
- Return ONLY the slug. No quotes, no explanation.`;

/** LLM-optimized slug with deterministic fallback. */
export async function generateSeoSlug(input: SlugInput): Promise<string> {
  const fallback = slugify(input.title || input.topic);
  try {
    const res = await queryGemini({
      provider: 'gemini-flash',
      model: 'gemini-2.5-flash',
      systemPrompt: SLUG_SYSTEM,
      userPrompt: `TITLE: ${input.title}\nTOPIC: ${input.topic}\n${input.drivingQuestion ? `QUESTION: ${input.drivingQuestion}\n` : ''}${input.summary ? `SUMMARY: ${input.summary.slice(0, 600)}` : ''}`,
      // gemini-2.5-flash spends ~500 "thinking" tokens before output; the slug
      // itself is tiny, but the budget must clear the thinking phase or it returns empty.
      maxTokens: 2048,
      temperature: 0.3,
    });
    const raw = (res.text ?? '').trim().split('\n')[0];
    const cleaned = slugify(raw, { maxWords: 8 });
    return cleaned.length >= 3 ? cleaned : fallback;
  } catch {
    return fallback;
  }
}
