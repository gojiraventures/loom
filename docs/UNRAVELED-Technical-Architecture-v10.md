# UNRAVELED — Technical Architecture Document

**Version:** 1.0  
**Last Updated:** March 29, 2026  
**Companion to:** UNRAVELED Design Document v1.0

---

## 1. Infrastructure Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Relational DB** | Supabase (PostgreSQL) | All structured data: claims, sources, people, institutions, topics, relationships, submissions, editorial pipeline |
| **Vector DB** | Pinecone | Semantic search embeddings for Omnisearch |
| **File Storage** | Supabase Storage | Manuscript images, artifact photos, PDF snapshots, cached transcripts |
| **Auth** | Supabase Auth | User accounts, admin roles, contributor profiles |
| **Real-time** | Supabase Realtime | Live editorial pipeline, submission status, collaborative research |
| **Edge Functions** | Supabase Edge Functions + Vercel Serverless | Crawler jobs, AI agent calls, link health checks, embedding generation |
| **Frontend** | Next.js 14+ (App Router) | Public site + admin research tool (role-gated) |
| **Hosting** | Vercel | Edge functions, ISR content pages, API routes |
| **AI Research** | Multi-model via API | Claude, Grok, Perplexity, open-source — all logged and compared |
| **Analytics** | Plausible or PostHog | Privacy-first, no Google Analytics |

---

## 2. Supabase Schema

### sources
Every citation, every link, every reference. The foundation of credibility.

```sql
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  year INTEGER,
  source_type TEXT NOT NULL,
  -- 'sacred_text','journal','book','newspaper','video','podcast',
  -- 'website','archive','museum_db','government_record'
  credibility_tier INTEGER NOT NULL CHECK (credibility_tier BETWEEN 1 AND 5),
  url TEXT,
  archive_url TEXT,
  pdf_snapshot_path TEXT,
  original_language TEXT,
  traditions TEXT[],
  topics TEXT[],
  notes TEXT,
  -- Link health tracking
  link_status TEXT DEFAULT 'active',
  -- 'active','dead','redirected','paywalled','changed','unchecked'
  link_last_checked_at TIMESTAMPTZ,
  link_http_status INTEGER,
  link_content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### claims
Every factual assertion extracted from any source.

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_text TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  -- 'factual','interpretation','speculation','oral_account'
  source_id UUID REFERENCES sources(id),
  person_id UUID REFERENCES people(id),
  traditions TEXT[],
  topics TEXT[],
  evidence_type TEXT,
  -- 'textual','archaeological','geological','genetic',
  -- 'oral_tradition','iconographic'
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
```

### people
Researchers, historical figures, influencers — with credibility tracking.

```sql
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
  -- {"egyptology": "A", "mesoamerican": "C"}
  track_record JSONB DEFAULT '{}',
  -- {total_claims, confirmed, debunked, unresolved, self_corrections}
  ideological_profile TEXT,
  known_affiliations TEXT[],
  fabrication_rate FLOAT DEFAULT 0,
  social_profiles JSONB DEFAULT '{}',
  -- {twitter: {handle, followers}, youtube: {channel, subscribers}}
  monetization_notes TEXT,
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### relationships
Six degrees network — who connects to who and how.

```sql
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL, -- 'person','institution','source','topic'
  from_id UUID NOT NULL,
  to_type TEXT NOT NULL,
  to_id UUID NOT NULL,
  relationship TEXT NOT NULL,
  -- 'mentor','student','employer','employee','member','co_author',
  -- 'rival','appointed_by','funded_by','succeeded','preceded',
  -- 'investigated','suppressed','published','cited'
  description TEXT,
  start_year INTEGER,
  end_year INTEGER,
  documented_by UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rel_from ON relationships(from_type, from_id);
CREATE INDEX idx_rel_to ON relationships(to_type, to_id);
CREATE INDEX idx_rel_type ON relationships(relationship);
```

### institutions
Museums, archives, universities, religious organizations, secret societies.

```sql
CREATE TABLE institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution_type TEXT,
  -- 'museum','university','archive','government','religious',
  -- 'secret_society','publisher','military'
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
```

### convergence_points
The core content — cross-tradition patterns.

```sql
CREATE TABLE convergence_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  topic TEXT NOT NULL,
  convergence_score INTEGER CHECK (convergence_score BETWEEN 0 AND 100),
  score_breakdown JSONB,
  -- {source_independence, structural_specificity,
  --  physical_corroboration, chronological_consistency}
  key_question TEXT,
  traditions TEXT[],
  shared_elements TEXT[],
  advocate_case TEXT,
  skeptic_case TEXT,
  open_questions TEXT[],
  jaw_drop_layers JSONB,
  -- [{level: 1, title: "The Assumption", content: "..."},
  --  {level: 2, title: "The First Crack", content: "..."}]
  how_cultures_describe JSONB,
  -- [{tradition, framing, narrative_type}]
  status TEXT DEFAULT 'research',
  -- 'research','advocate_review','skeptic_review',
  -- 'editorial','published'
  pinecone_id TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### scripture_passages
Primary text excerpts with original language.

```sql
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
  related_passages UUID[], -- cross-references to parallel passages
  pinecone_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### artifacts
Physical objects with museum links and annotation data.

```sql
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
  -- 'public_domain','cc_by','cc_by_nc_sa','fair_use','restricted'
  traditions TEXT[],
  topics TEXT[],
  annotations JSONB DEFAULT '[]',
  -- [{x, y, width, height, label, description}]
  provenance_notes TEXT,
  discovery_story TEXT,
  pinecone_id TEXT,
  link_status TEXT DEFAULT 'active',
  link_last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### external_media
YouTube, podcasts, lectures — with speaker attribution and timestamps.

```sql
CREATE TABLE external_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  media_type TEXT NOT NULL,
  -- 'youtube','podcast','documentary','lecture','interview'
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
```

### submissions ("The Signal")

```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type TEXT NOT NULL,
  -- 'new_unraveled','new_source','correction',
  -- 'local_knowledge','question'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sources_provided TEXT[],
  traditions TEXT[],
  topics TEXT[],
  submitter_background TEXT,
  credit_preference TEXT DEFAULT 'anonymous',
  submitter_user_id UUID,
  status TEXT DEFAULT 'submitted',
  -- 'submitted','screened','in_review','agent_review',
  -- 'advocate_review','skeptic_review','published',
  -- 'filed','returned'
  reviewer_notes TEXT,
  advocate_assessment TEXT,
  skeptic_assessment TEXT,
  upvote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### link_health_log
Every check, every result, full audit trail.

```sql
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
```

### ai_research_log
Track every AI query for cross-reference and bias detection.

```sql
CREATE TABLE ai_research_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL,
  -- 'claude','grok','chatgpt','gemini','perplexity','llama','mixtral'
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
  -- groups queries sent to multiple models for the same question
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Pinecone Configuration

### Index Setup

```
Index name: unraveled-knowledge
Dimensions: 1536 (OpenAI) or 1024 (Voyage)
Metric: cosine
Pod type: p1 (performance)
```

### Namespaces

| Namespace | Content | Metadata Fields |
|-----------|---------|----------------|
| `scriptures` | Original text + translation of every passage | tradition, reference, topic, source_id, language |
| `claims` | Every extracted claim | person_id, source_id, topic, tradition, strength, evidence_type, composite_weight |
| `people` | Bio + credentials + ideological profile | name, tier, institutions, topics, alive |
| `artifacts` | Description + annotations | institution, date, tradition, topic, license |
| `unraveled` | Full convergence point text + shared elements | topic, traditions, score, status |
| `media` | Transcript excerpts + annotations | speaker, platform, topic, media_type |
| `submissions` | Submission descriptions | type, topic, traditions, status |

### Embedding Pipeline

```
Content created/updated in Supabase
  → Supabase webhook fires
  → Edge function triggered
  → Generate embedding via API
  → Upsert to Pinecone with metadata
  → Store pinecone_id back in Supabase row
```

### Query Pipeline (Omnisearch)

```
User types query
  → Embed query string
  → Query ALL namespaces simultaneously (parallel)
  → Each namespace returns top-K results with scores
  → Merge results across namespaces
  → Re-rank by: (relevance_score × source_credibility)
  → Return structured cards to frontend
  → Total latency target: <500ms
```

---

## 4. Link Health Monitoring System

### Check Schedule

| Source Type | Frequency | Rationale |
|-------------|----------|-----------|
| YouTube videos | Daily | Highest churn — deletions, privacy changes, channel bans |
| Social media links | Daily | Extremely volatile |
| News articles | Every 3 days | Paywalls, redesigns, article removal |
| Podcast episodes | Weekly | Platform rotation, RSS changes |
| Museum database links | Weekly | Stable but reorganizations happen |
| Government/institutional pages | Weekly | Reorganizations without warning |
| Academic journal links | Bi-weekly | Very stable, occasional paywall changes |
| Archive.org links | Monthly | Extremely stable |
| Sacred text sites | Monthly | Extremely stable |
| Books (publisher pages) | Monthly | Stable, editions change slowly |

### Check Logic (Edge Function)

```javascript
async function checkLink(entity) {
  const startTime = Date.now();

  try {
    const response = await fetch(entity.url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'UnraveledBot/1.0 (link-health-check)' }
    });

    const result = {
      entity_type: entity.type,
      entity_id: entity.id,
      url_checked: entity.url,
      http_status: response.status,
      response_time_ms: Date.now() - startTime,
      is_accessible: response.ok,
      redirect_url: response.redirected ? response.url : null,
    };

    // For important sources, do a full GET to check content
    if (entity.credibility_tier <= 3) {
      const fullResponse = await fetch(entity.url);
      const content = await fullResponse.text();
      const hash = await sha256(content);

      result.content_hash = hash;
      result.content_changed = entity.link_content_hash
        ? hash !== entity.link_content_hash
        : false;
      result.paywall_detected = detectPaywall(content);
    }

    // Log the check
    await supabase.from('link_health_log').insert(result);

    // Update the source record
    const updates = {
      link_status: determineStatus(result),
      link_last_checked_at: new Date().toISOString(),
      link_http_status: result.http_status,
      link_content_hash: result.content_hash || entity.link_content_hash,
    };

    // If dead, try archive.org
    if (!result.is_accessible && !entity.archive_url) {
      const archiveUrl = await checkWaybackMachine(entity.url);
      if (archiveUrl) updates.archive_url = archiveUrl;
    }

    await supabase
      .from(entity.table)
      .update(updates)
      .eq('id', entity.id);

    // Alert if critical source died
    if (!result.is_accessible && entity.credibility_tier <= 2) {
      await sendAlert('critical_source_dead', entity);
    }

    return result;
  } catch (error) {
    // Network error, timeout, etc.
    await supabase.from('link_health_log').insert({
      entity_type: entity.type,
      entity_id: entity.id,
      url_checked: entity.url,
      is_accessible: false,
      error_message: error.message,
    });
  }
}
```

### Snapshot System

For Tier 1-3 sources, proactively store:

1. **PDF snapshot** — `await capturePageAsPDF(url)` → Supabase Storage at `snapshots/{source_id}/{date}.pdf`
2. **Content extract** — the specific cited text, stored in the `claims` or `scripture_passages` table
3. **Archive.org pre-check** — verify Wayback Machine has a copy at time of citation
4. **Metadata freeze** — title, author, date, URL as they appeared when cited

### Health Dashboard Queries

```sql
-- Dead links requiring attention
SELECT s.*, lh.checked_at, lh.error_message
FROM sources s
JOIN link_health_log lh ON lh.entity_id = s.id
WHERE s.link_status = 'dead'
  AND s.credibility_tier <= 3
ORDER BY lh.checked_at DESC;

-- Links not checked in 30+ days
SELECT * FROM sources
WHERE link_last_checked_at < NOW() - INTERVAL '30 days'
   OR link_last_checked_at IS NULL
ORDER BY credibility_tier ASC;

-- Content changes this week
SELECT s.title, s.url, lh.checked_at
FROM sources s
JOIN link_health_log lh ON lh.entity_id = s.id
WHERE lh.content_changed = TRUE
  AND lh.checked_at > NOW() - INTERVAL '7 days';

-- Overall health stats
SELECT
  link_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct
FROM sources
GROUP BY link_status;
```

---

## 5. Cron Job Schedule

| Job | Frequency | What It Does |
|-----|----------|-------------|
| `check-links-youtube` | Daily 2am UTC | Check all YouTube/social media links |
| `check-links-news` | Every 3 days | Check news article links |
| `check-links-weekly` | Weekly Sunday | Check museum, government, podcast links |
| `check-links-monthly` | 1st of month | Check academic, archive, sacred text links |
| `generate-health-report` | Weekly Monday 8am | Email/Slack summary of link health |
| `crawler-scholar` | Daily | Check Google Scholar / JSTOR for new publications on watchlist topics |
| `crawler-news` | Every 6 hours | Check archaeology news feeds |
| `crawler-social` | Every 4 hours | Check Reddit, X for trending discussions |
| `crawler-youtube` | Daily | Check watchlist channels for new uploads |
| `snapshot-critical-sources` | Weekly | PDF snapshot all Tier 1-2 sources |
| `update-person-scores` | Weekly | Recalculate track record scores based on new verified/debunked claims |
| `pinecone-sync` | On change (webhook) | Re-embed any Supabase record that was updated |

---

## 6. API Routes (Next.js)

```
/api/search          — Omnisearch (queries Pinecone + Supabase)
/api/sources         — CRUD for sources
/api/claims          — CRUD for claims
/api/people          — CRUD for people + credibility queries
/api/people/[id]/network  — Six degrees graph data
/api/institutions    — CRUD for institutions
/api/unraveled     — CRUD for convergence points
/api/scriptures      — Scripture passage queries
/api/artifacts       — Artifact queries with image URLs
/api/media           — External media queries
/api/submissions     — Submit + status tracking
/api/submissions/vote — Upvote a submission
/api/health          — Link health dashboard data
/api/health/check    — Trigger manual link check
/api/ai/research     — Submit research query to AI agent(s)
/api/ai/compare      — Submit same query to multiple models
/api/admin/pipeline  — Editorial pipeline management
/api/admin/watchlist — Manage watchlists
```

---

## 7. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=unraveled-knowledge
PINECONE_ENVIRONMENT=

# AI Models
ANTHROPIC_API_KEY=
OPENAI_API_KEY=        # for embeddings
XAI_API_KEY=           # for Grok
PERPLEXITY_API_KEY=

# External Services
WAYBACK_MACHINE_API=https://archive.org/wayback/available

# App
NEXT_PUBLIC_SITE_URL=https://unraveled.ai
ALERT_WEBHOOK_URL=     # Slack/Discord for critical alerts
```

---

*This document defines the technical implementation. For vision, content, and methodology, see the UNRAVELED Design Document.*
