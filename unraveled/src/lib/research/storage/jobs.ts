import { createServerSupabaseClient } from '@/lib/supabase';

export type JobStatus = 'pending' | 'running' | 'complete' | 'failed' | 'awaiting_approval';

export type JobType =
  | 'agent_signal'
  | 'agent_evaluation'
  | 'cross_validation'
  | 'convergence_analysis'
  | 'adversarial_debate'
  | 'synthesis_outline'
  | 'synthesis_section'
  | 'synthesis_assembly'
  | 'editor_pass';

export interface ResearchJob {
  id: string;
  session_id: string;
  topic: string;
  job_type: JobType;
  status: JobStatus;
  priority: number;
  params: Record<string, unknown>;       // DB column is `params`, not `payload`
  output_data: Record<string, unknown> | null;
  run_after_job_ids: string[];
  requires_approval: boolean;
  locked_by: string | null;
  locked_at: string | null;
  lock_expires_at: string | null;
  last_error: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateJobParams {
  session_id: string;
  topic?: string;
  job_type: JobType;
  params: Record<string, unknown>;
  priority?: number;
  run_after_job_ids?: string[];
  requires_approval?: boolean;
}

export async function createJob(params: CreateJobParams): Promise<ResearchJob> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_jobs')
    .insert({
      session_id: params.session_id,
      topic: params.topic ?? '',
      job_type: params.job_type,
      params: params.params,
      priority: params.priority ?? 50,
      run_after_job_ids: params.run_after_job_ids ?? [],
      requires_approval: params.requires_approval ?? false,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw new Error(`createJob: ${error.message}`);
  return data as ResearchJob;
}

export async function createJobs(jobs: CreateJobParams[]): Promise<ResearchJob[]> {
  if (jobs.length === 0) return [];
  const supabase = createServerSupabaseClient();
  const rows = jobs.map((p) => ({
    session_id: p.session_id,
    topic: p.topic ?? '',
    job_type: p.job_type,
    params: p.params,
    priority: p.priority ?? 50,
    run_after_job_ids: p.run_after_job_ids ?? [],
    requires_approval: p.requires_approval ?? false,
    status: 'pending',
  }));
  const { data, error } = await supabase.from('research_jobs').insert(rows).select();
  if (error) throw new Error(`createJobs: ${error.message}`);
  return (data ?? []) as ResearchJob[];
}

export async function getJob(jobId: string): Promise<ResearchJob | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from('research_jobs').select().eq('id', jobId).single();
  return data as ResearchJob | null;
}

export async function getJobsForSession(sessionId: string): Promise<ResearchJob[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_jobs')
    .select()
    .eq('session_id', sessionId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getJobsForSession: ${error.message}`);
  return (data ?? []) as ResearchJob[];
}

/** Returns runnable pending jobs (deps complete, unlocked). Uses DB function. */
export async function getRunnableJobs(limit = 10, sessionId?: string): Promise<ResearchJob[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_runnable_jobs', {
    p_limit: limit,
    p_session_id: sessionId ?? null,
  });
  if (error) throw new Error(`getRunnableJobs: ${error.message}`);
  return (data ?? []) as ResearchJob[];
}

/** Atomically claims a job for a worker. Returns true if claimed. */
export async function claimJob(jobId: string, workerId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('claim_job', {
    p_job_id: jobId,
    p_worker_id: workerId,
  });
  if (error) throw new Error(`claimJob: ${error.message}`);
  return data === true;
}

export async function completeJob(
  jobId: string,
  outputData: Record<string, unknown>,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'complete',
      output_data: outputData,
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) throw new Error(`completeJob: ${error.message}`);
}

export async function awaitApproval(
  jobId: string,
  outputData: Record<string, unknown>,
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'awaiting_approval',
      output_data: outputData,
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) throw new Error(`awaitApproval: ${error.message}`);
}

export async function failJob(jobId: string, errorMessage: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'failed',
      last_error: errorMessage,
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (error) throw new Error(`failJob: ${error.message}`);
}

export async function approveJob(jobId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'complete',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'awaiting_approval');
  if (error) throw new Error(`approveJob: ${error.message}`);
}

export async function rejectJob(jobId: string, notes: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'pending',
      last_error: `Rejected: ${notes}`,
      approval_notes: notes,
      output_data: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'awaiting_approval');
  if (error) throw new Error(`rejectJob: ${error.message}`);
}

/**
 * Appends additional dependency job IDs to a job's run_after_job_ids.
 * Used by agent_evaluation to make cross_validation wait for expansion agents.
 */
export async function appendJobDeps(jobId: string, newDepIds: string[]): Promise<void> {
  if (newDepIds.length === 0) return;
  const supabase = createServerSupabaseClient();
  // Use array_cat to atomically append without overwriting concurrent updates
  const { error } = await supabase.rpc('append_job_deps', {
    p_job_id: jobId,
    p_new_dep_ids: newDepIds,
  });
  if (error) {
    // Fallback: read-modify-write if RPC not available
    const { data: job } = await supabase
      .from('research_jobs')
      .select('run_after_job_ids')
      .eq('id', jobId)
      .single();
    const existing = (job?.run_after_job_ids as string[]) ?? [];
    const merged = [...new Set([...existing, ...newDepIds])];
    const { error: e2 } = await supabase
      .from('research_jobs')
      .update({ run_after_job_ids: merged, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    if (e2) throw new Error(`appendJobDeps: ${e2.message}`);
  }
}

/** Resets a failed job back to pending so it can be retried. */
export async function retryJob(jobId: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('research_jobs')
    .update({
      status: 'pending',
      last_error: null,
      locked_by: null,
      locked_at: null,
      lock_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'failed');
  if (error) throw new Error(`retryJob: ${error.message}`);
}

/** Resets jobs whose locks have expired back to pending. */
export async function resetStaleJobLocks(): Promise<number> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc('reset_stale_job_locks');
  if (error) throw new Error(`resetStaleJobLocks: ${error.message}`);
  return (data as number) ?? 0;
}
