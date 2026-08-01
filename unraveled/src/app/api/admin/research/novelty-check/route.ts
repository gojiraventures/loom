/**
 * POST /api/admin/research/novelty-check  { topic, title, research_questions }
 *
 * Freshness Gate — runs before a new research launches. Finds existing published
 * articles that overlap the proposed topic and returns a differentiation brief:
 * what's already covered and the distinct angle the new report should take.
 *
 * Does NOT launch anything. The Studio surfaces the brief; on approval the angle
 * is injected into the research as additional context.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { queryClaude } from '@/lib/research/llm/claude';
import { parseJsonResponse } from '@/lib/research/llm/parse';

export const maxDuration = 60;

interface NoveltyResult {
  overlaps: { slug: string | null; title: string; overlap_reason: string }[];
  is_near_duplicate: boolean;
  fresh_angle: string;
  differentiation_guidance: string;
  revised_questions: string[];
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { topic, title, research_questions } = (await req.json().catch(() => ({}))) as {
    topic?: string; title?: string; research_questions?: string[];
  };
  if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Candidate corpus: existing published (and researched) dossiers.
  const { data: existing } = await supabase
    .from('topic_dossiers')
    .select('slug, topic, title, summary, key_traditions, synthesized_output')
    .order('updated_at', { ascending: false })
    .limit(120);

  const corpus = (existing ?? [])
    .filter((d) => d.topic !== topic.trim())
    .map((d) => {
      const syn = d.synthesized_output as { key_findings?: { finding: string }[] } | null;
      const findings = (syn?.key_findings ?? []).slice(0, 4).map((f) => f.finding).join(' | ');
      return `- [${d.slug ?? 'draft'}] "${d.title ?? d.topic}"\n  summary: ${(d.summary ?? '').slice(0, 260)}\n  key findings: ${findings.slice(0, 400)}`;
    })
    .join('\n');

  if (!corpus) {
    // Nothing to overlap with — clean slate.
    return NextResponse.json({
      result: { overlaps: [], is_near_duplicate: false, fresh_angle: '', differentiation_guidance: '', revised_questions: research_questions ?? [] } as NoveltyResult,
    });
  }

  const res = await queryClaude({
    provider: 'claude',
    systemPrompt: `You are the editorial gatekeeper for a research publication. Your job is to prevent near-duplicate articles and ensure every new report is genuinely fresh.
Given a PROPOSED new topic and the EXISTING published library, identify overlaps and prescribe a distinct angle.
Return ONLY JSON:
{
  "overlaps": [{"slug": "existing-slug-or-null", "title": "existing title", "overlap_reason": "what specifically overlaps"}],
  "is_near_duplicate": true|false,   // true if the proposal would substantially duplicate an existing article as-is
  "fresh_angle": "one or two sentences: the distinct thesis/angle the new report should take so it is NOT a rehash",
  "differentiation_guidance": "concrete instructions for the research agents: what the existing article already covers (avoid rehashing), and what NEW dimensions, deeper components, counter-evidence, or updated developments to pursue instead",
  "revised_questions": ["sharper research questions that steer toward the fresh angle"]
}
If there is no meaningful overlap, return empty overlaps, is_near_duplicate=false, and leave fresh_angle/differentiation_guidance short or empty.`,
    userPrompt: `PROPOSED NEW TOPIC:\nTitle: ${title ?? topic}\nTopic key: ${topic}\nResearch questions:\n${(research_questions ?? []).map((q) => `- ${q}`).join('\n') || '(none provided)'}\n\nEXISTING PUBLISHED LIBRARY:\n${corpus}`,
    jsonMode: true,
    maxTokens: 2000,
    temperature: 0.3,
  });

  let result: NoveltyResult;
  try {
    const raw = parseJsonResponse(res) as Partial<NoveltyResult>;
    result = {
      overlaps: Array.isArray(raw.overlaps) ? raw.overlaps : [],
      is_near_duplicate: !!raw.is_near_duplicate,
      fresh_angle: raw.fresh_angle ?? '',
      differentiation_guidance: raw.differentiation_guidance ?? '',
      revised_questions: Array.isArray(raw.revised_questions) ? raw.revised_questions : (research_questions ?? []),
    };
  } catch {
    // Fail open — never block a launch because the gate errored.
    result = { overlaps: [], is_near_duplicate: false, fresh_angle: '', differentiation_guidance: '', revised_questions: research_questions ?? [] };
  }

  return NextResponse.json({ result });
}
