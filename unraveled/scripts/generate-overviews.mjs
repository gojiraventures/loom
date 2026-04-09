/**
 * Generates plain-language Overview content for all topics that don't have it yet.
 * Runs directly against Supabase + Anthropic — no HTTP auth needed.
 *
 * Usage: node scripts/generate-overviews.mjs
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content editor rewriting academic research summaries into accessible, plain-language Overview pages for a general audience.

Your output will be read on a phone by someone who just discovered this topic on a podcast. They are curious and smart, but they are not academics.

Voice target: Smart friend explaining it at a bar. They know the material cold, talking to someone new to it.

RULES:

OVERVIEW SUMMARY — 3 paragraphs, 120-180 words total:
- Paragraph 1 (2-3 sentences): The question in plain English, "we" voice. Start with what the reader wonders.
- Paragraph 2 (3-4 sentences): The surprising answer. Most counterintuitive finding, stated plainly. No hedging.
- Paragraph 3 (1-2 sentences): The "wait, what?" hook — the single most compelling piece of evidence.
- Max sentence length: 20 words. Break compounds into simple sentences.
- BANNED: "systematic analysis", "yields a conclusion", "cross-disciplinary", "it should be noted", "the evidence suggests", hedging chains.

ADVOCATE TEASER — 2-3 sentences only:
- Single strongest claim for significance. Ends with impact, not hedging.

SKEPTIC TEASER — 2-3 sentences only:
- Single strongest objection. Ends with a doubt that lingers.

Both teasers together should leave the reader feeling: both sides have a point, I need to read the full debate.

EVIDENCE EXPLANATIONS — for each of the top 3 findings, 2-3 sentences (~40-60 words):
- Plain language. Why does this matter? What should the reader understand about it?
- Not a copy of the finding — an accessible explanation of it.`;

async function generateOverview(topic, title, output, quickBrief) {
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
  "overview_summary": "3 paragraphs separated by \\n\\n. 120-180 words. Plain language.",
  "overview_advocate_summary": "2-3 sentences. Strongest claim. Creates tension.",
  "overview_skeptic_summary": "2-3 sentences. Strongest doubt. Creates tension.",
  "overview_findings": ["Explanation for Finding 1 (2-3 sentences)", "Explanation for Finding 2", "Explanation for Finding 3"]
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1500,
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
    .select('topic, title, synthesized_output, quick_brief, overview_summary')
    .not('synthesized_output', 'is', null);

  if (error) throw error;

  const pending = dossiers.filter(d => !d.overview_summary);
  console.log(`Found ${pending.length} topics needing overview generation.\n`);

  for (const d of pending) {
    process.stdout.write(`  Generating: ${d.title.slice(0, 65)}... `);
    try {
      const parsed = await generateOverview(d.topic, d.title, d.synthesized_output, d.quick_brief);

      const { error: updateErr } = await supabase
        .from('topic_dossiers')
        .update({
          overview_summary: parsed.overview_summary,
          overview_advocate_summary: parsed.overview_advocate_summary,
          overview_skeptic_summary: parsed.overview_skeptic_summary,
          overview_findings: parsed.overview_findings ?? null,
        })
        .eq('topic', d.topic);

      if (updateErr) throw updateErr;
      console.log('✓');
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
