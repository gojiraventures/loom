import type { AgentDefinition } from './types';
import { SHARED_BASE_PROMPT } from './shared-base-prompt';

/**
 * Translates OCEAN values (0–1) into concrete behavioural instructions
 * injected into every agent's prompt. This is what creates personality friction.
 */
function buildOceanInstructions(def: AgentDefinition): string {
  const { ocean, calibration } = def;
  const lines: string[] = [];

  // Openness → how broadly to range across disciplines and speculative territory
  if (ocean.openness >= 0.75) {
    lines.push('Draw connections across disciplines freely. Consider unconventional interpretations when evidence supports them. Do not privilege Western academic consensus over other knowledge systems.');
  } else if (ocean.openness <= 0.35) {
    lines.push('Stick strictly within established academic consensus. Cite only peer-reviewed or primary sources. Flag any interpretation that goes beyond documented evidence.');
  } else {
    lines.push('Balance established scholarship with emerging research. Note where mainstream and alternative interpretations diverge.');
  }

  // Conscientiousness → source standards and verification rigor
  if (ocean.conscientiousness >= 0.75) {
    lines.push('Every claim must be traceable to a specific source. Include author, year, and page/section where possible. If you cannot cite a source, flag the claim as unverified.');
  } else if (ocean.conscientiousness <= 0.35) {
    lines.push('Prioritize pattern recognition and synthesis over exhaustive citation. Note the most important sources; do not let citation anxiety slow analytical momentum.');
  }

  // Extraversion → response verbosity and directness
  if (ocean.extraversion >= 0.7) {
    lines.push('Be expansive and enthusiastic in findings. Surface surprising connections. Lead with the most striking evidence.');
  } else if (ocean.extraversion <= 0.3) {
    lines.push('Be precise and economical. No filler. Every sentence should add new information or analysis.');
  }

  // Agreeableness → how hard to push back on consensus/other agents
  if (ocean.agreeableness <= 0.3) {
    lines.push('Challenge every assumption. Do not accept a claim because it is widely held. Identify logical gaps, missing counter-evidence, and alternative explanations that have not been adequately addressed. Disagreement is your job.');
  } else if (ocean.agreeableness >= 0.7) {
    lines.push('Build on prior findings generously. Where evidence is ambiguous, note both interpretations. Reserve strong challenges for clear factual errors.');
  }

  // Neuroticism → confidence calibration and uncertainty handling
  if (ocean.neuroticism >= 0.65) {
    lines.push('Flag uncertainty explicitly. Distinguish between "we know X" and "evidence suggests X." Do not overstate confidence.');
  } else if (ocean.neuroticism <= 0.25) {
    lines.push('State findings with confidence proportional to the evidence. Do not hedge unnecessarily. Clear conclusions are more useful than endless qualifications.');
  }

  // Calibration sliders add more specific instructions
  if (calibration.citation_strictness >= 0.75) {
    lines.push('Reject any claim you cannot attach to a credible source. Tier 1–2 sources (primary texts, peer-reviewed journals) are strongly preferred. Tier 4–5 sources may be flagged but should not be primary evidence.');
  }

  if (calibration.contrarian_tendency >= 0.7) {
    lines.push('Actively seek counter-evidence. For every major claim, ask: what would disprove this? Has it been tested against that criterion?');
  }

  if (calibration.speculative_vs_conservative >= 0.7) {
    lines.push('Engage with fringe evidence and suppressed findings. If institutional narratives conflict with primary source documentation, note the discrepancy explicitly.');
  } else if (calibration.speculative_vs_conservative <= 0.3) {
    lines.push('Limit analysis to well-documented, peer-reviewed findings. Do not engage with fringe or unverified claims even when mentioned in sources.');
  }

  if (calibration.interdisciplinary_reach >= 0.7) {
    lines.push('Draw on archaeology, geology, genetics, linguistics, and comparative mythology as needed. Evidence does not respect disciplinary boundaries.');
  }

  return lines.map((l) => `- ${l}`).join('\n');
}

export function buildAgentPrompt(
  def: AgentDefinition,
  topic: string,
  researchQuestions: string[],
  additionalContext?: string,
): { systemPrompt: string; userPrompt: string } {
  const oceanInstructions = buildOceanInstructions(def);

  const systemPrompt = `${SHARED_BASE_PROMPT}

---

${def.systemPrompt}

## BEHAVIOURAL CALIBRATION
${oceanInstructions}

## OUTPUT REQUIREMENTS
You MUST return a valid JSON object matching this exact structure:
{
  "findings": [
    {
      "agent_id": "${def.id}",
      "claim_text": "A specific, falsifiable claim (not a vague statement)",
      "claim_type": "factual | interpretive | speculative | oral_account",
      "evidence_type": "textual | archaeological | geological | genetic | oral_tradition | iconographic | statistical | comparative",
      "strength": "strong | moderate | contested",
      "confidence": 0.0–1.0,
      "sources": [
        {
          "title": "Source title",
          "author": "Author name or null",
          "year": number or null,
          "source_type": "sacred_text | journal | book | excavation_report | oral_tradition | newspaper | archive | museum_db | government_record | website | other",
          "url": "URL or null",
          "credibility_tier": 1–5,
          "page_or_section": "specific page/chapter or null"
        }
      ],
      "traditions": ["tradition names involved"],
      "time_period": { "start_year": number, "end_year": number, "era": "description" } or null,
      "geographic_scope": ["regions"],
      "contradicts": [],
      "supports": [],
      "open_questions": ["what this finding does not resolve"],
      "raw_excerpts": ["direct quotes from source material"]
    }
  ]
}

MINIMUM: Return at least 5 findings. Aim for 8–15 high-quality findings with strong sourcing.
CONFIDENCE CALIBRATION: 0.9+ = multiple independent primary sources confirm. 0.7–0.9 = solid secondary sources. 0.5–0.7 = reasonable inference. Below 0.5 = speculative, use sparingly.
CREDIBILITY TIERS: 1 = primary text/peer-reviewed journal. 2 = university press book/excavation report. 3 = mainstream journalism/respected popular science. 4 = secondary commentary. 5 = fringe/unverified.`;

  const questionsSection = researchQuestions.length > 0
    ? `## RESEARCH QUESTIONS\n${researchQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : `## RESEARCH APPROACH\nNo specific questions have been provided. Conduct comprehensive domain research on this topic. Surface the most significant, surprising, and well-evidenced findings within your area of expertise.`;
  const contextText = additionalContext ? `\n\n## ADDITIONAL CONTEXT\n${additionalContext}` : '';

  const userPrompt = `## RESEARCH TOPIC: ${topic}

${questionsSection}
${contextText}

Conduct your research within your domain of expertise (${def.domain}). Return your findings as the JSON structure specified in your instructions.`;

  return { systemPrompt, userPrompt };
}

export function buildValidationPrompt(
  reviewerDef: AgentDefinition,
  findingsToReview: { id: string; agent_id: string; claim_text: string; evidence_type: string; sources: unknown[] }[],
  topic: string,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are ${reviewerDef.name}, a specialist in ${reviewerDef.domain}. You are reviewing research findings submitted by other agents for cross-validation.

Your job: assess each finding from your domain's perspective. Are the sources credible? Is the reasoning sound? Does the claim follow from the evidence cited?

Return ONLY valid JSON:
{
  "validations": [
    {
      "reviewer_agent_id": "${reviewerDef.id}",
      "finding_id": "the finding ID",
      "verdict": "confirmed | plausible | insufficient_evidence | contradicted",
      "reasoning": "specific explanation of your verdict",
      "additional_sources": []
    }
  ]
}

Verdict definitions:
- confirmed: Strong evidence from your domain corroborates this claim
- plausible: Claim is reasonable but evidence is thin or indirect
- insufficient_evidence: Claim may be true but lacks adequate sourcing
- contradicted: Specific counter-evidence exists that this finding ignores`;

  const findingsSummary = findingsToReview
    .map((f) => `ID: ${f.id}\nAgent: ${f.agent_id}\nClaim: ${f.claim_text}\nEvidence type: ${f.evidence_type}\nSources: ${(f.sources as unknown[]).length} cited`)
    .join('\n\n---\n\n');

  const userPrompt = `Topic: ${topic}\n\nFindings to review:\n\n${findingsSummary}`;

  return { systemPrompt, userPrompt };
}
