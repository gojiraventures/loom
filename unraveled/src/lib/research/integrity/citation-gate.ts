/**
 * Citation Gate
 *
 * No finding publishes at credibility tier 1 or 2 with an unresolvable source.
 *
 * Resolution strategy per citation type:
 *   DOI        → Crossref works API (keyless)
 *   URL        → HTTP HEAD reachability + paywall detection
 *   journal    → Crossref query by title + token-overlap similarity
 *   book       → Open Library search by title + author
 *   canonical  → Known-works registry (primary/sacred texts) — never false-flagged
 *
 * Everything degrades to 'needs_human', NEVER silently to 'resolved'.
 * Do NOT use an LLM to verify source existence — only authoritative registries.
 *
 * On mustBlock: findings are not published; blocked citations are written
 * to the citation_review_queue table for admin review.
 */

import type { SourceReference } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CitationType = 'doi' | 'url' | 'journal' | 'book' | 'canonical';
export type ResolutionStatus = 'resolved' | 'unresolvable' | 'needs_human' | 'paywall_suspected';

export interface ParsedCitation {
  type: CitationType;
  raw: string;         // original input
  normalized: string;  // cleaned DOI / URL / title
}

export interface CitationResult {
  citation: ParsedCitation;
  status: ResolutionStatus;
  resolvedTitle?: string;
  similarity?: number;   // 0–1 for fuzzy journal/book matches
  error?: string;
}

export interface GateResult {
  pass: boolean;
  mustBlock: boolean;
  results: CitationResult[];
}

// ── Canonical primary sources registry ────────────────────────────────────────
// Real primary/sacred texts that should NEVER be false-flagged as unresolvable.
// Normalised to lowercase, punctuation-stripped for matching.

const CANONICAL_REGISTRY = new Set([
  // Bible (books)
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
  'joshua', 'judges', 'ruth', 'samuel', 'kings', 'chronicles',
  'ezra', 'nehemiah', 'esther', 'job', 'psalms', 'proverbs',
  'ecclesiastes', 'song of solomon', 'isaiah', 'jeremiah', 'lamentations',
  'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah', 'jonah',
  'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', 'corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', 'thessalonians',
  'timothy', 'titus', 'philemon', 'hebrews', 'james', 'peter', 'jude', 'revelation',
  'the bible', 'holy bible', 'king james bible', 'septuagint',
  // Apocrypha / Pseudepigrapha
  'book of enoch', '1 enoch', '2 enoch', '3 enoch', 'enoch',
  'book of jubilees', 'jubilees',
  'dead sea scrolls',
  'nag hammadi', 'gospel of thomas', 'gospel of philip',
  'book of the dead', 'egyptian book of the dead',
  // Mesopotamian
  'epic of gilgamesh', 'gilgamesh',
  'enuma elish',
  'atrahasis',
  'sumerian king list',
  'descent of inanna',
  // Hindu
  'rigveda', 'rig veda', 'samaveda', 'yajurveda', 'atharvaveda',
  'mahabharata', 'ramayana', 'bhagavad gita', 'upanishads',
  'puranas', 'vishnu purana', 'shiva purana', 'bhagavata purana',
  // Buddhist
  'dhammapada', 'pali canon', 'tripitaka', 'tibetan book of the dead',
  'bardo thodol',
  // Zoroastrian
  'avesta', 'gathas', 'zend avesta',
  // Mesoamerican
  'popol vuh',
  'chilam balam',
  'codex mendoza', 'codex borgia',
  // Norse
  'prose edda', 'poetic edda', 'eddas',
  'eddic poetry',
  // Greek / Roman
  'iliad', 'odyssey', 'theogony', 'works and days',
  'aeneid', 'metamorphoses',
  // Egyptian
  'pyramid texts', 'coffin texts', 'papyrus of ani',
  // Islamic
  'quran', 'koran',
  // Chinese
  'i ching', 'yi jing', 'tao te ching', 'analects',
  // Other
  'tibetan book of the dead',
  'corpus hermeticum', 'hermetica',
  'zohar',
  'talmud', 'mishnah', 'torah',
]);

// ── Timeout helper ────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[citation-gate] Timeout after ${ms}ms: ${label}`)), ms),
    ),
  ]);
}

// ── Token-overlap similarity (no external dep) ────────────────────────────────

function tokenize(s: string): Set<string> {
  return new Set(s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersection = 0;
  for (const t of ta) { if (tb.has(t)) intersection++; }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Citation parsing ──────────────────────────────────────────────────────────

const DOI_RE = /\b(10\.\d{4,}\/\S+)/;
const URL_RE = /^https?:\/\//i;

export function parseCitation(source: SourceReference): ParsedCitation {
  const raw = [source.url, source.title].filter(Boolean).join(' ').trim();

  // DOI — in URL or standalone
  const doiFromUrl = source.url?.match(/doi\.org\/(10\.\d{4,}\/\S+)/)?.[1];
  const doiStandalone = (source.url ?? source.title ?? '').match(DOI_RE)?.[1];
  const doi = doiFromUrl ?? doiStandalone;
  if (doi) {
    return { type: 'doi', raw, normalized: doi.replace(/[)\].,;]+$/, '') };
  }

  // Canonical primary/sacred text by title
  const titleNorm = (source.title ?? '').toLowerCase().trim();
  if (CANONICAL_REGISTRY.has(titleNorm)) {
    return { type: 'canonical', raw, normalized: titleNorm };
  }
  // Partial match for canonical (e.g. "Genesis 6:4")
  for (const canon of CANONICAL_REGISTRY) {
    if (titleNorm.startsWith(canon)) {
      return { type: 'canonical', raw, normalized: canon };
    }
  }

  // URL
  if (source.url && URL_RE.test(source.url)) {
    return { type: 'url', raw, normalized: source.url };
  }

  // Journal (source_type journal)
  if (source.source_type === 'journal' && source.title) {
    return { type: 'journal', raw, normalized: source.title };
  }

  // Book
  if (['book', 'excavation_report', 'archive', 'museum_db', 'government_record'].includes(source.source_type) && source.title) {
    return { type: 'book', raw, normalized: source.title };
  }

  // Fallback — treat as journal title for lookup
  if (source.title) {
    return { type: 'journal', raw, normalized: source.title };
  }

  return { type: 'url', raw, normalized: '' };
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

async function resolveDoi(doi: string): Promise<CitationResult> {
  const parsed: ParsedCitation = { type: 'doi', raw: doi, normalized: doi };
  try {
    const res = await withTimeout(
      fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
        headers: { 'User-Agent': 'Unraveled/1.0 (mailto:admin@unraveledtruth.com)' },
      }),
      8000,
      `DOI ${doi}`,
    );
    if (res.status === 404) {
      return { citation: parsed, status: 'unresolvable', error: 'DOI not found in Crossref' };
    }
    if (!res.ok) {
      return { citation: parsed, status: 'needs_human', error: `Crossref HTTP ${res.status}` };
    }
    const data = await res.json() as { message?: { title?: string[] } };
    const title = data.message?.title?.[0];
    return { citation: parsed, status: 'resolved', resolvedTitle: title };
  } catch (err) {
    return {
      citation: parsed,
      status: 'needs_human',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function resolveUrl(url: string): Promise<CitationResult> {
  const parsed: ParsedCitation = { type: 'url', raw: url, normalized: url };
  if (!url) return { citation: parsed, status: 'unresolvable', error: 'Empty URL' };

  try {
    const res = await withTimeout(
      fetch(url, { method: 'HEAD', redirect: 'follow' }),
      6000,
      `URL ${url}`,
    );

    if (res.status === 404 || res.status === 410) {
      return { citation: parsed, status: 'unresolvable', error: `HTTP ${res.status}` };
    }
    if (res.status >= 500) {
      return { citation: parsed, status: 'needs_human', error: `HTTP ${res.status}` };
    }

    // Paywall detection heuristics
    const finalUrl = res.url ?? url;
    const paywallDomains = ['jstor.org', 'springer.com', 'nature.com', 'sciencedirect.com',
      'tandfonline.com', 'wiley.com', 'sagepub.com', 'oup.com', 'cambridge.org'];
    const isPaywall = paywallDomains.some((d) => finalUrl.includes(d));
    if (isPaywall) {
      return { citation: parsed, status: 'paywall_suspected' };
    }

    if (res.ok) {
      return { citation: parsed, status: 'resolved' };
    }

    return { citation: parsed, status: 'needs_human', error: `HTTP ${res.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Connection refused / DNS failure = unresolvable; timeout = needs_human
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      return { citation: parsed, status: 'unresolvable', error: msg };
    }
    return { citation: parsed, status: 'needs_human', error: msg };
  }
}

async function resolveJournal(title: string): Promise<CitationResult> {
  const parsed: ParsedCitation = { type: 'journal', raw: title, normalized: title };
  if (!title.trim()) return { citation: parsed, status: 'unresolvable', error: 'Empty title' };

  try {
    const query = encodeURIComponent(title);
    const res = await withTimeout(
      fetch(`https://api.crossref.org/works?query=${query}&rows=3&select=title`, {
        headers: { 'User-Agent': 'Unraveled/1.0 (mailto:admin@unraveledtruth.com)' },
      }),
      8000,
      `journal "${title}"`,
    );
    if (!res.ok) {
      return { citation: parsed, status: 'needs_human', error: `Crossref HTTP ${res.status}` };
    }
    const data = await res.json() as { message?: { items?: Array<{ title?: string[] }> } };
    const items = data.message?.items ?? [];
    if (items.length === 0) {
      return { citation: parsed, status: 'unresolvable', error: 'No results in Crossref' };
    }
    // Find best similarity match
    let bestSim = 0;
    let bestTitle = '';
    for (const item of items) {
      const candidate = item.title?.[0] ?? '';
      const sim = jaccardSimilarity(title, candidate);
      if (sim > bestSim) { bestSim = sim; bestTitle = candidate; }
    }
    // Threshold: 0.4 — tunable
    if (bestSim >= 0.4) {
      return { citation: parsed, status: 'resolved', resolvedTitle: bestTitle, similarity: bestSim };
    }
    return {
      citation: parsed,
      status: 'needs_human',
      resolvedTitle: bestTitle,
      similarity: bestSim,
      error: `Best match similarity ${bestSim.toFixed(2)} below threshold 0.40`,
    };
  } catch (err) {
    return {
      citation: parsed,
      status: 'needs_human',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function resolveBook(title: string, author?: string | null): Promise<CitationResult> {
  const parsed: ParsedCitation = { type: 'book', raw: title, normalized: title };
  if (!title.trim()) return { citation: parsed, status: 'unresolvable', error: 'Empty title' };

  try {
    const q = author ? `title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}` : `title=${encodeURIComponent(title)}`;
    const res = await withTimeout(
      fetch(`https://openlibrary.org/search.json?${q}&fields=title,author_name&limit=3`),
      8000,
      `book "${title}"`,
    );
    if (!res.ok) {
      return { citation: parsed, status: 'needs_human', error: `Open Library HTTP ${res.status}` };
    }
    const data = await res.json() as { numFound?: number; docs?: Array<{ title?: string }> };
    if (!data.numFound || data.numFound === 0) {
      return { citation: parsed, status: 'unresolvable', error: 'Not found in Open Library' };
    }
    const bestDoc = data.docs?.[0];
    const bestTitle = bestDoc?.title ?? '';
    const sim = jaccardSimilarity(title, bestTitle);
    if (sim >= 0.4) {
      return { citation: parsed, status: 'resolved', resolvedTitle: bestTitle, similarity: sim };
    }
    return {
      citation: parsed,
      status: 'needs_human',
      resolvedTitle: bestTitle,
      similarity: sim,
      error: `Best match similarity ${sim.toFixed(2)} below threshold 0.40`,
    };
  } catch (err) {
    return {
      citation: parsed,
      status: 'needs_human',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function resolveCanonical(normalized: string): CitationResult {
  const parsed: ParsedCitation = { type: 'canonical', raw: normalized, normalized };
  // If it's in the registry, it's resolved — these are real primary sources
  if (CANONICAL_REGISTRY.has(normalized)) {
    return { citation: parsed, status: 'resolved', resolvedTitle: normalized };
  }
  return { citation: parsed, status: 'needs_human', error: 'Not found in canonical registry' };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function resolveCitation(source: SourceReference): Promise<CitationResult> {
  const parsed = parseCitation(source);
  switch (parsed.type) {
    case 'doi':       return resolveDoi(parsed.normalized);
    case 'url':       return resolveUrl(parsed.normalized);
    case 'journal':   return resolveJournal(parsed.normalized);
    case 'book':      return resolveBook(parsed.normalized, source.author);
    case 'canonical': return resolveCanonical(parsed.normalized);
  }
}

/**
 * Gates citations for a set of findings.
 *
 * @param sources   All SourceReferences from a finding
 * @param tier      The credibility tier being checked (gate applies to tier 1 & 2 only)
 *
 * Returns:
 *   pass      = all tier-1/2 citations resolved (or no tier-1/2 citations)
 *   mustBlock = at least one tier-1/2 citation is unresolvable (not merely needs_human)
 *   results   = full resolution details for all checked citations
 */
export async function gateFindingCitations(
  sources: SourceReference[],
  { tier }: { tier?: number } = {},
): Promise<GateResult> {
  // Only gate tier 1 and 2 sources — higher tiers get human review anyway
  const toCheck = tier !== undefined
    ? sources.filter((s) => s.credibility_tier <= 2)
    : sources.filter((s) => s.credibility_tier <= 2);

  if (toCheck.length === 0) {
    return { pass: true, mustBlock: false, results: [] };
  }

  const results = await Promise.all(toCheck.map((s) => resolveCitation(s)));

  const mustBlock = results.some((r) => r.status === 'unresolvable');
  const pass = results.every((r) => r.status === 'resolved' || r.status === 'paywall_suspected');

  return { pass, mustBlock, results };
}

/**
 * Writes blocked citations to the citation_review_queue table.
 * Non-throwing — logs errors but does not fail the pipeline.
 */
export async function enqueueBlockedCitations(
  sessionId: string,
  agentId: string,
  claimText: string,
  results: CitationResult[],
): Promise<void> {
  // Dynamic import to avoid pulling Supabase into non-server contexts
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  const rows = results.map((r) => ({
    session_id: sessionId,
    agent_id: agentId,
    claim_text: claimText.slice(0, 500),
    citation_raw: r.citation.raw,
    citation_type: r.citation.type,
    resolution_status: r.status,
    resolved_title: r.resolvedTitle ?? null,
    similarity_score: r.similarity ?? null,
    error_detail: r.error ?? null,
  }));

  const { error } = await supabase.from('citation_review_queue').insert(rows);
  if (error) {
    console.error('[citation-gate] Failed to enqueue blocked citations:', error.message);
  }
}
