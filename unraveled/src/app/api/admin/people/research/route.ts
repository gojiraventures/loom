import { NextRequest, NextResponse } from 'next/server';
import { queryAnthropic, queryPerplexity } from '@/lib/ai';

export const maxDuration = 120;

// ── Wikipedia REST API helper ──────────────────────────────────────────────────

async function fetchWikipedia(name: string): Promise<string> {
  const ua = 'UnraveledTruth/1.0 (research pipeline; contact@unraveledtruth.com)';

  // Try direct slug first, fallback to search
  const directSlug = name.trim().replace(/\s+/g, '_');
  let title = directSlug;

  const directRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(directSlug)}`,
    { headers: { 'User-Agent': ua }, next: { revalidate: 0 } }
  );

  if (!directRes.ok) {
    // Search for the page
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&srlimit=1&origin=*`,
      { headers: { 'User-Agent': ua }, next: { revalidate: 0 } }
    );
    if (!searchRes.ok) return '';
    const sd = await searchRes.json() as { query?: { search?: { title: string }[] } };
    const first = sd?.query?.search?.[0];
    if (!first) return '';
    title = first.title;
  }

  const summaryRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    { headers: { 'User-Agent': ua }, next: { revalidate: 0 } }
  );
  if (!summaryRes.ok) return '';
  const data = await summaryRes.json() as Record<string, unknown>;

  const lines: string[] = [`--- WIKIPEDIA: ${title} ---`];
  if (data.description) lines.push(`Description: ${data.description}`);
  if (data.extract) lines.push(data.extract as string);
  const wikiUrl = (data.content_urls as Record<string, Record<string, string>> | undefined)?.desktop?.page;
  if (wikiUrl) lines.push(`Wikipedia URL: ${wikiUrl}`);
  return lines.join('\n');
}

const SYSTEM = `You are a researcher building dossiers on public figures for an evidence-index platform called UnraveledTruth.
Given a person's name and any research notes, return a structured JSON object with everything you know.
Be accurate, balanced, and note what is verified vs. claimed. Return ONLY valid JSON — no prose.`;

const SCHEMA_PROMPT = (name: string, perplexityNotes: string, extraContext?: string) => `
Research the following person and return a JSON object matching this exact schema.
Person: "${name}"
${extraContext ? `\nAdditional context provided by researcher:\n${extraContext}\n` : ''}
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
  "credibility_tier": "one of: academic | journalist | independent_researcher | whistleblower | public_figure | historical_figure | witness | unclassified — describes the person's primary professional role or public identity, NOT how they are perceived. Never use this field to express editorial judgment about a person's reputation.",
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
  "faith": "string — religious tradition, denomination, or belief (e.g. Catholic, Evangelical Christian, Jewish, Sunni Muslim, Buddhism, Atheist, Agnostic, Spiritual but not religious) or null if unknown",
  "faith_status": "one of: professed (self-declared in interviews/writings) | assumed (inferred from upbringing, community, behaviour) | unknown",
  "political_party": "string — registered or publicly known political party (e.g. Republican, Democrat, Libertarian, Independent, Labour, Conservative, Green) or null if unknown",
  "political_party_status": "one of: registered (confirmed voter registration or party membership) | assumed (inferred from stated positions, donations, endorsements) | unknown",
  "suggested_institutional_affiliations": [
    {
      "institution_name": "string — full name of the institution, organisation, or secret society",
      "institution_type": "one of: museum|university|intelligence|secret_society|government_agency|military|religious|think_tank|research_institute|other",
      "relationship": "one of: member|employee|director|founder|contractor|advisor|operative|affiliated|other",
      "role_title": "string or null — specific title or rank within the organisation",
      "membership_status": "one of: confirmed (self-admitted, documented, or declassified) | assumed (credibly alleged, circumstantial evidence) | unknown",
      "covert": true or false,
      "start_year": "string or null",
      "end_year": "string or null",
      "description": "string — brief note on the nature of the affiliation"
    }
  ],
  "slug": "string — kebab-case URL slug derived from full name",
  "public_discourse": [
    {
      "sentiment": "one of: positive | negative | mixed — how this claim characterizes the person",
      "claim": "string — specific, sourced public claim about this person. Must be factual and attributed. Good: 'Criticized by X for Y.' Bad: 'Some people find them controversial.'",
      "claim_source": "string — who made this claim: a publication, named individual, institution, or identifiable community",
      "claim_source_url": "string or null — link to the source if publicly available",
      "response_summary": "string or null — if the person has publicly responded to this claim, summarize their stated position",
      "response_source": "string or null — where the person made their response (e.g. 'The Portal podcast, Episode 41', 'Twitter/X, March 2023')",
      "response_source_url": "string or null"
    }
  ]
}

Public discourse extraction rules:
- Only include claims that are documented in public sources. Do not generate claims from your own assessment.
- Each claim must be specific and attributed — not vague (e.g. "respected by many" is not a valid claim).
- If a claim is domain-specific (e.g. criticism of their physics work vs. their economic views), note that in the claim text.
- If the person has publicly responded to a negative claim, always capture their response — this is the fairness layer.
- If you cannot find sourced claims, return an empty array. Do not fabricate discourse entries.

Return ONLY the JSON object, no markdown fences.`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, description, sources } = body as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // Build optional extra context from description + sources
  const contextParts: string[] = [];
  if (typeof description === 'string' && description.trim()) {
    contextParts.push(`Researcher note: ${description.trim()}`);
  }
  if (typeof sources === 'string' && sources.trim()) {
    contextParts.push(`Suggested sources (supplementary, use better sources if available):\n${sources.trim()}`);
  }
  const extraContext = contextParts.length > 0 ? contextParts.join('\n') : undefined;

  // Build Perplexity query — include description for disambiguation
  const disambig = typeof description === 'string' && description.trim()
    ? ` (context: ${description.trim()})`
    : '';

  const mainQuery = `Research ${name}${disambig} and extract the following structured information:

1. BIOGRAPHY: Full legal name, birth date and place, nationality, current residence.

2. EDUCATION: Every educational institution attended — school/university name, degree earned, field of study, and year of graduation. Include doctoral advisors if applicable.

3. CAREER HISTORY: Every employer or organisation they have been associated with — institution name, role/title, start year, end year. Include think tanks, government agencies, private companies, and advisory roles.

4. NAMED RELATIONSHIPS: Specific named individuals they have worked with, studied under, mentored, collaborated with, funded by, or are publicly associated with. Give names and the nature of the connection.

5. KEY CLAIMS AND CONTROVERSIES: Their most notable public claims, theories, or controversies, with years and sources.

Be specific. Use full institution names. Cite sources where possible.`;

  const grokQuery = `Search grokipedia.com for "${name}"${disambig}. ` +
    `Retrieve all content from their Grokipedia profile page — background, associations, claimed positions, funding sources, controversies, and any connections to other individuals or organisations documented there. ` +
    `Include the Grokipedia URL if you find one.`;

  // 1. Fetch all sources in parallel: Perplexity web search, Wikipedia, Grokipedia
  const [perplexityResult, wikipediaResult, grokResult] = await Promise.allSettled([
    queryPerplexity(mainQuery),
    fetchWikipedia(name.trim()),
    queryPerplexity(grokQuery),
  ]);

  const perplexityNotes = perplexityResult.status === 'fulfilled'
    ? perplexityResult.value.content
    : 'No web research available.';

  const wikiSummary = wikipediaResult.status === 'fulfilled' && wikipediaResult.value
    ? '\n\n' + wikipediaResult.value
    : '';

  const grokNotes = grokResult.status === 'fulfilled' && grokResult.value.content
    ? '\n\n--- GROKIPEDIA ---\n' + grokResult.value.content
    : '';

  // 1b. Wikipedia reference deep-dive — extract footnote sources for validation
  let wikiRefNotes = '';
  try {
    // Pull wiki slug from API result or from perplexity notes
    const wikiSlugMatch =
      (wikiSummary + perplexityNotes).match(/wikipedia\.org\/wiki\/([^\s"')#]+)/i);
    if (wikiSlugMatch) {
      const wikiRef = await queryPerplexity(
        `Look at the Wikipedia article for ${name} at https://en.wikipedia.org/wiki/${wikiSlugMatch[1]}. ` +
        `List every reference and footnote cited in that article. For each include: ` +
        `author(s), title, publication/outlet, year, and URL if available. ` +
        `Focus on references that document their education, employment, key claims, or notable relationships.`
      );
      wikiRefNotes = '\n\n--- WIKIPEDIA REFERENCE SOURCES ---\n' + wikiRef.content;
    }
  } catch {
    // non-fatal
  }

  const allNotes = perplexityNotes + wikiSummary + grokNotes + wikiRefNotes;

  // 2. Structure with Claude
  const { content } = await queryAnthropic(
    SCHEMA_PROMPT(name.trim(), allNotes, extraContext),
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

  return NextResponse.json({
    person: parsed,
    perplexity_notes: perplexityNotes,
    wikipedia_notes: wikiSummary.trim(),
    grokipedia_notes: grokNotes.trim(),
    wikipedia_refs: wikiRefNotes.trim(),
  });
}
