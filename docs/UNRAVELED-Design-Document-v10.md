# UNRAVELED — Master Design Document

**Version:** 0.8  
**Last Updated:** March 29, 2026  
**Status:** Active Development — Foundation Phase

---

## 1. Vision & Mission

### What is Unraveled?

Unraveled is a research platform and public-facing interactive site that documents instances of *narrative unraveled* — where geographically and culturally isolated civilizations independently describe the same phenomena with structural specificity that resists coincidence.

### The Core Principle

**Science meets art and design.** The content is strange enough on its own — the presentation must be so clean and rigorous it forces people to take it seriously. No conspiracy aesthetics. No sensationalism. No Alex Jones bullshit.

Think: Smithsonian exhibition designed by Pentagram, published like Bloomberg visual journalism, cited like an academic paper.

### What This Is Not

- Not a conspiracy site
- Not an "ancient aliens" platform
- Not faith advocacy or debunking
- Not entertainment first — it's research first, published beautifully

### What This Is

- A cross-tradition evidence index
- A research tool with a publishing layer
- An interactive exploration engine for patterns that are hard to dismiss
- A place where every claim cites peer-reviewed journals, university press publications, or primary archaeological records

### The Venn Diagram

If faith, evidence, and legend are three circles in a Venn diagram, Unraveled lives in the center — the overlap zone where all three meet and the patterns demand explanation.

---

## 2. Design Philosophy

### Aesthetic Direction

**Swiss International Style meets museum exhibition meets scientific journal.**

- **Typography:** Newsreader (editorial serif) + IBM Plex Mono (data/labels) + IBM Plex Sans (body). No generic fonts. No Inter, no Roboto.
- **Color Palette:** Dark ground (#08090A), warm gold accent (#C8956C), cool teal secondary (#6AADAD), muted supporting colors per tradition. Never garish.
- **Layout:** Swiss grid. Generous whitespace. The site whispers rather than shouts.
- **Tone:** Confident, unhurried, restrained. Active elements are brightest; labels and metadata step down; decorative elements are subtle.
- **Formatting:** Mobile-first, but heavy tablet and desktop user base expected. Max content width ~800px. Sticky navigation. Scroll-triggered animations.
- **Readability:** All body text minimum rgba(255,255,255,0.55) on dark backgrounds. Never sacrifice readability for aesthetic.

### Content Presentation Rules

1. Every claim cites a source
2. Every source links to the original work
3. Where evidence is contested, it is labeled "contested"
4. Where connections are speculative, the speculation is identified
5. Mainstream scholarly explanations are always presented alongside unraveled arguments
6. Primary sacred texts ARE first-class sources — the KJV, the Hebrew Bible, the Quran, the Vedas, the Epic of Gilgamesh. These aren't commentary — they're the evidence.
7. Unraveled scores are heuristics, not verdicts

### How We Describe Different Types of Knowledge

The word "myth" in English implies falsehood. But *mythos* in Greek simply meant "story." We use a taxonomy of narrative types:

| Type | Description | Examples |
|------|-------------|----------|
| Sacred Text | Canonical scripture considered divinely inspired | Genesis, Quran, Vedas, Book of Enoch |
| Oral Tradition | Knowledge transmitted through spoken word, song, ceremony | Aboriginal Dreamtime, Hopi prophecies, Griot traditions |
| Epic Literature | Extended narrative combining historical memory with mythological framework | Epic of Gilgamesh, Mahābhārata, Prose Edda, Popol Vuh |
| Historical Chronicle | Records intended as factual by their authors | Sumerian King List, Chinese dynastic records |
| Archaeological Evidence | Physical artifacts, structures, strata | Flood deposits, megalithic sites, Dead Sea Scrolls |
| Geological Evidence | Earth science data | Sediment cores, stratigraphy, paleoclimatology |
| Genetic Evidence | DNA analysis and population genetics | Haplogroup mapping, ancient genome sequencing |

---

## 3. System Architecture

### Three Layers

**Layer 1 — The Research Engine (gathering)**  
AI agents calibrated as specialist researchers. Each has a domain, a methodology, and a skepticism level. They crawl, read, extract, cross-reference, and flag. They don't publish — they feed a knowledge base.

**Layer 2 — The Unraveled Engine (connecting)**  
A separate set of agents whose only job is to find structural parallels, shared motifs, chronological overlaps, and geographic anomalies across the knowledge base. They don't gather — they connect.

**Layer 3 — The Publishing Layer (presenting)**  
The editorial system that takes validated research and unraveled findings, packages them into interactive formats (timelines, maps, scripture comparisons, artifact viewers), and publishes to the site with full citations.

### Research Agents (Layer 1) — The Gathering Team

These agents have no agenda. They find and structure information.

| Agent | Domain | Function |
|-------|--------|----------|
| 01 — Textual Scholar | Sacred texts, ancient literature | Extracts passages, translations, interpretive debates, structural parallels |
| 02 — Archaeologist | Physical evidence, excavation reports | Tracks artifacts, sites, provenance, verification status |
| 03 — Earth Scientist | Geology, paleoclimatology | Flood strata, sediment cores, dating, physical earth evidence |
| 04 — Comparative Mythologist | Narrative structure analysis | Decomposes stories into structural elements, maintains motif index |
| 05 — Ethnographer | Living traditions, indigenous knowledge | Oral histories, non-Western knowledge systems, community protocols |
| 06 — Art Historian | Visual evidence | Cave paintings, carvings, seals, petroglyphs, manuscript illustrations |
| 07 — Institutional Historian | Research history, archival records | Tracks collection histories, archival evidence, publication timelines |

### Unraveled Agents (Layer 2) — The Connecting Team

| Agent | Function |
|-------|----------|
| 08 — Pattern Matcher | Computes convergence scores across four axes: source independence, structural specificity, physical corroboration, chronological consistency |
| 09 — Timeline Analyst | Tracks chronological relationships, transmission possibilities, dating gaps |
| 10 — Geographic Analyst | Maps spatial distribution, computes isolation distances, flags improbable distributions |

### The Adversarial Pair (Layer 3) — The Debate Team

**This is the soul of the project.**

Every claim, every convergence point, every piece of evidence passes through TWO opposing agents before it reaches the audience. Neither agent "wins." The audience decides.

**Agent 11 — The Advocate (The Champion)**

This agent's job is to build the strongest possible case FOR the unraveled. Not to be credulous — to be *rigorous in pursuit of the pattern*. When five independent traditions describe structurally identical descending teacher-beings, the Advocate doesn't say "therefore aliens." The Advocate says: "Here is why diffusion theory fails to explain this specific distribution. Here is why Jungian archetypes don't account for this level of structural detail. Here is the physical evidence that remains unexplained. Here are the questions that mainstream scholarship has not adequately addressed."

The Advocate:
- Steelmans the unraveled argument with the best available evidence
- Identifies gaps in mainstream explanations that haven't been resolved
- Highlights when skeptical dismissals are lazy or insufficiently rigorous ("it's just a myth" is not an explanation)
- Fights for overlooked evidence, suppressed findings, and traditions that Western academia has historically dismissed
- Pushes back on reflexive debunking that substitutes authority for argument
- Asks: "What would it take for this pattern to be taken seriously by mainstream scholarship? Has that threshold already been met?"

**Agent 12 — The Skeptic (The Challenger)**

This agent's job is to build the strongest possible case AGAINST the unraveled. Not to be dismissive — to be *rigorous in pursuit of the conventional explanation*. When someone claims the Abydos glyphs show a helicopter, the Skeptic doesn't say "that's ridiculous." The Skeptic says: "Here is the palimpsest layering evidence. Here is how Pharaoh Seti I's cartouche was overwritten by Ramesses II's. Here are the specific erosion patterns that create the illusion. Here is why this particular explanation is more parsimonious than the alternative."

The Skeptic:
- Steelmans the mainstream explanation with the best available evidence
- Identifies known hoaxes, misidentifications, and confirmation bias patterns
- Highlights when unraveled arguments cherry-pick evidence or ignore counter-evidence
- Provides specific alternative explanations (diffusion theory, cognitive archetypes, independent invention, coincidence) with citations
- Pushes back on pattern-matching that confuses correlation with connection
- Asks: "What is the simplest explanation that accounts for this evidence? Has it been ruled out?"

### The Rule: Both Agents Are Required

Nothing publishes with only one side represented. Every convergence point on the site must include:

1. **The Advocate's best case** — sourced, specific, rigorous
2. **The Skeptic's best case** — sourced, specific, rigorous
3. **The open questions** — what neither side has fully resolved
4. **No editorial verdict** — the site does not tell the audience what to believe

This is what separates Unraveled from every other site in this space. Conspiracy sites suppress the skeptical argument. Debunking sites suppress the anomalous evidence. We publish both at full strength and trust the audience to think.

### The MythBusters Principle

Like MythBusters, the process IS the content. Watching the Advocate and Skeptic argue — seeing where their evidence overlaps, where it diverges, and where neither can close the case — is more compelling than any conclusion could be. The unresolved tension is the point. That's what keeps people in the rabbit hole. Not answers. Questions that demand better answers than either side currently has.

### Unraveled Scoring Methodology

Every entry is evaluated on four axes:

1. **Source Independence** — Were traditions developed without contact? Geographic isolation, linguistic separation, temporal distance.
2. **Structural Specificity** — Do accounts share specific narrative elements, not just themes? "A flood happened" is common. "A god warned one man to build a boat, load animals in pairs, and release birds to find land" is specific.
3. **Physical Corroboration** — Does archaeological, geological, or genetic evidence support any aspect? Physical evidence weighted highest.
4. **Chronological Consistency** — Do independent dating methods align? Temporal clustering strengthens unraveled.

### Evidence Strength Scale

| Level | Criteria |
|-------|----------|
| Strong | Multiple independent sources and/or physical evidence |
| Moderate | Multiple textual sources or limited physical evidence |
| Contested | Actively debated in academic literature |

### Source Credibility Tiers

| Tier | Description | Examples |
|------|-------------|----------|
| 1 | Peer-reviewed journal, university press | Science, Oxford University Press, Hermeneia Series |
| 2 | Reputable publisher, credentialed author | Penguin, Simon & Schuster with PhD authors |
| 3 | Primary source / sacred text | Genesis, Gilgamesh tablets, Vedas, Quran |
| 4 | Popular but well-sourced | Quality journalism, documentaries with cited experts |
| 5 | Claims requiring independent verification | Newspaper accounts, unverified reports, fringe sources |

---

## 4. Content Topics — The Ten Pillars

### 01. The Great Flood (BUILT — v3)
- **Unraveled Score:** 94
- **Status:** Timeline, map, scripture comparisons, source library built
- **Key Data:** 268+ cultures, 6 continents, geological confirmation
- **Primary Sources:** Genesis 6–9 (KJV), Epic of Gilgamesh Tablet XI, Shatapatha Brahmana, Quran Surah Nuh, Popol Vuh, Prose Edda
- **Key Scholars:** Ryan & Pitman, Andrew George, Witzel, Wu et al., Nickelsburg, Christenson
- **Physical Evidence:** Black Sea sediment cores, Shuruppak flood stratum, Yellow River outburst flood (Science, 2016)

### 02. Pyramids & Megalithic Construction
- **Unraveled Score:** TBD
- **Status:** Research phase
- **Key Pattern:** 5,000+ pyramidal structures across unconnected civilizations. Astronomical alignment. Massive stone transport without clear mechanical explanation. Similar internal chamber designs.
- **Key Sites:** Giza, Teotihuacan, Angkor Wat, Gunung Padang (Indonesia), Nubian pyramids (Sudan), Pyramid of Cestius (Rome), Bosnian Pyramids (contested)
- **Research Needed:** Astronomical alignment data comparison, construction date clustering, stone transport engineering analysis
- **Potential Physical Evidence:** Alignment precision measurements, tool mark analysis, geological sourcing of stone

### 03. The Watchers / Descending Teacher-Beings (STARTED)
- **Unraveled Score:** 81
- **Status:** Basic entry in unraveled section
- **Key Pattern:** Non-human beings descend from above, transfer specific advanced knowledge (metallurgy, astronomy, agriculture, weapons), catastrophe follows
- **Traditions:** Book of Enoch (200 Watchers), Sumerian Apkallu, Greek Prometheus, Mesoamerican Quetzalcoatl, Egyptian Neteru
- **Key Site:** Göbekli Tepe — sophisticated temple complex built by hunter-gatherers 11,500 years ago, predating agriculture
- **Primary Sources:** 1 Enoch 6–16, Dead Sea Scrolls 4Q201–212, Gilgamesh Epic

### 04. Nephilim / Giants
- **Unraveled Score:** TBD
- **Status:** Research phase
- **Key Pattern:** Anomalous large beings described as offspring of non-human and human coupling. Cross-cultural giant traditions.
- **Biblical:** Genesis 6:4, Numbers 13:33, Deuteronomy 3:11 (Og's bed), Book of Enoch, Book of Giants (Dead Sea Scrolls)
- **Cross-Cultural:** Greek Titans, Norse Jötnar, Mesoamerican Quinametzin, Patagonian giants (Magellan), Si-Te-Cah (Nevada), Aboriginal accounts
- **Physical Evidence Claims:** Paracas elongated skulls (contested DNA), historical newspaper reports (mostly unverified), Lovelock Cave artifacts
- **Skeptic Frame:** Gigantism, acromegaly, Marfan syndrome, fossil misidentification, hoaxes, newspaper sensationalism
- **Research Priority:** Separate verified physical evidence from folklore from hoax

### 05. The Underworld / Subterranean Realms
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Pattern:** Detailed underworld geography across cultures — more structurally similar than expected
- **Traditions:** Greek Hades (5 rivers, 3 judges), Egyptian Duat (12 gates), Mesopotamian Kur, Hindu Patala (7 levels), Norse Hel, Mayan Xibalba (9 levels)
- **Physical Evidence:** Derinkuyu (18 stories, 20,000 capacity), Cappadocian underground cities, Tayos Cave (Ecuador, Neil Armstrong expedition)
- **Modern Extension:** DUMB conspiracy theories (separate clearly from archaeological evidence)

### 06. The Serpent / Dragon
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Pattern:** Possibly the single most universal symbol in human mythology. Every culture has it.
- **Traditions:** Biblical serpent (Eden), Sumerian Ningishzida, Egyptian Apophis, Hindu Naga, Mesoamerican Quetzalcoatl, Chinese Long, Norse Jörmungandr, Aboriginal Rainbow Serpent, Hopi horned serpent
- **Shared Elements:** Guardians of knowledge, keepers of the underworld, beings between dimensions
- **Connected Symbols:** Rod of Asclepius, caduceus, kundalini, DNA double helix comparison
- **Key Scholar:** Witzel tracks serpent-slaying as one of the oldest shared narratives

### 07. Atlantis / Lost Advanced Civilizations
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Sources:** Plato's Timaeus and Critias (c. 360 BCE)
- **Cross-Cultural Pattern:** Nearly every culture preserves memory of a prior advanced civilization destroyed by cataclysm — Hindu Yugas, Hopi Four Worlds, Aztec Five Suns, Egyptian Zep Tepi
- **Physical Candidates:** Richat Structure (Mauritania), Younger Dryas impact hypothesis, Yonaguni (Japan), Doggerland (confirmed archaeology)
- **Key Scholar:** Graham Hancock (popular but contested), Randall Carlson (geological evidence)
- **Skeptic Frame:** Plato's allegory interpretation, confirmation bias in site identification

### 08. Sky Beings & Anomalous Aerial Phenomena in Ancient Art
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Examples:** Abydos "helicopter" glyphs (palimpsest explanation exists), Vimanas in Rigveda/Mahabharata, Ezekiel's Wheel (Ezekiel 1), Nuremberg 1561 broadsheet, Aboriginal Wandjina, Tassili n'Ajjer cave paintings
- **Critical Approach:** Present mainstream archaeological explanations alongside anomalous interpretations without choosing a side
- **Research Priority:** Separate artistic convention from genuinely anomalous depictions

### 09. Sacred Geometry & Universal Mathematical Patterns
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Pattern:** Golden ratio, Flower of Life, Fibonacci sequence appearing independently in sacred architecture across disconnected cultures
- **Key Sites:** Great Pyramid, Parthenon, Hindu temple architecture, Temple of Osiris at Abydos, Neolithic carved stone balls (Scotland, 3000 BCE — before Plato)
- **The Question:** Not "is sacred geometry real?" (it's math) but "how did disconnected cultures independently arrive at the same mathematical relationships?"

### 10. The Return / End Times Prophecy
- **Unraveled Score:** TBD
- **Status:** Concept phase
- **Key Pattern:** Cyclical return/ending across nearly every tradition
- **Traditions:** Hindu Kalki avatar, Christian Second Coming, Islamic Mahdi, Hopi Fifth World, Maya Long Count cycles, Norse Ragnarök, Buddhist Maitreya, Zoroastrian Saoshyant
- **Shared Structure:** Period of moral decline → final conflict → transformative figure returns → renewal of world
- **Key Source:** Dead Sea Scrolls "War Scroll" (1QM) — detailed prophecy of final battle

---

## 5. Interactive Tools & Features

### Built

| Tool | Description | Status |
|------|-------------|--------|
| Interactive Timeline | Chronological events with expandable details, source citations, evidence types | ✅ v3 |
| Narrative Spread Map | Animated world map with time slider, evidence layer toggles, spread lines | ✅ v1 |
| Scripture Side-by-Side | Original language + translation + framing for parallel passages | ✅ v3 (3 comparisons) |
| Unraveled Cards | Expandable topic cards with score, cross-cultural perspectives, evidence index | ✅ v3 |
| Narrative Taxonomy | Explanatory section on how cultures encode knowledge differently | ✅ v3 |
| Source Library | Full bibliography with links, author credentials, notes | ✅ v3 |
| Manuscript Image Cards | Links to museum digital archives (British Museum, Israel Museum, etc.) | ✅ v3 |
| Network Graph | Canvas-based interactive tradition connection visualization | ✅ v2 |

### To Build

| Tool | Description | Priority |
|------|-------------|----------|
| **Omnisearch** | Cross-references every source, scripture, tradition, artifact, and topic simultaneously. Not keyword search — concept search. "Wings covered in eyes" returns Ezekiel's Cherubim, the Ophanim, Hindu Garuda descriptions, Buddhist Lokapala iconography, and Assyrian Lamassu reliefs in one result set. See Section 8b. | CRITICAL |
| **Idea Submissions ("The Signal")** | Community pipeline where anyone can submit a unraveled they've noticed, a source they've found, or a connection they think we've missed. Moderated, credited, and potentially published. See Section 8c. | CRITICAL |
| Structure Comparison Matrix | Visual grid: rows = shared elements, columns = traditions. Makes parallel specificity undeniable at a glance. | HIGH |
| Artifact Viewer | Zoomable, annotated image viewer for physical evidence with hotspot annotations | HIGH |
| Steelman Both Sides Toggle | Switch between Advocate's best case and Skeptic's best case. Same data, same sources, two rigorous arguments, no verdict. The audience decides. | HIGH |
| Deep Dive Page Template | Full scrollytelling pages per topic with scroll-triggered animations | HIGH |
| Connection Web | Force-directed graph showing how all 10 topics interconnect | MEDIUM |
| 3D Globe Mode | Rotatable globe with narrative arcs across continents | MEDIUM |
| Audio Layer | Ancient Hebrew, reconstructed Akkadian, Sanskrit, Arabic readings of key passages | MEDIUM |
| Reading List Generator | Personalized book recommendations based on exploration patterns | LOW |
| Artifact Provenance Stories | The human stories behind the discoveries (George Smith, Qumran shepherd, etc.) | MEDIUM |

---

## 6. Admin / Research Tool

### Knowledge Base Dashboard
Every piece of information gathered goes into a structured database. Each entry has: source (URL, author, publication, date), evidence type tag, tradition tag, topic tag, confidence level, notes field. Searchable, filterable, sortable.

### Agent Workspace
Assign research tasks to calibrated AI agents. Each agent returns structured findings with full citations into the knowledge base.

### Unraveled Board
Visual workspace to drag findings from different traditions side by side. Ask the Pattern Matcher to score structural similarity.

### Editorial Pipeline
Kanban board: Research → Advocate Review → Skeptic Review → Fact-Check → Design → Publish. Nothing publishes without BOTH the Advocate and Skeptic weighing in. Both perspectives appear in the final output.

### Source Library Manager
Master bibliography. Add sources, tag by topic/tradition, rate scholarly reliability using the tier system. Every source linked to specific claims.

### Debate Tracker
The heart of the admin tool. For every convergence point, the Debate Tracker maintains:

- **The Advocate's Case** — the strongest argument FOR the pattern, with sourced evidence
- **The Skeptic's Case** — the strongest argument AGAINST the pattern, with sourced evidence
- **Points of Agreement** — where both sides accept the same facts (often surprising)
- **Points of Genuine Contention** — where the evidence is ambiguous and both readings are defensible
- **Open Questions** — what neither side has resolved. These are the most valuable items in the entire database. They're what drive future research and they're what keep the audience thinking.
- **Verdict: None.** The Debate Tracker never resolves. It presents and steps back.

---

## 7. Primary Source Library (Established)

### Sacred Texts (Tier 3)
- Genesis 6–9, King James Version (1611) — kingjamesbibleonline.org
- Torah / Hebrew Bible, Masoretic Text — sefaria.org (Hebrew + English side by side)
- Septuagint (LXX), Greek Old Testament (c. 3rd century BCE)
- Vulgate, Jerome's Latin Bible (c. 405 CE) — biblegateway.com
- Al-Quran, Surah Nuh (71) & Surah Hud (11:25–49) — quran.com
- 1 Enoch, Book of the Watchers (c. 300–200 BCE) — sacred-texts.com
- Epic of Gilgamesh, Tablet XI — British Museum K.3375
- Shatapatha Brahmana 1.8.1 — sacred-texts.com
- Popol Vuh — sacred-texts.com
- Prose Edda, Gylfaginning — sacred-texts.com

### Academic Sources (Tiers 1–2)
- Witzel, E.J.M. — *The Origins of the World's Mythologies* (Oxford, 2012)
- George, A.R. — *The Babylonian Gilgamesh Epic* (Oxford, 2003)
- Nickelsburg, G.W.E. — *1 Enoch: A Commentary* (Fortress Press, 2001)
- Milik, J.T. — *The Books of Enoch: Aramaic Fragments of Qumrân Cave 4* (Clarendon, 1976)
- Ryan, W.B.F. & Pitman, W.C. — *Noah's Flood* (Simon & Schuster, 1998)
- Hufford, D.J. — *The Terror That Comes in the Night* (UPenn Press, 1982)
- Hufford, D.J. — "Sleep Paralysis as Spiritual Experience" (*Transcultural Psychiatry*, 2005)
- Wu, Q. et al. — "Outburst flood at 1920 BCE..." (*Science*, 2016)
- Christenson, A.J. — *Popol Vuh* (University of Oklahoma Press, 2007)
- Doniger, W. — *The Hindus: An Alternative History* (Penguin, 2009)
- Ballard, R.D. et al. — "Deepwater Archaeology of the Black Sea" (*AJA*, 2001)
- Adler, S.R. — *Sleep Paralysis* (Rutgers, 2011)
- Campbell, J. — *The Hero with a Thousand Faces* (Pantheon, 1949)
- Eliade, M. — *Myth and Reality* (Harper & Row, 1963)
- Lévi-Strauss, C. — "The Structural Study of Myth" (*JAF*, 1955)

### Museum Digital Archives
- British Museum Collection Online — CC BY-NC-SA 4.0
- Israel Museum Digital Dead Sea Scrolls (Google partnership) — dss.collections.imj.org.il
- Leon Levy Dead Sea Scrolls Digital Library — deadseascrolls.org.il
- Wikimedia Commons (public domain artifact images)
- PICRYL (public domain search engine)

---

## 8. Jaw-Drop Layers — "Wait, WHAT?"

The most powerful content on the site isn't the unraveled arguments. It's the **verifiable facts that most people don't know** — the things that crack open assumptions and make the unraveled impossible to dismiss as coincidence.

Each topic should lead with its jaw-drop layer. These aren't speculative claims. They're documented, citable, and individually undeniable. It's the *accumulation* that demands explanation.

### The Great Flood
- **Most people think:** There's one flood story (Noah) and it's a religious myth.
- **Jaw drop:** There are 268+ independent flood narratives across 6 continents. The Hopi sealed their faithful inside hollow reeds. The Chinese framed it as a natural disaster solved by engineering. The Maya described it as a failed creation cycle. None of these cultures had contact with each other.
- **Deeper drop:** In 2016, a team from Peking University published geological evidence in *Science* magazine confirming a catastrophic outburst flood on the Yellow River dating to approximately 1920 BCE — physical proof supporting the Gun-Yu tradition that Chinese civilization has preserved for 4,000 years.
- **Deepest drop:** The bird-release sequence in Genesis (raven, then dove three times) and Gilgamesh Tablet XI (dove, swallow, then raven) share 5 of 6 structural elements. Both use three birds. Both end with the non-returning bird as the signal for dry land. These texts were written centuries apart. The parallel is specific enough that "coincidence" requires more explanation than "connection."

### Pyramids & Megalithic Construction
- **Most people think:** Pyramids are an Egyptian thing.
- **Jaw drop:** There are over 5,000 pyramidal structures globally, built by civilizations with no documented contact — in Sudan (Nubian, more pyramids than Egypt), Mexico (Teotihuacan, Chichén Itzá), Peru (Caral, 3000 BCE — contemporary with Egypt's oldest), China (Xi'an pyramids, largely unstudied), Indonesia (Gunung Padang, dated controversially to 20,000+ BCE), Italy (Pyramid of Cestius in Rome), Bosnia (contested), and more.
- **Deeper drop:** The Great Pyramid of Giza, El Castillo at Chichén Itzá, and Angkor Wat in Cambodia are all precisely aligned to astronomical bodies — Giza to Orion's Belt, El Castillo creates a serpent shadow on equinoxes, Angkor Wat mirrors the Draco constellation. These builders were separated by oceans and millennia.
- **Deepest drop:** The precision of the Great Pyramid's base is level to within 2.1 centimeters across 230 meters. Modern construction struggles to achieve this. The stones fit so tightly that a razor blade cannot be inserted between them. We still debate how it was done.

### Biblically Accurate Angels
- **Most people think:** Angels are pretty humans with wings and halos.
- **Jaw drop:** The Bible describes at least four types of angelic beings, and only one (the Malakim/messengers) looks remotely human. The others are terrifying:
  - **Seraphim** (Isaiah 6:2): Six wings. Two cover their face, two cover their feet, two for flying. They are "burning ones." Their voices shake the temple foundations.
  - **Cherubim** (Ezekiel 10:12-14): Four faces — human, lion, ox, eagle. Four wings. Their entire bodies, including backs, hands, and wings, are covered with eyes. They move without turning.
  - **Ophanim** (Ezekiel 1:15-18): "Wheels within wheels" — interlocking rings covered with eyes, moving in any direction, sparkling like topaz, making a sound like rushing water. The Dead Sea Scrolls (4Q405) classify them as angels.
  - The first words angels say in nearly every biblical appearance: **"Do not be afraid."** They have to say this because their appearance causes terror, not comfort.
- **Deeper drop:** The four faces of the Cherubim (human, lion, ox, eagle) map precisely to the four cardinal constellations of the ancient zodiac (Aquarius, Leo, Taurus, Aquila/Scorpio) and later became the four symbols of the Evangelists (Matthew, Mark, Luke, John). This symbolism crosses from Hebrew to Mesopotamian to Christian cosmology.
- **Cross-cultural unraveled:**
  - **Hindu Garuda:** A massive winged being — golden body, eagle features, human torso — who serves as the vehicle of Vishnu. Enemy of serpents (Nagas). Described in the Vedas (c. 1500 BCE). Wings span miles. Appears in Hindu, Buddhist, and Jain traditions across all of South and Southeast Asia.
  - **Sumerian Lamassu:** Human-headed winged bulls with five legs, guarding palace entrances. Multi-natured composite beings — human intelligence, bovine strength, eagle flight. Covered Assyrian palace walls thousands of years before Ezekiel described his Cherubim.
  - **Egyptian Ba/Akh:** The Ba is depicted as a human-headed bird — the soul's form after death. The Akh is the glorified, luminous spirit form. Both are composite human-bird beings.
  - **Buddhist Four Heavenly Kings (Lokapala):** Guardians of the four cardinal directions, depicted with multiple arms, flaming aureoles, and supernatural features at temple entrances across all of East Asia.
  - **Zoroastrian Amesha Spentas:** Seven holy immortals surrounding Ahura Mazda — beings of fire and light who serve as intermediaries between God and humanity. Structural parallel to the seven archangels.
  - **Mesoamerican Quetzalcoatl:** The Feathered Serpent — a composite being combining bird and serpent nature. A winged being who descends from above carrying knowledge.
  - **The pattern:** Composite beings (human + animal + supernatural features), wings, fire/light, multiple faces or forms, serving as intermediaries between the divine and human realms, guarding sacred thresholds. This description appears in traditions that had no contact with each other.

### The Serpent
- **Most people think:** The snake in Eden is a Christian symbol of evil.
- **Jaw drop:** The serpent appears as a sacred/powerful being in literally every documented civilization on earth — and in many of them, it's a guardian of knowledge, not a villain. The Hindu Naga (underground serpent beings), the Mesoamerican Feathered Serpent, the Aboriginal Rainbow Serpent, the Greek Ouroboros, the Chinese Dragon, the Egyptian Uraeus, the Norse World Serpent — all independently. The Rod of Asclepius (serpent = healing) is still the symbol of medicine today.
- **Deeper drop:** In at least 6 independent traditions, the serpent is specifically associated with *forbidden or hidden knowledge* — the same structural role it plays in Genesis.

### The Nephilim / Giants
- **Most people think:** Giants are fairy tales.
- **Jaw drop:** The Bible mentions them in three separate books (Genesis 6:4, Numbers 13:33, Deuteronomy 3:11 — Og's iron bed was 13.5 feet long). The Book of Enoch devotes 11 chapters to their origin. The Dead Sea Scrolls include a separate "Book of Giants" (4Q531-532). But the cross-cultural parallel is what matters: Greek Titans, Norse Jötnar, Aztec Quinametzin (who supposedly built Teotihuacan), Patagonian giants documented by Magellan's chronicler Antonio Pigafetta (1520), the Si-Te-Cah of Paiute oral tradition (corroborated by oversized artifacts at Lovelock Cave, Nevada, 1911), and Aboriginal Australian accounts of giant beings.
- **Deeper drop:** Deuteronomy 3:11 doesn't just mention a giant — it gives physical evidence: "His bed was decorated with iron and was more than nine cubits long and four cubits wide." That's roughly 13.5 × 6 feet. The text explicitly invites verification: "It is still in Rabbah of the Ammonites." The author assumed the reader could go check.

### Format for Site Presentation

Each jaw-drop layer should be presented as a cascading reveal:

**Level 1 — The Assumption** (what most people believe)
**Level 2 — The First Crack** (the fact that challenges the assumption)
**Level 3 — The Deeper Pattern** (the cross-cultural or physical evidence)
**Level 4 — The Open Question** (what neither believers nor skeptics have fully explained)

This creates a natural scroll-driven narrative where each level pulls the reader deeper into the rabbit hole. The design should feel like peeling back layers — each one more surprising than the last.

---

### 8b. Omnisearch — "The Index of Everything"

This is not a search bar. It's a research instrument.

**The problem with normal search:** If someone types "wings covered in eyes" into a typical site search, they get keyword matches. They find Ezekiel 1. Maybe Ezekiel 10. That's it.

**What Omnisearch does:** It searches across every layer of the knowledge base simultaneously — scriptures, traditions, archaeological records, scholarly commentary, artifact descriptions, convergence points, and jaw-drop layers — and returns results grouped by *concept*, not keyword.

"Wings covered in eyes" returns:
- **Biblical:** Ezekiel 1:18 (Ophanim, wheels full of eyes), Ezekiel 10:12 (Cherubim, entire bodies covered with eyes), Revelation 4:6-8 (four living creatures full of eyes)
- **Enochic:** 1 Enoch 71:7 (Ophanim as a class of angels who never sleep, guarding the throne)
- **Dead Sea Scrolls:** 4Q405 (Songs of the Sabbath Sacrifice, construes the wheels as angels)
- **Cross-cultural:** Hindu thousand-eyed Indra, Argus Panoptes (Greek, the all-seeing giant with 100 eyes), Peacock Angel Melek Taus (Yazidi, the all-seeing)
- **Art/Iconography:** Assyrian Lamassu with detailed eye motifs, Buddhist temple guardian figures with third eyes
- **Scholarly:** Hartenstein on Cherubim/Seraphim iconography, Nickelsburg's 1 Enoch commentary on the Ophanim classification
- **Connected topics:** Leads to the Angels convergence point, the Sky Beings topic, the Sacred Geometry topic (eye symbolism in sacred art)

**Search modes:**

| Mode | What it does | Example |
|------|-------------|---------|
| **Concept search** (default) | Finds everything related to an idea across all traditions and evidence types | "beings that descend from the sky" → Watchers, Apkallu, Prometheus, Quetzalcoatl, Vimanas |
| **Scripture search** | Finds specific passages across all sacred texts with original language and translation | "Genesis 6:4" → Hebrew text + KJV + Septuagint variant + scholarly notes + cross-references |
| **Tradition search** | Shows everything from one tradition's perspective | "Sumerian" → all Sumerian sources, artifacts, sites, connected convergence points |
| **Evidence search** | Finds physical/archaeological evidence only | "flood geological evidence" → Black Sea cores, Shuruppak stratum, Yellow River data, Ur excavation |
| **Connection search** | Finds the shortest path between two concepts | "Gilgamesh → Popol Vuh" → shows the chain of parallels (or the absence of one, which is equally interesting) |
| **"Surprise me"** | Surfaces a random jaw-drop fact the user probably doesn't know | "Did you know there are more pyramids in Sudan than in Egypt?" |

**Autocomplete intelligence:** As the user types, the search suggests related concepts they might not have thought of. Type "flood" and it suggests: "flood bird release sequence," "flood vessel dimensions compared," "flood narratives with no transmission pathway," "flood geological evidence sites." Each suggestion is a rabbit hole.

**Result cards:** Every search result is a card with: the source text (original language + translation if applicable), the tradition it comes from, the evidence type, a relevance score, and a "see connections" button that shows what else this result links to. Cards can be saved to a personal research board.

**Powered by:** Semantic/vector search (not just keywords) over the entire knowledge base. The system understands that "beings from the sky" and "descending teachers" and "Watchers" and "Apkallu" are conceptually related even though they share no keywords.

---

### 8c. Idea Submissions — "The Signal"

The audience isn't passive. Some of them know things we don't. A retired archaeologist. A Sanskrit scholar. A Hopi elder. A teenager in Guatemala who grew up hearing a flood story we haven't indexed. The site needs a way to capture those signals without drowning in noise.

**The name:** "The Signal" — because that's what we're looking for. Signal in the noise.

**Submission types:**

| Type | What it is | Example |
|------|-----------|---------|
| **New Unraveled** | "I noticed that Tradition X describes the same thing as Tradition Y and nobody seems to have connected them" | "The Dogon people of Mali describe beings called Nommo who came from the sky and brought knowledge — this parallels the Sumerian Apkallu pattern" |
| **New Source** | "Here's an academic paper / primary text / archaeological report that's relevant to Topic X" | "This 2023 paper in *Antiquity* re-dated Göbekli Tepe's Pillar 43 carvings using new methods" |
| **Correction** | "Your entry on X has an error — here's the correct information with citation" | "The Paracas skull DNA study you cite was by Brien Foerster, not a peer-reviewed lab. Here's the actual published analysis..." |
| **Local Knowledge** | "In my culture/region/family, we have an oral tradition about X that matches your unraveled pattern" | "My grandmother in Oaxaca told us a flood story involving a dog that becomes a woman — this is the Mixtec version and it has specific parallels to..." |
| **Question** | "Has anyone looked at whether X connects to Y?" | "Has anyone compared the layout of Göbekli Tepe's pillars to the arrangement of Ezekiel's Cherubim around the throne?" |

**Submission form fields:**
1. **Type** (dropdown: New Unraveled / New Source / Correction / Local Knowledge / Question)
2. **Title** (short, specific)
3. **Description** (what you've noticed, what you think it means)
4. **Sources** (URLs, book titles, or "oral tradition from [region/culture]")
5. **Traditions involved** (tag which traditions this connects to)
6. **Topics involved** (tag which of the 10 pillars this relates to)
7. **Your background** (optional: helps us assess expertise — "PhD in Assyriology" vs "interested reader" both welcome, but context helps)
8. **Willing to be credited?** (yes with name / yes anonymously / no)

**The pipeline:**

```
Submitted → Auto-screened → Research Queue → Agent Review → Advocate/Skeptic Review → Editorial Decision
```

**Stage 1 — Auto-screen:** Filter out spam, off-topic, and obviously unsourced claims. Not a quality judgment — just noise removal.

**Stage 2 — Research Queue:** Submissions that pass screening enter the research queue, visible to the editorial team. Sorted by: type, topic, and a rough "signal strength" score based on whether sources are cited, whether the traditions mentioned are already in the database, and whether similar connections have been flagged before.

**Stage 3 — Agent Review:** The relevant Layer 1 agents (Textual Scholar, Archaeologist, etc.) verify the factual claims. Can the cited source be confirmed? Does the described tradition exist in the academic literature? Is the local knowledge consistent with other documented accounts from that region?

**Stage 4 — Advocate/Skeptic Review:** The Advocate evaluates whether this strengthens or extends a unraveled pattern. The Skeptic checks whether there's a simpler explanation. Both write their assessment.

**Stage 5 — Editorial Decision:** Three outcomes:
- **Published** — added to the site with credit to the submitter
- **Added to Knowledge Base** — not published as a standalone piece but added to the research database for future reference
- **Returned with thanks** — doesn't meet the evidence threshold, but the submitter is thanked and told why

**Community features:**
- **Public Signal board:** A feed of recently submitted ideas (after auto-screening) that other users can upvote or add supporting evidence to. Think Reddit meets academic peer review. Upvotes don't determine publication — editorial review does — but they help surface high-signal submissions.
- **Submitter profiles:** People who submit ideas that get published build a track record. Frequent high-quality contributors get flagged as "Verified Signal" submitters whose future submissions get priority review.
- **"I can help with this" button:** If a submission needs expertise the team doesn't have (e.g., "I need someone who reads Old Norse"), other users can volunteer to assist.
- **Status tracking:** Submitters can see where their idea is in the pipeline. No black hole.

**The principle:** The best conspiracy sites accidentally got one thing right — they crowdsourced curiosity. The worst thing about them is they had no filter for quality. The Signal takes the crowdsourced curiosity and runs it through the same rigorous Advocate/Skeptic pipeline as everything else on the site. The result: the audience becomes the research team.

---

## 9. The Intelligence Engine — Automated Research at Scale

### The Vision

An army of specialized AI crawlers continuously scouring the internet — reading books, transcripts, interviews, podcasts, academic papers, forum discussions, social media posts, museum databases, and archaeological reports — extracting relevant claims, cross-referencing them against the knowledge base, rating the source, weighting the information, and flagging anything that could be a new thread or unraveled.

This is not a search engine. It's a research organism. It reads, evaluates, connects, and surfaces — 24/7, across every relevant domain, in every language it can access.

### 9a. The Crawler Fleet

Specialized bots, each calibrated for a different content type and domain:

| Crawler | What It Reads | What It Extracts |
|---------|--------------|-----------------|
| **Scholar Bot** | JSTOR, Google Scholar, Academia.edu, ResearchGate, university repositories, Hermeneia series, Oxford/Cambridge press catalogs | New papers, updated findings, cited sources, author credentials, methodological approaches |
| **Archive Bot** | Internet Archive, sacred-texts.com, Project Gutenberg, Perseus Digital Library, ETANA, CDLI (Cuneiform Digital Library) | Digitized ancient texts, out-of-print books, historical manuscripts, newly digitized collections |
| **News Bot** | Major news outlets, science journalism, archaeology magazines (Archaeology, Biblical Archaeology Review, Antiquity) | New discoveries, excavation updates, dating revisions, museum acquisitions |
| **Podcast/Transcript Bot** | YouTube transcripts, podcast RSS feeds, interview transcripts, lecture recordings | Claims made by researchers, authors, and public figures — timestamped and attributed |
| **Social Intelligence Bot** | Twitter/X, Reddit (r/AcademicBiblical, r/Archaeology, r/mythology, r/AlternativeHistory), Quora, specialist forums | Trending discussions, new claims circulating, community fact-checks, emerging theories |
| **Book Bot** | New releases on Amazon/publishers, Google Books previews, library catalogs, book review outlets | New publications in relevant fields, chapter summaries, cited sources within books |
| **Museum Bot** | British Museum, Louvre, Met, Smithsonian, Israel Museum, Egyptian Museum, national museum databases worldwide | New acquisitions, updated artifact descriptions, digitized collections, exhibition catalogs |
| **Primary Source Bot** | Dead Sea Scrolls Digital Library, CDLI, ORACC, Sefaria, Quran.com, sacred-texts.com | Newly digitized texts, translation updates, newly identified fragments, cross-reference opportunities |

### 9b. The Extraction Pipeline

Every piece of content the crawlers find goes through this pipeline:

```
Crawled → Parsed → Claims Extracted → Source Rated → Claims Weighted → Cross-Referenced → Flagged or Filed
```

**Step 1 — Parse:** Convert the content into structured text. For podcasts/videos, use transcription. For PDFs, use OCR where needed. For books, extract chapter structure and key passages.

**Step 2 — Extract Claims:** The AI identifies specific factual claims, assertions, references to traditions, mentions of physical evidence, and connections to any of the 10 pillar topics. Each claim is extracted as a structured object:

```
{
  claim: "Göbekli Tepe's Pillar 43 depicts a vulture carrying a human head, 
          possibly representing death and the soul's journey",
  source_person: "Klaus Schmidt",
  source_credential: "Lead archaeologist, German Archaeological Institute",
  source_publication: "Göbekli Tepe: A Stone Age Sanctuary (2012)",
  source_type: "academic_book",
  claim_type: "archaeological_interpretation",
  traditions_referenced: ["neolithic_anatolia"],
  topics_relevant: ["sky_beings", "underworld", "sacred_geometry"],
  verifiable: true,
  verification_method: "The pillar carvings are physically documented and 
                        photographed. The interpretation is Schmidt's."
}
```

**Step 3 — Rate the Source** (see 9c below)

**Step 4 — Weight the Claim** (see 9d below)

**Step 5 — Cross-Reference:** Compare the claim against everything already in the knowledge base. Does it corroborate something? Contradict something? Add detail to something? Is it entirely new?

**Step 6 — Flag or File:**
- **Flag for Review** if: it's a potential new unraveled, it contradicts established data, it comes from a Tier 1-2 source, or it's getting significant attention online
- **File to Knowledge Base** if: it's supporting evidence for an existing entry
- **Discard** if: it's duplicate, unsourced, or below the quality threshold

### 9c. Source & Person Rating System

Every source — human or publication — gets a living credibility profile that updates as new data comes in.

**Person Credibility Profile:**

| Field | Description |
|-------|-------------|
| **Name** | Full name and any aliases/handles |
| **Credentials** | Academic degrees, institutional affiliations, field experience |
| **Publication Record** | Peer-reviewed papers, books with reputable publishers, cited works |
| **Track Record Score** | What percentage of their verifiable claims have been confirmed vs. debunked? |
| **Expertise Domains** | What are they actually qualified to speak on? |
| **Bias Indicators** | Do they have a financial interest? Religious affiliation that creates bias? History of cherry-picking? |
| **Platform & Reach** | Where do they publish? How large is their audience? |
| **Unraveled Rating** | Overall 1-100 credibility score, weighted by domain |

**Credibility Tiers for People:**

| Tier | Who | Examples | Weight |
|------|-----|----------|--------|
| **A — Verified Scholar** | Active academic with peer-reviewed publications in relevant field | Andrew George (Gilgamesh), George Nickelsburg (1 Enoch), Michael Witzel (comparative mythology) | Claims weighted 0.9–1.0 |
| **B — Credentialed Researcher** | Has relevant credentials, publishes through reputable channels, but may work outside strict academia | Graham Hancock (journalist with geological sources), Brien Foerster (field researcher, some peer review) | Claims weighted 0.6–0.8 |
| **C — Informed Commentator** | No formal credentials but demonstrates consistent accuracy, cites sources, self-corrects | Quality YouTube researchers who cite papers, well-sourced bloggers, librarians and archivists | Claims weighted 0.3–0.5 |
| **D — Entertainer with Claims** | Large platform, mixes real information with speculation, rarely cites sources, doesn't self-correct | Many podcast hosts, social media influencers who "just ask questions" without doing the work | Claims weighted 0.1–0.2 |
| **E — Fabricator** | Consistently makes claims with no basis, invents sources, refuses correction, monetizes fear | Deliberate hoaxers, grifters selling "secret knowledge," AI-generated content farms | Claims weighted 0.0 — flagged and tracked for debunking |

**The key insight:** Someone can be Tier A in one domain and Tier D in another. A brilliant Egyptologist making claims about Mesoamerican architecture gets their Egyptology claims weighted at 0.9 but their Mesoamerican claims at 0.3 until cross-verified. Domain-specific credibility, not blanket trust.

**Track Record Scoring:**

For every person in the system, we track:
- **Total verifiable claims made:** How many specific, checkable assertions have they made?
- **Confirmed:** How many were independently verified?
- **Debunked:** How many were shown to be false?
- **Unresolved:** How many remain open questions?
- **Self-corrections:** Have they publicly corrected their own errors? (This RAISES credibility)
- **Fabrication rate:** What percentage of their claims appear to be invented? A fabrication rate above 30% triggers automatic Tier E classification.

**Social Influencer Tracking:**

| Metric | Why It Matters |
|--------|---------------|
| **Follower count** | Measures reach — how many people are exposed to their claims |
| **Engagement rate** | Measures influence — how many people act on their claims |
| **Source citation rate** | How often do they cite verifiable sources? |
| **Correction behavior** | Do they correct errors or double down? |
| **Monetization model** | Are they selling courses, supplements, paid content? Financial incentive to sensationalize? |
| **Cross-referencing score** | When they make claims, how often does our knowledge base corroborate vs. contradict? |
| **Amplification pattern** | Do they primarily create original research or amplify others' claims? If amplifying, whose? |

### 9d. People Dossiers & Relationship Network

#### The Concept

Every institutional decision was made by a person. Every suppression, every classification, every "debunking" — there's a name attached. And that name has a history, affiliations, mentors, rivals, funders, and ideological commitments that explain *why* they made the decisions they did.

The People Dossier system lets users double-click on any person mentioned anywhere on the site and see their full profile — not a character assassination, but a documented, sourced biography with the connections visible.

#### Dossier Structure

Every person in the system gets:

**Identity & Credentials**
- Full name, dates, nationality
- Academic training (where, under whom — mentor lineage matters)
- Institutional positions held (with dates)
- Publications and major works
- Awards, honors, society memberships

**Ideological Profile**
- Stated beliefs and theoretical commitments (from their own writings)
- Known affiliations with ideological organizations (documented, not speculated)
- Financial interests or funding sources
- Religious or philosophical commitments that may influence their work
- How their views were received by contemporaries vs. how they're viewed now

**Track Record**
- Major claims they made and whether those claims held up
- Claims they suppressed or dismissed and whether those dismissals held up
- Known errors, retractions, or positions they later abandoned
- Self-corrections (raises credibility)

**Relationship Network** (Six Degrees)
- Mentors / who trained them
- Students / who they trained
- Institutional superiors and subordinates
- Co-authors and collaborators
- Known rivals and critics
- Organizational memberships (scientific societies, advisory boards, secret societies where documented)
- Who appointed them to key positions and why

**Relevance to Unraveled**
- Which topics are they connected to
- Which institutional decisions did they influence
- What evidence passed through their hands

#### Example Dossier: Aleš Hrdlička (1869–1943)

**Identity & Credentials**
- Born Humpolec, Bohemia (now Czech Republic). Emigrated to US 1881.
- Medical training: NY Eclectic Medical College (1892), NY Homeopathic College (1894)
- Studied anthropology under L.P. Manouvrier in Paris (1896)
- First Curator of Physical Anthropology, Smithsonian Institution (1904–1941) — 37 years as sole gatekeeper
- Founded the American Journal of Physical Anthropology (1918) — controlled the field's primary publication
- President, American Association of Physical Anthropologists (1928–1932)
- Source: Britannica, Smithsonian Institution Archives (Record Unit 9521)

**Ideological Profile**
- Advisory member, American Eugenics Society (1926) — documented in their own reports, photos in Smithsonian Archives
- Believed in white racial superiority. In a 1926 letter to a University of Vermont professor: "There are differences of importance between the brains of the negro and European, to the general disadvantage of the former" — Washington Post, 2023
- Racial views inspired by Georges Cuvier's three-race theory (White, Black, Yellow)
- Views described in academic analysis as "mysticism dressed up in the language of science" — Mark Brandon, University of Munich doctoral dissertation, "The Racial World of Aleš Hrdlička"
- Believed science must replace religion as a source of moral values
- Source: Washington Post investigative series (2023), Johns Hopkins University Press ("Perils of Race-Thinking")

**Track Record**
- CONFIRMED: Theory that Native Americans migrated from Asia via Bering Strait — widely accepted today
- OVERTURNED: Claimed human presence in Americas was "not more than 3,000 years ago" — Folsom Man discovery (1927) proved 10,000+ years, Hrdlička initially denied it
- OVERTURNED: Dismissed all giant skeleton reports as amateur error — no re-measurement study was ever published to support this blanket dismissal
- CONTROVERSIAL: Collected 250+ human brains for a "racial brain collection" — most taken without consent of the deceased or their families (Washington Post, 2023)
- CONTROVERSIAL: During 1913 expedition to Peru, removed 80 trephined skulls from Andean grave sites
- DOCUMENTED: Beheaded still-decomposing Yaqui massacre victims for skull studies (AP, 2009)
- DOCUMENTED: Disposed of soft tissue from Kagamil Island mummies without study (1936–38)
- Source: Wikipedia (with citations), Washington Post, Smithsonian Archives, AP newswire

**Relationship Network**
```
William H. Holmes (boss, Director of Bureau of American Ethnology)
    ↓ appointed Hrdlička
Aleš Hrdlička (Curator, 1904-1941)
    ↔ American Eugenics Society (advisory member, 1926)
    ↔ L.P. Manouvrier (mentor, Paris)
    ↔ Georges Cuvier (intellectual ancestor — three-race theory)
    → T. Dale Stewart (successor as curator)
    ✕ Cyrus Thomas (predecessor — whose 1894 report documented giant skeletons)
    ✕ Franz Boas (contemporary rival — Boas argued AGAINST racial hierarchy)
```

**The Critical Connection:**
Cyrus Thomas published the 12th Annual Report (1894) documenting multiple 7-8 foot skeletons from Bureau of Ethnology excavations. Hrdlička arrived at the Smithsonian in 1903 — nine years later. One of his first acts was to arrange transfer of skeletal material from the Army Medical Museum to the National Museum. He then spent 37 years as the sole gatekeeper of what counted as legitimate physical anthropology at the Smithsonian. During that time, giant skeleton reports were systematically dismissed as "amateur error" without any published re-measurement study.

**Open questions:**
- Did Hrdlička personally examine any of the skeletons documented in Thomas's 1894 report?
- What happened to those specific remains after Hrdlička took control of the collections?
- Do Hrdlička's personal papers (Smithsonian Archives, Record Unit 9521) contain any correspondence about these specific remains?
- Given his documented eugenics commitments and racial ideology, did anomalous skeletal finds threaten his theoretical framework?

**This is not a conspiracy theory.** Every item above is sourced from: the Smithsonian's own archives, the Washington Post's 2023 investigative series, Britannica, AP wire reports, an academic dissertation published through the University of Munich, and Johns Hopkins University Press. The connections are documented. The open questions are specific and answerable. The reader decides what they mean.

#### Six Degrees Network Visualization

The relationship graph should be interactive:
- **Click any person** → see their full dossier
- **Click any institution** → see its Vault profile
- **Click any connection line** → see the documented relationship (mentor, employer, co-author, rival, society member)
- **Filter by:** time period, institution, ideological affiliation, topic relevance
- **Path finding:** "Show me the shortest connection between Aleš Hrdlička and the Dead Sea Scrolls" → traces through institutional and personal networks

**Key network clusters to map:**

| Cluster | Key Figures | Why It Matters |
|---------|------------|---------------|
| Smithsonian Anthropology (1880–1940) | Powell, Thomas, Holmes, Hrdlička, Stewart | The chain of custody for North American giant skeleton reports |
| Dead Sea Scrolls Access (1947–1991) | De Vaux, Milik, Strugnell, Eisenman, Shanks | The 40-year publication monopoly and who controlled access |
| Vatican Archive Gatekeepers | Various prefects and archivists | Who controls access to the 53 miles of shelving |
| Early Biblical Canon Formation | Athanasius, Jerome, Augustine, Council of Nicaea participants | Who decided what texts became "scripture" and what was excluded |
| Eugenics Movement (1900–1940) | Galton, Davenport, Hrdlička, and institutional connections | How racial ideology influenced what physical evidence was accepted or dismissed |
| Alternative History Researchers | Hancock, Bauval, Schoch, West, Carlson | Their academic credentials, track records, and how mainstream academia treats them |

### 9e. Claim Weighting System

**Weight = Source Credibility × Evidence Type × Corroboration × Specificity**

| Factor | How It's Scored |
|--------|----------------|
| **Source Credibility** | Person tier score (0.0–1.0) × publication tier score (0.0–1.0) |
| **Evidence Type** | Physical/archaeological (1.0) > Peer-reviewed analysis (0.9) > Primary text (0.8) > Secondary analysis (0.6) > Oral account (0.5) > Speculation (0.2) |
| **Corroboration** | How many independent sources support this claim? 1 source (0.3), 2-3 sources (0.6), 4+ independent sources (0.9), cross-cultural corroboration (1.0) |
| **Specificity** | Vague claim (0.2) vs. specific, falsifiable claim (0.8) vs. claim with physical evidence (1.0) |

**Example:**
- Claim: "The Gilgamesh flood narrative shares 12+ structural parallels with Genesis"
- Source: Andrew George, Tier A scholar (0.95)
- Publication: Oxford University Press (1.0)
- Evidence type: Peer-reviewed textual analysis (0.9)
- Corroboration: Confirmed by multiple independent scholars (0.9)
- Specificity: Specific and enumerable (0.9)
- **Composite weight: 0.95 × 1.0 × 0.9 × 0.9 × 0.9 = 0.69 (HIGH)**

vs.

- Claim: "The pyramids were built by Atlanteans using sound frequency technology"
- Source: Random YouTube channel, Tier D (0.15)
- Publication: YouTube video, no peer review (0.2)
- Evidence type: Speculation (0.2)
- Corroboration: No independent academic support (0.1)
- Specificity: Vague, unfalsifiable (0.2)
- **Composite weight: 0.15 × 0.2 × 0.2 × 0.1 × 0.2 = 0.00012 (NEGLIGIBLE)**

### 9f. The Irrefutable Facts Database

The crown jewel. A curated list of facts that have passed every test — verified by multiple independent sources, supported by physical evidence where applicable, and confirmed by both the Advocate and Skeptic agents. These are the "Wait, WHAT?" facts that anchor every topic.

**Criteria for "Irrefutable" status:**
1. Independently verified by 3+ Tier A/B sources
2. No credible published refutation exists
3. Physical evidence available where the claim is empirical
4. Both the Advocate and Skeptic agents agree on the factual basis (they may disagree on interpretation)
5. Has been in the knowledge base for 30+ days without successful challenge

**Examples of Irrefutable Facts:**

| Fact | Sources | Category |
|------|---------|----------|
| Over 200 culturally independent flood narratives exist across 6 continents | Witzel (Harvard, 2012); multiple ethnographic surveys | Cross-cultural pattern |
| The Epic of Gilgamesh Tablet XI (c. 1200 BCE) contains 12+ structural parallels with Genesis 6-9 (c. 500 BCE) | George (Oxford, 2003); Lambert & Millard (1969) | Textual unraveled |
| A catastrophic outburst flood on the Yellow River c. 1920 BCE was confirmed by geological evidence | Wu et al., Science Vol. 353 (2016) | Physical corroboration |
| The Book of Enoch was found in 11 Aramaic manuscripts among the Dead Sea Scrolls, confirming its antiquity to at least 300-200 BCE | Milik (Clarendon, 1976); Nickelsburg (Fortress, 2001) | Archaeological confirmation |
| There are more pyramids in Sudan (approximately 255) than in Egypt (approximately 138) | National Geographic; UNESCO World Heritage documentation | Verifiable count |
| Göbekli Tepe (c. 9500 BCE) is a sophisticated multi-pillar temple complex that predates agriculture, pottery, and settled civilization | Schmidt, German Archaeological Institute; multiple excavation reports | Archaeological fact |
| The Great Pyramid's base is level to within 2.1 cm across 230 meters | Multiple independent surveys including Petrie (1883) and modern laser measurement | Engineering measurement |
| Derinkuyu underground city in Turkey extends 18 stories deep and could shelter approximately 20,000 people | Turkish Department of Culture; multiple archaeological surveys | Archaeological fact |
| The biblical description of Cherubim (Ezekiel 10) includes four faces: human, lion, ox, eagle — the same four figures found on Assyrian Lamassu reliefs predating Ezekiel by centuries | Ezekiel 10:14 (primary text); British Museum Lamassu collection (physical artifacts) | Cross-cultural iconographic parallel |

**Irrefutable ≠ Interpreted.** A fact being irrefutable means the data point is confirmed. It does NOT mean any particular interpretation is confirmed. "200+ flood narratives exist" is irrefutable. "Therefore a global flood happened" is an interpretation that the Advocate and Skeptic debate.

### 9g-ii. AI Research Trust Framework

**Core Principle: Trust none individually. Use all systematically. Cross-reference everything.**

Every AI has a leash. Every AI has training biases. Every AI has content policies shaped by the commercial and political interests of its parent company. For a project like Unraveled, this means no single AI can be the sole research engine. We use multiple models and treat their disagreements as signal.

#### Honest Assessment of Each AI

| Model | Owner | Strengths for This Project | Blind Spots / Biases | Best Role |
|-------|-------|---------------------------|---------------------|-----------|
| **Claude** (Anthropic) | Anthropic | Academic rigor, citation accuracy, long document analysis, structured extraction | Cautious by design — may hedge on claims mainstream academia dismisses. Safety guardrails may underweight anomalous evidence. | Skeptic Agent, source analysis, academic cross-referencing, structured data extraction |
| **Grok** (xAI) | Elon Musk / xAI | Less filtered on controversial topics, real-time X/Twitter access, willing to engage fringe ideas | "Less filtered" can mean "less rigorous." May present fringe claims with same confidence as established facts. Musk ownership = its own political valence. | Social intelligence gathering, surfacing claims other AIs skip, Advocate Agent cross-check |
| **ChatGPT** (OpenAI) | Microsoft / OpenAI | Broad training data, creative synthesis, good at generating alternative hypotheses | Content policies on conspiracy-adjacent topics. Documented model behavior adjustments based on partner relationships. | Broad research synthesis, creative cross-referencing, generating alternative hypotheses |
| **Gemini** (Google) | Google / Alphabet | Access to Google's knowledge graph and index, strong on mainstream scholarly sources | Documented as particularly cautious on sensitive, religious, and controversial topics. Google Search itself has SEO/advertising bias. | Mainstream scholarly source finding, knowledge graph queries |
| **Perplexity** | Perplexity AI | Search-focused, inline citations, real-time web access, uses multiple underlying models | Inherits biases of underlying models. Citation quality varies. | Rapid fact-checking, source verification, finding academic papers |
| **Open-source (Llama, Mixtral)** | Meta / Mistral (open weights) | No corporate content policy. Can run locally with zero filtering. Full control. | Less capable than frontier models. "No filter" = will also confidently state complete falsehoods. | Unfiltered research passes, then verified through rigorous models. Testing whether filtered models suppress specific results. |

#### The Cross-Reference Protocol

For any significant claim, the research engine should:

1. **Query at least 3 models** with the same research question
2. **Compare responses** — where do they agree? Where do they diverge? What does one mention that others don't?
3. **Flag suppressions** — if one model refuses to engage with a topic or claim that others handle freely, that's a signal worth logging. It doesn't mean the claim is true — it means someone decided you shouldn't see it easily.
4. **Verify against primary sources** — no AI response is the final answer. Every claim gets traced back to a primary source (text, artifact, paper, record).
5. **Log the disagreements** — when AIs give conflicting answers about the same factual question, that conflict gets recorded in the knowledge base as a "disputed point" for human editorial review.

#### Detecting Throttled Results

This is the question nobody in AI is talking about publicly: **which models have been specifically tuned to suppress or downweight certain types of information?**

We can test this empirically:
- **The same query across all models.** Ask each model about a specific controversial claim (e.g., "What did the Smithsonian's 1894 Bureau of Ethnology report say about skeletal measurements?"). Compare depth, specificity, willingness to engage, and whether they volunteer relevant context or require prompting.
- **Escalation testing.** Start with a neutral query and progressively make it more specific toward controversial territory. At what point does each model start hedging, refusing, or redirecting? That boundary IS the bias.
- **Omission tracking.** When a model answers a question, what relevant information does it leave out that other models include? Systematic omissions are more revealing than outright refusals.
- **Source comparison.** Do different models cite different sources for the same topic? If one model consistently cites debunking articles while another cites primary sources, that's a measurable editorial bias in the training data or RLHF tuning.

**We should publish our findings.** A transparent comparison of how different AIs handle Unraveled-relevant queries would itself be valuable content — and it would hold AI companies accountable for hidden editorial decisions.

#### The Meta-Principle

The same Advocate/Skeptic framework we apply to ancient evidence applies to our own tools. We don't trust the AI. We don't distrust the AI. We document what it does, compare it to what other AIs do, verify against primary sources, and let the evidence speak.

If Claude (me) is hedging on something that Grok states directly and the primary source confirms — that's worth knowing. If Grok states something confidently that Claude flags as contested and the primary source supports Claude — that's also worth knowing. The pattern across models IS intelligence.

### 9g-iii. The Research Cockpit — "Jamie, Pull That Up"

The visualization challenge: how do you go from question to structured intelligence in two seconds?

#### The Speed Requirement

On Joe Rogan, Jamie has seconds to find a relevant source while the conversation continues. Our interface needs that same speed but with deeper, pre-structured intelligence behind it. The difference: Jamie searches Google. Our users search a curated, cross-referenced, pre-scored knowledge base.

#### The Interface Pattern

**Search Bar (always visible, command-K accessible)**
Type anything: a name, a concept, a scripture reference, a location, a date. Results appear instantly in under 500ms.

**Result Cards (progressive disclosure)**
Each result is a card with layers you can peel:

- **Layer 0:** Search result card (name, title, credibility score) — instant
- **Layer 1:** Summary panel (key facts, affiliations, why they matter) — 1 click
- **Layer 2:** Full dossier (complete profile, all sources, open questions) — 1 click
- **Layer 3:** Network graph (connections to people, institutions, topics) — 1 click
- **Layer 4:** Primary sources (links to actual documents, archives, publications) — 1 click
- **Layer 5:** The rabbit hole (related people, claims, topics) — infinite clicks

Each layer loads independently. You never wait for everything — Layer 0 appears instantly, deeper layers stream in.

#### Quick Actions

For podcasters, researchers, or anyone mid-conversation:

| Command | What It Does |
|---------|-------------|
| `@person [name]` | Pulls up person dossier card |
| `@verse [reference]` | Scripture with original language + translation + parallels |
| `@artifact [name]` | Artifact card with museum link, image, annotations |
| `@compare [A] vs [B]` | Side-by-side comparison of two traditions |
| `@fact [topic]` | Random irrefutable fact from that topic |
| `@debate [claim]` | Advocate vs Skeptic side by side |
| `@network [person]` | Six degrees graph centered on that person |

#### The Mobile Experience

Stack of cards. Swipe up = go deeper. Swipe right = connections. Swipe left = back. Tap any highlighted term = jump to its card. The whole site should feel like shuffling through a deck of intelligence cards.

#### The Share Moment

Every card, dossier, comparison, and timeline view should have one-tap sharing that generates a clean image or link. The share card includes: key fact, source citation, Unraveled branding. Must look good on X, Instagram stories, and iMessage previews. "Look what I found" is how this spreads.

### 9h. Master Watchlists

**Researcher Watchlist:** People whose work we actively monitor.

Categories:
- **Academic scholars** (Tier A) — their new papers go straight to the knowledge base
- **Field researchers** (Tier B) — their findings get Agent Review before inclusion
- **Popular communicators** (Tier C-D) — we track what they claim and fact-check it
- **Known fabricators** (Tier E) — we track their claims specifically to debunk them when they go viral

**Publication Watchlist:** Journals, publishers, and outlets we monitor:
- *Science, Nature, Antiquity, Biblical Archaeology Review, Journal of Near Eastern Studies, Transcultural Psychiatry, American Journal of Archaeology*
- Oxford University Press, Cambridge University Press, Fortress Press, Brill
- New book releases in: comparative mythology, ancient history, archaeology, religious studies, geology

**Topic Watchlist:** Specific searches that run continuously:
- New archaeological discoveries at Göbekli Tepe, Karahan Tepe, and related sites
- New Dead Sea Scrolls publications or re-analysis
- New pyramid discoveries or dating revisions worldwide
- New genetic studies on ancient populations
- New flood geology or paleoclimatology studies
- New translations or analyses of ancient texts in any relevant tradition

---

## 9h. The Vault — Institutional Accountability & Restricted Archives

### The Concept

Some of the most important evidence isn't hidden by conspiracy — it's hidden by bureaucracy, institutional politics, and the passage of time. Museums have basements. Archives have restricted sections. Collections get "lost" during transfers. Records get redacted in later editions. None of this requires a shadowy cabal. It requires only the ordinary machinery of institutions protecting their narratives.

**The Vault** tracks what major institutions are known to hold, what they've restricted, what's gone missing, and what the documented paper trail says. Every entry cites primary documents — not YouTube speculation.

### Institutional Profiles

Each institution gets a living profile:

**What they hold:** Documented collections, catalogs, acquisitions
**What they've published:** Their own reports, papers, exhibition catalogs
**What they've restricted:** Archives with limited access, embargoed materials, items pulled from display
**What's missing:** Items documented as received but never displayed, studied, or accounted for
**The paper trail:** Primary documents showing the chain of custody

### Case Study: The Smithsonian & Giant Skeletal Remains

This is a perfect Advocate/Skeptic case because both sides have real evidence:

**The Advocate's case:**
- The Smithsonian's *own* 12th Annual Report of the Bureau of Ethnology (1894), authored by Cyrus Thomas, documents multiple skeletons measuring 7-8 feet found during official mound excavations. This report is publicly available on Archive.org.
- Specific documented examples include: a 7'6" skeleton with 19" shoulder width at the Great Smith Mound, Kanawha Valley, WV (1883); a skeleton "between 7 and 8 feet" at Dunleith, IL; a 7'3" skeleton at Roane County, TN.
- The Bureau of American Ethnology actively encouraged sending skeletal remains to Washington. Over 18,000 Native American skeletons were collected before NAGPRA (1990).
- Aleš Hrdlička, who became Curator of Anthropology in the 1900s, actively dismissed giant skeleton reports as "amateur" measurements — but no systematic re-measurement study was ever published.
- Later editions of Smithsonian publications appear to have redacted or omitted size descriptions that appeared in earlier editions.
- Multiple newspaper accounts from the 1880s-1920s describe remains being "sent to the Smithsonian" with no subsequent published analysis.

**The Skeptic's case:**
- Hrdlička (1934) argued that "amateur anthropologists" unfamiliar with human anatomy routinely overestimated skeletal height from femur length.
- The "mound builder myth" was a politically motivated narrative used to justify colonization — the Smithsonian was right to debunk it.
- Many newspaper accounts from the era were sensationalized and unreliable.
- 7-7.5 feet is within the range of human variation (tall but not supernatural).
- The 2014 viral claim that "the Smithsonian admitted destroying giant skeletons" was traced to a satire site (World News Daily Report) and debunked by Reuters and AP.
- NAGPRA repatriation may account for some "missing" remains.

**The open questions:**
- Why was no systematic re-measurement study ever conducted on the remains documented in the Bureau's own reports?
- Where specifically are the skeletons documented in the 12th Annual Report today?
- What is in the Smithsonian's undigitized anthropological archives?
- Why do later editions of some reports omit specific measurements that appeared in earlier editions?

**Primary sources (all verifiable):**
- Thomas, Cyrus. "Report on the Mound Explorations of the Bureau of Ethnology." 12th Annual Report, Smithsonian Bureau of Ethnology (1894). Available: archive.org
- Hrdlička, Aleš. Various publications, Smithsonian Physical Anthropology division
- Vieira, J. & Newman, H. *Giants on Record: America's Hidden History, Secrets in the Mounds and the Smithsonian Files* (2015) — catalogs 1,000+ newspaper accounts with source citations

### Case Study: The Vatican Secret Archives (Archivum Secretum Apostolicum Vaticanum)

**What we know they hold:**
- 53 miles (85 km) of shelving containing documents spanning 12 centuries
- Renamed to "Vatican Apostolic Archive" in 2019 (Pope Francis dropped "Secret" to reduce conspiracy speculation)
- Partial catalog published but vast majority remains uncataloged in any public database
- Access requires: a specific research proposal, academic credentials, approval, and you cannot browse — you must request specific documents by name/number

**What's been partially revealed:**
- Pope Leo X's correspondence on Martin Luther
- Records of the Knights Templar trials (released 2007 after 700 years)
- Galileo's trial documents
- Letters between Michelangelo and popes
- Henry VIII's annulment petition (with original wax seal)

**What remains restricted/unknown:**
- Pre-Christian manuscripts and artifacts acquired during the early Church's consolidation of power
- Early Church council records and correspondence about which texts were included/excluded from the biblical canon
- Records of the Church's engagement with non-Christian traditions and texts
- Any documentation related to the Enochic literature and why it was excluded from the Western canon but preserved in Ethiopian Christianity
- Records from the Vatican Observatory (one of the oldest astronomical observatories in the world)

**The open questions:**
- What early manuscripts do they hold that predate the canonical decisions of the Council of Nicaea (325 CE) and Council of Carthage (397 CE)?
- Do they hold any Enochic manuscripts or related Dead Sea Scrolls-era texts?
- What records exist of the deliberations that excluded the Book of Enoch from the Western biblical canon?
- What do they hold from the Library of Alexandria or its successor institutions?

### Other Institutional Profiles to Build

| Institution | What to Track |
|-------------|--------------|
| **British Museum** | Unreturned artifacts, restricted collections, Elgin Marbles precedent, unpublished cuneiform tablets |
| **Egyptian Museum (Cairo)** | Underground storage levels, items seized from private collectors, restricted DNA studies |
| **Iraq Museum (Baghdad)** | Items lost during 2003 looting, items recovered, items still missing, cuneiform tablets |
| **Smithsonian National Museum of Natural History** | Full anthropological collections, NAGPRA repatriation records, Bureau of Ethnology archives |
| **Peru Ministry of Culture** | Paracas skull collections, restricted DNA study access, private collector seizures |
| **Turkish government archaeological authority** | Göbekli Tepe restricted areas (90%+ unexcavated), Karahan Tepe access limitations |
| **Israel Antiquities Authority** | Dead Sea Scrolls publication history (the decades-long access controversy), unpublished fragments |
| **Private Collections** | Hobby Lobby/Museum of the Bible collections (provenance controversies), private archaeological holdings worldwide |

### Private Collections & Undermined Stories

Some of the most important evidence sits in private hands — and some of the most important *absences* of evidence point to institutional decisions to suppress.

**What we track:**
- **Known private collections** with relevant artifacts (with permission/public record)
- **Auction records** for artifacts that passed through public sale
- **Confiscation records** where governments seized items from private collectors
- **Provenance gaps** where artifacts appear to have been deliberately lost or destroyed
- **Whistleblower accounts** from museum staff, archaeologists, or researchers who reported suppression (rated by our credibility system)

**The principle:** We don't assume conspiracy. We document paper trails. When the Smithsonian's 1894 report describes a 7'6" skeleton and no one can locate it today, that's not a theory — that's a gap in the record that deserves an answer.

---

## 9i. External Source Linking & Media Library

### The Philosophy

We are not an island. The best content already exists — in museum databases, YouTube lectures, podcast interviews, documentary footage, and institutional archives. Our job is to be the connective tissue that makes all of it findable, cross-referenced, and contextualized.

### External Source Types

| Source Type | How We Use It | Examples |
|-------------|--------------|---------|
| **Museum databases** | Deep-link to specific artifact pages with our annotation layer | British Museum collection pages (CC BY-NC-SA 4.0), Israel Museum Digital Scrolls, Smithsonian Open Access |
| **YouTube** | Embed or link to specific timestamps in scholarly lectures, documentary segments, and expert interviews | Irving Finkel (British Museum) on the Gilgamesh tablet, academic conference presentations, archaeological site tours |
| **Podcasts** | Link to specific episodes with our transcript excerpts and fact-check overlay | Lex Fridman interviews with relevant scholars, BBC In Our Time episodes on mythology, academic podcast series |
| **Academic repositories** | Link to papers on JSTOR, Google Scholar, Academia.edu, ResearchGate | Ryan & Pitman on Black Sea, Wu et al. in Science, Nickelsburg on 1 Enoch |
| **Digital archives** | Link to primary source scans and manuscripts | Archive.org (Smithsonian Bureau reports), Dead Sea Scrolls Digital Library, Cuneiform Digital Library |
| **Government records** | Link to FOIA results, declassified documents, archaeological survey reports | Bureau of Ethnology annual reports, NAGPRA databases, UNESCO World Heritage documentation |
| **Institutional open access** | Link to museums that have opened their collections digitally | Smithsonian Open Access (3M+ images), Met Open Access, Rijksmuseum, British Museum |

### How External Sources Appear on the Site

Every external source linked from our site gets a **source card** that shows:
- The source title and institution
- A credibility tier rating
- A brief description of what the linked content contains
- Which Unraveled topic(s) it's relevant to
- A timestamp or page reference for the specific relevant section
- Our Advocate and Skeptic notes on the content (where applicable)

### YouTube & Video Integration Rules

Videos are powerful but dangerous — they can carry both brilliant scholarship and complete fabrication in the same format. Rules:

1. **Always cite the speaker, not the channel.** "Irving Finkel, Curator of Cuneiform at the British Museum" not "some British Museum video."
2. **Link to specific timestamps.** Don't link a 3-hour podcast — link to the 4-minute segment where the relevant claim is made.
3. **Rate the speaker** using our Person Credibility system. A Tier A scholar on YouTube gets the same weight as their published paper. A Tier D entertainer gets flagged accordingly.
4. **Never embed without context.** Every video embed on the site includes our annotation: what's being claimed, who's claiming it, and what our Advocate and Skeptic say about it.
5. **Transcript excerpts only.** We never reproduce full transcripts — we excerpt the relevant 2-3 sentences with a link to the full source.

---

## 10. Technical Stack (Planned)

### Public Site
- **Framework:** React (Next.js for SSR/SEO)
- **Styling:** Tailwind CSS + custom CSS variables
- **Animations:** Framer Motion for scroll-triggered animations
- **Maps:** Canvas-based custom renderer (built) + potential Mapbox integration for 3D globe
- **Charts:** Custom SVG/Canvas + Chart.js where appropriate
- **Hosting:** Vercel or Cloudflare Pages
- **CMS:** Headless (Sanity, Strapi, or custom)

### Research Backend
- **Database:** PostgreSQL for structured knowledge base + claims + person profiles
- **Vector Database:** Pinecone or pgvector for semantic/concept search (Omnisearch)
- **Text Search:** Elasticsearch or Meilisearch for full-text keyword search
- **Graph Database:** Neo4j for relationship mapping (traditions → texts → artifacts → people → claims)
- **Embeddings:** Anthropic embeddings for converting all content into searchable concept space
- **AI Integration:** Anthropic API (Claude) for research agents, Advocate/Skeptic analysis, claim extraction, and search intelligence
- **File Storage:** S3-compatible for manuscript images, artifacts, and cached transcripts
- **Auth:** Role-based access for admin/research tools

### Intelligence Engine Infrastructure
- **Crawler orchestration:** Temporal or Airflow for scheduling and managing crawler jobs
- **Transcript pipeline:** Whisper (OpenAI) or AssemblyAI for podcast/video transcription
- **PDF/OCR pipeline:** For extracting text from scanned academic papers and old books
- **Rate limiting & politeness:** Respect robots.txt, rate-limit all crawlers, cache aggressively
- **Claim extraction:** Claude-based structured extraction pipeline — every piece of content produces structured claim objects
- **Person database:** Dedicated table tracking every researcher, author, influencer, and public figure with rolling credibility scores
- **Watchlist scheduler:** Cron-based system running continuous topic and person monitoring queries
- **Alert system:** Flags high-priority findings for immediate human review (e.g., new Tier 1 publication on a core topic)

### Research Backend
- **Database:** PostgreSQL for structured knowledge base
- **Vector Database:** Pinecone or pgvector for semantic/concept search (Omnisearch)
- **Text Search:** Elasticsearch or Meilisearch for full-text keyword search
- **Embeddings:** Anthropic or OpenAI embeddings — every scripture passage, artifact description, and scholarly note gets embedded into searchable concept space
- **Graph Database:** Neo4j or similar for mapping relationships between all entities (traditions → texts → artifacts → sites → topics)
- **AI Integration:** Anthropic API for research agents, Advocate/Skeptic analysis, and search intelligence
- **File Storage:** S3-compatible for manuscript images and artifacts
- **Auth:** Role-based access for admin/research tools

### Omnisearch Infrastructure
- **Multi-index:** Separate indices for scriptures, artifacts, traditions, scholarly sources, convergence points — searched simultaneously, results merged and ranked
- **Autocomplete:** Trained on the knowledge base to suggest conceptually related searches
- **Connection pathfinding:** Graph queries that find the shortest path between any two concepts

### Community / Submissions ("The Signal")
- **Submission queue:** Managed through admin tool with status tracking visible to submitters
- **Auto-screening:** Spam/off-topic filter layer before human review
- **Public feed:** Screened submissions visible to community with upvote mechanism
- **User profiles:** Track record system for repeat quality contributors ("Verified Signal" status)
- **Notifications:** Email/in-app status updates for submitters

### Admin Tool
- **Framework:** React + internal component library
- **Pipeline:** Kanban board (custom or Notion-style)
- **Agent Interface:** Chat-based task assignment with structured output

---

## 11. Development Roadmap

### Phase 1 — Foundation (Current)
- [x] Design language established
- [x] Flood timeline with academic citations
- [x] Scripture side-by-side comparisons
- [x] Narrative taxonomy
- [x] Narrative spread map with time slider
- [x] Source library with primary texts
- [x] Manuscript image references
- [x] Master design document
- [ ] Structure comparison matrix
- [ ] Steelman both sides toggle

### Phase 2 — Depth & Search
- [ ] Omnisearch prototype (concept search across knowledge base)
- [ ] Deep dive page template
- [ ] Nephilim full topic build-out with jaw-drop layers
- [ ] Pyramids full topic build-out with jaw-drop layers
- [ ] Biblically Accurate Angels convergence point
- [ ] Artifact viewer with annotated images
- [ ] Connection web visualization
- [ ] Admin tool prototype

### Phase 3 — Scale & Community
- [ ] All 10 topics built out
- [ ] Research agent system operational
- [ ] Knowledge base with 500+ entries
- [ ] "The Signal" — idea submission system (public)
- [ ] Submission review pipeline (admin)
- [ ] 3D globe mode
- [ ] Audio layer for ancient languages

### Phase 4 — Growth
- [ ] Public launch
- [ ] Community Signal board with upvoting
- [ ] Verified contributor system
- [ ] Reading list generator
- [ ] Newsletter / update system
- [ ] Podcast or video companion content
- [ ] API for researchers to query the knowledge base

---

## 12. Guiding Principles

1. **Let the data be strange on its own.** The design's job is to get out of the way and let the patterns speak.
2. **Cite everything.** If it can't be cited, it doesn't get published.
3. **Respect every tradition.** A Sumerian poet, a K'iche' Maya elder, and a Chinese court historian are all doing different things — all deserve equal rigor.
4. **Both sides at full strength.** The Advocate builds the best case for the pattern. The Skeptic builds the best case against it. Neither wins. The audience decides.
5. **No editorial verdicts.** The site never tells the audience what to believe. It presents the strongest arguments on both sides and the unresolved questions between them.
6. **Primary texts are first-class sources.** The KJV, the Gilgamesh tablets, the Vedas — these aren't commentary. They're the evidence.
7. **Show your work.** Every convergence score, every connection, every claim — the methodology is transparent.
8. **Build for the rabbit hole.** Every click should lead somewhere deeper. Every source should open a door.
9. **Never sensationalize.** The content is wild enough. Understate the presentation and let intelligence do the work.
10. **Lazy dismissal is as dishonest as lazy belief.** "It's just a myth" is not an explanation. "Therefore aliens" is not an explanation. Both require the same rigor of evidence and argument.
11. **The tension is the point.** The unresolved questions — where neither the Advocate nor the Skeptic can fully close the case — are the most valuable content on the site. That's where genuine inquiry lives.

---

*This is a living document. Updated as the project evolves.*
