/**
 * THREAD Tier 1 — Lightweight Connection Scan
 *
 * Pure database queries, zero LLM cost.
 * Detects candidate connections between published entities using:
 *   - shared_institution: two people affiliated with the same org
 *   - date_overlap: shared institution with overlapping year ranges
 *   - name_mention: entity A's bio text mentions entity B's name
 *
 * POST /api/admin/thread/scan  — manual trigger from admin UI
 * GET  /api/admin/thread/scan  — Vercel Cron trigger (runs full scan)
 * Body: { entity_id?: string, entity_type?: 'person' | 'institution', full_scan?: boolean }
 *
 * - With entity_id: scan that entity against all others (on publish)
 * - With full_scan: true: scan all published entities (batch job)
 * - No body / GET: full scan
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for full scans

interface PersonCard {
  id: string;
  full_name: string;
  short_bio: string | null;
}

interface InstitutionCard {
  id: string;
  name: string;
  short_bio: string | null;
}

interface PersonInstitution {
  person_id: string;
  institution_id: string;
  start_year: number | null;
  end_year: number | null;
  relationship: string | null;
}

interface CandidateInsert {
  entity_a_type: string;
  entity_a_id: string;
  entity_a_name: string;
  entity_b_type: string;
  entity_b_id: string;
  entity_b_name: string;
  detection_method: string;
  detection_details: Record<string, unknown>;
}

function yearsOverlap(
  aStart: number | null, aEnd: number | null,
  bStart: number | null, bEnd: number | null,
): boolean {
  const aS = aStart ?? 1000;
  const aE = aEnd ?? 2100;
  const bS = bStart ?? 1000;
  const bE = bEnd ?? 2100;
  return aS <= bE && bS <= aE;
}

function normalizeEntityPair(
  aType: string, aId: string, aName: string,
  bType: string, bId: string, bName: string,
): [string, string, string, string, string, string] {
  // Canonical ordering: lower UUID first to avoid duplicate (A,B) and (B,A)
  if (aId < bId) return [aType, aId, aName, bType, bId, bName];
  return [bType, bId, bName, aType, aId, aName];
}

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const { entity_id, entity_type, full_scan } = body as {
    entity_id?: string;
    entity_type?: 'person' | 'institution';
    full_scan?: boolean;
  };

  const candidates: CandidateInsert[] = [];
  let scannedEntities = 0;

  // ── Fetch all published entities ──────────────────────────────────────────

  const [
    { data: allPeople },
    { data: allInstitutions },
    { data: allMemberships },
    { data: ppConnections },
    { data: piConnections },
    { data: iiConnections },
  ] = await Promise.all([
    supabase
      .from('people_cards')
      .select('id, full_name, short_bio')
      .eq('status', 'published'),
    supabase
      .from('institution_cards')
      .select('id, name, short_bio')
      .eq('status', 'published'),
    supabase
      .from('people_institutions')
      .select('person_id, institution_id, start_year, end_year, relationship'),
    supabase
      .from('people_connections')
      .select('source_id, target_id'),
    supabase
      .from('people_institutions')
      .select('person_id, institution_id'),
    supabase
      .from('institution_connections')
      .select('source_id, target_id'),
  ]);

  const people: PersonCard[] = allPeople ?? [];
  const institutions: InstitutionCard[] = allInstitutions ?? [];
  const memberships: PersonInstitution[] = allMemberships ?? [];

  // Build set of existing direct connections to skip
  const existingEdges = new Set<string>();
  for (const e of (ppConnections ?? [])) {
    existingEdges.add(`${e.source_id}:${e.target_id}`);
    existingEdges.add(`${e.target_id}:${e.source_id}`);
  }
  for (const e of (piConnections ?? [])) {
    existingEdges.add(`${e.person_id}:${e.institution_id}`);
    existingEdges.add(`${e.institution_id}:${e.person_id}`);
  }
  for (const e of (iiConnections ?? [])) {
    existingEdges.add(`${e.source_id}:${e.target_id}`);
    existingEdges.add(`${e.target_id}:${e.source_id}`);
  }

  function alreadyConnected(idA: string, idB: string): boolean {
    return existingEdges.has(`${idA}:${idB}`) || existingEdges.has(`${idB}:${idA}`);
  }

  // ── Determine which entities to scan ─────────────────────────────────────

  let targetPeople: PersonCard[] = [];
  let targetInstitutions: InstitutionCard[] = [];

  if (entity_id && entity_type === 'person') {
    const p = people.find((x) => x.id === entity_id);
    if (p) targetPeople = [p];
  } else if (entity_id && entity_type === 'institution') {
    const inst = institutions.find((x) => x.id === entity_id);
    if (inst) targetInstitutions = [inst];
  } else if (full_scan) {
    targetPeople = people;
    targetInstitutions = institutions;
  } else {
    // Default: scan all — same as full_scan for now
    targetPeople = people;
    targetInstitutions = institutions;
  }

  // ── DETECTION A: Shared Institution ──────────────────────────────────────
  // Two people who share any institutional affiliation (regardless of dates)

  // Build institution → people mapping
  const instToPeople = new Map<string, PersonInstitution[]>();
  for (const m of memberships) {
    if (!instToPeople.has(m.institution_id)) instToPeople.set(m.institution_id, []);
    instToPeople.get(m.institution_id)!.push(m);
  }

  // Build person name lookup
  const personNameById = new Map(people.map((p) => [p.id, p.full_name]));
  const institutionNameById = new Map(institutions.map((i) => [i.id, i.name]));

  const targetPersonIds = new Set([...targetPeople.map((p) => p.id), ...targetInstitutions.map((i) => i.id)]);

  for (const [institutionId, members] of instToPeople) {
    if (members.length < 2) continue;
    const instName = institutionNameById.get(institutionId) ?? institutionId;

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const mA = members[i];
        const mB = members[j];

        // Only produce candidates if at least one entity is in our target set
        if (!targetPersonIds.has(mA.person_id) && !targetPersonIds.has(mB.person_id)) continue;
        if (alreadyConnected(mA.person_id, mB.person_id)) continue;

        const nameA = personNameById.get(mA.person_id);
        const nameB = personNameById.get(mB.person_id);
        if (!nameA || !nameB) continue;

        const [aType, aId, aName, bType, bId, bName] = normalizeEntityPair(
          'person', mA.person_id, nameA,
          'person', mB.person_id, nameB,
        );

        const hasOverlap = yearsOverlap(mA.start_year, mA.end_year, mB.start_year, mB.end_year);
        const method = hasOverlap ? 'date_overlap' : 'shared_institution';

        candidates.push({
          entity_a_type: aType, entity_a_id: aId, entity_a_name: aName,
          entity_b_type: bType, entity_b_id: bId, entity_b_name: bName,
          detection_method: method,
          detection_details: {
            shared_institution_id: institutionId,
            institution_name: instName,
            a_years: { start: mA.start_year, end: mA.end_year, role: mA.relationship },
            b_years: { start: mB.start_year, end: mB.end_year, role: mB.relationship },
            overlap: hasOverlap,
          },
        });
        scannedEntities++;
      }
    }
  }

  // ── DETECTION B: Name Mention in Bio ─────────────────────────────────────
  // Entity A's bio text contains entity B's name (but no direct edge exists)

  const allEntities: Array<{ id: string; type: 'person' | 'institution'; name: string; bio: string | null }> = [
    ...people.map((p) => ({ id: p.id, type: 'person' as const, name: p.full_name, bio: p.short_bio })),
    ...institutions.map((i) => ({ id: i.id, type: 'institution' as const, name: i.name, bio: i.short_bio })),
  ];

  const targetIds = new Set([
    ...targetPeople.map((p) => p.id),
    ...targetInstitutions.map((i) => i.id),
  ]);

  // For name mention, only scan target entities' bios (keep it bounded)
  const targetEntities = allEntities.filter((e) => targetIds.has(e.id));

  for (const target of targetEntities) {
    if (!target.bio) continue;
    const bioLower = target.bio.toLowerCase();

    for (const other of allEntities) {
      if (other.id === target.id) continue;
      if (alreadyConnected(target.id, other.id)) continue;

      // Check if the bio mentions the other entity's name
      const otherNameLower = other.name.toLowerCase();
      if (otherNameLower.length < 4) continue; // skip very short names
      if (!bioLower.includes(otherNameLower)) continue;

      const [aType, aId, aName, bType, bId, bName] = normalizeEntityPair(
        target.type, target.id, target.name,
        other.type, other.id, other.name,
      );

      candidates.push({
        entity_a_type: aType, entity_a_id: aId, entity_a_name: aName,
        entity_b_type: bType, entity_b_id: bId, entity_b_name: bName,
        detection_method: 'name_mention',
        detection_details: {
          mention_found_in: target.type === 'person' ? 'person_bio' : 'institution_bio',
          source_entity_id: target.id,
          source_entity_name: target.name,
          mentioned_entity_id: other.id,
          mentioned_entity_name: other.name,
        },
      });
      scannedEntities++;
    }
  }

  // ── Deduplicate within this batch ─────────────────────────────────────────
  // (DB UNIQUE constraint handles cross-batch dupes — unique violations are skipped)

  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((c) => {
    const key = `${c.entity_a_id}:${c.entity_b_id}:${c.detection_method}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Insert candidates (skip existing via unique constraint) ───────────────

  let inserted = 0;
  if (uniqueCandidates.length > 0) {
    // Insert one at a time so unique violations (dupes) don't abort the batch
    for (const candidate of uniqueCandidates) {
      const { error } = await supabase
        .from('discovery_candidates')
        .insert(candidate);
      if (!error) {
        inserted++;
      } else if (!(error.code === '23505' || error.message?.includes('unique'))) {
        // Log unexpected errors but keep going
        console.error('[thread/scan] Insert error:', error.code, error.message);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    entities_scanned: people.length + institutions.length,
    candidates_found: uniqueCandidates.length,
    candidates_inserted: inserted,
    breakdown: {
      shared_institution: uniqueCandidates.filter((c) => c.detection_method === 'shared_institution').length,
      date_overlap: uniqueCandidates.filter((c) => c.detection_method === 'date_overlap').length,
      name_mention: uniqueCandidates.filter((c) => c.detection_method === 'name_mention').length,
    },
  });
}

// Vercel Cron calls GET — proxy to the full scan logic
export async function GET() {
  return POST(new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_scan: true }),
  }));
}
