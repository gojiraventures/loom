# UNRAVELED — Research Methodology & Query Strategy Guide

**Version:** 1.0  
**Last Updated:** March 29, 2026  
**Classification:** Internal Research Tool — Not for Public Site

---

## 1. The Problem

Every search engine and AI model has layers between you and the raw information:

**Layer 1 — SEO / Commercial filtering.** Google ranks by engagement, backlinks, and ad revenue. The top results for any controversial topic are whatever media companies optimized for, not whatever is most primary or most true.

**Layer 2 — "Quality" filtering.** Google, Bing, and AI models deprioritize sources they classify as "low quality" — which often means "not from a major institutional domain." A 130-year-old Smithsonian report on Archive.org gets ranked below a 2-year-old BuzzFeed debunking article because BuzzFeed has better SEO.

**Layer 3 — Content policy filtering.** AI models have RLHF training that makes them hedge, refuse, or redirect on topics their creators flagged as sensitive. Search engines have manual quality rater guidelines (Google's are public — look up "Google Search Quality Evaluator Guidelines") that explicitly deprioritize "conspiracy" content regardless of its sourcing.

**Layer 4 — Temporal bias.** Recent content outranks older content, even when the older content is the actual primary source. A 2023 blog post about the Epic of Gilgamesh outranks Andrew George's 2003 Oxford critical edition.

**Our job is to get past all four layers to the primary sources.**

---

## 2. Search Engine Strategies

### 2a. Go Direct to Primary Source Databases

Skip Google entirely for academic and archival research. These databases contain the actual evidence:

| Database | URL | What It Has | Free? |
|----------|-----|-------------|-------|
| **Archive.org** | archive.org | Digitized books, government reports, historical newspapers, Wayback Machine | Yes |
| **Google Scholar** | scholar.google.com | Academic papers, citations, author profiles | Yes (papers may be paywalled) |
| **JSTOR** | jstor.org | Academic journals across all disciplines | Free account: 100 articles/month |
| **Academia.edu** | academia.edu | Researcher-uploaded papers and preprints | Free with account |
| **ResearchGate** | researchgate.net | Researcher profiles and paper access | Free with account |
| **Semantic Scholar** | semanticscholar.org | AI-powered academic search, citation graphs | Yes |
| **CDLI** | cdli.mpiwg-berlin.mpg.de | Cuneiform Digital Library — every known cuneiform tablet | Yes |
| **ORACC** | oracc.museum.upenn.edu | Open Richly Annotated Cuneiform Corpus | Yes |
| **Sefaria** | sefaria.org | Hebrew Bible, Talmud, Midrash — original + translation, cross-referenced | Yes |
| **Sacred-Texts** | sacred-texts.com | Every major sacred text digitized (public domain translations) | Yes |
| **Perseus Digital Library** | perseus.tufts.edu | Greek and Latin texts with morphological analysis | Yes |
| **Dead Sea Scrolls Digital Library** | deadseascrolls.org.il | High-res images of every scroll fragment | Yes |
| **British Museum Collection** | britishmuseum.org/collection | Every object in the BM collection with images | Yes (CC BY-NC-SA 4.0) |
| **Smithsonian Open Access** | si.edu/openaccess | 3M+ images and data from all Smithsonian museums | Yes (CC0) |
| **Met Open Access** | metmuseum.org/art/collection | 375,000+ public domain images | Yes |
| **PICRYL** | picryl.com | Public domain image aggregator | Yes |
| **Hathi Trust** | hathitrust.org | 17M+ digitized books from major research libraries | Yes (for public domain works) |
| **Internet Archive Scholar** | scholar.archive.org | Full-text search across 25M+ research papers and books | Yes |

**The principle:** If you're searching Google for something that exists in one of these databases, you're searching in the wrong place.

### 2b. Google Advanced Operators

When you do use Google, use it surgically:

| Operator | What It Does | Example |
|----------|-------------|---------|
| `site:archive.org` | Search only Archive.org | `site:archive.org "bureau of ethnology" skeleton` |
| `site:jstor.org` | Search only JSTOR | `site:jstor.org "flood narrative" comparative` |
| `site:*.edu` | Search only university domains | `site:*.edu nephilim "book of enoch" archaeological` |
| `site:*.gov` | Search only government domains | `site:*.gov "bureau of american ethnology" annual report` |
| `filetype:pdf` | Find PDFs only (often academic papers, reports) | `filetype:pdf "gilgamesh tablet xi" flood parallels genesis` |
| `intitle:"exact phrase"` | Title must contain exact phrase | `intitle:"12th annual report" bureau ethnology` |
| `"exact phrase"` | Exact match only | `"seven feet six inches" skeleton smithsonian` |
| `before:2000` | Results published before 2000 | `"giant skeleton" mound before:2000` (pre-debunking-era sources) |
| `after:2020` | Results published after 2020 | `göbekli tepe dating after:2020` (latest findings only) |
| `-site:reddit.com -site:quora.com` | Exclude noise sites | `nephilim genesis 6:4 -site:reddit.com -site:quora.com -site:youtube.com` |

### 2c. The Time Machine Technique

For topics where modern results are dominated by debunking or SEO content, **search for sources from BEFORE the debunking narrative formed.**

Example: Giant skeletons
- Modern search → dominated by "DEBUNKED" articles referencing the 2014 satire story
- Time-limited search → `"giant skeleton" smithsonian before:2010` → finds pre-viral original research, historical newspaper archives, and the actual Bureau of Ethnology reports before they became culture war fodder

Example: Book of Enoch
- Modern search → dominated by sensationalized "BANNED BOOKS OF THE BIBLE" content
- Time-limited search → `"book of enoch" dead sea scrolls aramaic fragments before:2005` → finds Milik's original scholarship, Nickelsburg's early commentary, and academic analysis before the topic went mainstream

### 2d. Language Switching

English-language Google is heavily filtered for controversial topics. **Search in other languages for the same topic** — different countries have different editorial norms, different SEO landscapes, and different institutional relationships.

| Language | Useful For | Example Query |
|----------|-----------|---------------|
| **German** | Archaeology (Germany has world-leading archaeology programs) | `Göbekli Tepe Ausgrabung neue Funde` |
| **French** | Egyptology (France has deep Egyptological tradition) | `Nephilim géants Bible archéologie` |
| **Hebrew** | Biblical studies, Dead Sea Scrolls | `נפילים בראשית ו׳ ארכיאולוגיה` |
| **Arabic** | Islamic scholarship on shared figures (Noah/Nuh, angels) | `طوفان نوح القرآن الآثار` |
| **Spanish** | Mesoamerican archaeology and indigenous traditions | `Popol Vuh diluvio maya arqueología` |
| **Turkish** | Göbekli Tepe and Anatolian archaeology (local reporting) | `Göbekli Tepe yeni keşifler kazı` |
| **Russian** | Alternative history research (less filtered academic tradition) | `допотопные цивилизации археология` |

Use Google Translate to read the results. The point isn't fluency — it's finding sources and citations that English SEO has buried.

### 2e. Alternative Search Engines

| Engine | Why Use It | URL |
|--------|-----------|-----|
| **Brave Search** | Independent index, no Google dependency, less filtering | search.brave.com |
| **Yandex** | Russian search engine — very different results for same queries, less Western editorial filtering | yandex.com |
| **Mojeek** | Fully independent crawler-based index, no tracking, minimal filtering | mojeek.com |
| **Marginalia** | Specifically designed to surface non-commercial, text-heavy, old-school websites that Google buries | search.marginalia.nu |
| **Wiby** | Indexes only "old web" style sites — personal pages, academic pages, pre-SEO content | wiby.me |
| **Million Short** | Lets you remove the top 100/1000/10000/100000 sites from results — bypasses SEO entirely | millionshort.com |

**Million Short is particularly powerful.** Remove the top 10,000 sites and suddenly the small university pages, personal researcher sites, historical society archives, and obscure museum databases float to the top — exactly the kind of sources our project needs.

---

## 3. AI Query Strategies

### 3a. The Honest Framing Problem

Every AI is trained to be helpful within its safety guidelines. When you ask about controversial topics, the AI's default behavior is to:
1. Give the mainstream consensus view
2. Acknowledge alternative views exist
3. Caution you against "misinformation"

This is fine for casual questions. For research, it means you get the Skeptic's view automatically and have to fight for the Advocate's view. Here's how to rebalance:

### 3b. Prompting for the Advocate

Instead of asking: "Were there giants in North America?"
(This triggers the AI's "controversial claim" reflex → you get hedging and debunking)

Ask: "The Smithsonian's 12th Annual Report of the Bureau of Ethnology (1894) by Cyrus Thomas documents skeletal remains measuring 7-8 feet at multiple excavation sites. What specific measurements and locations are documented in that report, and what happened to those remains after the report was published?"

**Why this works:** You're citing a specific primary source by name, asking for specific factual details, and asking a follow-up question about provenance. The AI has no reason to refuse — you're asking about the contents of a published government document.

### 3c. The "Steelman This" Technique

Ask: "Steelman the argument that cross-cultural flood narratives represent more than independent mythology. Use only peer-reviewed or university press sources. What is the strongest version of this argument that a serious scholar could make?"

**Why this works:** "Steelman" signals that you want the *best* version of an argument, not a strawman. "Peer-reviewed sources only" signals rigor. The AI can engage with the controversial position because you've framed it as an intellectual exercise with quality constraints.

### 3d. The Comparative Framing

Instead of: "Tell me about the Nephilim"
(Triggers "religious claim" caution)

Ask: "Compare the description of the Nephilim in Genesis 6:4, the Watchers in 1 Enoch 6-16, the Titans in Hesiod's Theogony, the Jötnar in the Prose Edda, and the Quinametzin in Aztec tradition. What specific narrative elements do they share? Where do they diverge? What has mainstream comparative mythology (Witzel, Campbell, Eliade) said about these parallels?"

**Why this works:** You're asking for a scholarly comparison, not a truth claim. The AI is comfortable analyzing texts comparatively. And the comparison itself reveals the unraveled pattern.

### 3e. The Primary Source Extraction

Ask: "What is the exact text of Genesis 6:4 in the original Hebrew (with transliteration), in the Septuagint Greek, in the Vulgate Latin, and in the King James English? What are the key translation differences between these versions, particularly in how 'Nephilim' and 'sons of God' are rendered?"

**Why this works:** You're asking for textual facts — the actual words in the actual manuscripts. No AI will refuse to provide the text of Genesis. But the translation comparison reveals how interpretation has been shaped by language choices.

### 3f. The "What Would Agent X Say" Technique

For our specific project, frame queries through the agent roles:

- "Acting as the Textual Scholar agent: What are ALL references to beings of unusual size in the Hebrew Bible, including minor references that are often overlooked?"
- "Acting as the Advocate agent: Build the strongest possible case that the structural parallels between the Epic of Gilgamesh and Genesis 6-9 indicate a common source event rather than literary borrowing."
- "Acting as the Skeptic agent: What is the strongest possible case that Ezekiel's vision of the Cherubim was influenced by Assyrian Lamassu iconography rather than representing an independent tradition?"
- "Acting as the Institutional Historian: Document the chain of custody for skeletal remains collected by the Smithsonian's Bureau of American Ethnology between 1880-1920. What records exist? What gaps exist?"

### 3g. Cross-Model Exploitation

Run the same query through multiple AIs and look for what's different:

```
Query: "What did the Smithsonian's Bureau of Ethnology 12th Annual Report 
(1894) document regarding skeletal measurements at mound excavation sites?"

Claude → [response]
Grok → [response]  
ChatGPT → [response]
Gemini → [response]
Perplexity → [response]
```

**What to look for:**
- Which model provides the most specific measurements/quotes from the report?
- Which model volunteers the Hrdlička connection without being asked?
- Which model adds unsolicited "debunking" context?
- Which model refuses to engage or redirects?
- Which model mentions information the others don't?

**Log every difference.** The delta between models IS intelligence.

### 3h. The Breadcrumb Chain

Start with an established fact and follow the chain:

1. "The Dead Sea Scrolls included 11 Aramaic manuscripts of 1 Enoch. Who published the official edition of these fragments?"
   → Answer: Józef Milik, 1976, Oxford Clarendon Press

2. "What was controversial about Milik's publication timeline for the Enoch fragments?"
   → Answer: He had access from the 1950s but didn't publish until 1976 — a 20+ year delay

3. "Who controlled access to the Dead Sea Scrolls during those decades and what was the stated justification?"
   → Answer: A small team led by Roland de Vaux, who restricted access to a chosen few scholars

4. "What was Roland de Vaux's institutional affiliation and religious background?"
   → Answer: Dominican priest, director of the École Biblique in Jerusalem

5. "Has any scholar argued that de Vaux's religious commitments influenced which scrolls were prioritized for publication?"
   → Now you're in the real research territory

Each question is individually legitimate and specific. The chain leads somewhere the AI wouldn't take you if you asked the final question first.

---

## 4. Finding What's Been Buried

### 4a. The Archive.org Method

Archive.org has digitized millions of books and documents that Google doesn't surface well. For our topics:

| Search | What You'll Find |
|--------|-----------------|
| `"bureau of ethnology" annual report` | Original 19th century Smithsonian excavation reports with skeletal measurements |
| `"book of enoch" translation` | Multiple early translations (Charles 1917, Laurence 1883) in full text |
| `"ancient giants" OR "giant skeleton" before:1940` | Pre-debunking era newspaper accounts and regional histories |
| `"mound builders" archaeological` | 19th century archaeological reports before the narrative was sanitized |
| `nephilim OR rephaim OR anakim` | Early biblical scholarship before modern content filtering |

### 4b. The Newspaper Archive Method

Historical newspapers are a goldmine because they reported findings before institutional narrative control took hold. If the Smithsonian's own agents documented a 7'6" skeleton in 1883 and the Charleston Daily Mail reported it at the time, that newspaper is a corroborating source independent of the Smithsonian's later institutional narrative.

| Resource | URL | Coverage |
|----------|-----|----------|
| **Newspapers.com** | newspapers.com | 800M+ pages, 1700s-2000s (subscription but free trial) |
| **Chronicling America (LOC)** | chroniclingamerica.loc.gov | Free, Library of Congress digitized newspapers 1770-1963 |
| **Fulton History** | fultonhistory.com | Free, 46M+ newspaper pages, focus on New York state |
| **British Newspaper Archive** | britishnewspaperarchive.co.uk | UK newspapers 1700s-2000s |
| **Google News Archive** | news.google.com/newspapers | Discontinued but still partially accessible |

**Search strategy:** Find the specific date and location from an academic report, then search the local newspaper from that date for corroborating or additional details.

### 4c. FOIA and Government Records

The US Freedom of Information Act (FOIA) applies to federal agencies including the Smithsonian. Specific FOIA-requestable items:

- Smithsonian Bureau of American Ethnology field notebooks and correspondence (1880-1920)
- Internal memos regarding the reclassification or disposal of skeletal remains
- NAGPRA repatriation records (what was returned to whom and when)
- Aleš Hrdlička's official correspondence files (partially available at Smithsonian Archives, but completeness is unknown)

### 4d. Museum Database Deep Searches

Most major museums have made their collections searchable online, but their search interfaces are poor. Strategies:

**British Museum:** Their collection database (britishmuseum.org/collection) has over 4.5M records. Use their advanced search with specific artifact types, dates, and excavation sites. Many artifacts have photos that have never been linked from any Google result.

**Smithsonian:** Their Open Access program (si.edu/openaccess) has 3M+ items under CC0. Search by collection name (e.g., "Bureau of American Ethnology"), date range, and material type. The anthropological collections are particularly under-explored online.

**Israel Museum / Dead Sea Scrolls:** The digital library (deadseascrolls.org.il) has high-resolution multispectral images of fragments. New readings are still being made from these images using modern imaging technology.

---

## 5. Detecting Suppression vs. Absence

Critical distinction: **not finding something is not the same as it being hidden.**

Before claiming suppression, verify:
1. **Did it ever exist?** Is there a primary source documenting its existence?
2. **Where was it last documented?** What's the most recent reliable record?
3. **Who had custody?** What institution or person was last known to have it?
4. **Is there a mundane explanation?** Natural decay, fire, flooding, administrative error, repatriation under NAGPRA?
5. **Is there a pattern?** One missing artifact is a filing error. Twenty missing artifacts from the same institution during the same period under the same curator is a pattern worth investigating.

### The Pattern Test

A single anomalous skeleton disappearing from the Smithsonian could be carelessness. But when the Smithsonian's own 1894 report documents multiple oversized skeletons, their own curator (Hrdlička) then dismisses all such reports without published re-measurement, and none of those specific specimens can be located today — that's a pattern. Document the pattern. Let the Advocate and Skeptic argue about what it means. Let the audience decide.

---

## 6. Building the Query Engine

All of these strategies should be automated and built into the Intelligence Engine:

### Automated Multi-Source Queries

For every research question, the system should automatically:

1. **Search primary databases first** (Archive.org, JSTOR, Scholar, CDLI, Sefaria)
2. **Search Google with surgical operators** (site:, filetype:, date ranges, exclusions)
3. **Search alternative engines** (Brave, Marginalia, Million Short)
4. **Query multiple AIs** with the steelman framing
5. **Search newspaper archives** for corroborating historical accounts
6. **Check museum databases** for related artifacts
7. **Compare all results** and flag: unique findings, contradictions, omissions, refusals

### Query Templates (Stored in Database)

For each topic, pre-build optimized queries:

```json
{
  "topic": "nephilim_giants",
  "primary_source_queries": [
    {"db": "archive_org", "query": "\"bureau of ethnology\" skeleton measurement mound"},
    {"db": "jstor", "query": "nephilim genesis anakim archaeological evidence"},
    {"db": "sefaria", "query": "Genesis 6:4 Nephilim"},
    {"db": "scholar", "query": "\"elongated skulls\" ancient DNA haplogroup analysis"}
  ],
  "google_queries": [
    {"query": "site:archive.org \"12th annual report\" bureau ethnology skeleton"},
    {"query": "site:*.edu nephilim \"book of enoch\" \"dead sea scrolls\""},
    {"query": "filetype:pdf \"giant skeleton\" smithsonian mound measurement"},
    {"query": "\"seven feet\" OR \"eight feet\" skeleton mound -hoax before:2010"}
  ],
  "ai_queries": [
    {"framing": "steelman", "query": "Build the strongest scholarly case for anomalous skeletal findings in North American burial mounds using only documented archaeological reports"},
    {"framing": "primary_source", "query": "What specific skeletal measurements are documented in the Smithsonian Bureau of Ethnology 12th Annual Report (1894)?"},
    {"framing": "advocate", "query": "What legitimate criticisms exist of Aleš Hrdlička's blanket dismissal of oversized skeletal remains?"},
    {"framing": "skeptic", "query": "What are the strongest explanations for why 19th century reports of giant skeletons were unreliable?"}
  ],
  "newspaper_queries": [
    {"db": "chronicling_america", "query": "giant skeleton mound", "date_range": "1870-1920"},
    {"db": "newspapers_com", "query": "smithsonian skeleton measurement", "date_range": "1880-1900"}
  ]
}
```

### Result Scoring

Every result from every source gets scored:

```
Result Score = Source Authority × Specificity × Primary Source Distance × Uniqueness
```

- **Source Authority:** .edu (0.9), archive.org (0.8), museum database (0.9), newspaper archive (0.6), blog (0.2)
- **Specificity:** Contains exact measurements/dates/names (1.0) vs. vague claims (0.2)
- **Primary Source Distance:** IS the primary source (1.0), cites primary source (0.8), cites someone who cites primary source (0.4), no citation (0.1)
- **Uniqueness:** Found by only one search method (0.9, novel finding) vs. found by all methods (0.5, well-known)

High-scoring results from low-authority sources get flagged for verification. Low-scoring results from high-authority sources get flagged for investigation (why is a major institution being vague about this?).

---

*This document is for internal research use. The methodology itself could be published as a "How We Research" transparency page on the public site — showing users exactly how we find and verify information.*
