-- ============================================================
-- Unraveled Research Engine — Migration 002
-- 6 new tables for multi-agent research orchestration
-- ============================================================

-- ── 1. research_sessions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic               TEXT NOT NULL,
  title               TEXT NOT NULL,
  research_questions  TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','researching','cross_validating','converging','debating','synthesizing','complete','failed')),
  raci_assignments    JSONB NOT NULL DEFAULT '{}',
  config_overrides    JSONB DEFAULT '{}',
  triggered_by        TEXT DEFAULT 'manual',
  error_log           TEXT[] DEFAULT '{}',
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_topic  ON research_sessions(topic);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON research_sessions(status);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read research sessions"
  ON research_sessions FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to research sessions"
  ON research_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. agent_findings ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_findings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  agent_id          TEXT NOT NULL,
  claim_text        TEXT NOT NULL,
  claim_type        TEXT NOT NULL
    CHECK (claim_type IN ('factual','interpretive','speculative','oral_account')),
  evidence_type     TEXT NOT NULL
    CHECK (evidence_type IN ('textual','archaeological','geological','genetic','oral_tradition','iconographic','statistical','comparative')),
  strength          TEXT NOT NULL
    CHECK (strength IN ('strong','moderate','contested')),
  confidence        FLOAT NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  sources           JSONB NOT NULL DEFAULT '[]',
  traditions        TEXT[] DEFAULT '{}',
  time_period       JSONB,
  geographic_scope  TEXT[] DEFAULT '{}',
  contradicts       UUID[] DEFAULT '{}',
  supports          UUID[] DEFAULT '{}',
  open_questions    TEXT[] DEFAULT '{}',
  raw_excerpts      TEXT[] DEFAULT '{}',
  llm_model         TEXT,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  pinecone_id       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_findings_session    ON agent_findings(session_id);
CREATE INDEX IF NOT EXISTS idx_findings_agent      ON agent_findings(agent_id);
CREATE INDEX IF NOT EXISTS idx_findings_confidence ON agent_findings(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_findings_traditions ON agent_findings USING GIN(traditions);
CREATE INDEX IF NOT EXISTS idx_findings_strength   ON agent_findings(strength);

ALTER TABLE agent_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read agent findings"
  ON agent_findings FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to agent findings"
  ON agent_findings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. finding_validations ──────────────────────────────────

CREATE TABLE IF NOT EXISTS finding_validations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  finding_id           UUID NOT NULL REFERENCES agent_findings(id) ON DELETE CASCADE,
  reviewer_agent_id    TEXT NOT NULL,
  verdict              TEXT NOT NULL
    CHECK (verdict IN ('confirmed','plausible','insufficient_evidence','contradicted')),
  reasoning            TEXT NOT NULL,
  additional_sources   JSONB DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_validations_session ON finding_validations(session_id);
CREATE INDEX IF NOT EXISTS idx_validations_finding ON finding_validations(finding_id);
CREATE INDEX IF NOT EXISTS idx_validations_verdict ON finding_validations(verdict);

ALTER TABLE finding_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read finding validations"
  ON finding_validations FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to finding validations"
  ON finding_validations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. convergence_analyses ─────────────────────────────────

CREATE TABLE IF NOT EXISTS convergence_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  agent_id            TEXT NOT NULL,
  convergence_points  JSONB NOT NULL DEFAULT '[]',
  timeline_gaps       JSONB DEFAULT '[]',
  geographic_clusters JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_analyses_session ON convergence_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_analyses_agent   ON convergence_analyses(agent_id);

ALTER TABLE convergence_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read convergence analyses"
  ON convergence_analyses FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to convergence analyses"
  ON convergence_analyses FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 5. debate_records ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS debate_records (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,
  advocate_case            TEXT NOT NULL,
  advocate_strongest_points TEXT[] DEFAULT '{}',
  advocate_confidence      FLOAT,
  skeptic_case             TEXT NOT NULL,
  skeptic_strongest_points TEXT[] DEFAULT '{}',
  skeptic_confidence       FLOAT,
  unresolved_tensions      TEXT[] DEFAULT '{}',
  agreed_facts             TEXT[] DEFAULT '{}',
  rounds                   INTEGER DEFAULT 1,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debates_session ON debate_records(session_id);

ALTER TABLE debate_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read debate records"
  ON debate_records FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to debate records"
  ON debate_records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 6. topic_dossiers ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS topic_dossiers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic                  TEXT NOT NULL UNIQUE,
  title                  TEXT,
  summary                TEXT,
  total_sessions         INTEGER DEFAULT 0,
  total_findings         INTEGER DEFAULT 0,
  total_sources          INTEGER DEFAULT 0,
  best_convergence_score INTEGER,
  key_traditions         TEXT[] DEFAULT '{}',
  key_open_questions     TEXT[] DEFAULT '{}',
  synthesized_output     JSONB,
  accumulated_knowledge  JSONB DEFAULT '{}',
  last_researched_at     TIMESTAMPTZ,
  pinecone_id            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dossiers_topic ON topic_dossiers(topic);

ALTER TABLE topic_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read topic dossiers"
  ON topic_dossiers FOR SELECT TO public USING (true);

CREATE POLICY "Service role full access to topic dossiers"
  ON topic_dossiers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Modify ai_research_log ───────────────────────────────────

ALTER TABLE ai_research_log
  ADD COLUMN IF NOT EXISTS session_id  UUID REFERENCES research_sessions(id),
  ADD COLUMN IF NOT EXISTS agent_id    TEXT,
  ADD COLUMN IF NOT EXISTS provider    TEXT,
  ADD COLUMN IF NOT EXISTS model       TEXT,
  ADD COLUMN IF NOT EXISTS query_preview TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd FLOAT,
  ADD COLUMN IF NOT EXISTS duration_ms  INTEGER;

CREATE INDEX IF NOT EXISTS idx_ai_log_session ON ai_research_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_log_agent   ON ai_research_log(agent_id);
