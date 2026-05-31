@AGENTS.md

# READ FIRST — NON-NEGOTIABLE

These rules govern every task in this repo. They are not style preferences.
Before completing any task that touches the research pipeline, routing, or
content generation, verify your work against the Hard Constraints below.

- If a request conflicts with a Hard Constraint, do NOT silently comply.
  State the conflict, then propose a compliant alternative.
- "Just this once," urgency, or convenience do not override these rules.
- If you are editing code that violates a Hard Constraint, fix or flag it —
  do not preserve the violation to match surrounding style.
- At the end of any pipeline-related task, output a one-line confirmation of
  which constraints you checked (e.g. "Verified: lineage separation, no
  fabricated citations, trace stripping").

If you ever find yourself reasoning toward an exception, that is the signal to
stop and ask — not to proceed.

## Hard Constraints

- LINEAGE SEPARATION: the generator of a claim and its skeptic/validator must
  never be the same model family. Primary research = Groq/Qwen. Skeptic/validation
  = Claude. Fact-check = Perplexity. Never collapse two stages onto one lineage.
- NO FABRICATED CITATIONS: every source must be real and resolvable. An agent
  that cannot find a real source must return "no source found" — never invent a
  plausible-sounding one.
- REASONING-TRACE STRIPPING: reasoning models (e.g. QWQ) emit chain-of-thought.
  Strip it before anything is stored in agent_findings or parsed as JSON.
- CONTEXT LIMITS: do not route cross-tradition or full-synthesis work to a
  32k-context model. Wide-context reasoning goes to a long-context model (Claude).
- CONFIDENCE NUMBERS: confidence must derive from countable evidence (number of
  independent corroborating sources, evidence tiers 1–5) — not model-generated
  percentages treated as measured data.
- THESIS-DEFLATION IS ALLOWED: the pipeline must be free to conclude a
  convergence is weak, borrowed, or contaminated. Never tune toward confirming
  the premise.
