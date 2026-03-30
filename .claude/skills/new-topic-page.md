---
name: new-topic-page
description: Create a full deep dive topic page with jaw-drop layers, scripture comparisons, advocate/skeptic cases, and sources
user_invocable: true
---

# New Topic Page

Create a deep dive page for: $ARGUMENTS

Create the page at `/src/app/topics/[slug]/page.tsx`.

## Required Sections

1. **Hero** — Title, jaw-drop subtitle stat, convergence score badge, evidence type tags (Textual, Archaeological, Geological, Oral Tradition)

2. **Jaw-Drop Layers** — Progressive scroll reveal:
   - Layer 1 "The Assumption" — what most people believe
   - Layer 2 "The First Crack" — the fact that challenges it
   - Layer 3 "The Deeper Pattern" — cross-cultural or physical evidence
   - Layer 4 "The Open Question" — what neither side can explain

3. **Scripture Side-by-Side** — Interactive comparison showing the same event across traditions. Each passage: tradition name, source reference, original language text, English translation, framing notes. Tab or toggle between traditions.

4. **Shared Elements Matrix** — Visual grid: shared elements (rows) x traditions (columns), checkmarks where present. Makes structural specificity undeniable at a glance.

5. **The Advocate's Case** — Strongest argument FOR a common source/pattern. Sourced, cited, specific. Use steelman framing.

6. **The Skeptic's Case** — Strongest argument AGAINST. Equally sourced, cited, specific. Mainstream scholarly explanations with citations.

7. **Open Questions** — Specific, answerable questions that neither side has resolved. These are the most valuable items.

8. **Sources** — Every citation on this page, organized by type: Sacred Texts, Academic Papers, Archaeological Reports, Museum Collections

## Content Rules

- Reference `/docs/UNRAVELED-Design-Document-v10.md` for topic data, jaw-drop facts, and source lists
- Hardcode content directly in the page component (we'll move to Supabase later)
- Every claim cites a source. Every source links to the original work.
- This page IS the product — make it beautiful, credible, and shareable
- Include proper metadata: title, description, OG tags, JSON-LD (Article + FAQPage)
- Add FAQ section with 5-6 common questions for GEO optimization
