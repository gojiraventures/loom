/**
 * POST /api/research
 *
 * Creates a session, returns 202 immediately, then runs Phase 1 (Layer 1 agents)
 * inside after(). When Phase 1 completes it sets status = 'researched'.
 *
 * The polling client detects 'researched' and calls POST /api/research/[id]/continue
 * which runs Phases 2–5 with its own 300s budget.
 *
 * Two-call split:
 *   Call 1 (this route):  Phase 1 only  ~150–250s
 *   Call 2 (/continue):   Phases 2–5    ~80–100s
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { runLayer1 } from '@/lib/research/pipeline';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, description, source_urls } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions))
    return NextResponse.json({ error: 'research_questions must be an array (may be empty)' }, { status: 400 });

  const contextParts: string[] = [];
  if (typeof description === 'string' && description.trim())
    contextParts.push(`TOPIC DESCRIPTION:\n${description.trim()}`);
  if (typeof source_urls === 'string' && source_urls.trim())
    contextParts.push(`SUPPLEMENTARY SOURCES (use as hints, not as authoritative — find better if available):\n${source_urls.trim()}`);
  const additionalContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

  let session: { id: string };
  try {
    session = await createSession({
      topic: topic.trim(),
      title: title.trim(),
      research_questions: research_questions.map(String),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sessionId = session.id;
  const topicStr = topic.trim();
  const questionsArr = research_questions.map(String);

  after(async () => {
    try {
      // Phase 1 only — Phases 2–5 run in /continue with a fresh 300s budget
      console.log(`[research:${sessionId}] Phase 1: layer 1 agents`);
      const layer1 = await runLayer1(sessionId, topicStr, questionsArr, additionalContext);
      console.log(`[research:${sessionId}] Phase 1 complete: ${layer1.allFindings.length} findings`);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Layer 1 produced no findings');
        return;
      }

      // Signal that Phase 1 is done — client polling detects this and calls /continue
      await updateSessionStatus(sessionId, 'researched');
      console.log(`[research:${sessionId}] Phase 1 done — awaiting /continue trigger`);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[research:${sessionId}] Phase 1 error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ session_id: sessionId, status: 'queued' }, { status: 202 });
}
