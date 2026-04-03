/**
 * POST /api/admin/social/design
 * Runs the Art Director Agent on a content piece, renders card(s) via Satori + Sharp,
 * uploads PNGs to Supabase Storage, and stores variants in social_design_variants.
 *
 * Body: {
 *   piece_id: string     — social_content_pieces.id
 * }
 *
 * Returns: { variants: DesignVariant[], brief: DesignBrief }
 *
 * GET /api/admin/social/design?piece_id=...
 * Returns existing variants for a piece.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { runArtDirector } from '@/lib/social/art-director-agent';
import { renderCard, renderAllSlides } from '@/lib/social/renderer';
import type { DesignBrief } from '@/lib/social/art-director-agent';
import { DIMENSIONS } from '@/lib/social/templates';

export const maxDuration = 120;

// ── GET — fetch existing variants ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const pieceId = req.nextUrl.searchParams.get('piece_id');
  if (!pieceId) return NextResponse.json({ error: 'piece_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('social_design_variants')
    .select('*')
    .eq('content_piece_id', pieceId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ variants: data ?? [] });
}

// ── POST — generate new designs ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as { piece_id?: string };
  if (!body.piece_id) return NextResponse.json({ error: 'piece_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Load the content piece
  const { data: piece, error: pieceErr } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('id', body.piece_id)
    .single();

  if (pieceErr || !piece) {
    return NextResponse.json({ error: 'Piece not found' }, { status: 404 });
  }

  // Load dossier for article context
  const { data: dossier } = await supabase
    .from('topic_dossiers')
    .select('title, best_convergence_score, synthesized_output')
    .eq('topic', piece.topic)
    .single();

  const output = dossier?.synthesized_output as { traditions_analyzed?: string[] } | null;
  const traditions = output?.traditions_analyzed ?? [];
  const articleTitle = dossier?.title ?? piece.topic;
  const convergenceScore = dossier?.best_convergence_score ?? 0;

  // ── Run Art Director Agent ──────────────────────────────────────────────────
  let brief: DesignBrief;
  try {
    brief = await runArtDirector({
      platform: piece.platform,
      content_type: piece.content_type,
      text_content: piece.text_content ?? '',
      supplementary: piece.supplementary ?? null,
      article_title: articleTitle,
      convergence_score: convergenceScore,
      traditions,
    });
  } catch (err) {
    return NextResponse.json({ error: `Art director failed: ${String(err)}` }, { status: 500 });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  let buffers: Buffer[];
  try {
    buffers = await renderAllSlides(brief);
  } catch (err) {
    return NextResponse.json({ error: `Render failed: ${String(err)}` }, { status: 500 });
  }

  // ── Upload to Supabase Storage ──────────────────────────────────────────────
  const bucketName = 'social-designs';
  const uploadedVariants: {
    variant_label: string;
    image_url: string;
    storage_path: string;
    width: number;
    height: number;
  }[] = [];

  const dims = brief.template === 'debate_split'
    ? DIMENSIONS.landscape
    : DIMENSIONS[brief.dimensions];

  for (let i = 0; i < buffers.length; i++) {
    const label = buffers.length === 1 ? 'primary' : `slide_${i + 1}`;
    const path = `${piece.topic}/${body.piece_id}/${label}.png`;

    const { error: uploadErr } = await supabase.storage
      .from(bucketName)
      .upload(path, buffers[i], {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path);

    uploadedVariants.push({
      variant_label: label,
      image_url: urlData.publicUrl,
      storage_path: path,
      width: dims.width,
      height: dims.height,
    });
  }

  if (uploadedVariants.length === 0) {
    return NextResponse.json({ error: 'All uploads failed' }, { status: 500 });
  }

  // ── Delete old variants for this piece ─────────────────────────────────────
  await supabase
    .from('social_design_variants')
    .delete()
    .eq('content_piece_id', body.piece_id);

  // ── Insert new variants ─────────────────────────────────────────────────────
  const { data: inserted, error: insertErr } = await supabase
    .from('social_design_variants')
    .insert(
      uploadedVariants.map((v, i) => ({
        content_piece_id: body.piece_id,
        variant_label: v.variant_label,
        template_type: brief.template,
        image_url: v.image_url,
        storage_path: v.storage_path,
        width: v.width,
        height: v.height,
        selected: i === 0, // first variant selected by default
      }))
    )
    .select();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    brief,
    variants: inserted ?? [],
    count: uploadedVariants.length,
  });
}
