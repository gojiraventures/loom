import { jsonrepair } from 'jsonrepair';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getFindingsBySession } from '@/lib/research/storage/findings';
import { getConvergenceBySession } from '@/lib/research/storage/convergence';
import { updateSessionStatus } from '@/lib/research/storage/sessions';
import { getJobsForSession } from '@/lib/research/storage/jobs';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SynthesisOutline } from '../section-prompts';
import type { SynthesizedOutput, JawDropLayer, LegendaryPattern, CircumstantialSignal, SourceReference } from '@/lib/research/types';

/** Parse a section's stored text as JSON, returning the value at the given key. */
function parseSectionJson(text: string, key: string): unknown {
  if (!text) return null;
  try {
    const obj = JSON.parse(jsonrepair(text)) as Record<string, unknown>;
    return obj[key] ?? null;
  } catch {
    return null;
  }
}

/** Extract the text string from a section's content JSONB (stored as { text: "..." }). */
function sectionText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  return (content as Record<string, unknown>).text as string ?? '';
}

export interface SynthesisAssemblyPayload {
  topic: string;
  title: string;
}

const SECTION_ORDER = [
  'executive_summary',
  'key_findings',
  'traditions_analysis',
  'convergence_deep_dive',
  'advocate_case',
  'skeptic_case',
  'jaw_drop_layers',
  'faith_perspectives',
  'legendary_patterns',
  'circumstantial_convergence',
  'open_questions',
  'how_cultures_describe',
  'sources',
] as const;

export async function handleSynthesisAssembly(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic, title } = job.params as unknown as SynthesisAssemblyPayload;
  const supabase = createServerSupabaseClient();

  // Load all sections for this session
  const { data: sections, error } = await supabase
    .from('dossier_sections')
    .select('section_key, content, status, word_count')
    .eq('session_id', job.session_id)
    .eq('is_current', true);

  if (error) throw new Error(`Failed to load sections: ${error.message}`);
  if (!sections || sections.length === 0) throw new Error('No sections found to assemble');

  const sectionMap = Object.fromEntries(
    (sections as { section_key: string; content: unknown; status: string; word_count: number }[]).map(
      (s) => [s.section_key, { content: s.content, status: s.status, word_count: s.word_count }],
    ),
  );

  const sectionSnapshot: Record<string, unknown> = {};
  for (const key of SECTION_ORDER) {
    if (sectionMap[key]) {
      sectionSnapshot[key] = sectionMap[key];
    }
  }

  const presentSections = Object.keys(sectionSnapshot);
  const missingSections = SECTION_ORDER.filter((k) => !sectionMap[k]);

  // Get next version number
  const { data: existingVersions } = await supabase
    .from('dossier_versions')
    .select('version_number')
    .eq('session_id', job.session_id)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersion = existingVersions?.[0]?.version_number
    ? (existingVersions[0].version_number as number) + 1
    : 1;

  const { data: versionRow, error: versionError } = await supabase
    .from('dossier_versions')
    .insert({
      session_id: job.session_id,
      topic,
      assembly_job_id: job.id,
      version_number: nextVersion,
      section_snapshot: sectionSnapshot,
      change_summary: `Assembly of ${presentSections.length} sections`,
      status: 'draft',
    })
    .select('id')
    .single();

  if (versionError) throw new Error(`Failed to create dossier version: ${versionError.message}`);

  // ── Build full SynthesizedOutput from parsed sections ──────────────────────
  try {
    // Load outline for title/subtitle/convergence_score/traditions_analyzed
    const sessionJobs = await getJobsForSession(job.session_id);
    const outlineJob = sessionJobs.find((j) => j.job_type === 'synthesis_outline');
    const outline = outlineJob?.output_data?.outline as SynthesisOutline | undefined;

    const [findings, convergenceAnalyses] = await Promise.all([
      getFindingsBySession(job.session_id),
      getConvergenceBySession(job.session_id),
    ]);

    const bestScore = outline?.convergence_score ?? Math.max(
      0,
      ...convergenceAnalyses.flatMap((a) => a.convergence_points).map((cp) => cp.composite_score),
    );
    const traditions = outline?.traditions_analyzed ?? [...new Set(findings.flatMap((f) => f.traditions))].sort();

    // Parse each section
    const get = (sectionKey: string, jsonKey: string): unknown =>
      parseSectionJson(sectionText(sectionMap[sectionKey]?.content), jsonKey);

    const executiveSummary = (get('executive_summary', 'executive_summary') as string) || '';
    const keyFindings = (get('key_findings', 'key_findings') as { finding: string; confidence: number; evidence_types: string[] }[]) || [];
    const advocateCase = (get('advocate_case', 'advocate_case') as string) || '';
    const skepticCase = (get('skeptic_case', 'skeptic_case') as string) || '';
    const jawDropLayers = (get('jaw_drop_layers', 'jaw_drop_layers') as JawDropLayer[]) || [];
    const faithPerspectives = (get('faith_perspectives', 'faith_perspectives') as Record<string, string>) || {};
    const legendaryPatterns = (get('legendary_patterns', 'legendary_patterns') as LegendaryPattern[]) || [];
    const circumstantialConvergence = (get('circumstantial_convergence', 'circumstantial_convergence') as CircumstantialSignal[]) || [];
    const openQuestions = (get('open_questions', 'open_questions') as string[]) || [];
    const howCulturesDescribe = (get('how_cultures_describe', 'how_cultures_describe') as Record<string, string>) || {};
    const sources = (get('sources', 'sources') as SourceReference[]) || [];

    // shared_elements_matrix lives inside convergence_deep_dive
    const convDeepDive = get('convergence_deep_dive', 'convergence_deep_dive') as Record<string, unknown> | null;
    const sharedElementsMatrix = (convDeepDive?.shared_elements_matrix as { element: string; traditions: Record<string, boolean> }[]) || [];

    const synthesizedOutput: SynthesizedOutput = {
      title: outline?.title ?? title,
      subtitle: outline?.subtitle ?? '',
      executive_summary: executiveSummary,
      convergence_score: bestScore,
      key_findings: keyFindings.map((kf) => ({
        finding: kf.finding,
        confidence: kf.confidence,
        evidence_types: (kf.evidence_types ?? []) as import('@/lib/research/types').EvidenceType[],
      })),
      traditions_analyzed: traditions,
      advocate_case: advocateCase,
      skeptic_case: skepticCase,
      jaw_drop_layers: jawDropLayers,
      shared_elements_matrix: sharedElementsMatrix,
      open_questions: openQuestions,
      faith_perspectives: faithPerspectives,
      legendary_patterns: legendaryPatterns,
      circumstantial_convergence: circumstantialConvergence,
      powerful_open_questions: openQuestions.slice(0, 5),
      how_cultures_describe: howCulturesDescribe,
      sources,
    };

    const allSources = findings.flatMap((f) => f.sources ?? []);
    const uniqueSources = allSources.filter(
      (s, i, arr) => arr.findIndex((x) => x.title === s.title) === i,
    );

    const { error: dossierError } = await supabase.from('topic_dossiers').upsert({
      topic,
      title: synthesizedOutput.title,
      summary: executiveSummary.slice(0, 500) || `Cross-tradition research on: ${topic}`,
      synthesized_output: synthesizedOutput,
      best_convergence_score: Math.round(bestScore),
      key_traditions: traditions,
      key_open_questions: openQuestions.slice(0, 10),
      last_researched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'topic' });

    if (dossierError) {
      console.error('[assembly] Failed to upsert topic_dossiers:', dossierError.message);
    }

    // Increment cumulative counters (best-effort)
    await supabase.rpc('increment_dossier_counters', {
      p_topic: topic,
      p_findings: findings.length,
      p_sources: uniqueSources.length,
    }).then(() => null, () => null);
  } catch (err) {
    console.error('[assembly] topic_dossiers upsert failed (non-fatal):', err);
  }

  // Mark session complete so Content tab picks it up
  await updateSessionStatus(job.session_id, 'complete').catch((err) =>
    console.error('[assembly] Failed to mark session complete:', err),
  );

  return {
    version_id: versionRow?.id ?? null,
    version_number: nextVersion,
    section_count: presentSections.length,
    missing_sections: missingSections,
    sections_present: presentSections,
  };
}
