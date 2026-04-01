import { createServerSupabaseClient } from '@/lib/supabase';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { getDebateBySession } from '@/lib/research/storage/debates';
import { queryClaude } from '@/lib/research/llm/claude';
import { getJob } from '@/lib/research/storage/jobs';
import { buildSectionPrompt } from '../section-prompts';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SectionKey, SynthesisOutline } from '../section-prompts';

export interface SynthesisSectionPayload {
  section_key: SectionKey;
  outline_job_id: string; // ID of the synthesis_outline job to read outline from
}

export async function handleSynthesisSection(job: ResearchJob): Promise<Record<string, unknown>> {
  const { section_key, outline_job_id } = job.params as unknown as SynthesisSectionPayload;

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

  const response = await queryClaude({
    provider: 'claude',
    systemPrompt,
    userPrompt,
    maxTokens,
    temperature: 0.45,
    jsonMode: false,
  });

  // Store section in dossier_sections table
  // content is JSONB — wrap prose in an object
  const contentPayload = { text: response.text };
  const wordCount = response.text.split(/\s+/).filter(Boolean).length;

  const supabase = createServerSupabaseClient();
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
      version: 1,
      is_current: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'session_id,section_key',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`[synthesis-section] Failed to store section ${section_key}:`, error.message);
  }

  return {
    section_key,
    section_id: sectionRow?.id ?? null,
    word_count: wordCount,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
  };
}
