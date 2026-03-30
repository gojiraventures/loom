import { createServerSupabaseClient } from '@/lib/supabase';
import type { ValidationResult } from '../types';

export async function insertValidations(
  sessionId: string,
  validations: ValidationResult[],
): Promise<void> {
  if (validations.length === 0) return;
  const supabase = createServerSupabaseClient();
  const rows = validations.map((v) => ({
    session_id: sessionId,
    finding_id: v.finding_id,
    reviewer_agent_id: v.reviewer_agent_id,
    verdict: v.verdict,
    reasoning: v.reasoning,
    additional_sources: v.additional_sources,
  }));
  const { error } = await supabase.from('finding_validations').insert(rows);
  if (error) throw new Error(`insertValidations: ${error.message}`);
}

export async function getValidationsBySession(sessionId: string): Promise<ValidationResult[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('finding_validations')
    .select()
    .eq('session_id', sessionId);
  if (error) throw new Error(`getValidationsBySession: ${error.message}`);
  return (data ?? []) as ValidationResult[];
}
