/**
 * Backfills narrative_bridge, finding_connectors, and debate_intro for all existing topics
 * that already have overview_summary but are missing the connective tissue fields.
 *
 * Does NOT overwrite overview_summary, overview_findings, advocate/skeptic summaries.
 *
 * Usage: node scripts/backfill-connective-tissue.mjs
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a content editor adding connective tissue to research article pages.

You will receive an existing overview for a research topic — the summary, the three key findings, and the advocate/skeptic debate summaries. Your job is to write three short pieces of editorial glue that make the page read as a continuous article rather than disconnected sections.

Voice: Smart journalist. Short sentences. Active voice. Specific to the topic — never generic filler.`;

async function generateConnectiveTissue(title, overviewSummary, overviewFindings, finding1Title, finding2Title, finding3Title, advocateSummary, skepticSummary) {
  const userPrompt = `Topic: "${title}"

EXISTING OVERVIEW SUMMARY (do not rewrite — write connective tissue that flows from this):
${overviewSummary}

THE THREE FINDINGS (titles only, for context):
1. ${finding1Title}
2. ${finding2Title}
3. ${finding3Title}

FINDING EXPLANATIONS (what users will read under each finding):
1. ${overviewFindings[0] ?? '(none)'}
2. ${overviewFindings[1] ?? '(none)'}
3. ${overviewFindings[2] ?? '(none)'}

ADVOCATE SUMMARY: ${advocateSummary ?? '(none)'}
SKEPTIC SUMMARY: ${skepticSummary ?? '(none)'}

---

Write exactly these three pieces. Return ONLY valid JSON, no markdown:

{
  "narrative_bridge": "1-2 sentences that flow directly after the overview summary and open the door to the evidence. Topic-specific. Pivots from big picture to specific findings. NOT generic. Example: 'The myth is traceable to exact sources. Here is the paper trail.' or 'The straightforward explanation has a real problem. Here is what the data says.'",
  "finding_connectors": [
    "Transition from Finding 1 to Finding 2. Max 15 words. Creates forward momentum. Signals escalation.",
    "Transition from Finding 2 to Finding 3. Max 15 words. Raises the stakes further."
  ],
  "debate_intro": "1-2 sentences MAX that set up the two-sided debate. Both sides have something real. Creates genuine intellectual uncertainty — the reader should not know which side is right. NOT: 'Here are two perspectives.' YES: 'The debunking case is strong. The anomalies are also real. That combination is the actual problem.'"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 600,
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
    .select('topic, title, synthesized_output, overview_summary, overview_findings, overview_advocate_summary, overview_skeptic_summary, narrative_bridge')
    .not('overview_summary', 'is', null);

  if (error) throw error;

  // Only process topics missing the new connective tissue fields
  const pending = dossiers.filter(d => !d.narrative_bridge);
  console.log(`Found ${pending.length} topics needing connective tissue backfill.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const d of pending) {
    process.stdout.write(`  ${d.title.slice(0, 60)}... `);
    try {
      const output = d.synthesized_output;
      const layers = (output?.jaw_drop_layers || []).slice(0, 3);
      const findings = /** @type {string[]} */ (d.overview_findings ?? []);

      const parsed = await generateConnectiveTissue(
        d.title,
        d.overview_summary,
        findings,
        layers[0]?.title ?? 'Finding 1',
        layers[1]?.title ?? 'Finding 2',
        layers[2]?.title ?? 'Finding 3',
        d.overview_advocate_summary,
        d.overview_skeptic_summary,
      );

      const { error: updateErr } = await supabase
        .from('topic_dossiers')
        .update({
          narrative_bridge: parsed.narrative_bridge ?? null,
          finding_connectors: parsed.finding_connectors ?? null,
          debate_intro: parsed.debate_intro ?? null,
        })
        .eq('topic', d.topic);

      if (updateErr) throw updateErr;
      console.log('✓');
      succeeded++;
    } catch (err) {
      console.log(`✗  ${err.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone. ${succeeded} succeeded, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
