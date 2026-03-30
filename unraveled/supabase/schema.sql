-- UNRAVELED.AI — Complete Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. SOURCES
-- ============================================
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  year INTEGER,
  source_type TEXT NOT NULL,
  credibility_tier INTEGER NOT NULL CHECK (credibility_tier BETWEEN 1 AND 5),
  url TEXT,
  archive_url TEXT,
  pdf_snapshot_path TEXT,
  original_language TEXT,
  traditions TEXT[],
  topics TEXT[],
  notes TEXT,
  link_status TEXT DEFAULT 'active',
  link_last_checked_at TIMESTAMPTZ,
  link_http_status INTEGER,
  link_content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_sources_tier ON sources(credibility_tier);
CREATE INDEX idx_sources_traditions ON sources USING GIN(traditions);
CREATE INDEX idx_sources_topics ON sources USING GIN(topics);
CREATE INDEX idx_sources_link_status ON sources(link_status);

-- ============================================
-- 2. PEOPLE
-- ============================================
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  aliases TEXT[],
  birth_year INTEGER,
  death_year INTEGER,
  nationality TEXT,
  photo_url TEXT,
  credentials TEXT,
  bio TEXT,
  credibility_tier TEXT CHECK (credibility_tier IN ('A','B','C','D','E')),
  credibility_by_domain JSONB DEFAULT '{}',
  track_record JSONB DEFAULT '{}',
  ideological_profile TEXT,
  known_affiliations TEXT[],
  fabrication_rate FLOAT DEFAULT 0,
  social_profiles JSONB DEFAULT '{}',
  monetization_notes TEXT,
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_people_name ON people(full_name);
CREATE INDEX idx_people_tier ON people(credibility_tier);

-- ============================================
-- 3. CLAIMS
-- ============================================
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  source_id UUID REFERENCES sources(id),
  person_id UUID REFERENCES people(id),
  traditions TEXT[],
  topics TEXT[],
  evidence_type TEXT,
  strength TEXT CHECK (strength IN ('strong','moderate','contested')),
  composite_weight FLOAT,
  is_irrefutable BOOLEAN DEFAULT FALSE,
  irrefutable_confirmed_at TIMESTAMPTZ,
  advocate_assessment TEXT,
  skeptic_assessment TEXT,
  open_questions TEXT[],
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_source ON claims(source_id);
CREATE INDEX idx_claims_person ON claims(person_id);
CREATE INDEX idx_claims_traditions ON claims USING GIN(traditions);
CREATE INDEX idx_claims_topics ON claims USING GIN(topics);
CREATE INDEX idx_claims_strength ON claims(strength);
CREATE INDEX idx_claims_irrefutable ON claims(is_irrefutable) WHERE is_irrefutable = TRUE;

-- ============================================
-- 4. RELATIONSHIPS
-- ============================================
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL,
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL,
  to_id UUID NOT NULL,
  relationship TEXT NOT NULL,
  description TEXT,
  start_year INTEGER,
  end_year INTEGER,
  documented_by UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rel_from ON relationships(from_type, from_id);
CREATE INDEX idx_rel_to ON relationships(to_type, to_id);
CREATE INDEX idx_rel_type ON relationships(relationship);

-- ============================================
-- 5. INSTITUTIONS
-- ============================================
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution_type TEXT,
  location TEXT,
  website_url TEXT,
  digital_collection_url TEXT,
  known_holdings TEXT,
  restricted_materials TEXT,
  missing_items TEXT,
  paper_trail_notes TEXT,
  vault_profile TEXT,
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_institutions_type ON institutions(institution_type);

-- ============================================
-- 6. CONVERGENCE POINTS
-- ============================================
CREATE TABLE convergence_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  topic TEXT NOT NULL,
  convergence_score INTEGER CHECK (convergence_score BETWEEN 0 AND 100),
  score_breakdown JSONB,
  key_question TEXT,
  traditions TEXT[],
  shared_elements TEXT[],
  advocate_case TEXT,
  skeptic_case TEXT,
  open_questions TEXT[],
  jaw_drop_layers JSONB,
  how_cultures_describe JSONB,
  status TEXT DEFAULT 'research',
  pinecone_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_convergence_topic ON convergence_points(topic);
CREATE INDEX idx_convergence_score ON convergence_points(convergence_score DESC);
CREATE INDEX idx_convergence_status ON convergence_points(status);
CREATE INDEX idx_convergence_traditions ON convergence_points USING GIN(traditions);

-- ============================================
-- 7. SCRIPTURE PASSAGES
-- ============================================
CREATE TABLE scripture_passages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tradition TEXT NOT NULL,
  source_id UUID REFERENCES sources(id),
  reference TEXT NOT NULL,
  original_language TEXT,
  original_text TEXT,
  translation TEXT,
  translator TEXT,
  framing_notes TEXT,
  topics TEXT[],
  related_passages UUID[],
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scripture_tradition ON scripture_passages(tradition);
CREATE INDEX idx_scripture_topics ON scripture_passages USING GIN(topics);

-- ============================================
-- 8. ARTIFACTS
-- ============================================
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  institution_id UUID REFERENCES institutions(id),
  location TEXT,
  date_estimated TEXT,
  catalog_number TEXT,
  museum_url TEXT,
  image_url TEXT,
  local_image_path TEXT,
  license TEXT,
  traditions TEXT[],
  topics TEXT[],
  annotations JSONB DEFAULT '[]',
  provenance_notes TEXT,
  discovery_story TEXT,
  pinecone_id TEXT,
  link_status TEXT DEFAULT 'active',
  link_last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_artifacts_institution ON artifacts(institution_id);
CREATE INDEX idx_artifacts_traditions ON artifacts USING GIN(traditions);
CREATE INDEX idx_artifacts_topics ON artifacts USING GIN(topics);

-- ============================================
-- 9. EXTERNAL MEDIA
-- ============================================
CREATE TABLE external_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT,
  speaker_id UUID REFERENCES people(id),
  channel_name TEXT,
  timestamp_start TEXT,
  timestamp_end TEXT,
  transcript_excerpt TEXT,
  our_annotation TEXT,
  topics TEXT[],
  traditions TEXT[],
  link_status TEXT DEFAULT 'active',
  link_last_checked_at TIMESTAMPTZ,
  link_content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_type ON external_media(media_type);
CREATE INDEX idx_media_topics ON external_media USING GIN(topics);

-- ============================================
-- 10. SUBMISSIONS ("The Signal")
-- ============================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sources_provided TEXT[],
  traditions TEXT[],
  topics TEXT[],
  submitter_background TEXT,
  credit_preference TEXT DEFAULT 'anonymous',
  submitter_user_id UUID,
  status TEXT DEFAULT 'submitted',
  reviewer_notes TEXT,
  advocate_assessment TEXT,
  skeptic_assessment TEXT,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_type ON submissions(submission_type);
CREATE INDEX idx_submissions_topics ON submissions USING GIN(topics);

-- ============================================
-- 11. LINK HEALTH LOG
-- ============================================
CREATE TABLE link_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  url_checked TEXT NOT NULL,
  http_status INTEGER,
  response_time_ms INTEGER,
  content_hash TEXT,
  content_changed BOOLEAN DEFAULT FALSE,
  is_accessible BOOLEAN,
  redirect_url TEXT,
  paywall_detected BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_entity ON link_health_log(entity_type, entity_id);
CREATE INDEX idx_health_date ON link_health_log(checked_at DESC);

-- ============================================
-- 12. AI RESEARCH LOG
-- ============================================
CREATE TABLE ai_research_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  query TEXT NOT NULL,
  response_summary TEXT,
  full_response TEXT,
  claims_extracted JSONB DEFAULT '[]',
  refused_to_answer BOOLEAN DEFAULT FALSE,
  hedging_detected BOOLEAN DEFAULT FALSE,
  unique_info TEXT,
  omissions_noted TEXT,
  topic TEXT,
  comparison_group_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_log_model ON ai_research_log(model);
CREATE INDEX idx_ai_log_topic ON ai_research_log(topic);
CREATE INDEX idx_ai_log_comparison ON ai_research_log(comparison_group_id);

-- ============================================
-- 13. NEWSLETTER SUBSCRIBERS
-- ============================================
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX idx_newsletter_email ON newsletter_subscribers(email);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE convergence_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_health_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_research_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables
CREATE POLICY "Public read access" ON sources FOR SELECT USING (true);
CREATE POLICY "Public read access" ON people FOR SELECT USING (true);
CREATE POLICY "Public read access" ON claims FOR SELECT USING (true);
CREATE POLICY "Public read access" ON relationships FOR SELECT USING (true);
CREATE POLICY "Public read access" ON institutions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON convergence_points FOR SELECT USING (true);
CREATE POLICY "Public read access" ON scripture_passages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON artifacts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON external_media FOR SELECT USING (true);

-- Submissions: public can insert, only authenticated can read all
CREATE POLICY "Anyone can submit" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read published" ON submissions FOR SELECT USING (status = 'published');

-- Newsletter: anyone can subscribe (insert)
CREATE POLICY "Anyone can subscribe" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

-- Service role has full access (for admin/API routes using service key)
-- No explicit policy needed — service role bypasses RLS
