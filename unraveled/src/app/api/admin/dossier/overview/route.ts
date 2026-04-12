/**
 * POST /api/admin/dossier/overview
 * Generates plain-language Overview content for a topic using Claude.
 * Writes to: overview_summary, overview_advocate_summary, overview_skeptic_summary,
 *            overview_findings, narrative_bridge, finding_connectors, debate_intro
 *
 * Body: { topic: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import type { SynthesizedOutput } from '@/lib/research/types';

export const maxDuration = 120;

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a content editor rewriting academic research summaries into compelling, plain-language article pages for a general audience.

Your output will be read by someone who just discovered this topic on a podcast. They are curious and smart, but not academics. The page should read like a well-crafted magazine article, not a research dashboard.

Voice target: Smart friend explaining it at a bar. They know the material cold. They're talking to someone new to it.

RULES — apply without exception:

OVERVIEW SUMMARY (3 paragraphs, 120-180 words total):
- Paragraph 1 (2-3 sentences): The question in plain English, "we" voice. Start with what the reader is wondering.
  BAD: "A systematic cross-disciplinary analysis of flood narratives..."
  GOOD: "Dozens of cultures that never met each other all remember a world-ending flood. We wanted to know why."
- Paragraph 2 (3-4 sentences): The surprising answer. Most counterintuitive finding, stated plainly. No hedging.
  BAD: "yields a conclusion that is both more modest and more significant..."
  GOOD: "There was no single global flood. The geology is clear on that. But the real story is stranger."
- Paragraph 3 (1-2 sentences): OPEN A QUESTION — do NOT answer it. Leave the reader feeling there is something deeper they need to understand. End on genuine uncertainty or a surprising discovery that demands explanation. NEVER end paragraph 3 with a conclusion or verdict. The reader should finish the summary wanting to know what the evidence actually shows.
  BAD: "The myth has a clear paper trail. It leads back to fiction every single time." (resolved — kills curiosity)
  GOOD: "But the government was building something in secret at the exact same time. What that says about what else might have been hidden is the question the evidence keeps raising."
- Max sentence length: 20 words. Break every compound sentence into two simple ones.
- BANNED: "systematic analysis", "yields a conclusion", "it should be noted", "the evidence suggests", "cross-disciplinary", em dashes (—), en dashes (–), hedging chains. Use hyphens (-) or rewrite.

NARRATIVE BRIDGE (1-2 sentences):
- This is the first sentence of the evidence section. It flows directly after the summary.
- Its job: pivot from "big picture" to "here's what the research actually found."
- Must be topic-specific — reference what the summary just established, then open the door to the evidence.
- Active voice. Short sentences.
- NOT generic: "Here is what the evidence shows." (useless)
- YES specific: "The myth is traceable to exact sources. Here's the paper trail." or "The straightforward explanation has a real problem. Here's what the data actually says."

FINDING CONNECTORS (exactly 2 short phrases, JSON array):
- [0] = transition from Finding 1 to Finding 2
- [1] = transition from Finding 2 to Finding 3
- Maximum 15 words each. These create forward momentum, not summaries.
- They should escalate — each connector signals the next finding raises the stakes of the previous one.
- Should feel like connective tissue in longform journalism.
  GOOD: ["That alone is strange. But the documentation makes it stranger.", "And then there's the piece that has no clean explanation."]
  GOOD: ["What makes that harder to dismiss is what came next.", "The third finding changes how you read both of the others."]
  BAD: ["Here is another finding.", "The following evidence is also relevant."]

DEBATE INTRO (1-2 sentences MAX):
- Sets up the two-sided debate that follows.
- Both sides have something real — signal this without giving either an edge.
- Creates intellectual discomfort, not resolution. The reader should feel genuinely uncertain which side is right.
  BAD: "Here are two perspectives on this topic." (product label, not editorial)
  GOOD: "The debunking case is strong. The anomalies are also real. That combination is the actual problem."
  GOOD: "Both sides start from the same facts and reach opposite conclusions. That is not a rhetorical trick — it is the honest state of the evidence."

ADVOCATE TEASER (2-3 sentences only):
- State the single strongest claim for significance being real.
- End with impact. The reader should feel the weight of the argument.
- Do NOT build a full argument. Create tension.

SKEPTIC TEASER (2-3 sentences only):
- State the single strongest objection or alternative explanation.
- End with the doubt that lingers.
- Do NOT build a full counter-argument. Create doubt.

Both teasers together should leave the reader feeling: both sides have a point, I need to read the full debate.

SECTION TRANSITIONS (exactly 2 strings, JSON array):
- [0] = 1-2 sentences bridging FROM the evidence section INTO the debate section.
  The findings just showed the reader something specific. This explains why smart people still disagree about what it means.
  Should feel like the natural next sentence after the last finding — not a label, a continuation.
  BAD: "Now here is the debate." GOOD: "That evidence sharpens the question rather than answering it. Reasonable people look at the same findings and reach opposite conclusions."
  GOOD: "The paper trail is specific. But what it proves depends entirely on which question you are asking."

- [1] = 1-2 sentences bridging FROM the debate section INTO the cultural perspectives section.
  Signals this disagreement runs deeper than the modern debate — different traditions have held this question in fundamentally different ways.
  BAD: "Here is how different cultures see it." GOOD: "That split is not new. Communities across history have been circling this same question from angles that have almost nothing in common."
  GOOD: "The academic argument is one version of this. Other traditions arrived at the same place by completely different roads."`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { topic?: string };
  if (!body.topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('title, synthesized_output, quick_brief')
    .eq('topic', body.topic)
    .single();

  if (error || !dossier) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;
  if (!output) return NextResponse.json({ error: 'No synthesized output' }, { status: 422 });

  const top3Layers = output.jaw_drop_layers.slice(0, 3);

  const userPrompt = `Topic: "${dossier.title}"

DEEP DIVE RESEARCH SUMMARY (source material - rewrite, don't copy):
${output.executive_summary}

QUICK BRIEF (may overlap with summary):
${(dossier.quick_brief as string | null) ?? '(none)'}

ADVOCATE CASE (full version - extract the single strongest claim only):
${output.advocate_case}

SKEPTIC CASE (full version - extract the single strongest objection only):
${output.skeptic_case}

TOP 3 EVIDENCE FINDINGS (for each, write a plain-language 2-3 sentence explanation):
${top3Layers.map((l, i) => `Finding ${i + 1}: "${l.title}"\nFull content: ${l.content}`).join('\n\n')}

---

Write all sections below. Return ONLY valid JSON, no markdown:

{
  "overview_summary": "3 paragraphs separated by \\n\\n. 120-180 words total. Para 1: the question in plain language, we voice. Para 2: the surprising answer stated plainly. Para 3: OPENS a question, does NOT resolve it — leaves the reader wanting to see the evidence.",
  "narrative_bridge": "1-2 sentences. Topic-specific pivot from the summary into the evidence. References what the summary established. Creates forward momentum.",
  "overview_findings": ["Plain-language explanation for Finding 1 (2-3 sentences, ~40-60 words)", "Plain-language explanation for Finding 2 (2-3 sentences, ~40-60 words)", "Plain-language explanation for Finding 3 (2-3 sentences, ~40-60 words)"],
  "finding_connectors": ["Transition from Finding 1 to Finding 2 (max 15 words)", "Transition from Finding 2 to Finding 3 (max 15 words)"],
  "debate_intro": "1-2 sentences MAX. Both sides have something real. Creates genuine uncertainty without telegraphing a winner.",
  "section_transitions": ["1-2 sentences bridging evidence into debate. Continuation, not a label.", "1-2 sentences bridging debate into cultural perspectives. Different traditions, same question."],
  "overview_advocate_summary": "2-3 sentences max. The single strongest claim for significance. Ends with impact, not hedging.",
  "overview_skeptic_summary": "2-3 sentences max. The single strongest objection. Ends with a doubt that lingers."
}`;

  let rawText = '';
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  } catch (err) {
    return NextResponse.json({ error: `Claude failed: ${String(err)}` }, { status: 500 });
  }

  let parsed: {
    overview_summary: string;
    narrative_bridge: string;
    overview_findings: string[];
    finding_connectors: string[];
    debate_intro: string;
    section_transitions: string[];
    overview_advocate_summary: string;
    overview_skeptic_summary: string;
  };

  try {
    const cleaned = rawText.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: rawText }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from('topic_dossiers')
    .update({
      overview_summary: parsed.overview_summary,
      narrative_bridge: parsed.narrative_bridge ?? null,
      overview_findings: parsed.overview_findings ?? null,
      finding_connectors: parsed.finding_connectors ?? null,
      debate_intro: parsed.debate_intro ?? null,
      section_transitions: parsed.section_transitions ?? null,
      overview_advocate_summary: parsed.overview_advocate_summary,
      overview_skeptic_summary: parsed.overview_skeptic_summary,
    })
    .eq('topic', body.topic);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    topic: body.topic,
    overview_summary: parsed.overview_summary,
    narrative_bridge: parsed.narrative_bridge ?? null,
    overview_findings: parsed.overview_findings ?? [],
    finding_connectors: parsed.finding_connectors ?? [],
    debate_intro: parsed.debate_intro ?? null,
    overview_advocate_summary: parsed.overview_advocate_summary,
    overview_skeptic_summary: parsed.overview_skeptic_summary,
  });
}
