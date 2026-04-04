import { createServerSupabaseClient } from '@/lib/supabase';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { queryClaude } from '@/lib/research/llm/claude';
import { queryGemini } from '@/lib/research/llm/gemini';
import { getJob } from '@/lib/research/storage/jobs';
import { buildSectionPrompt } from '../section-prompts';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SectionKey, SynthesisOutline } from '../section-prompts';

// Sections that need Claude's narrative voice (reader-facing, argumentative prose)
const CLAUDE_SECTIONS = new Set<SectionKey>([
  'executive_summary',
  'key_findings',
  'advocate_case',
  'skeptic_case',
  'jaw_drop_layers',
]);

// Sections routed to Gemini Flash — data aggregation, citation formatting, pattern listing
const GEMINI_FLASH_SECTIONS = new Set<SectionKey>([
  'how_cultures_describe',
  'circumstantial_convergence',
  'sources',
]);

// Everything else → Gemini Pro (analytical but structured; BLOCK_NONE safety so no guardrails)
// Includes: traditions_analysis, convergence_deep_dive, faith_perspectives,
//           legendary_patterns, open_questions

export interface SynthesisSectionPayload {
  section_key: SectionKey;
  outline_job_id: string; // ID of the synthesis_outline job to read outline from
  is_enhancement?: boolean; // Enhancement sessions use next version, is_current=false
}

export async function handleSynthesisSection(job: ResearchJob): Promise<Record<string, unknown>> {
  const { section_key, outline_job_id, is_enhancement } = job.params as unknown as SynthesisSectionPayload;

  // Load outline from the outline job's output
  const outlineJob = await getJob(outline_job_id);
  if (!outlineJob?.output_data?.outline) {
    throw new Error(`Outline job ${outline_job_id} has no output`);
  }
  const outline = outlineJob.output_data.outline as SynthesisOutline;

  const [findings, convergenceAnalyses, debate] = await Promise.all([
    getFindingsBySession(job.session_id),
    getConvergenceBySession(job.session_id),
    getDebateBySession(job.session_id),
  ]);

  if (!debate) throw new Error('No debate record found');

  const { systemPrompt, userPrompt, maxTokens } = buildSectionPrompt(section_key, {
    topic: job.topic || outline.title,
    outline,
    findings,
    debate,
    convergenceAnalyses,
  });

  const provider = CLAUDE_SECTIONS.has(section_key)
    ? 'claude'
    : GEMINI_FLASH_SECTIONS.has(section_key)
    ? 'gemini-flash'
    : 'gemini';

  const response = provider === 'claude'
    ? await queryClaude({ provider: 'claude', systemPrompt, userPrompt, maxTokens, temperature: 0.45, jsonMode: false })
    : await queryGemini({ provider, systemPrompt, userPrompt, maxTokens, temperature: 0.45, jsonMode: false });

  // Store section in dossier_sections table
  // content is JSONB — wrap prose in an object
  const contentPayload = { text: response.text };
  const wordCount = response.text.split(/\s+/).filter(Boolean).length;

  const supabase = createServerSupabaseClient();

  // Enhancement sessions get the next version number and stay is_current=false
  // until an admin approves them. Base sessions always use version=1, is_current=true.
  let version = 1;
  let isCurrent = true;

  if (is_enhancement) {
    const { data: existing } = await supabase
      .from('dossier_sections')
      .select('version')
      .eq('topic', job.topic)
      .eq('section_key', section_key)
      .order('version', { ascending: false })
      .limit(1)
      .single();
    version = (existing?.version ?? 0) + 1;
    isCurrent = false;
  }

  const { data: sectionRow, error } = await supabase
    .from('dossier_sections')
    .upsert({
      session_id: job.session_id,
      topic: job.topic,
      job_id: job.id,
      section_key,
      content: contentPayload,
      word_count: wordCount,
      status: 'draft',
      version,
      is_current: isCurrent,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'topic,section_key,version',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to store section ${section_key}: ${error.message}`);
  }

  return {
    section_key,
    section_id: sectionRow?.id ?? null,
    word_count: wordCount,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
  };
}
