import type { LLMProvider } from './llm/types';

// ── Agent Definition ─────────────────────────────────────────────────────────

export interface OceanProfile {
  openness: number;           // 0–1
  conscientiousness: number;  // 0–1
  extraversion: number;       // 0–1
  agreeableness: number;      // 0–1
  neuroticism: number;        // 0–1
}

export interface AgentCalibration {
  speculative_vs_conservative: number;  // 0=only hard evidence, 1=considers fringe
  detail_depth: number;                 // 0=summary, 1=granular
  citation_strictness: number;          // 0=loose, 1=strict sourcing
  interdisciplinary_reach: number;      // 0=stay in lane, 1=wide cross-domain
  confidence_threshold: number;         // 0–1 minimum confidence to include a claim
  contrarian_tendency: number;          // 0=accept consensus, 1=challenge everything
}

export type AgentLayer = 'research' | 'convergence' | 'adversarial' | 'synthesis' | 'governance' | 'output';
export type RaciRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

export interface AgentDefinition {
  id: string;
  name: string;
  layer: AgentLayer;
  domain: string;
  description: string;
  ocean: OceanProfile;
  calibration: AgentCalibration;
  llm: {
    provider: LLMProvider;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  systemPrompt: string;
  primaryExpertise: string[];
  secondaryExpertise: string[];
  defaultRaciRole: RaciRole;
  canEscalateTo: string[];
  requiresReviewFrom: string[];
}

// ── Structured Outputs ───────────────────────────────────────────────────────

export interface SourceReference {
  title: string;
  author: string | null;
  year: number | null;
  source_type: 'sacred_text' | 'journal' | 'book' | 'excavation_report' | 'oral_tradition' | 'newspaper' | 'archive' | 'museum_db' | 'government_record' | 'website' | 'other';
  url: string | null;
  credibility_tier: 1 | 2 | 3 | 4 | 5;
  page_or_section: string | null;
}

export type EvidenceType = 'textual' | 'archaeological' | 'geological' | 'genetic' | 'oral_tradition' | 'iconographic' | 'statistical' | 'comparative';
export type ClaimType = 'factual' | 'interpretive' | 'speculative' | 'oral_account';
export type ClaimStrength = 'strong' | 'moderate' | 'contested';

export interface AgentFinding {
  agent_id: string;
  claim_text: string;
  claim_type: ClaimType;
  evidence_type: EvidenceType;
  strength: ClaimStrength;
  confidence: number;         // 0–1
  sources: SourceReference[];
  traditions: string[];
  time_period: {
    start_year?: number;
    end_year?: number;
    era: string;
  } | null;
  geographic_scope: string[];
  contradicts: string[];      // finding IDs (populated after cross-ref)
  supports: string[];         // finding IDs (populated after cross-ref)
  open_questions: string[];
  raw_excerpts: string[];     // direct quotes
}

export type ValidationVerdict = 'confirmed' | 'plausible' | 'insufficient_evidence' | 'contradicted';

export interface ValidationResult {
  reviewer_agent_id: string;
  finding_id: string;
  verdict: ValidationVerdict;
  reasoning: string;
  additional_sources: SourceReference[];
}

export interface ConvergencePoint {
  title: string;
  traditions_involved: string[];
  shared_elements: string[];
  scores: {
    source_independence: number;  // 0–100
    structural_specificity: number;
    physical_corroboration: number;
    chronological_consistency: number;
  };
  composite_score: number;
  supporting_finding_ids: string[];
  notes: string;
}

export interface ConvergenceAnalysis {
  agent_id: string;
  convergence_points: ConvergencePoint[];
  timeline_gaps: { description: string; severity: 'minor' | 'major' | 'critical' }[];
  geographic_clusters: {
    region: string;
    traditions: string[];
    isolation_confirmed: boolean;
    notes: string;
  }[];
}

export interface DebateRecord {
  topic: string;
  advocate_case: string;
  advocate_strongest_points: string[];
  advocate_confidence: number;
  skeptic_case: string;
  skeptic_strongest_points: string[];
  skeptic_confidence: number;
  unresolved_tensions: string[];
  agreed_facts: string[];
  rounds: number;
}

export interface JawDropLayer {
  level: number;
  title: string;
  content: string;
  evidence_hook: string;
}

export interface CircumstantialSignal {
  signal: string;
  strength: 'weak' | 'moderate' | 'strong';
  traditions_involved: string[];
  notes: string;
}

export interface LegendaryPattern {
  pattern: string;
  traditions: string[];
  specific_motifs: string[];
  notes: string;
}

export interface SynthesizedOutput {
  title: string;
  subtitle: string;
  executive_summary: string;
  convergence_score: number;          // 0–100
  key_findings: {
    finding: string;
    confidence: number;
    evidence_types: EvidenceType[];
  }[];
  traditions_analyzed: string[];
  advocate_case: string;
  skeptic_case: string;
  jaw_drop_layers: JawDropLayer[];
  shared_elements_matrix: {
    element: string;
    traditions: Record<string, boolean>;
  }[];
  open_questions: string[];
  // ── Mandatory sections (anti-suppression) ────────────────────────────────
  faith_perspectives: Record<string, string>;     // tradition → theological interpretation
  legendary_patterns: LegendaryPattern[];         // recurring mythological motifs
  circumstantial_convergence: CircumstantialSignal[]; // weak signals that collectively point somewhere
  powerful_open_questions: string[];              // jaw-dropping unresolved questions for future research
  how_cultures_describe: Record<string, string>;
  sources: SourceReference[];
}

// ── Research Session ─────────────────────────────────────────────────────────

export type SessionStatus =
  | 'pending'
  | 'researching'
  | 'cross_validating'
  | 'converging'
  | 'debating'
  | 'synthesizing'
  | 'complete'
  | 'failed';

export interface ResearchSession {
  id: string;
  topic: string;
  title: string;
  research_questions: string[];
  status: SessionStatus;
  raci_assignments: Record<string, RaciRole>;
  error_log: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// ── RACI ─────────────────────────────────────────────────────────────────────

export interface RaciAssignment {
  responsible: string[];
  accountable: string[];
  consulted: string[];
  informed: string[];
}
