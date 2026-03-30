import { NextRequest, NextResponse } from 'next/server';
import { queryAnthropic, queryPerplexity } from '@/lib/ai';

export const maxDuration = 60;

const SYSTEM = `You are a researcher building institutional dossiers for an evidence-index platform. Given an institution name and research notes, return structured JSON. Be accurate, note what is verified vs. alleged. Return ONLY valid JSON.`;

const SCHEMA_PROMPT = (name: string, perplexityNotes: string, extraContext?: string) => `
Research the following institution and return a JSON object matching this exact schema.
Institution: "${name}"
${extraContext ? `\nAdditional context provided by researcher:\n${extraContext}\n` : ''}
Additional research notes (from web search):
${perplexityNotes}

Return this JSON schema:
{
  "name": "string",
  "short_name": "string or null",
  "known_as": ["aliases"],
  "slug": "kebab-case",
  "short_bio": "1-2 sentence summary",
  "bio": "3-5 paragraph description",
  "institution_type": "one of: museum|university|government_agency|military|intelligence|religious|secret_society|think_tank|research_institute|foundation|media_org|corporation|ngo|professional_society|library_archive|observatory|archaeological_org|medical|other",
  "sub_type": "string or null",
  "founded_year": "string or null",
  "founded_location": "string or null",
  "founder": "string or null",
  "headquarters_city": "string or null",
  "headquarters_state": "string or null",
  "headquarters_country": "string or null",
  "active": true,
  "transparency_tier": "one of: open|standard|opaque|classified|defunct_classified",
  "relevance_summary": "why relevant to alternative history/archaeology/conspiracy research",
  "controversy_summary": "documented controversies",
  "website_url": "string or null",
  "wikipedia_url": "string or null",
  "bio_sections": [
    { "section_type": "one of: overview|history|key_programs|controversies|declassified|collections|notable_members|funding_sources|suppression_allegations|institutional_behavior|timeline", "title": "string", "content": "2-4 paragraphs markdown", "sort_order": 0 }
  ],
  "suggested_relationships": [
    { "institution_name": "string", "relationship_type": "one of: parent|funded|front_for|collaborated|oversight|spun_off|merged_into|competed|investigated|succeeded|affiliated|classified_program", "description": "string", "covert": false, "start_year": "string or null" }
  ]
}

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

  // 1. Web research via Perplexity
  let perplexityNotes = '';
  try {
    const perp = await queryPerplexity(
      `What is ${name}${disambig}? Provide: full name, founding year and location, current HQ, institution type, key leaders, documented controversies, any intelligence/government connections, notable programs or events, website. Be specific and cite sources.`
    );
    perplexityNotes = perp.content;
  } catch {
    perplexityNotes = 'No additional web research available.';
  }

  // 2. Structure with Claude
  const { content } = await queryAnthropic(
    SCHEMA_PROMPT(name.trim(), perplexityNotes, extraContext),
    SYSTEM
  );

  // 3. Parse JSON
  let parsed: Record<string, unknown>;
  try {
    const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: 'AI returned invalid JSON', raw: content },
      { status: 500 }
    );
  }

  return NextResponse.json({ institution: parsed, perplexity_notes: perplexityNotes });
}
