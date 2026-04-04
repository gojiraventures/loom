/**
 * THREAD Suggestions — Review queue
 *
 * GET /api/admin/thread/suggestions?status=pending&limit=50&offset=0
 * PATCH /api/admin/thread/suggestions  Body: { id, status: 'approved'|'rejected'|'needs_research' }
 *
 * On approval: writes the connection to the appropriate graph relationship table
 * (people_connections, people_institutions, or institution_connections)
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const query = supabase
    .from('discovery_suggestions')
    .select(`
      id,
      entity_a_type, entity_a_id, entity_a_name,
      entity_b_type, entity_b_id, entity_b_name,
      suggested_relationship_type,
      suggested_strength,
      confidence_score,
      llm_reasoning,
      evidence_summary,
      suggested_new_entities,
      anomaly_notes,
      status,
      reviewed_at,
      created_at,
      discovery_interestingness (
        surprise_score,
        bridge_score,
        covert_signal_score,
        temporal_anomaly_score,
        research_potential_score,
        anomaly_flags
      )
    `)
    .order('confidence_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ suggestions: data ?? [], total: data?.length ?? 0 });
}

export async function PATCH(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json();
  const { id, status } = body as { id: string; status: 'approved' | 'rejected' | 'needs_research' };

  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  // Fetch the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from('discovery_suggestions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  // Update status
  const { error: updateError } = await supabase
    .from('discovery_suggestions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If approved, write to the appropriate graph relationship table
  if (status === 'approved') {
    const { entity_a_type, entity_a_id, entity_b_type, entity_b_id,
            suggested_relationship_type, suggested_strength, evidence_summary } = suggestion;

    let writeError: unknown = null;

    if (entity_a_type === 'person' && entity_b_type === 'person') {
      // person ↔ person
      const { error } = await supabase.from('people_connections').insert({
        source_id: entity_a_id,
        target_id: entity_b_id,
        relationship_type: suggested_relationship_type,
        strength: suggested_strength ?? 3,
        description: evidence_summary ?? null,
        bidirectional: true,
      });
      writeError = error;

    } else if (entity_a_type === 'person' && entity_b_type === 'institution') {
      // person → institution
      const { error } = await supabase.from('people_institutions').insert({
        person_id: entity_a_id,
        institution_id: entity_b_id,
        relationship: suggested_relationship_type,
        description: evidence_summary ?? null,
        membership_status: 'ai_inferred',
      });
      writeError = error;

    } else if (entity_a_type === 'institution' && entity_b_type === 'person') {
      // institution ← person (flip)
      const { error } = await supabase.from('people_institutions').insert({
        person_id: entity_b_id,
        institution_id: entity_a_id,
        relationship: suggested_relationship_type,
        description: evidence_summary ?? null,
        membership_status: 'ai_inferred',
      });
      writeError = error;

    } else if (entity_a_type === 'institution' && entity_b_type === 'institution') {
      // institution ↔ institution
      const { error } = await supabase.from('institution_connections').insert({
        source_id: entity_a_id,
        target_id: entity_b_id,
        relationship_type: suggested_relationship_type,
        description: evidence_summary ?? null,
      });
      writeError = error;
    }

    if (writeError) {
      console.error('[thread/suggestions] Error writing approved connection to graph:', writeError);
      // Don't fail the response — suggestion is still marked approved
      return NextResponse.json({
        ok: true,
        status: 'approved',
        graph_write_warning: 'Could not write to graph table — column schema may need updating',
      });
    }
  }

  return NextResponse.json({ ok: true, status });
}
