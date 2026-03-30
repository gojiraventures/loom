import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/dossier?topic=xxx
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic param required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('topic, title, slug, published, best_convergence_score, key_traditions, summary, synthesized_output, last_researched_at')
    .eq('topic', topic)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ dossier: data });
}
