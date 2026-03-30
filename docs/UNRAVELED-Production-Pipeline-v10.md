# UNRAVELED — Content Production Pipeline

**Version:** 1.0  
**Last Updated:** March 29, 2026  
**Companion to:** Distribution Strategy, Business Model

---

## 1. The Pipeline Philosophy

**Research once. Produce everywhere. Automate production. Humanize review.**

One deep research topic flows through an automated pipeline that produces 40+ pieces of channel-optimized content. AI handles the repetitive transformation work (writing → script → audio → video → graphics → social posts). Humans handle the editorial judgment (is this accurate? is this the right tone? does this serve the audience?).

```
RESEARCH (Human + AI agents)
    ↓
MASTER CONTENT (Long-form deep dive on site)
    ↓
AI PRODUCTION PIPELINE
    ├── Podcast script → Audio → Video podcast
    ├── YouTube script → Voiceover → Edited video
    ├── TikTok/Reels scripts → Short video
    ├── Instagram carousels → Designed cards
    ├── X threads → Scheduled posts
    ├── Newsletter draft → Email
    ├── App micro-chapters → Mobile content
    └── Embeddable widgets → Distribution
    ↓
AI EDITORIAL REVIEW (Multiple AI editors for accuracy, tone, bias)
    ↓
HUMAN FINAL REVIEW (Accuracy check, voice check, publish decision)
    ↓
PUBLISH + SCHEDULE + MONITOR + OPTIMIZE
```

---

## 2. The Tool Stack

### 2a. Writing & Scripting

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **Claude (Anthropic)** | Long-form research writing, script drafting, claim extraction, structured analysis | API: ~$200-500/mo | Primary writing engine. Drafts deep dives, scripts, threads, newsletter copy. The "lead writer" AI. |
| **Grok (xAI)** | Alternative perspective generation, social copy that pushes boundaries | API: varies | "Second opinion" writer. Drafts Advocate-leaning content that Claude might hedge on. |
| **Notion AI** or **Obsidian** | Research organization, content planning, editorial calendar | Free-$10/mo | Content planning and editorial calendar. Where the human team tracks what's in pipeline. |

### 2b. Podcast & Audio Production

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **Google NotebookLM Podcast API** | Generates conversational podcast-style audio from source documents. Two AI hosts discuss your content naturally. | Enterprise pricing (contact Google Cloud) | Feed it a completed deep dive → get a two-host discussion podcast. Perfect for "The Unraveled Podcast" episodes. |
| **AutoContent API** | NotebookLM alternative with custom voices, multilanguage, and automated publishing pipeline | From $49/mo | Backup podcast generation. Advantage: custom voice cloning, direct Spotify/YouTube publishing. |
| **ElevenLabs** | Best-in-class AI voice synthesis. Voice cloning. Multilingual. | From $5/mo (Starter) to $99/mo (Scale) | Scripture readings in different voices. Narration for video content. Voice cloning for consistent brand voice. Custom "Unraveled host" voice. |
| **Descript** | Audio/video editing via text transcript. Edit audio by editing words. | From $24/mo | Polish AI-generated podcasts. Remove filler, adjust pacing, add intros/outros. Also does video editing. |
| **Riverside.fm** | Remote recording for interviews (if we do live researcher interviews) | From $15/mo | Record conversations with real scholars and researchers for the podcast. |

**Podcast production flow:**
```
Deep dive published on site
  → Feed text to NotebookLM Podcast API
  → AI generates two-host discussion (15-30 min)
  → Download MP3
  → Import to Descript for polish (add intro music, trim, fix pacing)
  → Export final audio
  → Auto-publish to Spotify, Apple Podcasts, YouTube via Podbean/Anchor
  → AI generates show notes + timestamps from transcript
  → Newsletter excerpt auto-generated
```

### 2c. Video Production

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **HeyGen** | AI avatar video generation. Text → talking head video. Multiple avatars. | From $24/mo | Generate narrator videos for YouTube. Create "presenter" format without a camera. Multiple avatar styles. |
| **Synthesia** | Similar to HeyGen — AI avatar videos, 140+ languages | From $22/mo | Alternative to HeyGen. Test both, use whichever produces better quality for our content style. |
| **Opus Clip** | AI-powered long video → short clips. Identifies best moments automatically. | From $15/mo | Feed YouTube long-form → auto-generate TikTok/Reels/Shorts clips with captions. |
| **CapCut** | Video editing, auto-captions, effects, templates | Free (Pro: $8/mo) | Edit short-form videos. Add captions, transitions, effects. Templates for consistent branding. |
| **Canva** | Design + video templates, brand kit, social media scheduling | $13/mo (Pro) | Video thumbnails, social media templates, brand consistency across all visual content. |
| **RunwayML** | AI video generation, image-to-video, text-to-video | From $12/mo | Generate atmospheric B-roll footage for videos (ancient landscapes, artifact close-ups, abstract visualizations). |
| **Vadoo AI** | Convert audio podcasts → video podcasts with dynamic visuals and subtitles | From $20/mo | Turn podcast audio → YouTube video podcast with waveforms, subtitles, and branding. |

**YouTube long-form production flow:**
```
Deep dive research complete
  → Claude drafts video script (structured: hook, sections, CTA)
  → Human reviews and adjusts script for voice/accuracy
  → Script → HeyGen or Synthesia (AI avatar narration)
  → OR → ElevenLabs voiceover + RunwayML/stock B-roll
  → Add graphics, maps, scripture comparisons from site assets
  → Edit in Descript or CapCut
  → Add thumbnail (Canva template)
  → Upload to YouTube with SEO-optimized title/description/tags
  → Opus Clip auto-generates 5-8 short clips
  → Short clips → TikTok, Instagram Reels, YouTube Shorts
```

**Short-form video production flow:**
```
Jaw-drop fact identified from research
  → Claude writes 60-second script (hook, reveal, kicker, CTA)
  → ElevenLabs generates voiceover
  → CapCut: voiceover + text overlays + visual assets
  → OR: HeyGen avatar delivers the script
  → Auto-caption in CapCut
  → Export in 9:16 (TikTok/Reels) and 16:9 (YouTube Shorts)
  → Schedule across platforms
```

### 2d. Static Graphics & Social Content

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **Canva Pro** | Design templates, brand kit, bulk creation, social scheduling | $13/mo | Instagram carousels, fact cards, scripture comparison graphics, newsletter headers. Brand kit ensures consistency. |
| **Figma** | Professional design tool for complex graphics | Free (Pro: $15/mo) | Complex infographics, the narrative spread map as a static image, designed posters for merch. |
| **Midjourney** or **DALL-E** | AI image generation | $10-30/mo | Atmospheric images for social posts (ancient landscapes, abstract representations). NEVER for fabricating "evidence." |
| **Photopea** | Free Photoshop alternative | Free | Quick image edits, resizing, format conversion. |
| **Remove.bg** | Background removal | Free (limited) | Clean up artifact photos, create transparent assets. |

**Instagram carousel production flow:**
```
Topic identified (e.g., "5 Things You Didn't Know About Biblical Angels")
  → Claude drafts 6-slide carousel text (hook, 4 facts with sources, CTA)
  → Human reviews for accuracy and tone
  → Text → Canva carousel template (pre-built brand template)
  → Add relevant images/graphics from asset library
  → Export as individual slides
  → Schedule via Canva or Later
  → Cross-post to LinkedIn, Pinterest
```

### 2e. Scheduling & Distribution

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **Buffer** or **Later** | Multi-platform social scheduling | From $6/mo | Schedule all social posts across Instagram, TikTok, X, LinkedIn, Pinterest from one dashboard. |
| **Podbean** or **Anchor** | Podcast hosting + distribution to all platforms | Free - $14/mo | Host podcast, auto-distribute to Spotify, Apple, Google, Amazon. |
| **Beehiiv** or **Substack** | Newsletter platform | Free - $49/mo | Weekly newsletter. Beehiiv preferred for growth tools; Substack for simplicity and built-in audience. |
| **Zapier** or **Make.com** | Automation between tools | From $20/mo | Connect the pipeline: "When new post published on site → trigger social drafts → schedule → notify team." |
| **YouTube Studio** | YouTube publishing and analytics | Free | Manage YouTube channel, schedule uploads, track performance. |

### 2f. Analytics & Optimization

| Tool | What It Does | Cost | Our Use |
|------|-------------|------|---------|
| **PostHog** or **Plausible** | Privacy-first web analytics | Free - $50/mo | Site traffic, user journeys, content performance. No Google Analytics. |
| **Metricool** or **Sprout Social** | Social media analytics across platforms | From $18/mo | Track performance across all social channels. Identify what's working. |
| **TubeBuddy** or **vidIQ** | YouTube SEO and analytics | From $8/mo | Optimize YouTube titles, tags, descriptions. Track video performance. |
| **SparkToro** | Audience intelligence | From $50/mo | Understand where our audience hangs out, what they read, who they follow. |

---

## 3. The AI Editorial Review Layer

### Why This Matters

AI can produce content at scale. But AI can also hallucinate, misattribute, sensationalize, or drift from our voice. Every piece of AI-generated content passes through an editorial review before a human ever sees it.

### The AI Editor Team

| Editor | Role | What It Checks | Tool |
|--------|------|----------------|------|
| **Fact Checker** | Verify every claim against the knowledge base | Are sources cited correctly? Do the numbers match our database? Is any claim unsupported? | Claude (with RAG against our Supabase/Pinecone) |
| **Tone Auditor** | Ensure the content matches our voice | Is it sensationalized? Is it too dismissive? Does it sound like Unraveled or like a conspiracy blog? | Claude with custom system prompt defining our editorial voice |
| **Bias Detector** | Check for Advocate/Skeptic balance | Does this piece lean too far in one direction without presenting the other side? | Run through both Advocate and Skeptic agent prompts |
| **Platform Optimizer** | Optimize for the target platform | Is this Instagram copy too long? Does this X thread have a strong hook? Is this YouTube title click-worthy without being clickbait? | Claude with platform-specific guidelines |
| **Accessibility Checker** | Ensure content is accessible | Alt text on images? Captions on videos? Readable font sizes? Color contrast? | Automated tools + Claude review |

### Review Flow

```
AI generates content draft
  → Fact Checker verifies all claims against knowledge base
  → Tone Auditor checks voice and editorial standards
  → Bias Detector verifies Advocate/Skeptic balance
  → Platform Optimizer adjusts for target channel
  → All pass? → Human queue for final review
  → Any fail? → Auto-flag with specific issues for human attention
```

### Channel-Specific Voice & Style Guides

Each channel has its own AI editor tuned to that platform's norms:

**Instagram**
- Voice: Confident, visual-first, curiosity-driven
- Length: Carousel text 15-25 words per slide. Caption 100-150 words.
- Tone: "Did you know?" energy. Never preachy. Always end with "Full research with sources: [link]"
- Hashtag strategy: Mix of broad (#history #archaeology) and niche (#comparativemythology #deadseascrolls)
- Never: Clickbait, unverified claims, sensational language

**TikTok / Reels**
- Voice: Fast, punchy, slightly irreverent but always sourced
- Length: 60-90 seconds max. Hook in first 2 seconds.
- Tone: "Your teacher never told you this" energy. Conversational. Surprised-not-shocked.
- Captions: Always on. Large text. High contrast.
- Never: "Ancient aliens" framing, unsourced claims, misleading thumbnails

**X (Twitter)**
- Voice: Sharp, concise, intellectual but accessible
- Length: Threads 8-12 tweets. Singles under 200 characters for maximum engagement.
- Tone: "Here's something interesting" — inviting discussion, not lecturing
- Always: Source in the thread. Link to full research.
- Never: Dunking on skeptics or believers. Both get respect.

**YouTube**
- Voice: Documentary-quality narration. Measured, authoritative, curious.
- Length: 15-30 minutes for deep dives. 60-90 seconds for Shorts.
- Tone: BBC/Smithsonian Channel energy. "Let's look at the evidence together."
- Thumbnails: Clean, intriguing, not clickbait faces. Text overlay with the key question.
- Never: "THEY DON'T WANT YOU TO KNOW" style thumbnails. That's the opposite of our brand.

**Newsletter (Substack/Beehiiv)**
- Voice: Personal, behind-the-scenes, research-in-progress
- Length: 800-1200 words
- Tone: "Here's what we found this week and why it matters"
- Always: One jaw-drop fact, one source deep-link, one question for the community
- Never: Sales-y, pushy, or overly polished. The newsletter should feel like a letter from a researcher.

**Podcast**
- Voice: Two-host conversational (NotebookLM generates this naturally)
- Length: 20-40 minutes per episode
- Tone: Curious, exploratory, willing to sit with uncertainty
- Always: Name sources during discussion. Acknowledge both Advocate and Skeptic positions.
- Never: Reach conclusions the evidence doesn't support. The podcast mirrors the site's philosophy.

---

## 4. Full Automation Workflows (Zapier/Make.com)

### Workflow 1: New Deep Dive → Full Content Suite

```
TRIGGER: New unraveled point published on site (Supabase webhook)

→ Step 1: Claude API drafts:
    - YouTube script (15-20 min)
    - 5 TikTok scripts (60 sec each)
    - 6-slide Instagram carousel text
    - X thread (10 tweets)
    - Newsletter section (300 words)
    - 15 micro-chapter breakdowns for app
    
→ Step 2: AI Editorial Review (parallel):
    - Fact check all drafts against knowledge base
    - Tone audit each draft for its target platform
    - Bias check for Advocate/Skeptic balance
    
→ Step 3: Audio production (parallel):
    - NotebookLM Podcast API → generate discussion episode
    - ElevenLabs → generate YouTube voiceover from script
    - ElevenLabs → generate TikTok voiceovers
    
→ Step 4: Visual production (parallel):
    - HeyGen/Synthesia → YouTube avatar video from script
    - Canva API → Instagram carousels from text
    - CapCut → short-form videos from scripts + voiceovers
    - RunwayML → atmospheric B-roll for YouTube
    
→ Step 5: Assembly:
    - Descript → polish podcast audio
    - Video editor → assemble YouTube long-form
    - Opus Clip → auto-extract shorts from long-form
    
→ Step 6: Human review queue:
    - All assets staged in review dashboard
    - Human reviews, approves, or sends back with notes
    
→ Step 7: Publish + Schedule:
    - YouTube → upload (scheduled)
    - TikTok/Reels → upload (scheduled via Buffer)
    - Instagram → carousels (scheduled via Buffer)
    - X → thread (scheduled via Buffer)
    - Podcast → publish via Podbean
    - Newsletter → send via Beehiiv
    - App → push micro-chapters to Supabase
    
→ Step 8: Monitor:
    - Track performance across all platforms
    - Identify top-performing content for boosting/repurposing
    - Feed learnings back into next production cycle
```

### Workflow 2: Daily Social Content

```
TRIGGER: Daily cron (8am UTC)

→ Step 1: Pull from knowledge base:
    - 1 random irrefutable fact not yet posted
    - 1 "this day in research" if applicable
    - 1 scripture passage with cross-cultural parallel
    
→ Step 2: Claude generates:
    - Instagram fact card text
    - X tweet with source
    - TikTok script if the fact is visual enough
    
→ Step 3: Canva API generates fact card graphic

→ Step 4: AI Editorial review (fast-track)

→ Step 5: Queue in Buffer for posting at optimal times per platform

→ Step 6: Human gets morning notification:
    "Today's social content is ready for review: [link to dashboard]"
```

### Workflow 3: Podcast Episode from New Research

```
TRIGGER: Manual — research team flags a topic as "podcast-ready"

→ Step 1: Compile source material:
    - Deep dive text
    - Key scripture passages
    - Advocate and Skeptic assessments
    - Top 3 jaw-drop facts
    
→ Step 2: NotebookLM Podcast API:
    - Feed compiled sources
    - Set focus: the key question of this unraveled point
    - Set length: MEDIUM (20-30 min)
    - Generate audio
    
→ Step 3: Descript:
    - Import audio
    - Add branded intro/outro music
    - Trim any awkward AI transitions
    - Generate transcript
    
→ Step 4: Distribution:
    - Audio → Podbean → auto-distribute to all podcast platforms
    - Audio → Vadoo AI → generate video podcast for YouTube
    - Transcript → Claude → generate show notes, timestamps, key quotes
    - Key quotes → Canva → audiogram graphics for social
    
→ Step 5: Human review of final audio before publish
```

---

## 5. Monthly Cost Estimate (Full Pipeline)

| Tool | Monthly Cost |
|------|-------------|
| Claude API (heavy usage) | $300-500 |
| ElevenLabs (Scale) | $99 |
| HeyGen or Synthesia | $24 |
| NotebookLM Enterprise / AutoContent API | $50-200 |
| Canva Pro | $13 |
| CapCut Pro | $8 |
| Opus Clip | $15 |
| Descript (Creator) | $24 |
| RunwayML (Standard) | $12 |
| Buffer (Pro) | $12 |
| Podbean | $14 |
| Beehiiv (Scale) | $49 |
| Zapier / Make.com | $20 |
| Metricool | $18 |
| TubeBuddy/vidIQ | $8 |
| Midjourney | $10 |
| Grok API | $50 |
| Vadoo AI | $20 |
| **Total Pipeline** | **$746-$1,096/mo** |

Under $1,100/month for a full-stack content production pipeline that would cost $15,000-30,000/month with a traditional human team. The AI does the production. The humans do the judgment.

---

## 6. Content Feedback Loop

### Performance-Based Optimization

```
Content published across channels
  → Analytics tracked (views, engagement, shares, click-through)
  → Weekly: AI analyzes top performers vs. underperformers
  → Identifies patterns:
      - Which jaw-drop facts get most shares?
      - Which format (carousel vs. reel vs. thread) performs best per topic?
      - What posting times get most engagement?
      - Which hooks stop the scroll?
  → Adjusts templates and scheduling for next cycle
  → Monthly: human reviews optimization recommendations
```

### A/B Testing System

For every piece of content, generate 2-3 variants:
- Different hooks for the same fact
- Different thumbnail designs for the same video
- Different carousel opening slides
- Different X thread openers

Test them. Let data pick the winner. Apply learnings to the next cycle.

---

## 7. The Human Layer — What Can't Be Automated

| Task | Why It Needs a Human |
|------|---------------------|
| **Research direction** | Which topics to pursue, which connections to explore — requires editorial judgment |
| **Accuracy final check** | AI fact-checking is good but not perfect — a human must verify before publish |
| **Voice calibration** | Does this sound like Unraveled? AI can approximate but humans define the voice. |
| **Ethical judgment** | Should we publish this? Is this person dossier fair? Are we being responsible? |
| **Community management** | Responding to comments, DMs, Signal submissions — requires empathy and judgment |
| **Partnership decisions** | Which podcasters to work with, which licensing deals to accept |
| **Crisis response** | If something we publish gets pushback, a human must decide how to respond |

**The ratio:** AI does ~80% of production work. Humans do ~20% but that 20% is the editorial judgment that defines quality and credibility. Never automate the judgment.

---

*This document covers content production. For distribution strategy, see Distribution & Content Strategy. For business model, see Business Model.*
