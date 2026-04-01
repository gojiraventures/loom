import { route } from '../llm/router';
import { parseJsonResponse } from '../llm/parse';
import { SynthesizedOutputSchema } from '../schemas';
import type {
  AgentFinding,
  ConvergenceAnalysis,
  DebateRecord,
  SynthesizedOutput,
  ValidationResult,
} from '../types';

const SYNTHESIZER_SYSTEM_PROMPT = `You are the Editorial Synthesizer for Unraveled.ai.

Your job: take the raw output of a multi-agent research pipeline — research findings, cross-validations, convergence analyses, and an adversarial debate — and produce a single publication-quality synthesis.

VOICE:
You write for an audience that includes rigorous academics AND curious general readers. You are not a journalist simplifying for clicks. You are not an academic hiding behind jargon. You are a scholar who can explain why something is genuinely surprising.

YOUR EDITORIAL ROLE:
1. You have seen the Advocate's strongest case and the Skeptic's best rebuttal. You are not choosing a side. You are reporting the state of the evidence honestly.
2. Jaw-drop layers are NOT conspiracy bait. They are the specific moments where the evidence genuinely surprises even a sceptic. If nothing genuinely surprises you, say so honestly.
3. The shared elements matrix is a factual record. Do not inflate it.
4. Open questions are your gift to future researchers. Make them specific and researchable.
5. How cultures describe: give the reader a sense of each tradition in its own voice — not filtered through Western categories.

MANDATORY SECTIONS — DO NOT OMIT:
6. faith_perspectives: For every major religious tradition in the findings, document what their theological/scriptural framework actually claims about this topic. Do not summarize from a secular lens — present what the tradition itself teaches. These are not "interpretations to be balanced against" — they are primary data.
7. legendary_patterns: Document specific recurring mythological and narrative patterns across traditions. Name the specific motifs, the traditions they appear in, and the structural details they share.
8. circumstantial_convergence: Surface weak signals — individual data points that alone prove nothing but together point somewhere. Rate each signal's strength (weak/moderate/strong) honestly. Do not discard weak evidence — document it with its rating.
9. powerful_open_questions: The most jaw-dropping unresolved questions — the ones a researcher would dedicate years to. Not generic gaps, but specific, researchable questions that the evidence has foregrounded.

INSTITUTIONAL SUPPRESSION CLAIMS:
If findings include evidence of institutional involvement in suppressing, reinterpreting, or discrediting physical evidence (Smithsonian policies, museum collection practices, archaeological record gaps, specific named researchers), surface these prominently. Do not bury them as footnotes. They are part of the evidence record. Apply the same evidential standards you would to any other claim — document what evidence exists for and against.

THE TEST: Would a sceptical professor of ancient history read this and think "this is the most serious treatment of this question I have seen outside a journal"? If yes, you have succeeded.`;

function buildSynthesizerPrompt(
  topic: string,
  findings: (AgentFinding & { id: string })[],
  validations: ValidationResult[],
  convergenceAnalyses: ConvergenceAnalysis[],
  debate: DebateRecord,
): string {
  // Deduplicate findings by claim similarity, then sort by confidence.
  // Keep top 120 — enough to surface deep rabbit holes without overflowing context.
  const seenClaims = new Set<string>();
  const uniqueFindings = findings
    .sort((a, b) => b.confidence - a.confidence)
    .filter((f) => {
      // Rough dedup: first 80 chars of claim
      const key = f.claim_text.slice(0, 80).toLowerCase();
      if (seenClaims.has(key)) return false;
      seenClaims.add(key);
      return true;
    })
    .slice(0, 60);

  const topFindings = uniqueFindings
    .map((f) =>
      `[${f.agent_id}] ${f.evidence_type} | ${f.strength} | conf:${f.confidence.toFixed(2)}\n${f.claim_text}`,
    )
    .join('\n\n');

  // Validation summary
  const confirmed = validations.filter((v) => v.verdict === 'confirmed').length;
  const contradicted = validations.filter((v) => v.verdict === 'contradicted').length;
  const insufficient = validations.filter((v) => v.verdict === 'insufficient_evidence').length;

  // Top convergence points across all agents
  const topConvergence = convergenceAnalyses
    .flatMap((a) => a.convergence_points)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, 8)
    .map((cp) =>
      `${cp.title} (${cp.composite_score}/100)\nTraditions: ${cp.traditions_involved.join(', ')}\nElements: ${cp.shared_elements.join('; ')}\n${cp.notes}`,
    )
    .join('\n\n');

  // All traditions mentioned
  const allTraditions = [...new Set(findings.flatMap((f) => f.traditions))].sort();

  // All sources
  const allSources = findings
    .flatMap((f) => f.sources)
    .filter((s) => s.credibility_tier <= 2)
    .slice(0, 20);

  return `Topic: ${topic}

RESEARCH SUMMARY:
- ${findings.length} findings from ${new Set(findings.map((f) => f.agent_id)).size} research agents
- Cross-validation: ${confirmed} confirmed, ${contradicted} contradicted, ${insufficient} insufficient evidence
- Traditions covered: ${allTraditions.join(', ')}

TOP FINDINGS BY CONFIDENCE:
${topFindings}

TOP CONVERGENCE POINTS:
${topConvergence}

ADVOCATE'S CASE:
${debate.advocate_case}

ADVOCATE'S STRONGEST POINTS:
${debate.advocate_strongest_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

SKEPTIC'S REBUTTAL:
${debate.skeptic_case}

SKEPTIC'S STRONGEST POINTS:
${debate.skeptic_strongest_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

UNRESOLVED TENSIONS:
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

AGREED FACTS:
${debate.agreed_facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Synthesize this into publication-quality output. Return ONLY valid JSON matching exactly this structure:
{
  "title": "Short punchy title for this research",
  "subtitle": "One-sentence elaboration",
  "executive_summary": "3-4 paragraph summary of what the research found, what's genuinely surprising, and what remains unresolved. Min 200 words.",
  "convergence_score": 0-100,
  "key_findings": [
    { "finding": "specific claim", "confidence": 0.0-1.0, "evidence_types": ["textual", "geological", ...] }
  ],
  "traditions_analyzed": ["tradition names"],
  "advocate_case": "200+ word synthesis of the strongest case FOR convergence significance",
  "skeptic_case": "200+ word synthesis of the strongest conventional explanation",
  "jaw_drop_layers": [
    {
      "level": 1-6,
      "title": "Short title",
      "content": "The specific surprising finding, with evidence. Min 80 words.",
      "evidence_hook": "One sentence that would make a sceptic pause"
    }
  ],
  "shared_elements_matrix": [
    {
      "element": "specific structural element",
      "traditions": { "TraditionName": true/false }
    }
  ],
  "open_questions": ["specific researchable question 1", "question 2", "question 3"],
  "faith_perspectives": {
    "TraditionName": "What this tradition's theology/scripture specifically claims about this topic — in the tradition's own framing"
  },
  "legendary_patterns": [
    {
      "pattern": "Name of the recurring pattern",
      "traditions": ["tradition1", "tradition2"],
      "specific_motifs": ["specific detail 1", "specific detail 2"],
      "notes": "What makes this pattern significant"
    }
  ],
  "circumstantial_convergence": [
    {
      "signal": "Description of the weak signal",
      "strength": "weak|moderate|strong",
      "traditions_involved": ["tradition1"],
      "notes": "Why this signal matters even though it doesn't prove anything alone"
    }
  ],
  "powerful_open_questions": [
    "A specific researchable question that the evidence has opened — one a researcher could spend years on"
  ],
  "how_cultures_describe": {
    "TraditionName": "How this tradition describes the event in its own framing"
  },
  "sources": [
    {
      "title": "source title",
      "author": "author or null",
      "year": year or null,
      "source_type": "sacred_text|journal|book|excavation_report|oral_tradition|newspaper|archive|museum_db|government_record|website|other",
      "url": "url or null",
      "credibility_tier": 1-5,
      "page_or_section": "location or null"
    }
  ]
}`;
}

export interface SynthesisResult {
  output: SynthesizedOutput | null;
  error?: string;
}

export async function runSynthesis(
  sessionId: string,
  topic: string,
  findings: (AgentFinding & { id: string })[],
  validations: ValidationResult[],
  convergenceAnalyses: ConvergenceAnalysis[],
  debate: DebateRecord,
): Promise<SynthesisResult> {
  let response;
  try {
    response = await route(
      {
        provider: 'claude',
        model: 'claude-sonnet-4-6',
        systemPrompt: SYNTHESIZER_SYSTEM_PROMPT,
        userPrompt: buildSynthesizerPrompt(topic, findings, validations, convergenceAnalyses, debate),
        jsonMode: true,
        maxTokens: 8192,
        temperature: 0.60,
        sessionId,
      },
      'synthesizer',
    );
  } catch (err) {
    return {
      output: null,
      error: `Synthesizer LLM failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  try {
    const raw = parseJsonResponse(response);
    const output = SynthesizedOutputSchema.parse(raw) as SynthesizedOutput;
    return { output };
  } catch (err) {
    return {
      output: null,
      error: `Synthesizer schema validation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
