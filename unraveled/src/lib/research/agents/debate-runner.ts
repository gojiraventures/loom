import { route } from '../llm/router';
import { DebateRecordSchema } from '../schemas';
import { insertDebateRecord } from '../storage/debates';
import { advocate } from './definitions/advocate';
import { skeptic } from './definitions/skeptic';
import type { AgentFinding, ConvergenceAnalysis, DebateRecord } from '../types';

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildAdvocatePrompt(
  topic: string,
  findings: (AgentFinding & { id: string })[],
  convergenceAnalyses: ConvergenceAnalysis[],
): string {
  const findingsSummary = findings
    .filter((f) => f.strength !== 'contested' || f.confidence > 0.5)
    .slice(0, 50)
    .map((f) =>
      `[${f.id}] ${f.agent_id} | ${f.evidence_type} | confidence ${f.confidence.toFixed(2)}\n${f.claim_text}`,
    )
    .join('\n\n');

  const convergenceSummary = convergenceAnalyses
    .flatMap((a) => a.convergence_points)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 10)
    .map((cp) =>
      `${cp.title} (score ${cp.composite_score}/100)\nTraditions: ${cp.traditions_involved.join(', ')}\nShared elements: ${cp.shared_elements.join('; ')}`,
    )
    .join('\n\n');

  return `Topic: ${topic}

RESEARCH FINDINGS (${findings.length} total, showing strongest):
${findingsSummary}

TOP CONVERGENCE POINTS:
${convergenceSummary}

Build the strongest possible case FOR the significance of these convergence patterns. Return ONLY valid JSON:
{
  "topic": "${topic}",
  "advocate_case": "detailed argument (500+ words)",
  "advocate_strongest_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "advocate_confidence": 0.0-1.0,
  "skeptic_case": "",
  "skeptic_strongest_points": [],
  "skeptic_confidence": 0,
  "unresolved_tensions": ["tension 1", "tension 2", "tension 3"],
  "agreed_facts": ["fact 1", "fact 2", "fact 3"],
  "rounds": 1
}`;
}

function buildSkepticPrompt(
  topic: string,
  findings: (AgentFinding & { id: string })[],
  convergenceAnalyses: ConvergenceAnalysis[],
  advocateCase: string,
  advocateStrongestPoints: string[],
): string {
  const weakFindings = findings
    .filter((f) => f.strength === 'contested' || f.confidence < 0.5)
    .slice(0, 20)
    .map((f) => `[${f.id}] ${f.claim_text} (confidence: ${f.confidence.toFixed(2)})`)
    .join('\n');

  const allTraditions = [...new Set(findings.flatMap((f) => f.traditions))];

  return `Topic: ${topic}

THE ADVOCATE'S CASE:
${advocateCase}

ADVOCATE'S STRONGEST POINTS:
${advocateStrongestPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

CONTESTED/LOW-CONFIDENCE FINDINGS THE ADVOCATE MAY HAVE DOWNPLAYED:
${weakFindings || '(none flagged)'}

TRADITIONS REPRESENTED: ${allTraditions.join(', ')}

Construct the most rigorous conventional explanation. Attack the STRONGEST points, not the weakest.
Identify what the Advocate has overstated, cherry-picked, or failed to rule out.
Return ONLY valid JSON:
{
  "topic": "${topic}",
  "advocate_case": ${JSON.stringify(advocateCase)},
  "advocate_strongest_points": ${JSON.stringify(advocateStrongestPoints)},
  "advocate_confidence": 0,
  "skeptic_case": "detailed rebuttal (500+ words)",
  "skeptic_strongest_points": ["rebuttal 1", "rebuttal 2", "rebuttal 3", "rebuttal 4", "rebuttal 5"],
  "skeptic_confidence": 0.0-1.0,
  "unresolved_tensions": ["what neither side can explain 1", "tension 2", "tension 3"],
  "agreed_facts": ["what both sides agree on 1", "agreed 2", "agreed 3"],
  "rounds": 1
}`;
}

// ── Intermediate debate round types ──────────────────────────────────────────

interface AdvocateRound {
  case: string;
  strongest_points: string[];
  confidence: number;
  unresolved_tensions: string[];
  agreed_facts: string[];
}

// ── Runner ────────────────────────────────────────────────────────────────────

export interface DebateRunResult {
  debate: DebateRecord | null;
  error?: string;
}

export async function runDebate(
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
  convergenceAnalyses: ConvergenceAnalysis[],
): Promise<DebateRunResult> {
  // ── Round 1: Advocate builds case ──────────────────────────────────────────
  let advocateRound: AdvocateRound;
  try {
    const advocateResponse = await route(
      {
        provider: advocate.llm.provider,
        systemPrompt: advocate.systemPrompt,
        userPrompt: buildAdvocatePrompt(topic, findings, convergenceAnalyses),
        jsonMode: true,
        maxTokens: advocate.llm.maxTokens,
        temperature: advocate.llm.temperature,
        sessionId,
      },
      advocate.id,
    );

    const raw = advocateResponse.parsed ?? JSON.parse(advocateResponse.text);
    advocateRound = {
      case: raw.advocate_case ?? '',
      strongest_points: raw.advocate_strongest_points ?? [],
      confidence: raw.advocate_confidence ?? 0.5,
      unresolved_tensions: raw.unresolved_tensions ?? [],
      agreed_facts: raw.agreed_facts ?? [],
    };
  } catch (err) {
    return {
      debate: null,
      error: `Advocate failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // ── Round 2: Skeptic tears it apart ────────────────────────────────────────
  let debate: DebateRecord;
  try {
    const skepticResponse = await route(
      {
        provider: skeptic.llm.provider,
        systemPrompt: skeptic.systemPrompt,
        userPrompt: buildSkepticPrompt(
          topic,
          findings,
          convergenceAnalyses,
          advocateRound.case,
          advocateRound.strongest_points,
        ),
        jsonMode: true,
        maxTokens: skeptic.llm.maxTokens,
        temperature: skeptic.llm.temperature,
        sessionId,
      },
      skeptic.id,
    );

    const raw = skepticResponse.parsed ?? JSON.parse(skepticResponse.text);

    // Merge: Advocate fields from round 1, Skeptic fields from round 2
    const merged = {
      topic,
      advocate_case: advocateRound.case,
      advocate_strongest_points: advocateRound.strongest_points,
      advocate_confidence: advocateRound.confidence,
      skeptic_case: raw.skeptic_case ?? '',
      skeptic_strongest_points: raw.skeptic_strongest_points ?? [],
      skeptic_confidence: raw.skeptic_confidence ?? 0.5,
      // Skeptic has full context so their tension/agreed lists are more informed
      unresolved_tensions: raw.unresolved_tensions?.length
        ? raw.unresolved_tensions
        : advocateRound.unresolved_tensions,
      agreed_facts: raw.agreed_facts?.length
        ? raw.agreed_facts
        : advocateRound.agreed_facts,
      rounds: 2,
    };

    debate = DebateRecordSchema.parse(merged) as DebateRecord;
  } catch (err) {
    return {
      debate: null,
      error: `Skeptic failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  try {
    await insertDebateRecord(sessionId, debate);
  } catch (err) {
    // Non-fatal — return the debate even if storage failed
    console.error('insertDebateRecord failed:', err);
  }

  return { debate };
}
