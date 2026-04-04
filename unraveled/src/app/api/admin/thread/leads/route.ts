/**
 * THREAD Research Leads — list
 * GET /api/admin/thread/leads?status=new&limit=20&offset=0
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'new';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const query = supabase
    .from('research_leads')
    .select(`
      id,
      title,
      pitch_summary,
      evidence_chain,
      suggested_entities_to_add,
      suggested_lenses,
      estimated_research_depth,
      research_potential_score,
      status,
      created_at,
      deep_research_output,
      discovery_suggestions (
        entity_a_name, entity_a_type,
        entity_b_name, entity_b_type,
        suggested_relationship_type,
        confidence_score,
        anomaly_notes
      ),
      discovery_interestingness (
        surprise_score,
        bridge_score,
        covert_signal_score,
        temporal_anomaly_score,
        research_potential_score,
        anomaly_flags
      )
    `)
    .order('research_potential_score', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data ?? [] });
}
