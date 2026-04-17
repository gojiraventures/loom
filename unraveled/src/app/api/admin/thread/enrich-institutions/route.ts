/**
 * THREAD Institution Enrichment — Batch institution data pipeline
 *
 * POST /api/admin/thread/enrich-institutions
 * Body: { institution_ids?: string[], limit?: number, dry_run?: boolean }
 *
 * For each published institution:
 *  1. Calls Perplexity to research history, programs, key personnel, connections
 *  2. Uses Claude to extract structured data into the full institution schema
 *  3. Updates institution_cards.bio and .short_bio
 *  4. Writes institution_bio_sections (history, controversies, programs, funding)
 *  5. Writes institution_events (key dates, operations, scandals)
 *  6. Writes institution_departments (internal divisions)
 *  7. Writes people_institutions (links to people already in system)
 *  8. Writes institution_connections (links to other institutions in system)
 *
 * dry_run: true → returns what would be written without touching the DB
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryPerplexity, queryGemini } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SYSTEM = `You are a research analyst building a structured knowledge graph of institutions.
Given web research about an institution, extract structured data to enrich our database.
Be accurate and specific. Only include what the research supports. Return ONLY valid JSON. No en dashes (–) or em dashes (—) in any text fields. Use hyphens (-) sparingly.`;

function buildPrompt(
  name: string,
  currentBio: string,
  research: string,
  peopleInSystem: string[],
  institutionsInSystem: string[],
): string {
  return `Enriching the database profile for institution: "${name}"

CURRENT BIO (may be thin):
${currentBio || 'None'}

WEB RESEARCH:
${research}

PEOPLE IN OUR SYSTEM (check for personnel connections):
${peopleInSystem.join(', ')}

INSTITUTIONS IN OUR SYSTEM (check for connections):
${institutionsInSystem.join(', ')}

Extract and return this JSON:
{
  "bio": "2-4 paragraph factual overview covering: origin, stated purpose, structure, historical significance, and any documented controversies. Prioritize specific named facts over vague generalities.",
  "short_bio": "1-2 sentence summary for cards and search results.",
  "bio_sections": [
    {
      "section_type": "key_history",
      "title": "Section heading",
      "content": "Section body — specific, factual, citable. Use markdown: **bold**, bullet lists with -, blockquotes with >"
    }
  ],
  "events": [
    {
      "event_type": "founding|operation|scandal|dissolution|reorganization|legislation|publication|other",
      "title": "Event name",
      "event_date": "YYYY or YYYY-MM-DD",
      "end_date": "YYYY or null",
      "description": "1-2 sentence factual description",
      "classified": false,
      "declassified": false,
      "declassified_source": null
    }
  ],
  "departments": [
    {
      "name": "Division or program name",
      "short_name": "Acronym or null",
      "relevance_summary": "Why this division is notable — one sentence",
      "founded_year": 1950
    }
  ],
  "personnel": [
    {
      "name": "Full name",
      "relationship": "director|founder|member|employee|advisor|contractor|operative|whistleblower",
      "role_title": "Specific title or null",
      "start_year": 1960,
      "end_year": 1965,
      "description": "One sentence on the nature of their involvement",
      "covert": false
    }
  ],
  "institution_connections": [
    {
      "institution_name": "Exact name from our system or a new name",
      "relationship_type": "funded|contracted|affiliated|predecessor|successor|parent|subsidiary|front_for|partner",
      "description": "One sentence on the nature of the connection",
      "start_year": null,
      "end_year": null,
      "covert": false
    }
  ],
  "ghost_nodes": ["Names of people or institutions mentioned in research that should be added but are not yet in our system"]
}

section_type options: key_history, controversies, programs, funding, structure, other
Include 1-4 bio_sections covering different angles. Be specific — name names, cite years, describe documented programs.`;
}

interface ExtractionResult {
  bio: string;
  short_bio: string;
  bio_sections: Array<{
    section_type: string;
    title: string;
    content: string;
  }>;
  events: Array<{
    event_type: string;
    title: string;
    event_date: string | null;
    end_date: string | null;
    description: string;
    classified: boolean;
    declassified: boolean;
    declassified_source: string | null;
  }>;
  departments: Array<{
    name: string;
    short_name: string | null;
    relevance_summary: string;
    founded_year: number | null;
  }>;
  personnel: Array<{
    name: string;
    relationship: string;
    role_title: string | null;
    start_year: number | null;
    end_year: number | null;
    description: string;
    covert: boolean;
  }>;
  institution_connections: Array<{
    institution_name: string;
    relationship_type: string;
    description: string;
    start_year: number | null;
    end_year: number | null;
    covert: boolean;
  }>;
  ghost_nodes: string[];
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const { institution_ids, limit = 5, dry_run = false } = body as {
    institution_ids?: string[];
    limit?: number;
    dry_run?: boolean;
  };

  // Fetch institutions to enrich — only those not yet enriched by THREAD
  let query = supabase
    .from('institution_cards')
    .select('id, name, short_bio, bio, institution_type, status')
    .eq('status', 'published')
    .is('bio_enriched_at', null)
    .order('name');

  if (institution_ids?.length) {
    query = query.in('id', institution_ids);
  }

  const { data: institutions } = await query.limit(Math.min(limit, 10));
  if (!institutions || institutions.length === 0) {
    return NextResponse.json({ ok: true, message: 'No institutions to enrich', enriched: 0 });
  }

  // Fetch all entity names for cross-referencing
  const [{ data: allPeople }, { data: allInstitutions }] = await Promise.all([
    supabase.from('people_cards').select('id, full_name').eq('status', 'published'),
    supabase.from('institution_cards').select('id, name').eq('status', 'published'),
  ]);

  const peopleInSystem = (allPeople ?? []).map((p) => p.full_name as string);
  const institutionsInSystem = (allInstitutions ?? []).map((i) => i.name as string);

  const personNameToId = new Map((allPeople ?? []).map((p) => [
    (p.full_name as string).toLowerCase(),
    p.id as string,
  ]));
  const instNameToId = new Map((allInstitutions ?? []).map((i) => [
    (i.name as string).toLowerCase(),
    i.id as string,
  ]));

  const results: Array<{
    name: string;
    id: string;
    bio_updated: boolean;
    sections_added: number;
    events_added: number;
    departments_added: number;
    personnel_linked: number;
    connections_added: number;
    ghost_nodes: string[];
    error?: string;
  }> = [];

  for (const inst of institutions) {
    const name = inst.name as string;
    const currentBio = (inst.short_bio as string) ?? '';

    try {
      // 1. Perplexity research
      const researchQuery = `Research the institution "${name}" and provide:
1. Full history: founding, founders, stated mission, organizational structure
2. Key programs, operations, or initiatives — include names, dates, and outcomes
3. Notable personnel: directors, key members, whistleblowers — include names and years
4. Documented controversies, congressional investigations, or declassified revelations
5. Funding sources and connections to other organizations or government agencies
6. Any covert programs, front organizations, or hidden affiliations
Be specific with names, dates, and documented facts. This is for an investigative knowledge graph.`;

      const researchResult = await queryPerplexity(researchQuery).catch(() => ({ content: '' }));
      const research = researchResult.content || 'No research available.';

      // 2. Gemini structured extraction
      const { content } = await queryGemini(
        buildPrompt(name, currentBio, research, peopleInSystem, institutionsInSystem),
        SYSTEM,
        4096,
      );

      let extracted: ExtractionResult;
      try {
        const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        extracted = JSON.parse(cleaned) as ExtractionResult;
      } catch {
        results.push({ name, id: inst.id as string, bio_updated: false, sections_added: 0, events_added: 0, departments_added: 0, personnel_linked: 0, connections_added: 0, ghost_nodes: [], error: 'JSON parse failed' });
        continue;
      }

      let sectionsAdded = 0, eventsAdded = 0, departmentsAdded = 0, personnelLinked = 0, connectionsAdded = 0;

      if (!dry_run) {
        // 3. Update bio fields + stamp enrichment timestamp (always)
        const updates: Record<string, string> = { bio_enriched_at: new Date().toISOString() };
        if (extracted.bio && extracted.bio.length > ((inst.bio as string) ?? '').length) {
          updates.bio = extracted.bio;
        }
        if (extracted.short_bio && extracted.short_bio.length > currentBio.length) {
          updates.short_bio = extracted.short_bio;
        }
        await supabase.from('institution_cards').update(updates).eq('id', inst.id);

        // 4. Write bio sections
        for (const section of (extracted.bio_sections ?? [])) {
          if (!section.title || !section.content) continue;
          const { error } = await supabase.from('institution_bio_sections').insert({
            institution_id: inst.id,
            section_type: section.section_type ?? 'other',
            title: section.title,
            content: section.content,
          });
          if (!error) sectionsAdded++;
        }

        // 5. Write events
        for (const ev of (extracted.events ?? [])) {
          if (!ev.title) continue;
          const { error } = await supabase.from('institution_events').insert({
            institution_id: inst.id,
            event_type: ev.event_type ?? 'other',
            title: ev.title,
            event_date: ev.event_date ?? null,
            end_date: ev.end_date ?? null,
            description: ev.description ?? null,
            classified: ev.classified ?? false,
            declassified: ev.declassified ?? false,
            declassified_source: ev.declassified_source ?? null,
          });
          if (!error) eventsAdded++;
        }

        // 6. Write departments
        for (const dept of (extracted.departments ?? [])) {
          if (!dept.name) continue;
          const { error } = await supabase.from('institution_departments').insert({
            institution_id: inst.id,
            name: dept.name,
            short_name: dept.short_name ?? null,
            relevance_summary: dept.relevance_summary ?? null,
            founded_year: dept.founded_year ?? null,
          });
          if (!error) departmentsAdded++;
        }

        // 7. Write people_institutions (link to people in system)
        for (const p of (extracted.personnel ?? [])) {
          if (!p.name) continue;
          const personId = personNameToId.get(p.name.toLowerCase());
          if (!personId) continue; // Only link people already in system

          // Skip if membership already exists
          const { data: existing } = await supabase
            .from('people_institutions')
            .select('id')
            .eq('person_id', personId)
            .eq('institution_id', inst.id)
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from('people_institutions').insert({
            person_id: personId,
            institution_id: inst.id,
            relationship: p.relationship ?? 'member',
            role_title: p.role_title ?? null,
            start_year: p.start_year ?? null,
            end_year: p.end_year ?? null,
            description: p.description ?? null,
            covert: p.covert ?? false,
            membership_status: 'assumed',
          });
          if (!error) personnelLinked++;
        }

        // 8. Write institution_connections (link to institutions in system)
        for (const conn of (extracted.institution_connections ?? [])) {
          if (!conn.institution_name) continue;
          const targetId = instNameToId.get(conn.institution_name.toLowerCase())
            ?? (allInstitutions ?? []).find((i) =>
              (i.name as string).toLowerCase().includes(conn.institution_name.toLowerCase().slice(0, 12))
            )?.id as string | undefined;
          if (!targetId || targetId === inst.id) continue;

          // Skip if connection already exists
          const { data: existing } = await supabase
            .from('institution_connections')
            .select('id')
            .or(`and(source_id.eq.${inst.id},target_id.eq.${targetId}),and(source_id.eq.${targetId},target_id.eq.${inst.id})`)
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { error } = await supabase.from('institution_connections').insert({
            source_id: inst.id,
            target_id: targetId,
            relationship_type: conn.relationship_type ?? 'affiliated',
            description: conn.description ?? null,
            start_year: conn.start_year ?? null,
            end_year: conn.end_year ?? null,
            covert: conn.covert ?? false,
          });
          if (!error) connectionsAdded++;
        }
      }

      results.push({
        name,
        id: inst.id as string,
        bio_updated: !dry_run && (extracted.bio?.length ?? 0) > ((inst.bio as string) ?? '').length,
        sections_added: sectionsAdded,
        events_added: eventsAdded,
        departments_added: departmentsAdded,
        personnel_linked: personnelLinked,
        connections_added: connectionsAdded,
        ghost_nodes: extracted.ghost_nodes ?? [],
      });

      // Rate limit between institutions
      if (institutions.indexOf(inst) < institutions.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      results.push({
        name,
        id: inst.id as string,
        bio_updated: false,
        sections_added: 0,
        events_added: 0,
        departments_added: 0,
        personnel_linked: 0,
        connections_added: 0,
        ghost_nodes: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    ok: true,
    dry_run,
    enriched: results.filter((r) => !r.error).length,
    total_sections: results.reduce((s, r) => s + r.sections_added, 0),
    total_events: results.reduce((s, r) => s + r.events_added, 0),
    total_departments: results.reduce((s, r) => s + r.departments_added, 0),
    total_personnel_linked: results.reduce((s, r) => s + r.personnel_linked, 0),
    total_connections: results.reduce((s, r) => s + r.connections_added, 0),
    ghost_nodes: [...new Set(results.flatMap((r) => r.ghost_nodes))],
    results,
  });
}

export async function GET() {
  return POST(new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 5 }),
  }));
}
