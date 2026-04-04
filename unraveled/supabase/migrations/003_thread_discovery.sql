-- THREAD Discovery System — Automated Connection Discovery & Research Intelligence
-- Run in Supabase SQL Editor after 002_research_engine.sql

-- ============================================
-- 1. DISCOVERY CANDIDATES
-- Tier 1 output: lightweight scan results
-- Pure database detection, no LLM cost
-- ============================================
CREATE TABLE discovery_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_type TEXT NOT NULL CHECK (entity_a_type IN ('person', 'institution')),
  entity_a_id UUID NOT NULL,
  entity_a_name TEXT NOT NULL,
  entity_b_type TEXT NOT NULL CHECK (entity_b_type IN ('person', 'institution')),
  entity_b_id UUID NOT NULL,
  entity_b_name TEXT NOT NULL,
  detection_method TEXT NOT NULL CHECK (detection_method IN (
    'date_overlap',
    'shared_tags',
    'name_mention',
    'shared_institution',
    'geographic_proximity'
  )),
  detection_details JSONB NOT NULL DEFAULT '{}',
  processed_by_tier2 BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent re-inserting the same entity pair + detection method
  UNIQUE (entity_a_id, entity_b_id, detection_method)
);

CREATE INDEX idx_candidates_unprocessed ON discovery_candidates(processed_by_tier2, created_at DESC)
  WHERE processed_by_tier2 = FALSE;
CREATE INDEX idx_candidates_entity_a ON discovery_candidates(entity_a_id);
CREATE INDEX idx_candidates_entity_b ON discovery_candidates(entity_b_id);
CREATE INDEX idx_candidates_method ON discovery_candidates(detection_method);

-- ============================================
-- 2. DISCOVERY SUGGESTIONS
-- Tier 2 output: Ollama-inferred relationship suggestions
-- Awaiting human review before writing to graph tables
-- ============================================
CREATE TABLE discovery_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES discovery_candidates(id) ON DELETE SET NULL,
  entity_a_type TEXT NOT NULL CHECK (entity_a_type IN ('person', 'institution')),
  entity_a_id UUID NOT NULL,
  entity_a_name TEXT NOT NULL,
  entity_b_type TEXT NOT NULL CHECK (entity_b_type IN ('person', 'institution')),
  entity_b_id UUID NOT NULL,
  entity_b_name TEXT NOT NULL,
  -- Relationship type from existing graph enum vocabulary
  suggested_relationship_type TEXT NOT NULL,
  suggested_strength INTEGER CHECK (suggested_strength BETWEEN 1 AND 5),
  confidence_score FLOAT NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  llm_reasoning TEXT,
  evidence_summary TEXT,
  -- Names flagged by Ollama as missing from the system
  suggested_new_entities JSONB DEFAULT '[]',
  anomaly_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'needs_research'
  )),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestions_status ON discovery_suggestions(status, created_at DESC);
CREATE INDEX idx_suggestions_confidence ON discovery_suggestions(confidence_score DESC);
CREATE INDEX idx_suggestions_candidate ON discovery_suggestions(candidate_id);
CREATE INDEX idx_suggestions_pending ON discovery_suggestions(status)
  WHERE status = 'pending';

-- ============================================
-- 3. DISCOVERY INTERESTINGNESS
-- Tier 3 output: multi-signal anomaly scoring
-- One row per suggestion, scores 0.0-1.0 per signal
-- ============================================
CREATE TABLE discovery_interestingness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES discovery_suggestions(id) ON DELETE CASCADE,
  -- Cross-domain surprise: academic + intelligence scores higher than academic + academic
  surprise_score FLOAT NOT NULL DEFAULT 0 CHECK (surprise_score BETWEEN 0 AND 1),
  -- Bridge score: does this connection link otherwise-separate clusters?
  bridge_score FLOAT NOT NULL DEFAULT 0 CHECK (bridge_score BETWEEN 0 AND 1),
  -- Pattern resembles known covert relationship signatures
  covert_signal_score FLOAT NOT NULL DEFAULT 0 CHECK (covert_signal_score BETWEEN 0 AND 1),
  -- Suspicious timing: short overlaps, one arrives as other leaves, etc.
  temporal_anomaly_score FLOAT NOT NULL DEFAULT 0 CHECK (temporal_anomaly_score BETWEEN 0 AND 1),
  -- Composite: (surprise*0.3) + (bridge*0.25) + (covert*0.25) + (temporal*0.2)
  research_potential_score FLOAT NOT NULL DEFAULT 0 CHECK (research_potential_score BETWEEN 0 AND 1),
  -- Array of specific anomaly descriptions surfaced during scoring
  anomaly_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (suggestion_id)
);

CREATE INDEX idx_interestingness_potential ON discovery_interestingness(research_potential_score DESC);

-- ============================================
-- 4. RESEARCH LEADS
-- Auto-generated article pitches from high-scoring discoveries
-- research_potential_score >= 0.7 gets a lead auto-generated
-- ============================================
CREATE TABLE research_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interestingness_id UUID REFERENCES discovery_interestingness(id) ON DELETE SET NULL,
  suggestion_id UUID REFERENCES discovery_suggestions(id) ON DELETE SET NULL,
  -- Ollama-generated compelling headline
  title TEXT NOT NULL,
  -- 2-3 paragraph pitch for the editorial team
  pitch_summary TEXT,
  -- Structured evidence chain: [{entity, connection, year, source}]
  evidence_chain JSONB DEFAULT '[]',
  -- Entity names that should be added to the system
  suggested_entities_to_add JSONB DEFAULT '[]',
  -- Which of the six investigative lenses apply
  suggested_lenses JSONB DEFAULT '[]',
  estimated_research_depth TEXT CHECK (estimated_research_depth IN (
    'quick_article',
    'full_dossier',
    'investigation'
  )),
  -- Populated when admin triggers "Deep Research" (Claude API call)
  deep_research_output JSONB,
  research_potential_score FLOAT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'queued',
    'in_progress',
    'published',
    'dismissed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON research_leads(status, created_at DESC);
CREATE INDEX idx_leads_potential ON research_leads(research_potential_score DESC);
CREATE INDEX idx_leads_new ON research_leads(created_at DESC) WHERE status = 'new';

-- ============================================
-- ROW LEVEL SECURITY
-- Service role bypasses all policies (admin only)
-- ============================================
ALTER TABLE discovery_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_interestingness ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_leads ENABLE ROW LEVEL SECURITY;
