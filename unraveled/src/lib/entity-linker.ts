/**
 * Entity auto-linker
 *
 * Loads all linkable entities (people, institutions, topics) and provides
 * a utility to scan text and return segments with inline link metadata.
 * Only links the first occurrence of each entity per text block.
 */

import { createServerSupabaseClient } from '@/lib/supabase';

export interface EntityRef {
  name: string;
  href: string;
  type: 'person' | 'institution' | 'topic';
}

export interface TextSegment {
  text: string;
  entity?: EntityRef;
}

export interface EntityIndex {
  /** Sorted longest-name-first for greedy matching */
  entities: EntityRef[];
  /** Compiled regex — one pattern covering all names */
  pattern: RegExp;
}

// ── Alias safety filter ───────────────────────────────────────────────────────

// Generic English phrases that should never be used as entity aliases — they
// appear constantly in prose and create bogus links (e.g. "the company" → CIA).
const BLOCKED_ALIASES = new Set([
  'the company', 'the agency', 'the bureau', 'the firm', 'the institute',
  'the organization', 'the organisation', 'the group', 'the program',
  'the programme', 'the project', 'the office', 'the department',
  'the service', 'the unit', 'the division', 'the committee',
  'the administration', 'the government', 'the foundation',
  'the society', 'the association', 'the council', 'the authority',
]);

/**
 * Returns false for aliases that are too short or are generic English phrases
 * that would create false-positive links in ordinary prose.
 */
function isSafeAlias(alias: string): boolean {
  const lower = alias.toLowerCase().trim();
  // Must be at least 4 characters and not a blocked phrase
  return lower.length >= 4 && !BLOCKED_ALIASES.has(lower);
}

// ── Data loading ──────────────────────────────────────────────────────────────

export async function loadEntityIndex(): Promise<EntityIndex> {
  const supabase = createServerSupabaseClient();

  const [
    { data: people },
    { data: institutions },
    { data: topics },
  ] = await Promise.all([
    supabase
      .from('people')
      .select('full_name, known_as, slug')
      .not('slug', 'is', null)
      .in('status', ['published', 'needs_review']),
    supabase
      .from('institutions')
      .select('name, known_as, slug')
      .not('slug', 'is', null)
      .in('status', ['published', 'needs_review']),
    supabase
      .from('topic_dossiers')
      .select('title, slug')
      .eq('published', true)
      .not('slug', 'is', null),
  ]);

  const refs: EntityRef[] = [];

  for (const p of people ?? []) {
    if (!p.slug) continue;
    refs.push({ name: p.full_name, href: `/people/${p.slug}`, type: 'person' });
    for (const alias of p.known_as ?? []) {
      if (alias && alias !== p.full_name && isSafeAlias(alias)) {
        refs.push({ name: alias, href: `/people/${p.slug}`, type: 'person' });
      }
    }
  }

  for (const i of institutions ?? []) {
    if (!i.slug) continue;
    refs.push({ name: i.name, href: `/institutions/${i.slug}`, type: 'institution' });
    for (const alias of i.known_as ?? []) {
      if (alias && alias !== i.name && isSafeAlias(alias)) {
        refs.push({ name: alias, href: `/institutions/${i.slug}`, type: 'institution' });
      }
    }
  }

  for (const t of topics ?? []) {
    if (!t.slug || !t.title) continue;
    refs.push({ name: t.title, href: `/topics/${t.slug}`, type: 'topic' });
  }

  // Sort longest name first — ensures "Albert Einstein" matches before "Einstein"
  const entities = refs.sort((a, b) => b.name.length - a.name.length);

  // Build one combined regex with named groups impossible at this scale,
  // so use a single alternation pattern with word boundaries
  const escaped = entities.map(e =>
    e.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');

  return { entities, pattern };
}

// ── Text segmentation ─────────────────────────────────────────────────────────

/**
 * Splits a plain-text string into segments, tagging entity mentions with their
 * href. Only the first occurrence of each entity name is linked.
 */
export function segmentText(text: string, index: EntityIndex): TextSegment[] {
  if (!text || index.entities.length === 0) return [{ text }];

  const segments: TextSegment[] = [];
  const linked = new Set<string>(); // track linked hrefs to link only first occurrence
  let lastIndex = 0;

  // Reset regex state
  index.pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = index.pattern.exec(text)) !== null) {
    const matchedName = match[0];
    // Find the entity — case-insensitive lookup
    const entity = index.entities.find(
      e => e.name.toLowerCase() === matchedName.toLowerCase()
    );
    if (!entity || linked.has(entity.href)) continue;

    // Push preceding plain text
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    // Push the linked entity
    segments.push({ text: matchedName, entity });
    linked.add(entity.href);
    lastIndex = match.index + matchedName.length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}
