import { NextRequest, NextResponse } from 'next/server';
import { runResearchSession } from '@/lib/research';

// Allow long-running research sessions (up to 5 minutes)
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!Array.isArray(research_questions) || research_questions.length === 0) {
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  }

  try {
    const result = await runResearchSession(
      topic.trim(),
      title.trim(),
      research_questions.map(String),
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/research]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
