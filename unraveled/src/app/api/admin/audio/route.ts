/**
 * POST /api/admin/audio
 *   Body: { topic }
 *   Generates a podcast script (Claude) + audio (Gemini TTS), uploads to storage,
 *   saves audio_url + audio_script to topic_dossiers.
 *
 * GET /api/admin/audio?topic=...
 *   Returns { audio_url, audio_script, audio_generated_at } for the topic.
 *
 * DELETE /api/admin/audio?topic=...
 *   Removes the stored audio and clears the DB fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generatePodcast } from '@/lib/external/gemini-tts';
import type { SynthesizedOutput } from '@/lib/research/types';

// Allow up to 5 minutes — audio generation can take 60–120 s
export const maxDuration = 300;

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const topic = new URL(req.url).searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('topic_dossiers')
    .select('audio_url, audio_script, audio_generated_at')
    .eq('topic', topic)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    audio_url: data?.audio_url ?? null,
    audio_script: data?.audio_script ?? null,
    audio_generated_at: data?.audio_generated_at ?? null,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { topic } = await req.json() as { topic: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Load synthesized_output
  const { data: dossier, error: loadErr } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output, title')
    .eq('topic', topic)
    .single();

  if (loadErr || !dossier?.synthesized_output) {
    return NextResponse.json({ error: 'No synthesized article found for this topic' }, { status: 404 });
  }

  const output = dossier.synthesized_output as SynthesizedOutput;

  // Generate script + audio
  const { script, wavBuffer } = await generatePodcast(output);

  // Upload WAV to Supabase Storage
  const fileName = `${topic.replace(/[^a-z0-9-]/gi, '_')}_${Date.now()}.wav`;
  const storagePath = `${topic.replace(/[^a-z0-9-]/gi, '_')}/${fileName}`;

  const { error: uploadErr } = await supabase.storage
    .from('topic-audio')
    .upload(storagePath, wavBuffer, { contentType: 'audio/wav', upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('topic-audio')
    .getPublicUrl(storagePath);

  // Save to dossier
  const { error: saveErr } = await supabase
    .from('topic_dossiers')
    .update({
      audio_url: publicUrl,
      audio_script: script,
      audio_generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('topic', topic);

  if (saveErr) {
    return NextResponse.json({ error: `DB update failed: ${saveErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    audio_url: publicUrl,
    script_length: script.length,
    wav_size_mb: (wavBuffer.length / 1024 / 1024).toFixed(2),
  });
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const topic = new URL(req.url).searchParams.get('topic');
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Get current audio_url to find the storage path
  const { data } = await supabase
    .from('topic_dossiers')
    .select('audio_url')
    .eq('topic', topic)
    .single();

  if (data?.audio_url) {
    // Extract path from URL and delete from storage
    const url = new URL(data.audio_url);
    const pathMatch = url.pathname.match(/\/topic-audio\/(.+)$/);
    if (pathMatch) {
      await supabase.storage.from('topic-audio').remove([pathMatch[1]]);
    }
  }

  await supabase
    .from('topic_dossiers')
    .update({ audio_url: null, audio_script: null, audio_generated_at: null })
    .eq('topic', topic);

  return NextResponse.json({ ok: true });
}
