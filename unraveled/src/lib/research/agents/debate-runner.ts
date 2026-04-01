import { route } from '../llm/router';
import { IS_OLLAMA_MODE } from '../llm/concurrency';
import { DebateRecordSchema } from '../schemas';
import { insertDebateRecord } from '../storage/debates';
import type { AgentFinding, ConvergenceAnalysis, DebateRecord } from '../types';

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildSharedContext(
  topic: string,
  findings: (AgentFinding & { id: string })[],
  convergenceAnalyses: ConvergenceAnalysis[],
): string {
  const findingsSummary = findings
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

RESEARCH FINDINGS (${findings.length} total, showing up to 50):
${findingsSummary}

TOP CONVERGENCE POINTS:
${convergenceSummary}`;
}

function buildAdvocatePrompt(sharedContext: string, topic: string): string {
  return `${sharedContext}

Build the strongest possible case FOR the significance of these convergence patterns.
Not credulous — rigorously honest about what the evidence actually supports.
Your job: make the skeptic's rebuttal as hard as possible.

Return ONLY valid JSON:
{
  "advocate_case": "detailed argument (500+ words)",
  "advocate_strongest_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "advocate_confidence": 0.0,
  "unresolved_tensions": ["tension 1", "tension 2", "tension 3"],
  "agreed_facts": ["fact 1", "fact 2", "fact 3"]
}

Topic: ${topic}`;
}

function buildSkepticPrompt(sharedContext: string, topic: string): string {
  return `${sharedContext}

Build the strongest possible conventional explanation AGAINST the significance of these patterns.
Not dismissive — rigorously honest about what the evidence actually supports.
Identify hoaxes, misidentifications, confirmation bias, and alternative explanations not ruled out.
Diffusion theory requires a documented transmission route — state it explicitly or acknowledge absence.

Return ONLY valid JSON:
{
  "skeptic_case": "detailed rebuttal (500+ words)",
  "skeptic_strongest_points": ["rebuttal 1", "rebuttal 2", "rebuttal 3", "rebuttal 4", "rebuttal 5"],
  "skeptic_confidence": 0.0,
  "unresolved_tensions": ["what neither side can explain 1", "tension 2", "tension 3"],
  "agreed_facts": ["what both sides agree on 1", "agreed 2", "agreed 3"]
}

Topic: ${topic}`;
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
  const sharedContext = buildSharedContext(topic, findings, convergenceAnalyses);

  // In Ollama mode, use Claude for debate — the 8192-token advocate/skeptic prompts cause
  // qwen2.5:32b to OOM and drop the connection. Debate is argumentative reasoning that Claude
  // handles well, and synthesis (Phase 5) already uses Claude anyway.
  const debateProvider = IS_OLLAMA_MODE ? 'claude' as const : 'gemini' as const;

  const advocateRequest = {
    provider: debateProvider,
    skipOllamaOverride: true, // Phases 2-5 always use cloud; Ollama is Layer 1 only
    systemPrompt: `You are The Advocate for Unraveled.ai. Your mandate: construct the strongest possible evidence-based case FOR the significance of convergence patterns across traditions. Not credulous — rigorously honest. Every major claim must cite a source. Make the skeptic's job hard.`,
    userPrompt: buildAdvocatePrompt(sharedContext, topic),
    jsonMode: true,
    maxTokens: 8192,
    temperature: 0.55,
    sessionId,
  };
  const skepticRequest = {
    provider: debateProvider,
    skipOllamaOverride: true, // Phases 2-5 always use cloud; Ollama is Layer 1 only
    systemPrompt: `You are The Skeptic for Unraveled.ai. Your mandate: construct the strongest possible conventional explanation AGAINST convergence significance. Not dismissive — rigorously rigorous. "It's just a myth" is not an argument. Provide specific alternative explanations. Diffusion theory requires a documented route.`,
    userPrompt: buildSkepticPrompt(sharedContext, topic),
    jsonMode: true,
    maxTokens: 8192,
    temperature: 0.45,
    sessionId,
  };

  // Run in parallel — Claude handles concurrent requests fine; Gemini does too in cloud mode.
  const [advocateResult, skepticResult] = await Promise.allSettled([
    route(advocateRequest, 'advocate'),
    route(skepticRequest, 'skeptic'),
  ]);

  if (advocateResult.status === 'rejected') {
    return { debate: null, error: `Advocate failed: ${advocateResult.reason instanceof Error ? advocateResult.reason.message : String(advocateResult.reason)}` };
  }
  if (skepticResult.status === 'rejected') {
    return { debate: null, error: `Skeptic failed: ${skepticResult.reason instanceof Error ? skepticResult.reason.message : String(skepticResult.reason)}` };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let advRaw: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let skpRaw: any;
  try {
    advRaw = advocateResult.value.parsed ?? JSON.parse(advocateResult.value.text);
    skpRaw = skepticResult.value.parsed ?? JSON.parse(skepticResult.value.text);
  } catch (err) {
    return { debate: null, error: `Failed to parse debate outputs: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Merge: take unresolved_tensions and agreed_facts from whichever side provided more
  const unresolvedTensions: string[] =
    (advRaw.unresolved_tensions?.length ?? 0) >= (skpRaw.unresolved_tensions?.length ?? 0)
      ? (advRaw.unresolved_tensions ?? [])
      : (skpRaw.unresolved_tensions ?? []);

  const agreedFacts: string[] =
    (advRaw.agreed_facts?.length ?? 0) >= (skpRaw.agreed_facts?.length ?? 0)
      ? (advRaw.agreed_facts ?? [])
      : (skpRaw.agreed_facts ?? []);

  const merged = {
    topic,
    advocate_case: advRaw.advocate_case ?? '',
    advocate_strongest_points: advRaw.advocate_strongest_points ?? [],
    advocate_confidence: advRaw.advocate_confidence ?? 0.5,
    skeptic_case: skpRaw.skeptic_case ?? '',
    skeptic_strongest_points: skpRaw.skeptic_strongest_points ?? [],
    skeptic_confidence: skpRaw.skeptic_confidence ?? 0.5,
    unresolved_tensions: unresolvedTensions,
    agreed_facts: agreedFacts,
    rounds: 1,
  };

  let debate: DebateRecord;
  try {
    debate = DebateRecordSchema.parse(merged) as DebateRecord;
  } catch (err) {
    return { debate: null, error: `Debate schema parse failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  try {
    await insertDebateRecord(sessionId, debate);
  } catch (err) {
    console.error('insertDebateRecord failed:', err);
  }

  return { debate };
}
