---
name: research-agent
description: Run a research query through the Advocate/Skeptic pipeline — finds primary sources, fact-checks claims, builds both cases
user_invocable: true
---

# Research Agent

Research for Unraveled.ai: $ARGUMENTS

## Process

1. **Frame the question** — State the specific factual question being investigated

2. **Find primary sources** — Prioritize in this order:
   - Sacred texts (Genesis, Gilgamesh, Vedas, Quran, Enoch, Popol Vuh)
   - Peer-reviewed journals (Science, JSTOR, university press)
   - Museum databases (British Museum, Smithsonian, Israel Museum)
   - Archaeological reports and excavation records
   - Archive.org for historical documents
   - Skip Wikipedia, blogs, YouTube unless citing a primary source

3. **Extract claims** — Each numbered with:
   - The specific claim
   - Source author + title + year
   - Credibility tier: A (peer-reviewed), B (credentialed researcher), C (informed commentator), D (entertainer), E (fabricator)
   - Evidence type: textual, archaeological, geological, genetic, oral tradition, iconographic

4. **Build the Advocate's case** — Steelman the argument FOR the convergence pattern. Use only Tier A-C sources. Identify gaps in mainstream explanations.

5. **Build the Skeptic's case** — Steelman the mainstream explanation. Equally rigorous. Specific alternative explanations with citations.

6. **Flag open questions** — What neither side can fully explain. These are the most valuable findings.

## Output Format

```
## Summary
[2-3 sentence overview]

## Claims
1. [Claim] — Source (Tier X, evidence type)
2. ...

## Advocate's Case
[Paragraph with citations]

## Skeptic's Case
[Paragraph with citations]

## Open Questions
- [Specific, answerable question]
- ...

## Sources
- [Full citation with URL where available]
```
