/**
 * POST /api/research/deep-dive
 *
 * Targeted supplemental session on an existing topic.
 * Runs Phase 1 (with focus context) via after(), then chains to /continue.
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
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, focus_areas } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim())
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  if (typeof title !== 'string' || !title.trim())
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!Array.isArray(research_questions) || research_questions.length === 0)
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  if (typeof focus_areas !== 'string' || !focus_areas.trim())
    return NextResponse.json({ error: 'focus_areas is required — specify what rabbit holes to dig into' }, { status: 400 });

  const additionalContext = `## DEEP DIVE FOCUS — MANDATORY

You MUST specifically investigate the following areas, people, books, and claims in addition to your standard domain research. These are the specific rabbit holes this session is targeting:

${focus_areas.trim()}

Do not give these topics a surface-level mention. Go deep. If you know of specific evidence, claims, counter-claims, or documented actions related to these named individuals, books, or institutions, surface them now with full citation detail. If these topics are outside your primary domain, still apply your domain's analytical framework to them.`;

  const session = await createSession({
    topic: topic.trim(),
    title: title.trim(),
    research_questions: research_questions.map(String),
  });
  const sessionId = session.id;
  const siteUrl = getSiteUrl(req);

  after(async () => {
    try {
      const layer1 = await runLayer1(
        sessionId,
        topic.trim(),
        research_questions.map(String),
        additionalContext,
      );
      console.log(`[deep-dive:${sessionId}] Layer 1 complete: ${layer1.allFindings.length} findings`);

      if (layer1.allFindings.length === 0) {
        await updateSessionStatus(sessionId, 'failed');
        await logSessionError(sessionId, 'Deep dive Layer 1 produced no findings');
        return;
      }

      await updateSessionStatus(sessionId, 'cross_validating');

      await fetch(`${siteUrl}/api/research/${sessionId}/continue`, { method: 'POST' })
        .catch((e) => console.error(`[deep-dive:${sessionId}] chain fire failed:`, e));

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[deep-dive:${sessionId}] Layer 1 error:`, message);
      await updateSessionStatus(sessionId, 'failed').catch(() => null);
      await logSessionError(sessionId, message).catch(() => null);
    }
  });

  return NextResponse.json({ session_id: sessionId, status: 'queued' }, { status: 202 });
}
