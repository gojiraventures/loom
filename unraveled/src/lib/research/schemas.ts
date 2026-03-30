import { z } from 'zod';

// ── Source Reference ─────────────────────────────────────────────────────────

export const SourceReferenceSchema = z.object({
  title: z.string(),
  author: z.string().nullable(),
  year: z.number().nullable(),
  source_type: z.enum([
    'sacred_text', 'journal', 'book', 'excavation_report',
    'oral_tradition', 'newspaper', 'archive', 'museum_db',
    'government_record', 'website', 'other',
  ]).catch('other'),
  url: z.string().nullable(),
  credibility_tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
    .catch(3 as 1 | 2 | 3 | 4 | 5),
  page_or_section: z.string().nullable(),
});

// ── Agent Finding ─────────────────────────────────────────────────────────────

export const AgentFindingSchema = z.object({
  agent_id: z.string(),
  claim_text: z.string().min(10),
  claim_type: z.enum(['factual', 'interpretive', 'speculative', 'oral_account']),
  evidence_type: z.enum([
    'textual', 'archaeological', 'geological', 'genetic',
    'oral_tradition', 'iconographic', 'statistical', 'comparative',
  ]).catch('comparative'),
  strength: z.enum(['strong', 'moderate', 'contested']).catch('moderate'),
  confidence: z.number().min(0).max(1),
  sources: z.array(SourceReferenceSchema).min(1),
  traditions: z.array(z.string()),
  time_period: z.object({
    start_year: z.number().nullish(),
    end_year: z.number().nullish(),
    era: z.string(),
  }).nullable(),
  geographic_scope: z.array(z.string()),
  contradicts: z.array(z.string()).default([]),
  supports: z.array(z.string()).default([]),
  open_questions: z.array(z.string()),
  raw_excerpts: z.array(z.string()),
});

export const AgentFindingsSchema = z.object({
  findings: z.array(AgentFindingSchema).min(1),
});

// ── Validation Result ─────────────────────────────────────────────────────────

export const ValidationResultSchema = z.object({
  reviewer_agent_id: z.string(),
  finding_id: z.string(),
  verdict: z.enum(['confirmed', 'plausible', 'insufficient_evidence', 'contradicted']),
  reasoning: z.string().min(20),
  additional_sources: z.array(SourceReferenceSchema),
});

export const ValidationResultsSchema = z.object({
  validations: z.array(ValidationResultSchema),
});

// ── Convergence Analysis ──────────────────────────────────────────────────────

export const ConvergencePointSchema = z.object({
  title: z.string(),
  traditions_involved: z.array(z.string()).min(2),
  shared_elements: z.array(z.string()).min(1),
  scores: z.object({
    source_independence: z.number().min(0).max(100),
    structural_specificity: z.number().min(0).max(100),
    physical_corroboration: z.number().min(0).max(100),
    chronological_consistency: z.number().min(0).max(100),
  }),
  composite_score: z.number().min(0).max(100),
  supporting_finding_ids: z.array(z.string()),
  notes: z.string(),
});

export const ConvergenceAnalysisSchema = z.object({
  agent_id: z.string(),
  convergence_points: z.array(ConvergencePointSchema),
  timeline_gaps: z.array(z.object({
    description: z.string(),
    severity: z.enum(['minor', 'major', 'critical']),
  })),
  geographic_clusters: z.array(z.object({
    region: z.string(),
    traditions: z.array(z.string()),
    isolation_confirmed: z.boolean(),
    notes: z.string(),
  })),
});

// ── Debate Record ─────────────────────────────────────────────────────────────

export const DebateRecordSchema = z.object({
  topic: z.string(),
  advocate_case: z.string().min(100),
  advocate_strongest_points: z.array(z.string()).min(3),
  advocate_confidence: z.number().min(0).max(1),
  skeptic_case: z.string().min(100),
  skeptic_strongest_points: z.array(z.string()).min(3),
  skeptic_confidence: z.number().min(0).max(1),
  unresolved_tensions: z.array(z.string()).min(1),
  agreed_facts: z.array(z.string()),
  rounds: z.number().int().min(1),
});

// ── Synthesized Output ────────────────────────────────────────────────────────

export const JawDropLayerSchema = z.object({
  level: z.number().int().min(1).max(6),
  title: z.string(),
  content: z.string().min(50),
  evidence_hook: z.string(),
});

export const SynthesizedOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  executive_summary: z.string().min(100),
  convergence_score: z.number().min(0).max(100),
  key_findings: z.array(z.object({
    finding: z.string(),
    confidence: z.number().min(0).max(1),
    evidence_types: z.array(z.string()),
  })).min(3),
  traditions_analyzed: z.array(z.string()).min(2),
  advocate_case: z.string().min(100),
  skeptic_case: z.string().min(100),
  jaw_drop_layers: z.array(JawDropLayerSchema).min(3),
  shared_elements_matrix: z.array(z.object({
    element: z.string(),
    traditions: z.record(z.string(), z.boolean()),
  })),
  open_questions: z.array(z.string()).min(3),
  // ── Mandatory anti-suppression sections ──────────────────────────────────
  faith_perspectives: z.record(z.string(), z.string()).default({}),
  legendary_patterns: z.array(z.object({
    pattern: z.string(),
    traditions: z.array(z.string()),
    specific_motifs: z.array(z.string()),
    notes: z.string(),
  })).default([]),
  circumstantial_convergence: z.array(z.object({
    signal: z.string(),
    strength: z.enum(['weak', 'moderate', 'strong']),
    traditions_involved: z.array(z.string()),
    notes: z.string(),
  })).default([]),
  powerful_open_questions: z.array(z.string()).default([]),
  how_cultures_describe: z.record(z.string(), z.string()),
  sources: z.array(SourceReferenceSchema).min(5),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type AgentFindingInput = z.infer<typeof AgentFindingSchema>;
export type AgentFindingsInput = z.infer<typeof AgentFindingsSchema>;
export type ValidationResultInput = z.infer<typeof ValidationResultSchema>;
export type ConvergenceAnalysisInput = z.infer<typeof ConvergenceAnalysisSchema>;
export type DebateRecordInput = z.infer<typeof DebateRecordSchema>;
export type SynthesizedOutputInput = z.infer<typeof SynthesizedOutputSchema>;
