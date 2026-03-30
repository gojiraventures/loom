import { route } from '../llm/router';
import { ConvergenceAnalysisSchema } from '../schemas';
import { insertConvergenceAnalysis } from '../storage/convergence';
import { patternMatcher, timelineAnalyst, geographicAnalyst } from './definitions';
import type { AgentFinding, ConvergenceAnalysis } from '../types';
import type { AgentDefinition } from '../types';

const CONVERGENCE_AGENTS = [patternMatcher, timelineAnalyst, geographicAnalyst];

function buildConvergencePrompt(
  def: AgentDefinition,
  topic: string,
  findings: (AgentFinding & { id: string })[],
): { systemPrompt: string; userPrompt: string } {
  const findingsSummary = findings
    .slice(0, 40) // Cap input size
    .map((f) => [
      `ID: ${(f as { id: string }).id}`,
      `Agent: ${f.agent_id}`,
      `Claim: ${f.claim_text}`,
      `Evidence: ${f.evidence_type} | Strength: ${f.strength} | Confidence: ${f.confidence}`,
      `Traditions: ${f.traditions.join(', ')}`,
      `Period: ${f.time_period?.era ?? 'unknown'}`,
      `Geography: ${f.geographic_scope.join(', ')}`,
    ].join('\n'))
    .join('\n\n---\n\n');

  const systemPrompt = `${def.systemPrompt}

Return ONLY valid JSON matching this structure:
{
  "agent_id": "${def.id}",
  "convergence_points": [
    {
      "title": "Name of this convergence point",
      "traditions_involved": ["tradition1", "tradition2"],
      "shared_elements": ["specific structural element 1", "specific structural element 2"],
      "scores": {
        "source_independence": 0-100,
        "structural_specificity": 0-100,
        "physical_corroboration": 0-100,
        "chronological_consistency": 0-100
      },
      "composite_score": 0-100,
      "supporting_finding_ids": ["finding-id-1"],
      "notes": "key observations"
    }
  ],
  "timeline_gaps": [
    { "description": "gap description", "severity": "minor|major|critical" }
  ],
  "geographic_clusters": [
    {
      "region": "region name",
      "traditions": ["tradition names"],
      "isolation_confirmed": true|false,
      "notes": "details"
    }
  ]
}`;

  const userPrompt = `Topic: ${topic}\n\nResearch findings to analyse:\n\n${findingsSummary}`;

  return { systemPrompt, userPrompt };
}

export interface ConvergenceRunResult {
  agentId: string;
  analysis: ConvergenceAnalysis | null;
  error?: string;
}

async function runConvergenceAgent(
  def: AgentDefinition,
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
): Promise<ConvergenceRunResult> {
  const { systemPrompt, userPrompt } = buildConvergencePrompt(def, topic, findings);

  let response;
  try {
    response = await route(
      {
        provider: def.llm.provider,
        systemPrompt,
        userPrompt,
        jsonMode: true,
        maxTokens: def.llm.maxTokens,
        temperature: def.llm.temperature,
        sessionId,
      },
      def.id,
    );
  } catch (err) {
    return {
      agentId: def.id,
      analysis: null,
      error: `LLM error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let analysis: ConvergenceAnalysis;
  try {
    const raw = response.parsed ?? JSON.parse(response.text);
    analysis = ConvergenceAnalysisSchema.parse(raw) as ConvergenceAnalysis;
  } catch (err) {
    return {
      agentId: def.id,
      analysis: null,
      error: `Schema error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  await insertConvergenceAnalysis(sessionId, analysis);
  return { agentId: def.id, analysis };
}

export async function runConvergenceLayer(
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
): Promise<ConvergenceRunResult[]> {
  const settled = await Promise.allSettled(
    CONVERGENCE_AGENTS.map((def) => runConvergenceAgent(def, sessionId, topic, findings)),
  );

  return settled.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { agentId: 'unknown', analysis: null, error: String(r.reason) },
  );
}
