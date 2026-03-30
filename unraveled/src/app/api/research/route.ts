/**
 * POST /api/research
 *
 * Creates a session and runs Phase 1 (Layer 1 research agents) via after().
 * Returns 202 immediately with the session ID.
 * After Phase 1 completes, fires /api/research/[sessionId]/continue which
 * self-chains through the remaining phases — each in its own fresh 300s window.
 */
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSession, updateSessionStatus, logSessionError } from '@/lib/research/storage/sessions';
import { runLayer1 } from '@/lib/research/pipeline';

export const maxDuration = 300;

function getSiteUrl(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  const { protocol, host } = new URL(req.url);
  return `${protocol}//${host}`;
}

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
  if (!Array.isArray(research_questions) || research_questions.length === 0)
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });

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
    console.error('[POST /api/research] createSession failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const sessionId = session.id;
  const siteUrl = getSiteUrl(req);

  // Phase 1 only — then chain remaining phases via /continue (each gets fresh 300s)
  after(async () => {
    try {
      const layer1 = await runLayer1(
        sessionId,
        topic.trim(),
        research_questions.map(String),
        additionalContext,
      );
      console.log(`[research:${sessionId}] Layer 1 complete: ${layer1.allFindings.length} findings`);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Layer 1 produced no findings');
        return;
      }

      await updateSessionStatus(sessionId, 'cross_validating');

      // Fire Phase 2+ in a fresh request — new 300s timeout window
      fetch(`${siteUrl}/api/research/${sessionId}/continue`, { method: 'POST' })
        .catch((e) => console.error(`[research:${sessionId}] chain fire failed:`, e));

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[research:${sessionId}] Layer 1 error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ session_id: sessionId, status: 'queued' }, { status: 202 });
}
