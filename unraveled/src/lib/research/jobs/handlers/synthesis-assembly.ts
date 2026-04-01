import { createServerSupabaseClient } from '@/lib/supabase';
import type { ResearchJob } from '@/lib/research/storage/jobs';

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
  const { topic } = job.params as unknown as SynthesisAssemblyPayload;
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

  return {
    version_id: versionRow?.id ?? null,
    version_number: nextVersion,
    section_count: presentSections.length,
    missing_sections: missingSections,
    sections_present: presentSections,
  };
}
