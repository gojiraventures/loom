/**
 * POST /api/admin/images/crop
 *   Body: { id, top, bottom, left, right }  — all 0–1 fractions of the original dimensions
 *   Downloads the original image, crops with Sharp, uploads to topic-images storage,
 *   saves cropped_url on the topic_images row.
 *
 * PATCH /api/admin/images/crop
 *   Body: { id, hero_position }  — e.g. "center", "top", "20% 30%"
 *   Just updates the hero_position field without re-processing the image.
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createServerSupabaseClient } from '@/lib/supabase';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    id: string;
    top: number;    // 0–1
    bottom: number; // 0–1
    left: number;   // 0–1
    right: number;  // 0–1
  };
  const { id, top, bottom, left, right } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { data: img, error: fetchErr } = await supabase
    .from('topic_images')
    .select('image_url, topic, title, width, height')
    .eq('id', id)
    .single();

  if (fetchErr || !img?.image_url) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  // Download original
  const res = await fetch(img.image_url, {
    headers: { 'User-Agent': 'Unraveled/1.0 (contact@unraveled.ai)' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: 502 });

  const originalBuffer = Buffer.from(await res.arrayBuffer());

  // Get real dimensions from Sharp (width/height in DB may be null)
  const meta = await sharp(originalBuffer).metadata();
  const W = meta.width ?? img.width ?? 0;
  const H = meta.height ?? img.height ?? 0;
  if (!W || !H) return NextResponse.json({ error: 'Could not determine image dimensions' }, { status: 422 });

  const cropLeft   = Math.round(W * (left   ?? 0));
  const cropTop    = Math.round(H * (top    ?? 0));
  const cropWidth  = Math.round(W * ((right  ?? 1) - (left ?? 0)));
  const cropHeight = Math.round(H * ((bottom ?? 1) - (top  ?? 0)));

  if (cropWidth < 10 || cropHeight < 10) {
    return NextResponse.json({ error: 'Crop region too small' }, { status: 422 });
  }

  const croppedBuffer = await sharp(originalBuffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Upload to topic-images bucket
  const safeTitle = (img.title ?? 'image').replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  const safeTopic = img.topic.replace(/[^a-z0-9]/gi, '_').slice(0, 40);
  const storagePath = `${safeTopic}/cropped_${safeTitle}_${id.slice(0, 8)}.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from('topic-images')
    .upload(storagePath, croppedBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) {
    return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from('topic-images').getPublicUrl(storagePath);

  const { error: updateErr } = await supabase
    .from('topic_images')
    .update({
      cropped_url: publicUrl,
      width: cropWidth,
      height: cropHeight,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, cropped_url: publicUrl, width: cropWidth, height: cropHeight });
}

export async function PATCH(req: NextRequest) {
  const { id, hero_position } = await req.json() as { id: string; hero_position: string };
  if (!id || !hero_position) return NextResponse.json({ error: 'id and hero_position required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('topic_images')
    .update({ hero_position, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
