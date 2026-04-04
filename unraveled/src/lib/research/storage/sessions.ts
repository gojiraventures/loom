import { createServerSupabaseClient } from '@/lib/supabase';
import type { ResearchSession, SessionStatus, RaciAssignment } from '../types';

export async function createSession(params: {
  topic: string;
  title: string;
  research_questions: string[];
  description?: string;
  source_urls?: string;
  session_type?: string;
}): Promise<ResearchSession> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_sessions')
    .insert({ ...params, status: 'pending', started_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`createSession: ${error.message}`);
  return data as ResearchSession;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  extras: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString(), ...extras };
  if (status === 'complete' || status === 'failed') {
    update.completed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('research_sessions')
    .update(update)
    .eq('id', sessionId);
  if (error) throw new Error(`updateSessionStatus: ${error.message}`);
}

export async function setRaciAssignments(
  sessionId: string,
  raci: RaciAssignment,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const flat: Record<string, string> = {};
  for (const agentId of raci.responsible) flat[agentId] = 'responsible';
  for (const agentId of raci.accountable) flat[agentId] = 'accountable';
  for (const agentId of raci.consulted) flat[agentId] = 'consulted';
  for (const agentId of raci.informed) flat[agentId] = 'informed';
  const { error } = await supabase
    .from('research_sessions')
    .update({ raci_assignments: flat })
    .eq('id', sessionId);
  if (error) throw new Error(`setRaciAssignments: ${error.message}`);
}

export async function logSessionError(sessionId: string, message: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await Promise.resolve(
    supabase.rpc('append_session_error', { session_id: sessionId, error_msg: message }),
  ).catch(() => null); // Best-effort
}

/**
 * Atomically acquires the pipeline lock for a session.
 * For 'researched' sessions also flips status → 'cross_validating'.
 * Returns true if this caller won the lock; false if already locked.
 */
export async function claimSessionForContinue(sessionId: string, currentStatus: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();

  if (currentStatus === 'researched') {
    // Atomic: flip status AND set lock in one update — only succeeds if still 'researched' and unlocked
    const { data } = await supabase
      .from('research_sessions')
      .update({ status: 'cross_validating', pipeline_locked: true, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'researched')
      .eq('pipeline_locked', false)
      .select('id');
    return Array.isArray(data) && data.length > 0;
  }

  // For mid-pipeline states: just acquire the lock without changing status
  const { data } = await supabase
    .from('research_sessions')
    .update({ pipeline_locked: true, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('pipeline_locked', false)
    .select('id');
  return Array.isArray(data) && data.length > 0;
}

/** Release the pipeline lock. Always call in a finally block. */
export async function releaseSessionLock(sessionId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  await supabase
    .from('research_sessions')
    .update({ pipeline_locked: false })
    .eq('id', sessionId);
}

export async function getSession(sessionId: string): Promise<ResearchSession | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('research_sessions')
    .select()
    .eq('id', sessionId)
    .single();
  return data as ResearchSession | null;
}
