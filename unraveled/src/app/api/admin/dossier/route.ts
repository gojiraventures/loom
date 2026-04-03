import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/dossier?topic=xxx
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic param required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('topic, title, slug, published, featured, best_convergence_score, key_traditions, summary, synthesized_output, last_researched_at, llm_perspectives')
    .eq('topic', topic)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ dossier: data });
}

// PATCH /api/admin/dossier — toggle featured
export async function PATCH(req: NextRequest) {
  const { topic, featured } = await req.json();
  if (!topic || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'topic and featured (boolean) required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('topic_dossiers')
    .update({ featured })
    .eq('topic', topic);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, featured });
}
