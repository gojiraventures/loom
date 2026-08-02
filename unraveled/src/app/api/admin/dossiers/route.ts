/**
 * GET /api/admin/dossiers
 *
 * Complete list of every dossier (published and draft) — the single source of
 * truth for the admin dossier index. Queries topic_dossiers directly, one bulk
 * call, no cap and no dependency on research_sessions history.
 *
 * The list page previously derived its topic set from /api/admin/sessions
 * (limit 50, ordered by recency across ALL sessions of every type), then made
 * one /api/admin/dossier fetch per topic. Once total session volume exceeded
 * 50, older published articles' originating sessions rotated out of that
 * window and silently disappeared from the list even though they were live.
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('topic, title, slug, published, featured, best_convergence_score, key_traditions, summary, synthesized_output, last_researched_at, published_at, updated_at, llm_perspectives, recommended_components, driving_question, overview_summary')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dossiers: data ?? [] });
}
