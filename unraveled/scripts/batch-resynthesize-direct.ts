/**
 * Direct batch re-synthesis — bypasses HTTP, calls synthesis functions directly.
 * Run: npx tsx --tsconfig tsconfig.json scripts/batch-resynthesize-direct.ts
 *
 * Reads env from .env.local automatically via tsx's dotenv support.
 */

import { createClient } from '@supabase/supabase-js';
import { runSynthesis } from '../src/lib/research/agents/synthesizer';
import { accumulateDossier } from '../src/lib/research/dossier';
import type { AgentFinding } from '../src/lib/research/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOPICS = [
  { topic: 'Elongated skulls cranial deformation Paracas anomalous features', title: 'Elongated Skulls: Royalty, Ritual, or Something Else?' },
  { topic: 'Global Giants & Nephilim Parallels', title: 'Giants Among Us: Myth, Bone, and the Archaeology of a Global Obsession' },
  { topic: 'Annunaki Sumerian texts ancient astronaut Sitchin translation', title: 'Gods, Rockets, and Bad Translations: The Annunaki, Sitchin, and the Limits of Ancient Astronaut Theory' },
  { topic: 'Ley lines earth grids sacred geometry ancient sites alignment', title: 'Lines Across the Land: Sacred Geometry, Earth Grids, and the Human Impulse to Map the Sacred' },
  { topic: "Nature's Exit Protocol: Darwin's Wasp, Predation Neurochemistry & the Mercy Problem", title: "Nature's Exit Protocol: Darwin's Wasp, Predation Neurochemistry & the Mercy Problem" },
  { topic: 'rome-to-rome-roman-empire-catholic-church', title: 'Rome to Rome: How the Catholic Church Inherited an Empire' },
  { topic: 'Star people indigenous sky beings UAP UFO traditions Dogon', title: 'Star People: Indigenous Sky-Being Traditions and the UFO Imagination' },
  { topic: 'Tartaria: The Empire That Disappeared from the Maps', title: 'Tartaria: The Empire That Never Was — and the Real History That Made the Myth Possible' },
  { topic: 'Tree of Life universal symbol cross-cultural mythology Yggdrasil', title: 'The Axis of Everything: Why Every Culture on Earth Invented the Tree of Life' },
  { topic: 'Dragon mythology cross-cultural universal archetype', title: 'The Dragon Paradox: Why Every Culture Invented the Same Monster' },
  { topic: 'Global pyramids cross-cultural convergence ancient architecture', title: 'The Global Pyramid Problem: Independent Genius, Borrowed Ideas, or Something Stranger?' },
  { topic: 'Simulation hypothesis ancient illusion traditions Maya consciousness', title: 'The Illusion Engine: Ancient Consciousness Traditions and the Modern Simulation Hypothesis' },
  { topic: 'The Philadelphia Experiment: Invisibility, Teleportation & Naval Denial', title: "The Philadelphia Experiment: How a Sailor's Marginalia Became America's Most Durable Naval Myth" },
  { topic: 'Acoustic archaeology sound resonance ancient architecture ritual', title: 'The Resonant Temple: Acoustic Archaeology and the Ancient Engineering of Sacred Sound' },
  { topic: 'peter-thiel', title: "The Restrainer and the Mimic: Peter Thiel's Secret Antichrist Lectures and the Theology of Silicon Valley Power" },
  { topic: 'Pineal gland third eye DMT mysticism neuroscience', title: 'The Seat of the Soul, Revisited: Pineal Gland, DMT, and the Neuroscience of Mystical Vision' },
  { topic: 'Ancient ocean navigation pre-Columbian contact Polynesian Phoenician', title: 'Who Crossed First? The Archaeology, Genetics, and Mythology of Pre-Columbian Ocean Contact' },
];

async function synthesizeTopic(topic: string, title: string, index: number): Promise<boolean> {
  const label = `[${index + 1}/${TOPICS.length}] ${title}`;
  console.log(`\n⏳ Starting: ${label}`);
  const start = Date.now();

  // Get all completed sessions for this topic
  const { data: sessions, error: sessErr } = await supabase
    .from('research_sessions')
    .select('id')
    .eq('topic', topic)
    .eq('status', 'complete')
    .order('completed_at', { ascending: false });

  if (sessErr || !sessions?.length) {
    console.error(`❌ No completed sessions: ${label} — ${sessErr?.message ?? 'none found'}`);
    return false;
  }

  const sessionId = sessions[0].id;
  const sessionIds = sessions.map((s: { id: string }) => s.id);

  // Fetch all findings across all sessions
  const { data: findings, error: findingsErr } = await supabase
    .from('agent_findings')
    .select('*')
    .in('session_id', sessionIds)
    .order('confidence', { ascending: false });

  if (findingsErr || !findings?.length) {
    console.error(`❌ No findings: ${label} — ${findingsErr?.message ?? 'empty'}`);
    return false;
  }

  // Debate from latest session
  const { data: debateRow } = await supabase
    .from('debate_records')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (!debateRow) {
    console.error(`❌ No debate record: ${label}`);
    return false;
  }

  // Validations from latest session
  const { data: validations } = await supabase
    .from('finding_validations')
    .select('*')
    .eq('session_id', sessionId);

  console.log(`   findings=${findings.length} sessionId=${sessionId}`);

  const result = await runSynthesis(
    sessionId,
    topic,
    findings as (AgentFinding & { id: string })[],
    validations ?? [],
    [],
    debateRow,
  );

  if (result.error || !result.output) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`❌ Synthesis failed (${elapsed}s): ${label}`);
    console.error(`   ${result.error}`);
    return false;
  }

  await accumulateDossier({
    topic,
    title,
    findings: findings as (AgentFinding & { id: string })[],
    convergenceAnalyses: [],
    debate: debateRow,
    output: result.output,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`✅ Done (${elapsed}s): ${label}`);
  console.log(`   score=${result.output.convergence_score} layers=${result.output.jaw_drop_layers.length} traditions=${result.output.traditions_analyzed.length}`);
  return true;
}

async function main() {
  console.log(`🚀 Direct batch re-synthesis: ${TOPICS.length} topics`);
  console.log(`   No HTTP — calls synthesis functions directly\n`);

  const results = { ok: 0, failed: 0 };

  for (let i = 0; i < TOPICS.length; i++) {
    const { topic, title } = TOPICS[i];
    const ok = await synthesizeTopic(topic, title, i);
    if (ok) results.ok++; else results.failed++;

    if (i < TOPICS.length - 1) {
      process.stdout.write('   Pausing 2s...');
      await new Promise(r => setTimeout(r, 2000));
      process.stdout.write(' done\n');
    }
  }

  console.log(`\n📊 Summary: ${results.ok} succeeded, ${results.failed} failed out of ${TOPICS.length}`);
}

main().catch(console.error);
