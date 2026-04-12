/**
 * Backfills origin_context for all topics that don't have it yet.
 * Does NOT overwrite any other overview fields.
 *
 * Usage: node scripts/backfill-origin-context.mjs
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

const SYSTEM_PROMPT = `You are a content editor writing an Origin & Context section for a research article page.

This section appears immediately after the opening "What This Is About" hook and before the first evidence section.

Purpose: Give a curious newcomer enough background to understand why this story exists and why it matters -- in under 40 seconds. Experienced readers should feel the piece is sharper and more authoritative, not padded.

Tone: Identical to the rest of the piece. Calm, evidence-first, intelligent, slightly wry. Never sensational or conspiratorial.

Content structure:
1. The historical or situational setup: What was the original event, program, discovery, or phenomenon? When and why did it happen? Who were the key players and what was the official goal?
2. Only the minimal essential context a smart first-time reader needs. No padding. No lecturing.
3. Bridge naturally into the central tension or mystery the article explores (the myth vs. documented reality, the secrecy gap, the contradiction, etc.).
4. End with a smooth transition sentence that flows directly into the evidence section.

Rules:
- 150-300 words total. Two or three short paragraphs maximum.
- Do NOT repeat anything already stated in the hook/summary or in the title.
- Varied sentence structures. No em dashes or en dashes. Sound human, not AI-generated.
- Max 20 words per sentence.
- A complete newcomer should instantly "get it."
- An expert reader should feel zero padding or lecturing.
- The title should land with noticeably more weight and emotional resonance after reading this section.
- Return null (as a JSON null, not the string "null") if the existing hook already provides full origin context and adding more would only repeat or pad.`;

async function generate(title, overviewSummary, executiveSummary) {
  const userPrompt = `Topic: "${title}"

EXISTING HOOK (already shown to the reader -- do NOT repeat this):
${overviewSummary}

FULL RESEARCH SUMMARY (use for background context):
${executiveSummary}

---

Write the Origin & Context section for this topic. Return ONLY valid JSON, no markdown:
{
  "origin_context": "150-300 words, two or three paragraphs separated by \\n\\n. Or null if the hook already provides full context."
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
    .select('topic, title, overview_summary, origin_context, synthesized_output')
    .not('overview_summary', 'is', null)
    .order('title');

  if (error) throw error;

  const pending = dossiers.filter(d => !d.origin_context);
  console.log(`Found ${pending.length} topics needing origin_context.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const d of pending) {
    process.stdout.write(`  [${succeeded + failed + 1}/${pending.length}] ${d.title.slice(0, 60)}... `);
    try {
      const parsed = await generate(
        d.title,
        d.overview_summary,
        d.synthesized_output?.executive_summary ?? '',
      );

      const { error: updateErr } = await supabase
        .from('topic_dossiers')
        .update({ origin_context: parsed.origin_context ?? null })
        .eq('topic', d.topic);

      if (updateErr) throw updateErr;
      const label = parsed.origin_context ? '✓' : '✓ (skipped — hook sufficient)';
      console.log(label);
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
