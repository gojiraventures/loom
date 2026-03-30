# UNRAVELED.AI — Implementation Handoff Guide

**For:** Technical founder using Claude Code in VS Code on MacBook Air  
**Environment:** Supabase, Pinecone, Anthropic, Perplexity APIs connected  
**GitHub:** Connected  
**Last Updated:** March 29, 2026

---

## How to Use This Document

This is your blueprint for building Unraveled.ai. You don't need to write code — you need to **steer Claude Code** with clear instructions. This document tells you:

1. What to build, in what order
2. What to tell Claude Code at each step
3. What decisions you'll need to make along the way
4. What "done" looks like for each milestone

**The workflow:** Open Claude Code in VS Code → paste the relevant section below as your prompt → let Claude Code build it → review the output → iterate.

**Reference documents** (give Claude Code access to these as context):
- UNRAVELED-Design-Document-v10.md (vision, content, agents)
- UNRAVELED-Technical-Architecture-v10.md (database schema, Pinecone)
- UNRAVELED-Research-Methodology-v10.md (search strategies)
- UNRAVELED-Business-Model-v10.md (revenue, GEO)
- UNRAVELED-Distribution-Strategy-v10.md (channels, app)
- UNRAVELED-Production-Pipeline-v10.md (tools, automation)
- UNRAVELED-Media-Sourcing-Guide-v10.md (footage, licensing)

---

## Phase 0: Project Setup (Do This First)

### Step 0.1 — Initialize the Project

Open your terminal in VS Code and tell Claude Code:

```
Create a new Next.js 14+ project using the App Router with TypeScript and Tailwind CSS. 
Name it "unraveled". Include these packages from the start:
- @supabase/supabase-js and @supabase/ssr (for Supabase auth + data)
- @pinecone-database/pinecone (for vector search)
- framer-motion (for animations)
- lucide-react (for icons)

Set up the project structure like this:
/src
  /app          — Next.js app router pages
  /components   — React components
  /lib          — Utility functions, API clients
  /types        — TypeScript type definitions
  /styles       — Global styles, CSS variables

Initialize a git repo and make the first commit.
```

### Step 0.2 — Connect Your Services

Your .env.local file should look like this (you already have these keys):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Pinecone
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=unraveled-knowledge

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_key_here

# Perplexity
PERPLEXITY_API_KEY=your_key_here
```

Tell Claude Code:

```
Create a /src/lib/supabase.ts file that initializes the Supabase client 
for both server and client components using @supabase/ssr.

Create a /src/lib/pinecone.ts file that initializes the Pinecone client 
and connects to the "unraveled-knowledge" index.

Create a /src/lib/ai.ts file with helper functions for calling:
- Claude API (Anthropic) for research and analysis
- Perplexity API for fact-checking and source verification

Make sure all API keys come from environment variables.
```

### Step 0.3 — Set Up Supabase Database

Go to your Supabase dashboard (supabase.com). Then tell Claude Code:

```
I need you to generate the complete SQL schema for Unraveled.ai. 
Reference the UNRAVELED-Technical-Architecture-v10.md document for 
the full schema. Create a single SQL file at /supabase/schema.sql 
that I can paste into the Supabase SQL Editor.

The tables needed are:
1. sources — every citation with link health tracking
2. claims — every factual assertion  
3. people — researchers and historical figures with credibility tiers
4. relationships — six degrees network connections
5. institutions — museums, archives, organizations
6. convergence_points — cross-tradition patterns (the core content)
7. scripture_passages — primary text excerpts with original language
8. artifacts — physical objects with museum links
9. external_media — YouTube, podcasts, documentaries
10. submissions — community "Signal" submissions
11. link_health_log — every link check result
12. ai_research_log — every AI query and response

Include all indexes. Include Row Level Security policies 
(public read, authenticated write for most tables).
```

**Your action:** Copy the generated SQL and paste it into Supabase SQL Editor → Run.

### Step 0.4 — Set Up Pinecone Index

Go to Pinecone dashboard (app.pinecone.io). Create an index:
- **Name:** unraveled-knowledge  
- **Dimensions:** 1536 (for OpenAI embeddings) or 1024 (for Voyage)
- **Metric:** cosine
- **Cloud/Region:** pick whatever's cheapest (AWS us-east-1 is usually fine)

No code needed for this step — just click through their dashboard.

### Step 0.5 — Set Up Design System

Tell Claude Code:

```
Set up the Unraveled.ai design system in Tailwind and CSS variables.

Design language:
- Dark ground (near-black background: #0A0A0A or similar)
- Typography: Use a serif font for headings (like Newsreader from Google Fonts) 
  and a clean sans-serif for body (like IBM Plex Sans or Inter)
- Color palette: Warm amber/gold as primary accent, muted earth tones
- Swiss-inspired grid: clean, generous whitespace, typographic hierarchy
- NO conspiracy aesthetics — this should feel like a museum or research journal

Create:
1. /src/styles/globals.css with CSS variables for colors, typography, spacing
2. tailwind.config.ts with custom theme extending defaults
3. /src/components/ui/ directory with base components:
   - Button, Card, Badge, Input, Dialog (shadcn/ui style)
4. Import Google Fonts in the layout

The overall vibe: Stripe meets the Smithsonian. Premium, clean, credible.
```

**Checkpoint:** At this point you should be able to run `npm run dev` and see a blank dark page with your fonts loading. Commit to git.

---

## Phase 1: The Core Content Experience (Build This First)

This is what people will actually see. Don't build the admin tools or research agents yet — build the thing that proves people want this.

### Step 1.1 — Homepage / Landing

Tell Claude Code:

```
Build the Unraveled.ai homepage. Reference the design document for the vision.

The page should have:

1. HERO SECTION
   - Large heading: "Unraveled" with tagline "Where Ancient Threads Meet"
   - Subtext: "When geographically isolated civilizations independently describe 
     the same phenomena with structural specificity — that's not coincidence. 
     That's a pattern worth investigating."
   - A single call-to-action: "Begin with the Flood" (links to the first deep dive)

2. THE PATTERN (below hero)
   - Show 3-4 "convergence cards" — preview cards for our best topics
   - Each card shows: topic name, convergence score, number of traditions, 
     one jaw-drop fact, and a "Read the evidence →" link
   - Topics to feature: The Great Flood, Biblically Accurate Angels, 
     The Watchers/Nephilim

3. METHODOLOGY SECTION
   - Brief explanation of the Advocate/Skeptic model
   - "We don't tell you what to believe. We show you what we found."
   - Visual showing: Primary Sources → Cross-Reference → Advocate Case → 
     Skeptic Case → You Decide

4. FOOTER
   - Links: About, Methodology, Sources, Newsletter signup
   - "No ads. No sponsors. Just evidence."

Use framer-motion for scroll-triggered animations. 
Keep it fast — no heavy assets on first load.
The aesthetic should feel like a premium research publication, 
not a conspiracy site.
```

### Step 1.2 — First Deep Dive Page: The Great Flood

This is the most important page on the entire site. It proves the concept.

Tell Claude Code:

```
Build the Great Flood deep dive page at /topics/the-great-flood.

This is the flagship content page. Reference the Design Document's 
Flood topic data and jaw-drop layers.

Structure:

1. HERO
   - Title: "The Great Flood"
   - Subtitle: "268 independent narratives across 6 continents. 
     Before the internet. Before ships could cross oceans. 
     Before anyone could share a story globally."
   - Convergence score badge: 94/100
   - Evidence types: Textual, Archaeological, Geological, Oral Tradition

2. JAW-DROP LAYERS (progressive reveal as you scroll)
   - Layer 1 "The assumption": Most people think the flood is just Noah
   - Layer 2 "The first crack": There are 268+ independent flood narratives
   - Layer 3 "The pattern": They share specific structural elements 
     (divine warning, one family, boat, birds, mountain landing, rainbow/covenant)
   - Layer 4 "The open question": How do you explain structural specificity 
     across cultures that had zero contact?

3. SCRIPTURE SIDE-BY-SIDE
   - Interactive comparison showing Genesis, Gilgamesh, Hindu Matsya, 
     Maya Popol Vuh, Norse Prose Edda — ideally with original language 
     text + English translation
   - Tab or toggle between traditions
   
4. SHARED ELEMENTS MATRIX
   - Visual grid showing which elements appear in which traditions
   - Elements: divine warning, one righteous family, vessel construction, 
     animal preservation, bird release, mountain landing, covenant/rainbow
   - Traditions across the top, elements down the side, checkmarks where present

5. THE ADVOCATE'S CASE
   - The strongest argument FOR a common source event
   - Sourced, cited, specific

6. THE SKEPTIC'S CASE  
   - The strongest argument for independent development / common human experience
   - Equally sourced, cited, specific

7. OPEN QUESTIONS
   - What neither side can fully explain
   - Specific, not vague

8. SOURCES
   - Every source cited on this page, with links
   - Organized by type: Sacred Texts, Academic Papers, Archaeological Reports

Make it beautiful. This page IS the product. If someone shares this page 
and it looks incredible and feels credible, we win.

For now, hardcode the content directly in the page component. 
We'll move to Supabase later when we have more topics.
```

### Step 1.3 — The Narrative Spread Map

Tell Claude Code:

```
Build an interactive map component showing how flood narratives 
spread across the globe over time.

We already have a prototype of this (reference convergence-map.jsx 
if you have it). If not, build from scratch:

- World map rendered on Canvas or SVG (simplified dot-grid landmasses 
  are fine — we don't need mapbox for this)
- Time slider: 5600 BCE → 700 CE
- As the slider moves, data points appear on the map showing when 
  each tradition's flood narrative is dated
- Data points are colored by evidence type:
  - Blue: textual evidence
  - Green: archaeological evidence  
  - Orange: geological evidence
  - Purple: oral tradition
- Evidence layer toggles (checkboxes to show/hide each type)
- Clicking a data point shows a popup with: tradition name, date, 
  key quote, and link to source
- Animated spread lines between traditions that share structural elements

Include at least 15-20 data points across all continents.
This should be embeddable (we'll use this as a widget other sites can embed).
```

### Step 1.4 — Newsletter Signup + Basic SEO

Tell Claude Code:

```
Add these to the site:

1. Newsletter signup component (Beehiiv or just collect email in Supabase)
   - Simple inline form: email + "Join the research" button
   - Store emails in a Supabase "newsletter_subscribers" table
   - Show on homepage and at bottom of every deep dive page

2. SEO optimization for every page:
   - Proper meta tags (title, description, og:image, og:title, og:description)
   - JSON-LD structured data (Article, FAQPage, Organization schemas)
   - FAQ section on the flood page with 5-6 common questions and direct answers
   - Sitemap.xml generation
   - robots.txt that allows all major search bots and AI crawlers 
     (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot)
   
3. Open Graph images:
   - Generate an OG image template that creates shareable preview cards
   - When someone shares a page on X or iMessage, the preview should 
     show the topic title, convergence score, and key fact
```

**Checkpoint:** At this point you should have a live site with a homepage, one deep dive, a map, and newsletter signup. Deploy to Vercel. This is your MVP. Share it with 10 people and see if they go "wait, WHAT?" Commit to git.

---

## Phase 2: Expand Content + Start Community (After Phase 1 Gets Traction)

### Step 2.1 — Second and Third Deep Dives

Build the same deep-dive template for:
- **Biblically Accurate Angels** (Cherubim, Seraphim, Ophanim — the "wings covered with eyes" stuff)
- **The Watchers / Nephilim** (Genesis 6:4, 1 Enoch, and cross-cultural parallels)

Tell Claude Code to create a reusable deep-dive template component, then populate it with content for each topic. Same structure as the Flood page.

### Step 2.2 — People Dossier System

Tell Claude Code:

```
Build a People Dossier page template at /people/[slug].

Use the Aleš Hrdlička dossier from the Design Document as the 
proof-of-concept content. The page should show:

1. Person header (name, dates, photo placeholder, credentials)
2. Credibility score with domain-specific breakdown
3. Institutional affiliations timeline
4. Ideological profile (from their own documented writings)
5. Track record (confirmed, overturned, controversial findings)
6. Relationship network (visual graph showing connections to other 
   people, institutions, and topics)
7. Open questions (specific, answerable)
8. Sources (every claim on this page sourced)

The relationship network should be an interactive graph visualization 
(use D3-force or vis.js). Clicking a connected person should link 
to their dossier page.

For now, hardcode the Hrdlička data. We'll connect to Supabase 
when we have more people.
```

### Step 2.3 — Omnisearch (The "Jamie, Pull That Up" Interface)

Tell Claude Code:

```
Build a command-palette-style search (cmd+K to open) that searches 
across all content on the site.

For now, use client-side search against hardcoded content. 
Later we'll connect this to Pinecone for semantic search.

The search should:
- Open with cmd+K (or a search icon in the nav)
- Show results as cards with progressive disclosure
- Support @commands: @person, @verse, @topic, @fact
- Each result card shows: type icon, title, snippet, and 
  a "View →" link to the full page
- Results appear instantly as you type (fuzzy matching)
- Keyboard navigable (up/down arrows, enter to select)

Use the cmdk library (https://cmdk.paco.me/) or build a 
custom command palette.
```

### Step 2.4 — Membership / Support System

Tell Claude Code:

```
Build a simple membership system using Supabase Auth + Stripe.

Tiers (from the Business Model doc):
- Signal ($5/mo) — name on supporter wall, early access
- Advocate ($15/mo) — research log access, topic voting  
- Scholar ($50/mo) — live sessions, submission priority
- Patron ($200/mo) — quarterly calls, founding patron status

For Phase 2, we just need:
1. Supabase Auth (email/password + Google OAuth)
2. Stripe Checkout integration for subscriptions
3. A /support page explaining the tiers
4. A /supporters page showing supporter names (from Supabase)
5. Webhook handler to update Supabase when Stripe payment succeeds/cancels

All published content stays free. Membership is about 
supporting the research, not accessing it.
```

---

## Phase 3: Intelligence Engine + Automation (After Revenue)

### Step 3.1 — Connect Supabase to Pinecone

Tell Claude Code:

```
Build an embedding pipeline:
- When content is added to Supabase (sources, claims, scripture_passages, 
  convergence_points), automatically generate an embedding via OpenAI's 
  text-embedding-3-small model
- Store the embedding in Pinecone with metadata (id, type, topic, tradition)
- Store the Pinecone vector ID back in the Supabase record
- Build as a Supabase Edge Function triggered by database webhooks

Then update the Omnisearch to query Pinecone instead of client-side search.
```

### Step 3.2 — Link Health Monitor

Tell Claude Code:

```
Build a cron job (Supabase Edge Function on a schedule) that:
1. Queries all sources with link_last_checked_at older than their check interval
2. Sends a HEAD request to each URL
3. Logs the result in link_health_log table
4. Updates the source record with new status
5. If a critical source (tier 1-2) goes dead, sends a notification 
   (email or webhook to Discord/Slack)

Run YouTube links daily, news weekly, academic monthly 
(per the check schedule in the Technical Architecture doc).
```

### Step 3.3 — AI Research Agents

Tell Claude Code:

```
Build a research agent system that can be triggered from an admin interface.

The agent flow:
1. Human enters a research question or topic
2. System sends the query to Claude with a system prompt defining 
   the agent's role (Textual Scholar, Archaeological Agent, Advocate, Skeptic, etc.)
3. Claude's response is structured: extracted claims, sources cited, 
   confidence level, open questions
4. Response is logged in ai_research_log table
5. Extracted claims are staged for human review before being added 
   to the knowledge base

For the cross-reference protocol:
- Same query gets sent to Claude AND Perplexity
- Responses are compared
- Differences are flagged for human review

Build a simple admin page at /admin/research with a text input, 
agent role selector, and results display.
```

---

## Deployment

### Vercel Setup

Tell Claude Code:

```
Configure the project for Vercel deployment:
1. Add a vercel.json if needed
2. Make sure all environment variables are documented
3. Set up ISR (Incremental Static Regeneration) for content pages
4. Configure Edge Runtime for API routes that need speed
5. Set up proper caching headers
```

**Your action:** 
1. Go to vercel.com
2. Import your GitHub repo
3. Add all environment variables from .env.local
4. Deploy

### Custom Domain

Once you have unraveled.ai registered:
1. In Vercel dashboard → Settings → Domains → Add "unraveled.ai"
2. Update DNS records at your registrar to point to Vercel
3. Vercel will auto-provision SSL

---

## Daily Workflow With Claude Code

Here's how your development day should look:

**Morning:** 
1. Open VS Code
2. Open Claude Code
3. Review what was built yesterday
4. Pick the next step from this document
5. Paste the relevant prompt section into Claude Code
6. Review what Claude Code builds
7. Ask it to fix anything that looks wrong
8. Commit to git when satisfied

**Tips for working with Claude Code:**
- Give it one task at a time, not five
- If it builds something wrong, describe what's wrong specifically
- Say "show me what you built" to get it to explain its work
- Say "run the dev server and check if it works" to get it to test
- Reference the companion documents by name for context
- When in doubt, say "keep it simple — we can add complexity later"

**What to build first (priority order):**
1. ✅ Project setup + design system (Phase 0)
2. ✅ Homepage (Phase 1.1)
3. ✅ Flood deep dive page (Phase 1.2) ← THIS IS THE MOST IMPORTANT PAGE
4. ✅ Map visualization (Phase 1.3)
5. ✅ SEO + newsletter (Phase 1.4)
6. Deploy to Vercel
7. Share with 10 people. Get reactions.
8. If reactions are "wait, WHAT?" → continue to Phase 2
9. If reactions are "meh" → iterate on the content before building more features

---

## Quick Reference: Key Prompts for Claude Code

### When stuck on styling:
```
The design should feel like a premium research publication — 
think Stripe's documentation meets the Smithsonian Channel. 
Dark background, warm amber accents, generous whitespace, 
strong typography hierarchy. No conspiracy aesthetics.
```

### When stuck on content tone:
```
Write in the voice of a curious, rigorous researcher who respects 
both believers and skeptics. Never sensational, never dismissive. 
Present evidence, cite sources, and let the reader decide.
"We don't tell you what to believe. We show you what we found."
```

### When stuck on technical decisions:
```
Keep it simple. We're one person using Claude Code. 
Pick the approach that ships fastest and can be improved later.
No premature optimization. No over-engineering. 
Get it working, then get it right, then get it fast.
```

### When reviewing AI-generated code:
```
Does this page look credible? Would a university professor 
take this seriously? Would a 22-year-old share this on TikTok?
If both answers aren't yes, it needs work.
```

---

## What "Done" Looks Like for Phase 1

You can move to Phase 2 when:

- [ ] Homepage loads fast and looks premium
- [ ] Flood deep dive page has all 7 sections with real sourced content
- [ ] Map visualization works with time slider and evidence toggles
- [ ] Newsletter signup captures emails to Supabase
- [ ] SEO meta tags and structured data are on every page
- [ ] Site is deployed on Vercel at unraveled.ai
- [ ] 10+ people have seen it and at least 3 said "wait, WHAT?"
- [ ] You can share a link and the OG preview looks great on X/iMessage

**Estimated time to Phase 1 complete:** 2-4 weeks working with Claude Code a few hours per day.

---

## What NOT to Build Yet

Don't let scope creep kill momentum. These are important but NOT Phase 1:

- ❌ Admin dashboard
- ❌ AI research agents
- ❌ Link health monitoring
- ❌ Pinecone semantic search (use simple client-side search first)
- ❌ Membership/payments
- ❌ Social media automation
- ❌ Podcast generation
- ❌ Mobile app
- ❌ Content licensing system
- ❌ Embeddable widgets

Build the content experience first. If nobody cares about the content, none of the tooling matters.

---

*This is your roadmap. Work through it step by step. Every section is a prompt you can hand to Claude Code. Ship Phase 1, validate with real humans, then come back for Phase 2.*
