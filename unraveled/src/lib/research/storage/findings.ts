import { createServerSupabaseClient } from '@/lib/supabase';
import type { AgentFinding } from '../types';

export async function insertFindings(
  sessionId: string,
  findings: AgentFinding[],
  llmModel: string,
  tokenInfo?: { input: number; output: number },
): Promise<string[]> {
  if (findings.length === 0) return [];
  const supabase = createServerSupabaseClient();

  const rows = findings.map((f) => ({
    session_id: sessionId,
    agent_id: f.agent_id,
    claim_text: f.claim_text,
    claim_type: f.claim_type,
    evidence_type: f.evidence_type,
    strength: f.strength,
    confidence: f.confidence,
    sources: f.sources,
    traditions: f.traditions,
    time_period: f.time_period,
    geographic_scope: f.geographic_scope,
    open_questions: f.open_questions,
    raw_excerpts: f.raw_excerpts,
    llm_model: llmModel,
    input_tokens: tokenInfo?.input,
    output_tokens: tokenInfo?.output,
  }));

  const { data, error } = await supabase
    .from('agent_findings')
    .insert(rows)
    .select('id');
  if (error) throw new Error(`insertFindings: ${error.message}`);
  return (data ?? []).map((r: { id: string }) => r.id);
}

export async function getFindingsBySession(sessionId: string): Promise<(AgentFinding & { id: string })[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('agent_findings')
    .select()
    .eq('session_id', sessionId)
    .order('confidence', { ascending: false });
  if (error) throw new Error(`getFindingsBySession: ${error.message}`);
  return (data ?? []) as (AgentFinding & { id: string })[];
}

export async function getFindingsByAgent(sessionId: string, agentId: string): Promise<(AgentFinding & { id: string })[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('agent_findings')
    .select()
    .eq('session_id', sessionId)
    .eq('agent_id', agentId);
  if (error) throw new Error(`getFindingsByAgent: ${error.message}`);
  return (data ?? []) as (AgentFinding & { id: string })[];
}

/**
 * Gets ALL findings for a topic across every research session —
 * used for accumulated re-synthesis and deep dive context.
 */
export async function getFindingsByTopic(topic: string): Promise<(AgentFinding & { id: string; session_id: string })[]> {
  const supabase = createServerSupabaseClient();

  // First get all completed session IDs for this topic
  const { data: sessions, error: sessErr } = await supabase
    .from('research_sessions')
    .select('id')
    .eq('topic', topic)
    .eq('status', 'complete');
  if (sessErr) throw new Error(`getFindingsByTopic sessions: ${sessErr.message}`);
  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s: { id: string }) => s.id);

  const { data, error } = await supabase
    .from('agent_findings')
    .select()
    .in('session_id', sessionIds)
    .order('confidence', { ascending: false });
  if (error) throw new Error(`getFindingsByTopic findings: ${error.message}`);
  return (data ?? []) as (AgentFinding & { id: string; session_id: string })[];
}
