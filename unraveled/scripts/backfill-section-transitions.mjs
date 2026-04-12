/**
 * Backfills section_transitions for all existing topics.
 * Does NOT overwrite any other overview fields.
 *
 * Usage: node scripts/backfill-section-transitions.mjs
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

const SYSTEM_PROMPT = `You are a content editor adding two transitional sentences to research article pages.

The page has three sections: Evidence, Debate, and Cultural Perspectives. You write two short bridges — one carrying the reader from the Evidence section into the Debate, one carrying them from the Debate into the Cultural Perspectives.

Voice: Smart journalist. Short sentences. Specific to the topic — never generic filler.

Rules:
- Transition [0] (evidence → debate): Should feel like the natural next sentence after the last finding. Not a label. A continuation that explains why the evidence doesn't settle the argument.
  BAD: "Now here is the debate." GOOD: "That evidence sharpens the question rather than answering it. Reasonable people look at the same findings and reach opposite conclusions."
- Transition [1] (debate → cultures): Signals the disagreement is older and wider than the modern academic argument.
  BAD: "Here is how different cultures see it." GOOD: "That split is not new. Communities across history have been circling this same question from angles that have almost nothing in common."`;

async function generate(title, overviewSummary, findings, advocateSummary, skepticSummary) {
  const userPrompt = `Topic: "${title}"

OVERVIEW SUMMARY:
${overviewSummary}

THREE KEY FINDINGS (what the evidence section covers):
${(findings || []).map((f, i) => `${i + 1}. ${f}`).join('\n')}

ADVOCATE SUMMARY: ${advocateSummary ?? '(none)'}
SKEPTIC SUMMARY: ${skepticSummary ?? '(none)'}

---

Return ONLY valid JSON, no markdown:
{
  "section_transitions": [
    "1-2 sentences bridging evidence into debate. Continuation, not a label. Specific to this topic.",
    "1-2 sentences bridging debate into cultural perspectives. Signals the question is older and wider than the modern argument."
  ]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 300,
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
    .select('topic, title, overview_summary, overview_findings, overview_advocate_summary, overview_skeptic_summary, section_transitions')
    .not('overview_summary', 'is', null)
    .order('title');

  if (error) throw error;

  const pending = dossiers.filter(d => !d.section_transitions);
  console.log(`Found ${pending.length} topics needing section transitions.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const d of pending) {
    process.stdout.write(`  [${succeeded + failed + 1}/${pending.length}] ${d.title.slice(0, 60)}... `);
    try {
      const parsed = await generate(
        d.title,
        d.overview_summary,
        d.overview_findings,
        d.overview_advocate_summary,
        d.overview_skeptic_summary,
      );

      const { error: updateErr } = await supabase
        .from('topic_dossiers')
        .update({ section_transitions: parsed.section_transitions })
        .eq('topic', d.topic);

      if (updateErr) throw updateErr;
      console.log('✓');
      succeeded++;
    } catch (err) {
      console.log(`✗  ${err.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
