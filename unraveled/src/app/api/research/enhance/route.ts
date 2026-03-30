/**
 * POST /api/research/enhance
 *
 * Enhancement round on an existing topic — adds new research questions,
 * runs the full pipeline, then sets status = 'pending_review' instead of
 * auto-merging to the dossier. Admin must approve before the new findings
 * are incorporated into the published article.
 *
 * Max 3 questions per enhancement round.
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getValidationsBySession } from '@/lib/research/storage/validations';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { runLayer1, buildCrossValidationPlan } from '@/lib/research/pipeline';
import { runAllCrossValidation } from '@/lib/research/agents/cross-validator';
import { runConvergenceLayer } from '@/lib/research/agents/convergence-runner';
import { runDebate } from '@/lib/research/agents/debate-runner';
import { runSynthesis } from '@/lib/research/agents/synthesizer';
import type { AgentFinding } from '@/lib/research/types';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions) || research_questions.length === 0)
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  if (research_questions.length > 3)
    return NextResponse.json({ error: 'Enhancement rounds are capped at 3 questions. Split into multiple rounds.' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: session, error: createErr } = await supabase
    .from('research_sessions')
    .insert({
      topic: topic.trim(),
      title: title.trim(),
      research_questions: research_questions.map(String),
      session_type: 'enhancement',
      status: 'pending',
    })
    .select('id')
    .single();

  if (createErr || !session)
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create session' }, { status: 500 });

  const sessionId = session.id;
  const topicStr = topic.trim();
  const titleStr = title.trim();
  const questionsArr = research_questions.map(String);

  after(async () => {
    try {
      console.log(`[enhance:${sessionId}] Phase 1: layer 1 agents`);
      const layer1 = await runLayer1(sessionId, topicStr, questionsArr);
      console.log(`[enhance:${sessionId}] Phase 1 complete: ${layer1.allFindings.length} findings`);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Layer 1 produced no findings');
        return;
      }

      const findings = await getFindingsBySession(sessionId) as (AgentFinding & { id: string })[];

      console.log(`[enhance:${sessionId}] Phase 2: cross-validation`);
      await updateSessionStatus(sessionId, 'cross_validating');
      const crossValPlan = buildCrossValidationPlan(sessionId, topicStr, questionsArr, findings);
      const reviewerIds = [...new Set(crossValPlan.map((p) => p.reviewerAgentId))];
      await runAllCrossValidation(sessionId, topicStr, findings, reviewerIds);

      console.log(`[enhance:${sessionId}] Phase 3: convergence`);
      await updateSessionStatus(sessionId, 'converging');
      await runConvergenceLayer(sessionId, topicStr, findings);
      const convergenceAnalyses = await getConvergenceBySession(sessionId);

      console.log(`[enhance:${sessionId}] Phase 4: debate`);
      await updateSessionStatus(sessionId, 'debating');
      const debateResult = await runDebate(sessionId, topicStr, findings, convergenceAnalyses);
      if (debateResult.error || !debateResult.debate) {
        const errMsg = debateResult.error ?? 'Debate produced no output';
        await logSessionError(sessionId, errMsg);
        await updateSessionStatus(sessionId, 'failed');
        return;
      }

      console.log(`[enhance:${sessionId}] Phase 5: synthesis`);
      await updateSessionStatus(sessionId, 'synthesizing');
      const allValidations = await getValidationsBySession(sessionId);
      const synthesisResult = await runSynthesis(
        sessionId, topicStr, findings, allValidations, convergenceAnalyses, debateResult.debate,
      );
      if (synthesisResult.error || !synthesisResult.output) {
        const errMsg = synthesisResult.error ?? 'Synthesis produced no output';
        await logSessionError(sessionId, errMsg);
        await updateSessionStatus(sessionId, 'failed');
        return;
      }

      // Store synthesis result on the session for admin preview — do NOT merge to dossier yet
      await supabase
        .from('research_sessions')
        .update({ synthesized_output: synthesisResult.output })
        .eq('id', sessionId);

      // Await admin approval before touching the published dossier
      await updateSessionStatus(sessionId, 'pending_review');
      console.log(`[enhance:${sessionId}] Pending review ✓ — awaiting admin approval`);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[enhance:${sessionId}] pipeline error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ session_id: sessionId, status: 'queued' }, { status: 202 });
}
