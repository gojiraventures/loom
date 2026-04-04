import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { pickComponents } from '@/lib/interactive/picker';
import type { SynthesizedOutput } from '@/lib/research/types';

// POST /api/admin/components/recommend
// Body: { topic: string }
// Runs the component picker against the existing synthesized_output and saves
// recommended_components to the DB. Also copies recs → selected_components so
// the topic page can render them immediately (admin can disable unwanted ones).
export async function POST(req: NextRequest) {
  const { topic } = await req.json() as { topic: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output')
    .eq('topic', topic)
    .single();

  if (error || !data?.synthesized_output) {
    return NextResponse.json({ error: 'No synthesized output found' }, { status: 404 });
  }

  const recommendations = pickComponents(data.synthesized_output as SynthesizedOutput);

  // Seed selected_components from recommendations (all enabled) if not already set
  const { data: existing } = await supabase
    .from('topic_dossiers')
    .select('selected_components')
    .eq('topic', topic)
    .single();

  const update: Record<string, unknown> = { recommended_components: recommendations };
  if (!existing?.selected_components || (existing.selected_components as unknown[]).length === 0) {
    update.selected_components = recommendations;
  }

  await supabase
    .from('topic_dossiers')
    .update(update)
    .eq('topic', topic);

  return NextResponse.json({ recommendations });
}
