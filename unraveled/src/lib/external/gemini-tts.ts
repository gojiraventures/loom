/**
 * Gemini multi-speaker TTS — NotebookLM-style podcast audio generation.
 *
 * Step 1: Claude writes a two-host podcast script from the article.
 * Step 2: Gemini 2.5 Flash TTS converts it to audio with two distinct voices.
 *
 * Voices:
 *   Host    → Zephyr (bright, authoritative female)
 *   Co-Host → Puck   (upbeat, curious male)
 *
 * Output: raw WAV buffer (24 kHz, 16-bit mono PCM with RIFF header).
 *         Upload to Supabase Storage and serve the public URL.
 *
 * Script format Gemini expects for multi-speaker:
 *   "Host: Welcome to Unraveled Truth...\nCo-Host: Today we're diving into..."
 *   Speaker labels must exactly match the speakerVoiceConfigs names.
 */

import { queryClaude } from '@/lib/research/llm/claude';
import type { SynthesizedOutput } from '@/lib/research/types';

// ── Script prompt ─────────────────────────────────────────────────────────────

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

function buildScriptPrompt(output: SynthesizedOutput): string {
  const layers = (output.jaw_drop_layers ?? [])
    .slice(0, 4)
    .map((l) => `• ${l.title}: ${l.content?.slice(0, 200) ?? ''}`)
    .join('\n');

  return `Write a podcast script for this article. Use the exact Host:/Co-Host: format.

ARTICLE TITLE: ${output.title}
SUBTITLE: ${output.subtitle ?? ''}

EXECUTIVE SUMMARY:
${output.executive_summary?.slice(0, 600) ?? ''}

KEY FINDINGS:
${layers}

ADVOCATE POSITION (strongest case for):
${output.advocate_case?.slice(0, 400) ?? ''}

SKEPTIC POSITION (strongest case against):
${output.skeptic_case?.slice(0, 400) ?? ''}

OPEN QUESTIONS:
${(output.open_questions ?? []).slice(0, 3).join('\n')}

Write the script now. Host:/Co-Host: format only.`;
}

// ── PCM → WAV ────────────────────────────────────────────────────────────────

function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);          // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28);
  header.writeUInt16LE(channels * bitDepth / 8, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

// ── Gemini TTS REST call ──────────────────────────────────────────────────────

async function callGeminiTTS(script: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: script }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: 'Host',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            {
              speaker: 'Co-Host',
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
            },
          ],
        },
      },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180_000), // 3 min
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini TTS error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType: string; data: string } }[]
      }
    }[]
  };

  const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!part?.data) throw new Error('Gemini TTS returned no audio data');

  const pcm = Buffer.from(part.data, 'base64');
  return pcmToWav(pcm);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface PodcastResult {
  script: string;
  wavBuffer: Buffer;
}

export async function generatePodcast(output: SynthesizedOutput): Promise<PodcastResult> {
  // Step 1: Script via Claude
  const scriptResponse = await queryClaude({
    provider: 'claude',
    systemPrompt: SCRIPT_SYSTEM,
    userPrompt: buildScriptPrompt(output),
    jsonMode: false,
    maxTokens: 4096,
    temperature: 0.7,
  });

  const script = scriptResponse.text.trim();
  if (!script) throw new Error('Claude returned empty script');

  // Step 2: Audio via Gemini TTS
  const wavBuffer = await callGeminiTTS(script);

  return { script, wavBuffer };
}
