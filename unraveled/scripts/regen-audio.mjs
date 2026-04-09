/**
 * Regenerate podcast audio for all topics that already have audio_url set.
 * Run with: node scripts/regen-audio.mjs
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
    .map(l => { const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]; })
);

const GOOGLE_KEY = env.GOOGLE_API_KEY ?? env.GEMINI_API_KEY ?? '';

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// ── Script prompt (mirrors gemini-tts.ts) ────────────────────────────────────

const SCRIPT_SYSTEM = `You write podcast scripts for "Unraveled Truth" — a show that explores ancient mysteries, cross-cultural mythology, and fringe archaeology with intellectual rigor and genuine curiosity.

Two hosts:
- Host: authoritative, sets up the topic, asks incisive questions, drives the narrative. Calm confidence. National Geographic energy.
- Co-Host: analytically sharp, adds depth, occasionally skeptical, brings the surprising detail. Economist precision.

Script rules:
- Start immediately in conversation — no "welcome to the show" cold opens. Drop the listener into the middle of a thought.
- 8–12 exchanges per host (16–24 total turns). Target ~4 minutes of audio.
- Never use the words: "fascinating", "delve", "intriguing", "captivating", "groundbreaking".
- Reference specific evidence from the article — named scholars, sites, dates, cultural names.
- End on a genuine open question that lingers, not a tidy summary.
- Format EXACTLY as:
  Host: [line]
  Co-Host: [line]
  Host: [line]
  ...
- No stage directions, no [pause], no asterisks. Plain dialogue only.`;

function buildScriptPrompt(output) {
  const layers = (output.jaw_drop_layers ?? [])
    .slice(0, 4)
    .map((l) => `• ${l.title}: ${(l.content ?? '').slice(0, 200)}`)
    .join('\n');

  return `Write a podcast script for this article. Use the exact Host:/Co-Host: format.

ARTICLE TITLE: ${output.title}
SUBTITLE: ${output.subtitle ?? ''}

EXECUTIVE SUMMARY:
${(output.executive_summary ?? '').slice(0, 600)}

KEY FINDINGS:
${layers}

ADVOCATE POSITION (strongest case for):
${(output.advocate_case ?? '').slice(0, 400)}

SKEPTIC POSITION (strongest case against):
${(output.skeptic_case ?? '').slice(0, 400)}

OPEN QUESTIONS:
${(output.open_questions ?? []).slice(0, 3).join('\n')}

Write the script now. Host:/Co-Host: format only.`;
}

// ── PCM → WAV ────────────────────────────────────────────────────────────────

function pcmToWav(pcmData, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
  header.writeUInt16LE(channels * bitDepth / 8, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}

// ── Gemini TTS ───────────────────────────────────────────────────────────────

async function callGeminiTTS(script) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GOOGLE_KEY}`;
  const body = {
    contents: [{ parts: [{ text: script }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: 'Host',    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Algieba' } } },
            { speaker: 'Co-Host', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sadaltager' } } },
          ],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini TTS error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('Gemini TTS returned no audio data');
  return pcmToWav(Buffer.from(part.data, 'base64'));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function regenerateTopic(topic, output) {
  console.log(`\n[${topic}] Generating script via Claude...`);
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    temperature: 0.7,
    system: SCRIPT_SYSTEM,
    messages: [{ role: 'user', content: buildScriptPrompt(output) }],
  });
  const script = msg.content[0].text.trim();
  console.log(`[${topic}] Script: ${script.length} chars, ${script.split('\n').length} lines`);

  console.log(`[${topic}] Calling Gemini TTS (Algieba + Sadaltager)...`);
  const wavBuffer = await callGeminiTTS(script);
  console.log(`[${topic}] Audio: ${(wavBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const safeKey = topic.replace(/[^a-z0-9-]/gi, '_');
  const storagePath = `${safeKey}/${safeKey}_${Date.now()}.wav`;

  console.log(`[${topic}] Uploading to storage...`);
  const { error: uploadErr } = await supabase.storage
    .from('topic-audio')
    .upload(storagePath, wavBuffer, { contentType: 'audio/wav', upsert: true });
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data: { publicUrl } } = supabase.storage.from('topic-audio').getPublicUrl(storagePath);

  const { error: saveErr } = await supabase
    .from('topic_dossiers')
    .update({
      audio_url: publicUrl,
      audio_script: script,
      audio_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('topic', topic);
  if (saveErr) throw new Error(`DB update failed: ${saveErr.message}`);

  console.log(`[${topic}] Done → ${publicUrl}`);
}

async function main() {
  const { data: rows, error } = await supabase
    .from('topic_dossiers')
    .select('topic, synthesized_output')
    .not('audio_url', 'is', null);

  if (error) throw error;
  console.log(`Found ${rows.length} topic(s) with existing audio to regenerate.`);

  for (const row of rows) {
    await regenerateTopic(row.topic, row.synthesized_output);
  }

  console.log('\nAll done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
