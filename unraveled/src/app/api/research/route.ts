import { NextRequest, NextResponse } from 'next/server';
import { runResearchSession } from '@/lib/research';

export const maxDuration = 300; // 5 minutes — requires Vercel Pro

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { topic, title, research_questions, description, source_urls } = body as Record<string, unknown>;

  if (typeof topic !== 'string' || !topic.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!Array.isArray(research_questions) || research_questions.length === 0) {
    return NextResponse.json({ error: 'research_questions must be a non-empty array' }, { status: 400 });
  }

  // Build optional additional context block from description + source URLs
  const contextParts: string[] = [];
  if (typeof description === 'string' && description.trim()) {
    contextParts.push(`TOPIC DESCRIPTION:\n${description.trim()}`);
  }
  if (typeof source_urls === 'string' && source_urls.trim()) {
    contextParts.push(`SUPPLEMENTARY SOURCES (use as hints, not as authoritative — find better if available):\n${source_urls.trim()}`);
  }
  const additionalContext = contextParts.length > 0 ? contextParts.join('\n\n') : undefined;

  try {
    const result = await runResearchSession(
      topic.trim(),
      title.trim(),
      research_questions.map(String),
      additionalContext,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/research]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
