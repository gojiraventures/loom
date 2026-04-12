/**
 * Regenerates the full overview (summary + all connective tissue fields) for every topic.
 * Overwrites existing overview content with the improved prompt.
 *
 * Usage: node scripts/regenerate-all-overviews.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '../.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content editor rewriting academic research summaries into compelling, plain-language article pages for a general audience.

Your output will be read by someone who just discovered this topic on a podcast. They are curious and smart, but not academics. The page should read like a well-crafted magazine article, not a research dashboard.

Voice target: Smart friend explaining it at a bar. They know the material cold. They're talking to someone new to it.

RULES:

OVERVIEW SUMMARY — 3 paragraphs, 120-180 words total:
- Paragraph 1 (2-3 sentences): The question in plain English, "we" voice. Start with what the reader wonders.
- Paragraph 2 (3-4 sentences): The surprising answer. Most counterintuitive finding, stated plainly. No hedging.
- Paragraph 3 (1-2 sentences): OPEN A QUESTION — do NOT answer it. Leave the reader feeling there is something deeper they need to understand. End on genuine uncertainty or a surprising discovery that demands explanation. NEVER end paragraph 3 with a conclusion or verdict. The reader should finish the summary wanting to know what the evidence actually shows.
  BAD: "The myth has a clear paper trail. It leads back to fiction." (resolved — kills curiosity)
  GOOD: "But the government was building something in secret at the exact same time. What that says about what else might have been hidden is the question the evidence keeps raising."
- Max sentence length: 20 words. Break compounds into simple sentences.
- BANNED: "systematic analysis", "yields a conclusion", "cross-disciplinary", "it should be noted", "the evidence suggests", hedging chains.

NARRATIVE BRIDGE (1-2 sentences):
- First sentence of the evidence section. Flows directly after the summary.
- Topic-specific pivot from "big picture" to "here's what the research found."
- NOT: "Here is what the evidence shows." — YES: "The myth is traceable to exact sources. Here's the paper trail."

FINDING CONNECTORS (exactly 2 phrases, JSON array):
- [0] = transition from Finding 1 to Finding 2 (max 15 words)
- [1] = transition from Finding 2 to Finding 3 (max 15 words)
- Create forward momentum and escalation.
  GOOD: ["That alone is strange. But the documentation makes it stranger.", "And then there's the piece that has no clean explanation."]
  BAD: ["Here is another finding.", "The following evidence is also relevant."]

DEBATE INTRO (1-2 sentences MAX):
- Both sides have something real. Creates genuine intellectual uncertainty.
  BAD: "Here are two perspectives." — GOOD: "The debunking case is strong. The anomalies are also real. That combination is the actual problem."

ADVOCATE TEASER — 2-3 sentences:
- Single strongest claim for significance. Ends with impact.

SKEPTIC TEASER — 2-3 sentences:
- Single strongest objection. Ends with a doubt that lingers.

SECTION TRANSITIONS (exactly 2 strings, JSON array):
- [0] = 1-2 sentences bridging FROM the evidence section INTO the debate section.
  Should feel like the natural next sentence after the last finding — not a label, a continuation.
  BAD: "Now here is the debate." GOOD: "That evidence sharpens the question rather than answering it. Reasonable people look at the same findings and reach opposite conclusions."
- [1] = 1-2 sentences bridging FROM the debate section INTO the cultural perspectives section.
  BAD: "Here is how different cultures see it." GOOD: "That split is not new. Communities across history have been circling this same question from angles that have almost nothing in common."

EVIDENCE EXPLANATIONS — for each of the top 3 findings, 2-3 sentences (~40-60 words):
- Plain language. Why does this matter? Accessible explanation, not a copy of the finding.

ORIGIN CONTEXT (150-300 words, two or three short paragraphs maximum):
- Appears immediately after the "What This Is About" hook, before the evidence section.
- Purpose: Give a curious newcomer enough background to understand why this story exists and why it matters -- in under 40 seconds. Experienced readers should feel the piece is sharper and more authoritative, not padded.
- Tone: Identical to the rest of the piece. Calm, evidence-first, slightly wry. Never sensational or conspiratorial.
- Content structure:
  1. The historical or situational setup: What was the original event, program, discovery, or phenomenon? When and why did it happen? Who were the key players and what was the official goal?
  2. Only the minimal essential context a smart first-time reader needs. No padding. No lecturing.
  3. Bridge naturally into the central tension or mystery the article explores (the myth vs. documented reality, the secrecy gap, the contradiction, etc.).
  4. End with a smooth transition sentence that flows directly into the evidence section.
- Do NOT repeat anything already stated in the hook/summary or in the title.
- Writing rules: Varied sentence structures. No em dashes or en dashes. Sound human, not AI-generated. Max 20 words per sentence.
- Quality gate: A complete newcomer instantly "gets it." An expert reader feels zero padding or lecturing. The title should land with noticeably more weight after reading this section.
- Return null if the existing hook already provides full origin context and adding more would only repeat or pad.`;

async function generateFull(title, output, quickBrief) {
  const top3 = (output.jaw_drop_layers || []).slice(0, 3);

  const userPrompt = `Topic: "${title}"

RESEARCH SUMMARY (rewrite in plain language — don't copy):
${output.executive_summary}

QUICK BRIEF:
${quickBrief || '(none)'}

ADVOCATE CASE (extract single strongest claim):
${output.advocate_case}

SKEPTIC CASE (extract single strongest objection):
${output.skeptic_case}

TOP 3 FINDINGS (write plain-language explanations):
${top3.map((l, i) => `Finding ${i + 1}: "${l.title}"\nDetail: ${l.content}`).join('\n\n')}

Return ONLY valid JSON, no markdown:
{
  "overview_summary": "3 paragraphs separated by \\n\\n. 120-180 words. Para 3 opens a question, does NOT resolve it.",
  "narrative_bridge": "1-2 sentences. Topic-specific pivot from summary into the evidence section.",
  "overview_findings": ["Explanation for Finding 1 (2-3 sentences)", "Explanation for Finding 2", "Explanation for Finding 3"],
  "finding_connectors": ["Transition Finding 1 to 2 (max 15 words)", "Transition Finding 2 to 3 (max 15 words)"],
  "debate_intro": "1-2 sentences. Both sides have something real. Genuine uncertainty.",
  "section_transitions": ["1-2 sentences evidence → debate. Continuation not a label.", "1-2 sentences debate → cultural perspectives. Different traditions, same question."],
  "overview_advocate_summary": "2-3 sentences. Strongest claim. Creates tension.",
  "overview_skeptic_summary": "2-3 sentences. Strongest doubt. Creates tension.",
  "origin_context": "150-300 words. Two or three paragraphs. Historical setup, minimal context, bridge to central tension. Null if hook already provides full context."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const cleaned = raw.replace(/^```json\n?/i, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

async function main() {
  const { data: dossiers, error } = await supabase
    .from('topic_dossiers')
    .select('topic, title, synthesized_output, quick_brief')
    .not('synthesized_output', 'is', null)
    .order('title');

  if (error) throw error;

  console.log(`Regenerating overviews for ${dossiers.length} topics.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const d of dossiers) {
    process.stdout.write(`  [${succeeded + failed + 1}/${dossiers.length}] ${d.title.slice(0, 60)}... `);
    try {
      const parsed = await generateFull(d.title, d.synthesized_output, d.quick_brief);

      const { error: updateErr } = await supabase
        .from('topic_dossiers')
        .update({
          overview_summary:           parsed.overview_summary,
          narrative_bridge:           parsed.narrative_bridge ?? null,
          overview_findings:          parsed.overview_findings ?? null,
          finding_connectors:         parsed.finding_connectors ?? null,
          debate_intro:               parsed.debate_intro ?? null,
          section_transitions:        parsed.section_transitions ?? null,
          overview_advocate_summary:  parsed.overview_advocate_summary,
          overview_skeptic_summary:   parsed.overview_skeptic_summary,
          origin_context:             parsed.origin_context ?? null,
        })
        .eq('topic', d.topic);

      if (updateErr) throw updateErr;
      console.log('✓');
      succeeded++;
    } catch (err) {
      console.log(`✗  ${err.message}`);
      failed++;
    }

    // Brief pause between calls
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
