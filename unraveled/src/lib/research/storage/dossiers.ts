import { createServerSupabaseClient } from '@/lib/supabase';
import type { SynthesizedOutput } from '../types';

export async function upsertTopicDossier(params: {
  topic: string;
  title: string;
  synthesized_output: SynthesizedOutput;
  finding_count: number;
  source_count: number;
  convergence_score: number;
  traditions: string[];
  open_questions: string[];
}): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('topic_dossiers').upsert({
    topic: params.topic,
    title: params.title,
    summary: params.synthesized_output.executive_summary,
    synthesized_output: params.synthesized_output,
    best_convergence_score: params.convergence_score,
    key_traditions: params.traditions,
    key_open_questions: params.open_questions,
    last_researched_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'topic' });
  if (error) throw new Error(`upsertTopicDossier: ${error.message}`);

  // Increment counters
  await Promise.resolve(
    supabase.rpc('increment_dossier_counters', {
      p_topic: params.topic,
      p_findings: params.finding_count,
      p_sources: params.source_count,
    }),
  ).catch(() => null);
}

export async function getDossier(topic: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_dossiers')
    .select()
    .eq('topic', topic)
    .single();
  return data;
}
