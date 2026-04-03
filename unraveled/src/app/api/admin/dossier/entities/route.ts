/**
 * GET  /api/admin/dossier/entities?session_id=...
 *   Returns people and institutions extracted from a research session.
 *   Queries both source_session_id stubs and people_topics/institution_topics links.
 *
 * POST /api/admin/dossier/entities
 *   Body: { type: 'person'|'institution', id: string, action: 'draft'|'skip' }
 *   Promotes a needs_review entity to draft, or archives it.
 *
 * PUT /api/admin/dossier/entities
 *   Body: { session_id: string, topic: string }
 *   Runs entity extraction immediately for the given session (useful for sessions that
 *   pre-date the editor_pass job or where extraction failed silently).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { extractAndQueueEntities } from '@/lib/research/entity-extractor';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'session_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // People: created by this session (source_session_id) OR linked via people_topics
  const [{ data: stubPeople }, { data: linkedPeople }] = await Promise.all([
    supabase
      .from('people')
      .select('id, full_name, slug, status, credibility_tier, short_bio, extraction_notes, key_positions')
      .eq('source_session_id', sessionId),
    supabase
      .from('people_topics')
      .select('role, context, person:person_id(id, full_name, slug, status, credibility_tier, short_bio)')
      .eq('topic_id', sessionId),
  ]);

  // Institutions: created by this session OR linked via institution_topics
  const [{ data: stubInstitutions }, { data: linkedInstitutions }] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, name, slug, status, institution_type, short_bio, extraction_notes')
      .eq('source_session_id', sessionId),
    supabase
      .from('institution_topics')
      .select('role, context, institution:institution_id(id, name, slug, status, institution_type, short_bio)')
      .eq('topic_id', sessionId),
  ]);

  // Merge: stub records + linked records (dedupe by id)
  const peopleMap = new Map<string, Record<string, unknown>>();

  for (const p of stubPeople ?? []) {
    peopleMap.set(p.id, {
      ...p,
      topic_role: (p.key_positions as string[])?.[0] ?? null,
      topic_context: p.short_bio,
      source: 'extracted',
    });
  }
  for (const link of linkedPeople ?? []) {
    const p = link.person as unknown as Record<string, unknown> | null;
    if (!p || !p.id) continue;
    const id = p.id as string;
    if (!peopleMap.has(id)) {
      peopleMap.set(id, { ...p, topic_role: link.role, topic_context: link.context, source: 'linked' });
    }
  }

  const institutionMap = new Map<string, Record<string, unknown>>();

  for (const i of stubInstitutions ?? []) {
    institutionMap.set(i.id, {
      ...i,
      topic_role: null,
      topic_context: i.short_bio,
      source: 'extracted',
    });
  }
  for (const link of linkedInstitutions ?? []) {
    const inst = link.institution as unknown as Record<string, unknown> | null;
    if (!inst || !inst.id) continue;
    const id = inst.id as string;
    if (!institutionMap.has(id)) {
      institutionMap.set(id, { ...inst, topic_role: link.role, topic_context: link.context, source: 'linked' });
    }
  }

  return NextResponse.json({
    people: [...peopleMap.values()],
    institutions: [...institutionMap.values()],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { type: 'person' | 'institution'; id: string; action: 'draft' | 'skip' };
  const { type, id, action } = body;

  if (!type || !id || !action) {
    return NextResponse.json({ error: 'type, id, and action are required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const newStatus = action === 'draft' ? 'draft' : 'archived';
  const table = type === 'person' ? 'people' : 'institutions';

  const { error } = await supabase
    .from(table)
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: newStatus });
}

// ── PUT: trigger extraction on demand ─────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const body = await req.json() as { session_id: string; topic: string };
  const { session_id, topic } = body;
  if (!session_id || !topic) {
    return NextResponse.json({ error: 'session_id and topic required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const { data: dossier, error: dossierErr } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output')
    .eq('topic', topic)
    .single();

  if (dossierErr || !dossier?.synthesized_output) {
    return NextResponse.json({ error: 'No synthesized_output found — run assembly first' }, { status: 404 });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;

  let findings: Awaited<ReturnType<typeof getFindingsBySession>> = [];
  try {
    findings = await getFindingsBySession(session_id);
  } catch {
    // non-fatal — extract without findings context
  }

  const result = await extractAndQueueEntities(session_id, topic, output, findings);

  return NextResponse.json({
    ok: true,
    created_people: result.created_people,
    linked_people: result.linked_people,
    created_institutions: result.created_institutions,
    linked_institutions: result.linked_institutions,
    errors: result.errors,
  });
}
