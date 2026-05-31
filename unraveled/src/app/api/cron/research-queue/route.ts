/**
 * POST /api/cron/research-queue
 *
 * Runs every 2 minutes via Vercel Cron.
 * Picks the next queued research topic and drives it through all 5 phases
 * automatically — no human intervention needed.
 *
 * State machine per tick:
 *   No running item  → start Phase 1 for the oldest queued item
 *   running, session=researched  → run Phases 2-5 in after()
 *   running, session=complete    → mark queue item complete
 *   running, session=failed      → mark queue item failed
 *   running, session=in-progress → wait for next tick
 *   running, started >45min ago  → timeout, mark failed
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  createSession,
  getSession,
  updateSessionStatus,
  logSessionError,
  claimSessionForContinue,
  releaseSessionLock,
} from '@/lib/research/storage/sessions';
import { runLayer1, buildCrossValidationPlan } from '@/lib/research/pipeline';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import { accumulateDossier } from '@/lib/research/dossier';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

interface QueueItem {
  id: string;
  topic: string;
  title: string;
  research_questions: string[];
  description: string | null;
  source_urls: string | null;
  status: string;
  session_id: string | null;
  error_detail: string | null;
  started_at: string | null;
}

async function updateQueue(
  id: string,
  patch: Record<string, unknown>,
) {
  const supabase = createServerSupabaseClient();
  await supabase.from('research_queue').update(patch).eq('id', id);
}

/** Runs Phases 2–5 for a session that has completed Phase 1. */
async function runPhases2to5(sessionId: string, topic: string, title: string, researchQuestions: string[]) {
  const claimed = await claimSessionForContinue(sessionId, 'researched');
  if (!claimed) {
    console.log(`[research-queue] ${sessionId} already locked for phases 2-5`);
    return;
  }

  try {
    const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];
    if (findings.length === 0) {
      await updateSessionStatus(sessionId, 'failed');
      await logSessionError(sessionId, 'No findings available for phases 2-5');
      return;
    }

    // Phase 2: Cross-validation
    console.log(`[research-queue:${sessionId}] Phase 2: cross-validation`);
    const crossValPlan = buildCrossValidationPlan(sessionId, topic, researchQuestions, findings);
    const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
    await runAllCrossValidation(sessionId, topic, findings, reviewerIds);
    await updateSessionStatus(sessionId, 'converging');

    // Phase 3: Convergence
    console.log(`[research-queue:${sessionId}] Phase 3: convergence`);
    await runConvergenceLayer(sessionId, topic, findings);
    const convergenceAnalyses = await getConvergenceBySession(sessionId);
    await updateSessionStatus(sessionId, 'debating');

    // Phase 4: Debate
    console.log(`[research-queue:${sessionId}] Phase 4: debate`);
    const debateResult = await runDebate(sessionId, topic, findings, convergenceAnalyses);
    if (debateResult.error || !debateResult.debate) {
      const msg = debateResult.error ?? 'Debate produced no output';
      await logSessionError(sessionId, msg);
      await updateSessionStatus(sessionId, 'failed');
      return;
    }
    await updateSessionStatus(sessionId, 'synthesizing');
    await releaseSessionLock(sessionId);

    // Phase 5: Synthesis
    console.log(`[research-queue:${sessionId}] Phase 5: synthesis`);
    const claimed5 = await claimSessionForContinue(sessionId, 'synthesizing');
    if (!claimed5) return;

    const [allFindings, allValidations, allConvergence, debate] = await Promise.all([
      getFindingsBySession(sessionId) as Promise<(AgentFinding & { id: string })[]>,
      getValidationsBySession(sessionId),
      getConvergenceBySession(sessionId),
      getDebateBySession(sessionId),
    ]);

    if (!debate) {
      await logSessionError(sessionId, 'No debate record for synthesis');
      await updateSessionStatus(sessionId, 'failed');
      return;
    }

    const synthesisResult = await runSynthesis(
      sessionId, topic, allFindings, allValidations, allConvergence, debate,
    );
    if (synthesisResult.error || !synthesisResult.output) {
      const msg = synthesisResult.error ?? 'Synthesis produced no output';
      await logSessionError(sessionId, msg);
      await updateSessionStatus(sessionId, 'failed');
      return;
    }

    await accumulateDossier({
      topic,
      title,
      findings: allFindings,
      convergenceAnalyses: allConvergence,
      debate,
      output: synthesisResult.output,
    });

    await updateSessionStatus(sessionId, 'complete');
    console.log(`[research-queue:${sessionId}] Complete ✓`);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[research-queue:${sessionId}] Phases 2-5 error:`, msg);
    await updateSessionStatus(sessionId, 'failed').catch(() => null);
    await logSessionError(sessionId, msg).catch(() => null);
  } finally {
    await releaseSessionLock(sessionId).catch(() => null);
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Check for a currently running queue item
  const { data: runningData } = await supabase
    .from('research_queue')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: true })
    .limit(1)
    .single();

  const running = runningData as QueueItem | null;

  if (running) {
    // Timeout guard: if running for >45 minutes something went wrong
    if (running.started_at) {
      const ageMs = Date.now() - new Date(running.started_at).getTime();
      if (ageMs > 45 * 60 * 1000) {
        await updateQueue(running.id, {
          status: 'failed',
          error_detail: 'Timed out after 45 minutes',
          completed_at: new Date().toISOString(),
        });
        console.log(`[research-queue] Queue item ${running.id} timed out`);
        return NextResponse.json({ action: 'timed_out', queue_id: running.id });
      }
    }

    if (!running.session_id) {
      await updateQueue(running.id, { status: 'failed', error_detail: 'Orphaned — no session_id', completed_at: new Date().toISOString() });
      return NextResponse.json({ action: 'reset_orphan' });
    }

    const session = await getSession(running.session_id);
    if (!session) {
      await updateQueue(running.id, { status: 'failed', error_detail: 'Session not found', completed_at: new Date().toISOString() });
      return NextResponse.json({ action: 'session_missing' });
    }

    if (session.status === 'complete') {
      await updateQueue(running.id, { status: 'complete', completed_at: new Date().toISOString() });
      return NextResponse.json({ action: 'marked_complete', session_id: running.session_id });
    }

    if (session.status === 'failed') {
      const errLog = session.error_log;
      const lastErr = errLog.length > 0 ? errLog[errLog.length - 1] : 'Pipeline failed';
      await updateQueue(running.id, { status: 'failed', error_detail: lastErr, completed_at: new Date().toISOString() });
      return NextResponse.json({ action: 'marked_failed', session_id: running.session_id });
    }

    if (session.status === 'researched') {
      // Phase 1 is done — run phases 2-5 in after()
      const sessionId = running.session_id;
      const { topic, title } = running;
      const researchQuestions = running.research_questions;

      after(() => runPhases2to5(sessionId, topic, title, researchQuestions));

      return NextResponse.json({ action: 'phases_2_5_fired', session_id: sessionId });
    }

    // Still running phases 1-4 — wait for next tick
    return NextResponse.json({ action: 'waiting', session_status: session.status });
  }

  // No running item — pick the next queued one
  const { data: nextData } = await supabase
    .from('research_queue')
    .select('*')
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  const next = nextData as QueueItem | null;

  if (!next) {
    return NextResponse.json({ action: 'queue_empty' });
  }

  // Create the research session
  let session: { id: string };
  try {
    session = await createSession({
      topic: next.topic,
      title: next.title,
      research_questions: next.research_questions,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateQueue(next.id, { status: 'failed', error_detail: msg, completed_at: new Date().toISOString() });
    return NextResponse.json({ action: 'session_create_failed', error: msg }, { status: 500 });
  }

  const sessionId = session.id;

  await updateQueue(next.id, {
    status: 'running',
    session_id: sessionId,
    started_at: new Date().toISOString(),
  });

  const contextParts: string[] = [];
  if (next.description) contextParts.push(`TOPIC DESCRIPTION:\n${next.description}`);
  if (next.source_urls) contextParts.push(`SUPPLEMENTARY SOURCES (use as hints, not as authoritative — find better if available):\n${next.source_urls}`);
  const additionalContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

  const topic = next.topic;
  const researchQuestions = next.research_questions;

  after(async () => {
    try {
      console.log(`[research-queue:${sessionId}] Phase 1 starting`);
      const layer1 = await runLayer1(sessionId, topic, researchQuestions, additionalContext);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Layer 1 produced no findings');
        return;
      }

      await updateSessionStatus(sessionId, 'researched');
      console.log(`[research-queue:${sessionId}] Phase 1 done — ${layer1.allFindings.length} findings — next tick runs phases 2-5`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[research-queue:${sessionId}] Phase 1 error:`, msg);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, msg).catch(() => null);
    }
  });

  return NextResponse.json({ action: 'phase_1_started', session_id: sessionId, topic: next.topic });
}

// Allow manual trigger from admin without cron header (GET only for convenience)
export async function GET(req: NextRequest) {
  return POST(req);
}
