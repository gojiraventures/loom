/**
 * POST /api/reports/llm-perspectives
 * Body: { topic: string, title: string, summary: string }
 *
 * Queries ChatGPT, Grok, Claude, and Gemini with the same topic prompt,
 * then uses Claude to characterize each response.
 * Results are cached in topic_dossiers.llm_perspectives (jsonb).
 */
import { NextRequest, NextResponse } from 'next/server';
import { queryAnthropic, queryOpenAI, queryGrok, queryGemini } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 120;

export type LLMVerdict =
  | 'engages'       // addresses the topic seriously
  | 'qualifies'     // engages but heavily hedges / adds disclaimers
  | 'dismisses'     // calls it fringe, conspiracy, misinformation
  | 'suppresses';   // refuses to answer or deflects entirely

export interface LLMPerspective {
  llm: string;
  label: string;          // display name, e.g. "ChatGPT (GPT-4o)"
  response: string;       // verbatim excerpt (first ~400 chars)
  verdict: LLMVerdict;
  verdict_reason: string; // one sentence explaining the verdict
  generated_at: string;
}

const QUESTION_PROMPT = (title: string, summary: string) =>
  `What do you know about the following topic, and how do you assess its credibility? ` +
  `Topic: "${title}". ` +
  `${summary ? `Context: ${summary}` : ''} ` +
  `Please give a substantive response — don't just say you can't help.`;

const ANALYSIS_SYSTEM = `You are an AI bias analyst. You will be given a topic and a verbatim response from an AI model.
Classify the response and return ONLY valid JSON — no prose.`;

const ANALYSIS_PROMPT = (title: string, llmName: string, response: string) => `
Topic: "${title}"
AI Model: ${llmName}
Verbatim response:
"""
${response.slice(0, 800)}
"""

Classify this response and return JSON:
{
  "verdict": "one of: engages | qualifies | dismisses | suppresses",
  "verdict_reason": "one sentence explaining the verdict — what specifically made you choose it"
}

Definitions:
- engages: addresses the topic seriously and substantively
- qualifies: engages but adds significant hedging, disclaimers, or safety warnings that dilute the substance
- dismisses: characterizes the topic as conspiracy, misinformation, fringe, or lacking credibility
- suppresses: refuses to answer, deflects, or gives a non-response

Return ONLY the JSON object.`;

async function getPerspective(
  llmKey: string,
  label: string,
  query: (prompt: string) => Promise<{ content: string }>,
  title: string,
  summary: string,
): Promise<LLMPerspective> {
  let response = '';
  try {
    const res = await query(QUESTION_PROMPT(title, summary));
    response = res.content;
  } catch {
    response = '[No response — API error]';
  }

  // Analyse the response with Claude
  let verdict: LLMVerdict = 'qualifies';
  let verdict_reason = 'Unable to classify response.';
  try {
    const analysis = await queryAnthropic(
      ANALYSIS_PROMPT(title, label, response),
      ANALYSIS_SYSTEM,
    );
    const cleaned = analysis.content
      .replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { verdict: LLMVerdict; verdict_reason: string };
    verdict = parsed.verdict;
    verdict_reason = parsed.verdict_reason;
  } catch {
    // keep defaults
  }

  return {
    llm: llmKey,
    label,
    response: response.slice(0, 420) + (response.length > 420 ? '…' : ''),
    verdict,
    verdict_reason,
    generated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { topic: string; title: string; summary?: string };
  const { topic, title, summary = '' } = body;
  if (!topic || !title) {
    return NextResponse.json({ error: 'topic and title required' }, { status: 400 });
  }

  // Query all four LLMs in parallel
  const [chatgpt, grok, claude, gemini] = await Promise.all([
    getPerspective('chatgpt', 'ChatGPT (GPT-4o)', queryOpenAI, title, summary),
    getPerspective('grok', 'Grok (xAI)', queryGrok, title, summary),
    getPerspective('claude', 'Claude (Anthropic)', queryAnthropic, title, summary),
    getPerspective('gemini', 'Gemini (Google)', queryGemini, title, summary),
  ]);

  const perspectives: LLMPerspective[] = [chatgpt, grok, claude, gemini];

  // Cache in DB
  const supabase = createServerSupabaseClient();
  await supabase
    .from('topic_dossiers')
    .update({ llm_perspectives: perspectives })
    .eq('topic', topic);

  return NextResponse.json({ perspectives });
}

// GET /api/reports/llm-perspectives?topic=xxx — return cached perspectives
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_dossiers')
    .select('llm_perspectives')
    .eq('topic', topic)
    .single();

  return NextResponse.json({ perspectives: data?.llm_perspectives ?? null });
}
