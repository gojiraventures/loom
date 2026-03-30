export interface Source {
  id: string;
  title: string;
  author?: string;
  publisher?: string;
  year?: number;
  source_type: string;
  credibility_tier: number;
  url?: string;
  archive_url?: string;
  original_language?: string;
  traditions: string[];
  topics: string[];
  notes?: string;
  link_status: string;
}

export interface Claim {
  id: string;
  claim_text: string;
  claim_type: string;
  source_id?: string;
  traditions: string[];
  topics: string[];
  evidence_type?: string;
  strength?: "strong" | "moderate" | "contested";
  advocate_assessment?: string;
  skeptic_assessment?: string;
  open_questions: string[];
}

export interface Person {
  id: string;
  full_name: string;
  aliases: string[];
  birth_year?: number;
  death_year?: number;
  nationality?: string;
  credentials?: string;
  bio?: string;
  credibility_tier: "A" | "B" | "C" | "D" | "E";
  credibility_by_domain: Record<string, string>;
  track_record: {
    total_claims?: number;
    confirmed?: number;
    debunked?: number;
    unresolved?: number;
    self_corrections?: number;
  };
  ideological_profile?: string;
  known_affiliations: string[];
}

export interface ConvergencePoint {
  id: string;
  title: string;
  subtitle?: string;
  topic: string;
  convergence_score: number;
  key_question?: string;
  traditions: string[];
  shared_elements: string[];
  advocate_case?: string;
  skeptic_case?: string;
  open_questions: string[];
  jaw_drop_layers?: JawDropLayer[];
}

export interface JawDropLayer {
  level: number;
  title: string;
  content: string;
}

export interface ScripturePassage {
  id: string;
  tradition: string;
  reference: string;
  original_language?: string;
  original_text?: string;
  translation?: string;
  translator?: string;
  framing_notes?: string;
  topics: string[];
}

export interface Tradition {
  id: string;
  label: string;
  color: string;
  region: string;
}
