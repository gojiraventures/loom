import { createServerSupabaseClient } from '@/lib/supabase';
import type { DebateRecord } from '../types';

export async function insertDebateRecord(
  sessionId: string,
  debate: DebateRecord,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('debate_records').insert({
    session_id: sessionId,
    advocate_case: debate.advocate_case,
    advocate_strongest_points: debate.advocate_strongest_points,
    advocate_confidence: debate.advocate_confidence,
    skeptic_case: debate.skeptic_case,
    skeptic_strongest_points: debate.skeptic_strongest_points,
    skeptic_confidence: debate.skeptic_confidence,
    unresolved_tensions: debate.unresolved_tensions,
    agreed_facts: debate.agreed_facts,
    rounds: debate.rounds,
  });
  if (error) throw new Error(`insertDebateRecord: ${error.message}`);
}

export async function getDebateBySession(sessionId: string): Promise<DebateRecord | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('debate_records')
    .select()
    .eq('session_id', sessionId)
    .single();
  return data as DebateRecord | null;
}
