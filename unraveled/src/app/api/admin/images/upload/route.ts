/**
 * POST /api/admin/images/upload
 *
 * Accepts: multipart/form-data
 *   - file: image file (JPEG, PNG, WebP, GIF, TIFF — max 10 MB)
 *   - topic: string
 *   - title: string
 *
 * Flow:
 *   1. Upload to Supabase Storage bucket "topic-images"
 *   2. Run Visual Curator (Gemini) evaluation
 *   3. Store in topic_images with source='own', status='approved'
 *      (your own images skip the suggested queue — they go straight to approved)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { evaluateImagesForTopic } from '@/lib/external/gemini-image-eval';
import type { WikimediaImage } from '@/lib/external/wikimedia-images';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff']);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const topic = formData.get('topic') as string | null;
  const title = formData.get('title') as string | null;

  if (!file || !topic || !title) {
    return NextResponse.json({ error: 'file, topic, and title are required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const storagePath = `${topic.replace(/[^a-z0-9-]/gi, '_')}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('topic-images')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from('topic-images')
    .getPublicUrl(storagePath);

  // ── Visual Curator evaluation ──────────────────────────────────────────────
  // Build a WikimediaImage-compatible candidate so Gemini can evaluate it
  const candidate: WikimediaImage & { search_query?: string; _source?: string } = {
    title: file.name.replace(/\.[^.]+$/, ''),
    image_url: publicUrl,
    thumbnail_url: publicUrl,
    source_page_url: publicUrl,
    description: null,
    author: 'Site owner',
    date_created: new Date().toISOString().slice(0, 10),
    license: 'Own',
    license_url: null,
    attribution: 'UnraveledTruth.com — All rights reserved',
    width: 0,
    height: 0,
    mime_type: file.type,
    quality_score: 0.9, // own images start with high score
    search_query: undefined,
    _source: 'own',
  };

  const [evaluated] = await evaluateImagesForTopic([candidate], topic, title).catch(() => [
    {
      ...candidate,
      gemini_verdict: null,
      gemini_aesthetic_score: null,
      gemini_literal: null,
      gemini_alignment: null,
      gemini_caption: null,
      gemini_tweaks: null,
      gemini_alternatives: null,
      gemini_rejected: false,
    },
  ]);

  // ── Store in topic_images ──────────────────────────────────────────────────
  // Own images go straight to 'approved' regardless of curator verdict
  const { data: inserted, error: dbError } = await supabase
    .from('topic_images')
    .insert({
      topic,
      source: 'own',
      search_query: null,
      title: candidate.title,
      description: evaluated.gemini_literal ?? null,
      image_url: publicUrl,
      thumbnail_url: publicUrl,
      source_page_url: null,
      license: 'Own',
      license_url: null,
      attribution: candidate.attribution,
      author: 'Site owner',
      date_created: candidate.date_created,
      width: null,
      height: null,
      mime_type: file.type,
      quality_score: evaluated.quality_score,
      status: 'approved', // own images skip the queue
      featured: false,
      gemini_verdict: evaluated.gemini_verdict,
      gemini_aesthetic_score: evaluated.gemini_aesthetic_score,
      gemini_literal: evaluated.gemini_literal,
      gemini_alignment: evaluated.gemini_alignment,
      gemini_caption: evaluated.gemini_caption,
      gemini_tweaks: evaluated.gemini_tweaks,
      gemini_alternatives: null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (dbError) {
    // Clean up orphaned storage file
    await supabase.storage.from('topic-images').remove([storagePath]);
    return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    url: publicUrl,
    gemini_verdict: evaluated.gemini_verdict,
    gemini_caption: evaluated.gemini_caption,
    gemini_tweaks: evaluated.gemini_tweaks,
  });
}
