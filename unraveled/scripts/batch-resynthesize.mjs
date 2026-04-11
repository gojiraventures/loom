/**
 * Batch re-synthesis script — hits localhost:3000/api/admin/resynthesize
 * for each topic that needs truncation fix.
 *
 * Run with: node scripts/batch-resynthesize.mjs
 * (server must be running on localhost:3000)
 */

const BASE_URL = 'http://localhost:3000';

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

async function resynthesize(topic, title, index) {
  const label = `[${index + 1}/${TOPICS.length}] ${title}`;
  console.log(`\n⏳ Starting: ${label}`);
  const start = Date.now();

  try {
    const res = await fetch(`${BASE_URL}/api/admin/resynthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': 'unraveled-local-admin-script-2026',
      },
      body: JSON.stringify({ topic, title }),
      signal: AbortSignal.timeout(180_000), // 3 min timeout per topic
    });

    const json = await res.json();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (res.ok) {
      console.log(`✅ Done (${elapsed}s): ${label}`);
      console.log(`   findings=${json.findingsUsed} score=${json.convergenceScore} layers=${json.jawDropLayers}`);
    } else {
      console.error(`❌ Failed (${elapsed}s): ${label}`);
      console.error(`   Error: ${json.error}`);
    }

    return res.ok;
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`❌ Exception (${elapsed}s): ${label} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`🚀 Batch re-synthesis: ${TOPICS.length} topics`);
  console.log(`   Server: ${BASE_URL}`);
  console.log(`   These run sequentially to avoid hammering the LLM API.\n`);

  const results = { ok: 0, failed: 0 };

  for (let i = 0; i < TOPICS.length; i++) {
    const { topic, title } = TOPICS[i];
    const ok = await resynthesize(topic, title, i);
    if (ok) results.ok++; else results.failed++;

    // Brief pause between requests
    if (i < TOPICS.length - 1) {
      process.stdout.write('   Waiting 3s before next...');
      await new Promise(r => setTimeout(r, 3000));
      process.stdout.write(' done\n');
    }
  }

  console.log(`\n📊 Summary: ${results.ok} succeeded, ${results.failed} failed out of ${TOPICS.length}`);

  if (results.failed > 0) {
    console.log('   Re-run the script to retry failed topics (successful ones will re-synthesize again, which is fine).');
  }
}

main().catch(console.error);
