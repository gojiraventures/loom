import { upsertTopicDossier } from './storage/dossiers';
import type { AgentFinding, ConvergenceAnalysis, DebateRecord, SynthesizedOutput } from './types';

/**
 * Accumulate research session results into the topic dossier.
 * Non-fatal — logs errors without throwing so the pipeline always completes.
 */
export async function accumulateDossier(params: {
  topic: string;
  title: string;
  findings: (AgentFinding & { id: string })[];
  convergenceAnalyses: ConvergenceAnalysis[];
  debate: DebateRecord;
  output: SynthesizedOutput;
}): Promise<void> {
  const { topic, title, findings, convergenceAnalyses, output } = params;

  const allSources = findings.flatMap((f) => f.sources);
  const uniqueSources = allSources.filter(
    (s, idx, arr) => arr.findIndex((x) => x.title === s.title) === idx,
  );

  const bestScore = Math.max(
    output.convergence_score,
    ...convergenceAnalyses
      .flatMap((a) => a.convergence_points)
      .map((cp) => cp.composite_score),
    0,
  );

  try {
    await upsertTopicDossier({
      topic,
      title,
      synthesized_output: output,
      finding_count: findings.length,
      source_count: uniqueSources.length,
      convergence_score: bestScore,
      traditions: output.traditions_analyzed,
      open_questions: output.open_questions,
    });
  } catch (err) {
    console.error('accumulateDossier failed (non-fatal):', err);
  }
}
