/**
 * THREAD Bio Enrichment — Batch entity enrichment pipeline
 *
 * POST /api/admin/thread/enrich
 * Body: { entity_ids?: string[], limit?: number, dry_run?: boolean }
 *
 * For each published person:
 *  1. Calls Perplexity to research institutional affiliations + known associates
 *  2. Uses Claude to extract structured data (richer bio, institutions, connections)
 *  3. Updates people_cards.short_bio
 *  4. Creates institution stubs + people_institutions membership records
 *  5. Writes suggested person connections to people_connections if both parties exist
 *
 * dry_run: true → returns what would be written without touching the DB
 *
 * GET /api/admin/thread/enrich → Vercel Cron / status check
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryPerplexity, queryGemini } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ENRICHMENT_SYSTEM = `You are a research analyst building a structured knowledge graph of people and institutions.
Given web research about a person, extract structured data to enrich our database.
Be accurate. Only include what the research supports. Return ONLY valid JSON — no prose, no markdown.`;

function enrichmentPrompt(
  name: string,
  currentBio: string,
  researchNotes: string,
  entitiesInSystem: string[],
): string {
  return `You are enriching the database profile for: "${name}"

CURRENT BIO (thin — needs enriching):
${currentBio || 'None'}

WEB RESEARCH:
${researchNotes}

PEOPLE & INSTITUTIONS ALREADY IN OUR SYSTEM (check for connections):
${entitiesInSystem.join(', ')}

Extract and return this JSON:
{
  "short_bio": "3-4 sentence bio. Must mention: specific named colleagues/collaborators, institutions with years, key claims or controversies. Should be rich enough that name-matching algorithms can find connections.",
  "institution_affiliations": [
    {
      "institution_name": "full institution name",
      "institution_type": "university|intelligence|government_agency|think_tank|research_institute|military|religious|secret_society|media_org|other",
      "role": "member|employee|director|founder|advisor|contractor|affiliated",
      "role_title": "specific title if known, or null",
      "start_year": 1990,
      "end_year": 2005,
      "end_year_is_current": false,
      "description": "one sentence on the nature of this affiliation",
      "confidence": "confirmed|assumed"
    }
  ],
  "person_connections": [
    {
      "name": "full name of connected person",
      "relationship_type": "colleague|collaborator|mentor|student|funded|employed|affiliated|investigated|criticized|influenced|co_appeared",
      "description": "one sentence on how they are connected",
      "start_year": null,
      "strength": 3
    }
  ],
  "ghost_nodes": ["names of people/institutions mentioned in research that should be added to the system but aren't listed above"]
}`;
}

interface EnrichmentResult {
  short_bio: string;
  institution_affiliations: Array<{
    institution_name: string;
    institution_type: string;
    role: string;
    role_title: string | null;
    start_year: number | null;
    end_year: number | null;
    end_year_is_current: boolean;
    description: string;
    confidence: string;
  }>;
  person_connections: Array<{
    name: string;
    relationship_type: string;
    description: string;
    start_year: number | null;
    strength: number;
  }>;
  ghost_nodes: string[];
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const { entity_ids, limit = 10, dry_run = false } = body as {
    entity_ids?: string[];
    limit?: number;
    dry_run?: boolean;
  };

  // Fetch people to enrich
  let query = supabase
    .from('people_cards')
    .select('id, full_name, short_bio, status')
    .eq('status', 'published')
    .order('full_name');

  if (entity_ids?.length) {
    query = query.in('id', entity_ids);
  }

  const { data: people } = await query.limit(Math.min(limit, 20));
  if (!people || people.length === 0) {
    return NextResponse.json({ ok: true, message: 'No people to enrich', enriched: 0 });
  }

  // Fetch all entity names in system for cross-reference
  const [{ data: allPeople }, { data: allInstitutions }] = await Promise.all([
    supabase.from('people_cards').select('id, full_name').eq('status', 'published'),
    supabase.from('institution_cards').select('id, name').eq('status', 'published'),
  ]);

  const peopleInSystem = (allPeople ?? []).map((p) => p.full_name as string);
  const institutionsInSystem = (allInstitutions ?? []).map((i) => i.name as string);
  const entitiesInSystem = [...peopleInSystem, ...institutionsInSystem];

  const personNameToId = new Map((allPeople ?? []).map((p) => [
    (p.full_name as string).toLowerCase(),
    p.id as string,
  ]));

  const results: Array<{
    name: string;
    id: string;
    bio_updated: boolean;
    institutions_added: number;
    connections_added: number;
    ghost_nodes: string[];
    error?: string;
  }> = [];

  for (const person of people) {
    const name = person.full_name as string;
    const currentBio = (person.short_bio as string) ?? '';

    try {
      // 1. Perplexity research — targeted at affiliations and connections
      const researchQuery = `Research ${name} and provide:
1. Every institution, organization, think tank, government agency, university, or company they have been affiliated with — include years and role/title
2. Their most significant named collaborators, colleagues, mentors, and associates — include the nature of each connection
3. Key publications, podcasts, or platforms they are associated with
4. Any notable controversies, funding sources, or hidden affiliations
Be specific with names and years. This is for an investigative knowledge graph.`;

      const researchResult = await queryPerplexity(researchQuery).catch(() => ({ content: '' }));
      const researchNotes = researchResult.content || 'No research available.';

      // 2. Gemini structured extraction
      const { content } = await queryGemini(
        enrichmentPrompt(name, currentBio, researchNotes, entitiesInSystem),
        ENRICHMENT_SYSTEM,
        4096,
      );

      let extracted: EnrichmentResult;
      try {
        const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        extracted = JSON.parse(cleaned) as EnrichmentResult;
      } catch {
        results.push({ name, id: person.id as string, bio_updated: false, institutions_added: 0, connections_added: 0, ghost_nodes: [], error: 'JSON parse failed' });
        continue;
      }

      let institutionsAdded = 0;
      let connectionsAdded = 0;

      if (!dry_run) {
        // 3. Update bio if richer
        if (extracted.short_bio && extracted.short_bio.length > currentBio.length) {
          await supabase
            .from('people_cards')
            .update({ short_bio: extracted.short_bio })
            .eq('id', person.id);
        }

        // 4. Write institution affiliations
        for (const aff of (extracted.institution_affiliations ?? [])) {
          if (!aff.institution_name) continue;

          // Find or create the institution
          let instId: string | null = null;

          // Check if institution already exists (fuzzy match)
          const existingInst = (allInstitutions ?? []).find(
            (i) => (i.name as string).toLowerCase().includes(aff.institution_name.toLowerCase().slice(0, 10))
              || aff.institution_name.toLowerCase().includes((i.name as string).toLowerCase().slice(0, 10)),
          );

          if (existingInst) {
            instId = existingInst.id as string;
          } else {
            // Create institution stub
            const { data: newInst } = await supabase
              .from('institution_cards')
              .insert({
                name: aff.institution_name,
                institution_type: aff.institution_type ?? 'other',
                short_bio: `${aff.institution_name} — added via THREAD bio enrichment for ${name}.`,
                status: 'draft',
              })
              .select('id')
              .single();
            instId = newInst?.id ?? null;
          }

          if (!instId) continue;

          // Write membership record (ignore conflict if already exists)
          const { error: memberError } = await supabase
            .from('people_institutions')
            .insert({
              person_id: person.id,
              institution_id: instId,
              relationship: aff.role ?? 'affiliated',
              role_title: aff.role_title ?? null,
              start_year: aff.start_year ?? null,
              end_year: aff.end_year_is_current ? null : (aff.end_year ?? null),
              description: aff.description ?? null,
              membership_status: aff.confidence === 'confirmed' ? 'confirmed' : 'assumed',
            });

          if (!memberError) institutionsAdded++;
        }

        // 5. Write person connections where both parties exist in the system
        for (const conn of (extracted.person_connections ?? [])) {
          if (!conn.name) continue;
          const targetId = personNameToId.get(conn.name.toLowerCase());
          if (!targetId || targetId === person.id) continue;

          // Skip if connection already exists
          const { data: existing } = await supabase
            .from('people_connections')
            .select('id')
            .or(`and(source_id.eq.${person.id},target_id.eq.${targetId}),and(source_id.eq.${targetId},target_id.eq.${person.id})`)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const { error: connError } = await supabase
            .from('people_connections')
            .insert({
              source_id: person.id,
              target_id: targetId,
              relationship_type: conn.relationship_type ?? 'affiliated',
              strength: conn.strength ?? 3,
              description: conn.description ?? null,
              bidirectional: true,
            });

          if (!connError) connectionsAdded++;
        }
      }

      results.push({
        name,
        id: person.id as string,
        bio_updated: !dry_run && extracted.short_bio.length > currentBio.length,
        institutions_added: institutionsAdded,
        connections_added: connectionsAdded,
        ghost_nodes: extracted.ghost_nodes ?? [],
      });

      // Rate limit: 3 seconds between people to avoid hammering Perplexity
      if (people.indexOf(person) < people.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }

    } catch (err) {
      results.push({
        name,
        id: person.id as string,
        bio_updated: false,
        institutions_added: 0,
        connections_added: 0,
        ghost_nodes: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const totalInstitutions = results.reduce((s, r) => s + r.institutions_added, 0);
  const totalConnections = results.reduce((s, r) => s + r.connections_added, 0);
  const allGhostNodes = [...new Set(results.flatMap((r) => r.ghost_nodes))];

  return NextResponse.json({
    ok: true,
    dry_run,
    enriched: results.filter((r) => !r.error).length,
    total_institutions_added: totalInstitutions,
    total_connections_added: totalConnections,
    new_ghost_nodes: allGhostNodes,
    results,
  });
}

// Cron-safe GET handler
export async function GET() {
  return POST(new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 5 }),
  }));
}
