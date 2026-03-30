import { createServerSupabaseClient } from '@/lib/supabase';
import type { ConvergenceAnalysis } from '../types';

export async function insertConvergenceAnalysis(
  sessionId: string,
  analysis: ConvergenceAnalysis,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('convergence_analyses').insert({
    session_id: sessionId,
    agent_id: analysis.agent_id,
    convergence_points: analysis.convergence_points,
    timeline_gaps: analysis.timeline_gaps,
    geographic_clusters: analysis.geographic_clusters,
  });
  if (error) throw new Error(`insertConvergenceAnalysis: ${error.message}`);
}

export async function getConvergenceBySession(sessionId: string): Promise<ConvergenceAnalysis[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('convergence_analyses')
    .select()
    .eq('session_id', sessionId);
  if (error) throw new Error(`getConvergenceBySession: ${error.message}`);
  return (data ?? []) as ConvergenceAnalysis[];
}
