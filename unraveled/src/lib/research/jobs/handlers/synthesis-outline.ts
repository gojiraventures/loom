import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { queryClaude } from '@/lib/research/llm/claude';
import { parseJsonResponse } from '@/lib/research/llm/parse';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SynthesisOutline } from '../section-prompts';

export interface SynthesisOutlinePayload {
  topic: string;
  title: string;
}

const OUTLINE_SYSTEM = `You are the Editorial Director for Unraveled.ai. Your job: given a completed research pipeline, produce a synthesis outline that will guide 13 section writers.

You will analyze: research findings, convergence analyses, and the advocate/skeptic debate.

Return ONLY valid JSON with this structure:
{
  "title": "Publication-ready title (punchy, scholarly)",
  "subtitle": "One-sentence elaboration",
  "convergence_score": 0-100,
  "traditions_analyzed": ["list", "of", "traditions"],
  "section_notes": {
    "executive_summary": "Editorial guidance for this section",
    "key_findings": "...",
    "traditions_analysis": "...",
    "convergence_deep_dive": "...",
    "advocate_case": "...",
    "skeptic_case": "...",
    "jaw_drop_layers": "...",
    "faith_perspectives": "...",
    "legendary_patterns": "...",
    "circumstantial_convergence": "...",
    "open_questions": "...",
    "how_cultures_describe": "...",
    "sources": "..."
  },
  "top_finding_ids_by_section": {
    "executive_summary": ["finding-id-1", "finding-id-2"],
    "key_findings": [],
    "traditions_analysis": [],
    "convergence_deep_dive": [],
    "advocate_case": [],
    "skeptic_case": [],
    "jaw_drop_layers": [],
    "faith_perspectives": [],
    "legendary_patterns": [],
    "circumstantial_convergence": [],
    "open_questions": [],
    "how_cultures_describe": [],
    "sources": []
  }
}`;

export async function handleSynthesisOutline(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic, title } = job.params as unknown as SynthesisOutlinePayload;

  const [findings, convergenceAnalyses, debate] = await Promise.all([
    getFindingsBySession(job.session_id),
    getConvergenceBySession(job.session_id),
    getDebateBySession(job.session_id),
  ]);

  if (!debate) throw new Error('No debate record — run debate job first');

  const topFindings = findings
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 50)
    .map((f) => `[${f.id}] ${f.agent_id} (conf:${f.confidence.toFixed(2)}) ${f.claim_text.slice(0, 120)}`)
    .join('\n');

  const topConvergence = convergenceAnalyses
    .flatMap((a) => a.convergence_points)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 8)
    .map((cp) => `${cp.title} (${cp.composite_score}/100): ${cp.traditions_involved.join(', ')}`)
    .join('\n');

  const traditions = [...new Set(findings.flatMap((f) => f.traditions))].sort();

  const userPrompt = `Topic: ${topic}
Working title: ${title}
Traditions covered: ${traditions.join(', ')}

TOP FINDINGS:
${topFindings}

TOP CONVERGENCE POINTS:
${topConvergence}

ADVOCATE CONFIDENCE: ${debate.advocate_confidence}
SKEPTIC CONFIDENCE: ${debate.skeptic_confidence}

UNRESOLVED TENSIONS:
${debate.unresolved_tensions.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}

Produce the synthesis outline. For top_finding_ids_by_section, assign the 3-8 most relevant finding IDs from the list above to each section.`;

  const response = await queryClaude({
    provider: 'claude',
    systemPrompt: OUTLINE_SYSTEM,
    userPrompt,
    jsonMode: true,
    maxTokens: 8192,
    temperature: 0.3,
  });

  const outline = parseJsonResponse(response) as SynthesisOutline;

  return {
    outline,
    finding_count: findings.length,
    tradition_count: traditions.length,
  };
}
