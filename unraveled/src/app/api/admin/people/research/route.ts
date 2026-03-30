import { NextRequest, NextResponse } from 'next/server';
import { queryAnthropic, queryPerplexity } from '@/lib/ai';

export const maxDuration = 60;

const SYSTEM = `You are a researcher building dossiers on public figures for an evidence-index platform called UnraveledTruth.
Given a person's name and any research notes, return a structured JSON object with everything you know.
Be accurate, balanced, and note what is verified vs. claimed. Return ONLY valid JSON — no prose.`;

const SCHEMA_PROMPT = (name: string, perplexityNotes: string) => `
Research the following person and return a JSON object matching this exact schema.
Person: "${name}"

Additional research notes (from web search):
${perplexityNotes}

Return this JSON schema (all fields optional except full_name):
{
  "full_name": "string — legal full name",
  "known_as": ["string — common names/aliases"],
  "short_bio": "string — 1–2 sentence summary",
  "bio": "string — 3–5 paragraph biography",
  "born_date": "string — YYYY-MM-DD or YYYY",
  "born_location": "string — city, country",
  "died_date": "string or null",
  "nationality": "string",
  "credibility_tier": "one of: academic | journalist | independent_researcher | whistleblower | public_figure | historical_figure | witness | controversial | unclassified",
  "current_role": "string — current primary role/occupation",
  "work_history": [{"org": "string", "role": "string", "years": "string"}],
  "education": [{"institution": "string", "degree": "string", "year": "string", "verified": true}],
  "notable_claims": [{"claim": "string", "year": "string", "status": "verified|contested|debunked|unverified"}],
  "key_positions": ["string — topics/positions they are known for"],
  "website_url": "string or null",
  "twitter_handle": "string or null — @handle",
  "wikipedia_url": "string or null",
  "socials": [{"platform": "string", "url": "string", "handle": "string or null"}],
  "bio_sections": [
    {
      "section_type": "one of: overview|early_life|career|key_claims|controversy|evidence_for|evidence_against|legacy|connections|timeline|in_their_words|what_others_say",
      "title": "string",
      "content": "string — 2–5 paragraphs of rich markdown content",
      "sort_order": 0
    }
  ],
  "suggested_relationships": [
    {
      "person_name": "string — name of related person",
      "relationship_type": "one of: colleague|mentor|collaborator|interviewed|endorsed|criticized|debated|associated|funded|employed|family|co_appeared|influenced|contradicted|succeeded|investigated",
      "description": "string",
      "strength": 3,
      "bidirectional": true,
      "start_year": "string or null"
    }
  ],
  "suggested_books": [
    {
      "title": "string",
      "author_name": "string",
      "published_year": "string",
      "amazon_url": "string or null",
      "relationship": "one of: author|co_author|subject|mentioned|foreword|endorsed|reviewed|debunked_by|supported_by",
      "context": "string — why this book is relevant"
    }
  ],
  "slug": "string — kebab-case URL slug derived from full name"
}

Return ONLY the JSON object, no markdown fences.`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name } = body as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // 1. Web research via Perplexity
  let perplexityNotes = '';
  try {
    const perp = await queryPerplexity(
      `Who is ${name}? Provide biographical details: full name, birth date and place, nationality, education (institutions and degrees), career history, notable claims or discoveries, public controversies, current occupation, and any significant publications or media appearances. Be specific and cite sources where possible.`
    );
    perplexityNotes = perp.content;
  } catch {
    perplexityNotes = 'No additional web research available.';
  }

  // 2. Structure with Claude
  const { content } = await queryAnthropic(
    SCHEMA_PROMPT(name.trim(), perplexityNotes),
    SYSTEM
  );

  // 3. Parse JSON
  let parsed: Record<string, unknown>;
  try {
    // Strip any accidental markdown fences
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON', raw: content },
      { status: 500 }
    );
  }

  return NextResponse.json({ person: parsed, perplexity_notes: perplexityNotes });
}
