import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/dossier?topic=xxx
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic param required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('topic, title, slug, published, featured, best_convergence_score, key_traditions, summary, synthesized_output, last_researched_at, published_at, llm_perspectives, recommended_components, selected_components, driving_question, overview_summary')
    .eq('topic', topic)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ dossier: data });
}

// PATCH /api/admin/dossier
// Accepts: { topic, featured? } or { topic, selected_components? } or { topic, driving_question? }
export async function PATCH(req: NextRequest) {
  const body = await req.json() as {
    topic: string;
    featured?: boolean;
    selected_components?: unknown[];
    driving_question?: string;
  };
  const { topic } = body;
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.featured === 'boolean') updates.featured = body.featured;
  if (Array.isArray(body.selected_components)) updates.selected_components = body.selected_components;
  if (typeof body.driving_question === 'string') updates.driving_question = body.driving_question.trim() || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('topic_dossiers')
    .update(updates)
    .eq('topic', topic);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...updates });
}
