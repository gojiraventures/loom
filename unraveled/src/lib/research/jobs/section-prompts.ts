import type { AgentFinding, ConvergenceAnalysis, ConvergencePoint, DebateRecord, SourceReference } from '../types';

// ── Section Keys ─────────────────────────────────────────────────────────────

export type SectionKey =
  | 'executive_summary'
  | 'key_findings'
  | 'traditions_analysis'
  | 'convergence_deep_dive'
  | 'advocate_case'
  | 'skeptic_case'
  | 'jaw_drop_layers'
  | 'faith_perspectives'
  | 'legendary_patterns'
  | 'circumstantial_convergence'
  | 'open_questions'
  | 'how_cultures_describe'
  | 'sources';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SynthesisOutline {
  title: string;
  subtitle: string;
  convergence_score: number;
  traditions_analyzed: string[];
  section_notes: Record<string, string>;           // section_key → editorial notes
  top_finding_ids_by_section: Record<string, string[]>; // section_key → finding IDs
}

export interface SectionContext {
  topic: string;
  outline: SynthesisOutline;
  findings: (AgentFinding & { id: string })[];
  debate: DebateRecord;
  convergenceAnalyses: ConvergenceAnalysis[];
}

export interface SectionPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

// ── Editorial Voice ───────────────────────────────────────────────────────────

const EDITORIAL_VOICE = `You write for an audience that includes rigorous academics AND curious general readers. You are not a journalist simplifying for clicks. You are not an academic hiding behind jargon. You are a scholar who can explain why something is genuinely surprising.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFinding(f: AgentFinding & { id: string }): string {
  return `[${f.id}] ${f.evidence_type} | ${f.strength} | conf:${f.confidence.toFixed(2)} | traditions: ${f.traditions.join(', ')}\n${f.claim_text}`;
}

function topFindingsByConfidence(
  findings: (AgentFinding & { id: string })[],
  limit: number,
): (AgentFinding & { id: string })[] {
  const seen = new Set<string>();
  return findings
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .filter((f) => {
      const key = f.claim_text.slice(0, 80).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function findingsByTradition(
  findings: (AgentFinding & { id: string })[],
): Map<string, (AgentFinding & { id: string })[]> {
  const map = new Map<string, (AgentFinding & { id: string })[]>();
  for (const f of findings) {
    for (const t of f.traditions) {
      const existing = map.get(t) ?? [];
      existing.push(f);
      map.set(t, existing);
    }
  }
  return map;
}

function allSources(findings: (AgentFinding & { id: string })[]): SourceReference[] {
  // Collect all sources and deduplicate by URL then by title similarity
  const byUrl = new Map<string, SourceReference>();
  const byTitle = new Map<string, SourceReference>();
  const deduped: SourceReference[] = [];

  for (const f of findings) {
    for (const s of f.sources) {
      const urlKey = s.url?.trim().toLowerCase();
      const titleKey = s.title.trim().toLowerCase().slice(0, 60);

      if (urlKey && byUrl.has(urlKey)) continue;
      if (byTitle.has(titleKey)) continue;

      if (urlKey) byUrl.set(urlKey, s);
      byTitle.set(titleKey, s);
      deduped.push(s);
    }
  }

  return deduped.sort((a, b) => a.credibility_tier - b.credibility_tier);
}

function topConvergencePoints(analyses: ConvergenceAnalysis[], limit: number): ConvergencePoint[] {
  return analyses
    .flatMap((a) => a.convergence_points)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, limit);
}

function sectionNotes(outline: SynthesisOutline, key: SectionKey): string {
  return outline.section_notes[key] ? `\nEDITORIAL NOTES FOR THIS SECTION: ${outline.section_notes[key]}` : '';
}

// ── Main Function ─────────────────────────────────────────────────────────────

export function buildSectionPrompt(sectionKey: SectionKey, ctx: SectionContext): SectionPrompt {
  const { topic, outline, findings, debate, convergenceAnalyses } = ctx;

  switch (sectionKey) {
    // ── executive_summary ───────────────────────────────────────────────────
    case 'executive_summary': {
      const top20 = topFindingsByConfidence(findings, 20);
      const topConv = topConvergencePoints(convergenceAnalyses, 5);

      const systemPrompt = `You are writing the executive summary for a research dossier published on Unraveled.ai. ${EDITORIAL_VOICE} Your summary must open with what is genuinely surprising, state what the research found with specificity, and close with what remains unresolved — in that order. Do not bury the lead.`;

      const userPrompt = `Topic: ${topic}
Research title: ${outline.title}
Subtitle: ${outline.subtitle}
Overall convergence score: ${outline.convergence_score}/100
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'executive_summary')}

TOP 20 FINDINGS BY CONFIDENCE:
${top20.map(formatFinding).join('\n\n')}

TOP CONVERGENCE POINTS:
${topConv.map((cp) => `${cp.title} (score: ${cp.composite_score}/100)\nTraditions: ${cp.traditions_involved.join(', ')}\n${cp.notes}`).join('\n\n')}

UNRESOLVED TENSIONS FROM DEBATE:
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Write a 400-600 word executive summary. Return ONLY valid JSON (no markdown fences, no preamble) in this exact structure:
{
  "executive_summary": "400-600 word string covering: what the research found, what is genuinely surprising, what remains unresolved. Use paragraph breaks (\\n\\n). Do not pad."
}`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── key_findings ────────────────────────────────────────────────────────
    case 'key_findings': {
      const top12 = topFindingsByConfidence(findings, 12);

      const systemPrompt = `You are distilling the top research findings for a cross-tradition evidence index. ${EDITORIAL_VOICE} Each finding must be a specific, falsifiable claim — not a summary category. Include the traditions implicated and evidence types directly supporting each claim.`;

      const userPrompt = `Topic: ${topic}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'key_findings')}

TOP FINDINGS (already sorted by confidence descending — use these as the basis, restate them crisply):
${top12.map(formatFinding).join('\n\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "key_findings": [
    {
      "finding": "Specific, falsifiable claim in one sentence",
      "confidence": 0.0,
      "evidence_types": ["textual", "archaeological"],
      "traditions": ["Tradition1", "Tradition2"]
    }
  ]
}

Rules:
- 8 to 12 findings total
- confidence is 0.0–1.0
- evidence_types values must be from: textual, archaeological, geological, genetic, oral_tradition, iconographic, statistical, comparative
- Order by confidence descending`;

      return { systemPrompt, userPrompt, maxTokens: 1500 };
    }

    // ── traditions_analysis ─────────────────────────────────────────────────
    case 'traditions_analysis': {
      const byTradition = findingsByTradition(findings);
      const traditionBlocks = outline.traditions_analyzed.map((t) => {
        const tFindings = (byTradition.get(t) ?? [])
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 8)
          .map(formatFinding)
          .join('\n\n');
        return `TRADITION: ${t}\n${tFindings || '(no direct findings — infer from convergence context)'}`;
      }).join('\n\n---\n\n');

      const systemPrompt = `You are writing the per-tradition breakdown section of a research dossier. ${EDITORIAL_VOICE} For each tradition, state precisely what it contributes to this topic: its primary sources, what those sources specifically claim, and an honest assessment of evidential strength. Do not blend traditions together.`;

      const userPrompt = `Topic: ${topic}
Traditions to cover: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'traditions_analysis')}

FINDINGS GROUPED BY TRADITION:
${traditionBlocks}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "traditions_analysis": [
    {
      "tradition": "Tradition name",
      "what_it_says": "What this tradition specifically claims about the topic — 100-200 words, citing specific texts or practices",
      "primary_sources": ["Source 1", "Source 2"],
      "evidence_strength": "strong | moderate | weak | contested",
      "notes": "Anything that makes this tradition's evidence distinctive or problematic"
    }
  ]
}

Cover every tradition in the list. Order by evidence_strength descending.`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── convergence_deep_dive ───────────────────────────────────────────────
    case 'convergence_deep_dive': {
      const allConvPoints = topConvergencePoints(convergenceAnalyses, 12);
      const agreedFacts = debate.agreed_facts;

      const systemPrompt = `You are writing the convergence deep-dive for a cross-tradition research dossier. ${EDITORIAL_VOICE} Focus on the specific structural parallels that appear across independent traditions — not surface resemblances. The shared_elements_matrix is a factual record; do not inflate it. Score each convergence point honestly.`;

      const userPrompt = `Topic: ${topic}
Overall convergence score: ${outline.convergence_score}/100
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'convergence_deep_dive')}

CONVERGENCE POINTS (scored by composite):
${allConvPoints.map((cp) => `${cp.title} — composite: ${cp.composite_score}/100
  Source independence: ${cp.scores.source_independence} | Structural specificity: ${cp.scores.structural_specificity}
  Physical corroboration: ${cp.scores.physical_corroboration} | Chronological consistency: ${cp.scores.chronological_consistency}
  Traditions: ${cp.traditions_involved.join(', ')}
  Shared elements: ${cp.shared_elements.join('; ')}
  Notes: ${cp.notes}`).join('\n\n')}

AGREED FACTS (from adversarial debate):
${agreedFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "convergence_deep_dive": {
    "narrative": "200-400 word narrative explaining the most significant convergence findings and what makes them notable",
    "top_convergence_points": [
      {
        "title": "Convergence point title",
        "traditions_involved": ["Tradition1"],
        "composite_score": 0,
        "score_breakdown": {
          "source_independence": 0,
          "structural_specificity": 0,
          "physical_corroboration": 0,
          "chronological_consistency": 0
        },
        "explanation": "2-4 sentences on why this convergence is or isn't significant",
        "shared_elements": ["element 1", "element 2"]
      }
    ],
    "shared_elements_matrix": [
      {
        "element": "Specific structural element",
        "traditions": { "TraditionName": true }
      }
    ]
  }
}`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── advocate_case ───────────────────────────────────────────────────────
    case 'advocate_case': {
      const strongFindings = findings
        .filter((f) => f.strength === 'strong' || f.confidence >= 0.7)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);
      const topConv = topConvergencePoints(convergenceAnalyses, 6);

      const systemPrompt = `You are writing the advocate's case for a research dossier — the strongest possible argument FOR the significance of the cross-tradition parallels. ${EDITORIAL_VOICE} Do not strawman the skeptical position; steel-man the advocate's. Use specific evidence, not rhetorical flourish. Acknowledge what the advocate cannot yet prove.`;

      const userPrompt = `Topic: ${topic}
Advocate confidence from debate: ${debate.advocate_confidence}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'advocate_case')}

ADVOCATE'S CASE FROM DEBATE:
${debate.advocate_case}

ADVOCATE'S STRONGEST POINTS:
${debate.advocate_strongest_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

STRONGEST SUPPORTING FINDINGS:
${strongFindings.map(formatFinding).join('\n\n')}

TOP CONVERGENCE POINTS:
${topConv.map((cp) => `${cp.title} (${cp.composite_score}/100): ${cp.notes}`).join('\n\n')}

AGREED FACTS (the advocate can build on these):
${debate.agreed_facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "advocate_case": "300+ word synthesis of the strongest case FOR the significance of these cross-tradition parallels. Use specific evidence. Acknowledge limits honestly. Do not use rhetorical padding."
}`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── skeptic_case ─────────────────────────────────────────────────────────
    case 'skeptic_case': {
      const contestedFindings = findings
        .filter((f) => f.strength === 'contested' || f.claim_type === 'speculative')
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 15);

      const systemPrompt = `You are writing the skeptic's case for a research dossier — the strongest mainstream explanation that does NOT require cross-tradition convergence. ${EDITORIAL_VOICE} Do not strawman the advocate position; steel-man the skeptic's. Use specific methodological objections, not dismissal. Acknowledge what the skeptic cannot explain away.`;

      const userPrompt = `Topic: ${topic}
Skeptic confidence from debate: ${debate.skeptic_confidence}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'skeptic_case')}

SKEPTIC'S CASE FROM DEBATE:
${debate.skeptic_case}

SKEPTIC'S STRONGEST POINTS:
${debate.skeptic_strongest_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

CONTESTED OR SPECULATIVE FINDINGS (what the skeptic would challenge):
${contestedFindings.map(formatFinding).join('\n\n')}

UNRESOLVED TENSIONS (the skeptic can exploit these):
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

AGREED FACTS (the skeptic must account for these):
${debate.agreed_facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "skeptic_case": "300+ word synthesis of the strongest mainstream/skeptical explanation that does not require convergence. Include specific methodological objections. Acknowledge what the skeptic cannot fully explain. Do not use dismissive language."
}`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── jaw_drop_layers ──────────────────────────────────────────────────────
    case 'jaw_drop_layers': {
      const top20 = topFindingsByConfidence(findings, 20);
      const topConv = topConvergencePoints(convergenceAnalyses, 6);

      const systemPrompt = `You are identifying the genuinely surprising moments in this research for a jaw-drop layers section. ${EDITORIAL_VOICE} Jaw-drop layers are NOT conspiracy bait. They are specific moments where the evidence genuinely surprises even a sceptic — unexpected specificity, unlikely preservation, anomalous convergence. If nothing genuinely surprises, say so in the content. Assign levels 1-6 (1=mildly surprising, 6=paradigm-shifting claim if verified).`;

      const userPrompt = `Topic: ${topic}
Overall convergence score: ${outline.convergence_score}/100${sectionNotes(outline, 'jaw_drop_layers')}

TOP FINDINGS BY CONFIDENCE:
${top20.map(formatFinding).join('\n\n')}

TOP CONVERGENCE POINTS:
${topConv.map((cp) => `${cp.title} (${cp.composite_score}/100)\n${cp.notes}`).join('\n\n')}

UNRESOLVED TENSIONS:
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "jaw_drop_layers": [
    {
      "level": 1,
      "title": "Short title (5-8 words)",
      "content": "The specific surprising finding, with the evidence that makes it surprising. Minimum 80 words. Name sources, traditions, and specifics. Do not summarize vaguely.",
      "evidence_hook": "One sentence that would make a sceptical professor pause"
    }
  ]
}

Rules:
- 4 to 6 layers total
- level 1 = mildly surprising, level 6 = paradigm-shifting if verified
- Order from highest level to lowest
- content must be minimum 80 words
- No layer should be generic — each must name a specific finding, source, or convergence point`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── faith_perspectives ───────────────────────────────────────────────────
    case 'faith_perspectives': {
      const byTradition = findingsByTradition(findings);
      const traditionBlocks = outline.traditions_analyzed.map((t) => {
        const tFindings = (byTradition.get(t) ?? [])
          .filter((f) => f.evidence_type === 'textual' || f.claim_type === 'oral_account' || f.sources.some((s) => s.source_type === 'sacred_text'))
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 6)
          .map(formatFinding)
          .join('\n\n');
        return `TRADITION: ${t}\n${tFindings || '(use general knowledge of this tradition\'s theological framework for this topic)'}`;
      }).join('\n\n---\n\n');

      const systemPrompt = `You are documenting what each religious tradition actually teaches about this topic — in its own framing. ${EDITORIAL_VOICE} Do not filter through a secular lens. Do not "balance" the tradition against mainstream scholarship. Treat each tradition's theological and scriptural claims as primary data. Present what the tradition itself teaches, using its own categories and vocabulary.`;

      const userPrompt = `Topic: ${topic}
Traditions to cover: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'faith_perspectives')}

TEXTUAL AND ORAL FINDINGS BY TRADITION:
${traditionBlocks}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "faith_perspectives": {
    "TraditionName": "What this tradition's theology and scripture specifically claims about this topic — 100-200 words. Use the tradition's own framing, vocabulary, and categories. Cite specific texts, passages, or doctrinal positions where possible. This is not a secular summary — it is the tradition speaking for itself."
  }
}

Cover every tradition in the list. Do not leave any tradition out.`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── legendary_patterns ───────────────────────────────────────────────────
    case 'legendary_patterns': {
      const narrativeFindings = findings
        .filter((f) =>
          f.evidence_type === 'textual' ||
          f.evidence_type === 'oral_tradition' ||
          f.evidence_type === 'iconographic' ||
          f.evidence_type === 'comparative'
        )
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 25);
      const topConv = topConvergencePoints(convergenceAnalyses, 8);

      const systemPrompt = `You are documenting recurring mythological and narrative patterns across traditions for a research dossier. ${EDITORIAL_VOICE} Name specific motifs — not categories. A "flood narrative" is a category; "a hero warned by a deity, builds a vessel, releases a bird to find land" is a pattern. Specificity is the entire point. List what the traditions share structurally, not just thematically.`;

      const userPrompt = `Topic: ${topic}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'legendary_patterns')}

NARRATIVE AND COMPARATIVE FINDINGS:
${narrativeFindings.map(formatFinding).join('\n\n')}

TOP CONVERGENCE POINTS (look for narrative/structural overlaps):
${topConv.map((cp) => `${cp.title}\nTraditions: ${cp.traditions_involved.join(', ')}\nShared elements: ${cp.shared_elements.join('; ')}`).join('\n\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "legendary_patterns": [
    {
      "pattern": "Name of the recurring narrative or mythological pattern",
      "traditions": ["Tradition1", "Tradition2"],
      "specific_motifs": [
        "Specific structural detail that appears in each tradition (e.g., 'hero receives 7-day warning')",
        "Another specific motif"
      ],
      "notes": "What makes this pattern significant — is it the specificity, the structural match, the geographic independence, or something else?"
    }
  ]
}

Rules:
- List every distinct pattern you find — do not collapse separate patterns into one
- specific_motifs must be concrete details, not thematic summaries
- traditions must list every tradition where the pattern appears`;

      return { systemPrompt, userPrompt, maxTokens: 1500 };
    }

    // ── circumstantial_convergence ───────────────────────────────────────────
    case 'circumstantial_convergence': {
      const weakToModerate = findings
        .filter((f) => f.strength === 'contested' || f.confidence < 0.6)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 20);
      const allFindings20 = topFindingsByConfidence(findings, 20);

      const systemPrompt = `You are documenting weak signals for a circumstantial convergence section — individual data points that alone prove nothing but together point somewhere. ${EDITORIAL_VOICE} Do not discard weak evidence; document it honestly with its actual strength rating. The purpose of this section is to surface what future research should investigate, not to build a case.`;

      const userPrompt = `Topic: ${topic}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'circumstantial_convergence')}

CONTESTED OR LOW-CONFIDENCE FINDINGS (primary source for weak signals):
${weakToModerate.map(formatFinding).join('\n\n')}

BROADER FINDING SET (for context — surface signals that are interesting even if not strongly evidenced):
${allFindings20.map(formatFinding).join('\n\n')}

OPEN QUESTIONS FROM DEBATE:
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "circumstantial_convergence": [
    {
      "signal": "Description of the weak signal — what was observed, where, in what tradition",
      "strength": "weak",
      "traditions_involved": ["Tradition1"],
      "notes": "Why this signal is worth noting even though it proves nothing alone — what pattern it contributes to, what research it points toward"
    }
  ]
}

Rules:
- strength must be exactly one of: weak, moderate, strong
- Do not rate anything strong unless it has significant corroborating context
- Include at least 5 signals
- notes must explain why the signal matters, not just restate the signal`;

      return { systemPrompt, userPrompt, maxTokens: 1500 };
    }

    // ── open_questions ───────────────────────────────────────────────────────
    case 'open_questions': {
      const top15 = topFindingsByConfidence(findings, 15);

      const systemPrompt = `You are generating the open questions section of a research dossier. ${EDITORIAL_VOICE} These questions are your gift to future researchers. They must be specific and researchable — the kind a researcher could dedicate years to. Not "what else happened?" but "does the stratigraphic layer at site X correspond to the destruction narrative in source Y?" Generic gaps are not open questions.`;

      const userPrompt = `Topic: ${topic}
Traditions covered: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'open_questions')}

TOP FINDINGS (what the evidence has established — questions should build on this):
${top15.map(formatFinding).join('\n\n')}

UNRESOLVED TENSIONS FROM DEBATE:
${debate.unresolved_tensions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

OPEN QUESTIONS FROM INDIVIDUAL FINDINGS:
${[...new Set(findings.flatMap((f) => f.open_questions))].slice(0, 20).map((q, i) => `${i + 1}. ${q}`).join('\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "open_questions": [
    "A specific, researchable question that this evidence has opened — name the source, site, tradition, or claim it builds on"
  ]
}

Rules:
- 5 to 8 questions total
- Each question must be specific enough to design a research program around
- No question should be answerable with a Google search
- No question should be generic (e.g., "what other traditions might show this?" is too vague)`;

      return { systemPrompt, userPrompt, maxTokens: 1000 };
    }

    // ── how_cultures_describe ────────────────────────────────────────────────
    case 'how_cultures_describe': {
      const byTradition = findingsByTradition(findings);
      const traditionBlocks = outline.traditions_analyzed.map((t) => {
        const tFindings = (byTradition.get(t) ?? [])
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 6)
          .map(formatFinding)
          .join('\n\n');
        return `TRADITION: ${t}\n${tFindings || '(use general knowledge of how this tradition describes this topic)'}`;
      }).join('\n\n---\n\n');

      const systemPrompt = `You are writing how each culture describes the topic in its own voice for a research dossier. ${EDITORIAL_VOICE} Give the reader a sense of each tradition speaking for itself — not filtered through Western academic categories. Use the vocabulary, imagery, and framing of each tradition. The goal is to let each culture's description stand on its own terms before any comparative analysis.`;

      const userPrompt = `Topic: ${topic}
Traditions to cover: ${outline.traditions_analyzed.join(', ')}${sectionNotes(outline, 'how_cultures_describe')}

FINDINGS BY TRADITION:
${traditionBlocks}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "how_cultures_describe": {
    "TraditionName": "How this culture describes the phenomenon — 80-150 words. Use the tradition's own imagery, vocabulary, and framing. Include specific named figures, locations, or sequences where the sources provide them. This is the tradition's own voice, not a scholar's summary of it."
  }
}

Cover every tradition in the list. Do not leave any tradition out.`;

      return { systemPrompt, userPrompt, maxTokens: 2000 };
    }

    // ── sources ──────────────────────────────────────────────────────────────
    case 'sources': {
      const dedupedSources = allSources(findings);
      const top40 = dedupedSources.slice(0, 40);

      const systemPrompt = `You are compiling the sources section for a research dossier. ${EDITORIAL_VOICE} Select the 15-20 most significant sources — prioritizing primary sources, peer-reviewed scholarship, and directly cited evidence. Add a brief annotation for each explaining what it contributes to this specific research topic. Do not list sources that are not genuinely relevant to the findings.`;

      const userPrompt = `Topic: ${topic}${sectionNotes(outline, 'sources')}

ALL DEDUPLICATED SOURCES FROM FINDINGS (${dedupedSources.length} total — select the 15-20 most significant):
${top40.map((s, i) => `[${i + 1}] credibility_tier:${s.credibility_tier} | ${s.source_type}
  Title: ${s.title}
  Author: ${s.author ?? 'unknown'} | Year: ${s.year ?? 'unknown'}
  URL: ${s.url ?? 'none'}
  Page/section: ${s.page_or_section ?? 'not specified'}`).join('\n\n')}

Return ONLY valid JSON (no markdown fences) in this exact structure:
{
  "sources": [
    {
      "title": "Full source title",
      "author": "Author name or null",
      "year": 1990,
      "source_type": "journal",
      "url": "https://... or null",
      "credibility_tier": 1,
      "page_or_section": "pp. 45-67 or null",
      "annotation": "1-2 sentences: what this source contributes to THIS specific research topic — not a generic description"
    }
  ]
}

Rules:
- source_type must be exactly one of: sacred_text, journal, book, excavation_report, oral_tradition, newspaper, archive, museum_db, government_record, website, other
- credibility_tier is 1 (highest) to 5 (lowest)
- 15 to 20 sources total
- Prioritize credibility_tier 1-2, then select the most relevant from tier 3+
- annotation is required for every source — no generic placeholders`;

      return { systemPrompt, userPrompt, maxTokens: 3000 };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = sectionKey;
      throw new Error(`Unknown section key: ${String(_exhaustive)}`);
    }
  }
}
