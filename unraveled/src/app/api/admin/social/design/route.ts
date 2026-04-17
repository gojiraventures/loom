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
import { renderAllSlides, compositeWithBackground } from '@/lib/social/renderer';
import type { DesignBrief } from '@/lib/social/art-director-agent';
import { briefDimensions } from '@/lib/social/templates';
import { generateWithValidation, checkAvailable, generateImageComfyUI } from '@/lib/external/comfyui';
import { generateImageFalAI, isFalAvailable } from '@/lib/external/falai';
import { COMFYUI_TAIL_BLOCK } from '@/lib/media/hero-prompt-generator';
import { runQA } from '@/lib/social/qa-agent';
import type { QAResult } from '@/lib/social/qa-agent';

export const maxDuration = 300;

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

  // ── Render — with ComfyUI background if available ──────────────────────────
  let buffers: Buffer[];
  let usedComfyUI = false;
  let generationHistory: import('@/lib/external/comfyui').ValidationAttempt[] | null = null;

  const hasImagePrompt = !!brief.image_prompt;

  // Backend selection: fal.ai (API, no local server needed) > ComfyUI (local)
  const imageBackend = process.env.IMAGE_BACKEND ?? 'comfyui'; // 'comfyui' | 'falai'
  const falReady = imageBackend === 'falai' && isFalAvailable();
  const comfyReady = imageBackend === 'comfyui' && await checkAvailable();
  const imageReady = hasImagePrompt && (falReady || comfyReady);
  const generateFn = falReady ? generateImageFalAI : generateImageComfyUI;
  const backendName = falReady ? 'fal.ai' : 'ComfyUI';

  if (imageReady && brief.image_prompt) {
    try {
      // Strip any residual Midjourney flags (--stylize, --v, --ar, etc.) — safety net
      const cleanPrompt = brief.image_prompt
        .replace(/--\w[\w-]*(?:\s+\S+)?/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const comfyPrompt = `${cleanPrompt} ${COMFYUI_TAIL_BLOCK}`;

      // Intent brief for the Gemini validator (plain English, separate from the full prompt)
      const imageIntent = `${articleTitle} — ${brief.visual_note}`;

      console.log(`[design] Using ${backendName} for image generation`);
      const { width: bgWidth, height: bgHeight } = briefDimensions(brief);
      const bgResult = await generateWithValidation(
        comfyPrompt,
        imageIntent,
        bgWidth,
        bgHeight,
        3,
        generateFn,
      );

      // Composite single hero card (carousels fall back to solid bg for non-first slides)
      const heroBuffer = await compositeWithBackground(bgResult.buffer, brief);

      if (brief.template === 'carousel_slide' && brief.slides && brief.slides.length > 1) {
        // First slide gets the hero background; remaining slides render normally
        const remainingSlides = await renderAllSlides(brief);
        buffers = [heroBuffer, ...remainingSlides.slice(1)];
      } else {
        buffers = [heroBuffer];
      }

      usedComfyUI = true;
      generationHistory = bgResult.history;
      if (bgResult.attempts > 1) {
        console.log(`[design] ComfyUI validated in ${bgResult.attempts} attempt(s):`, bgResult.history.map(h => `#${h.attempt} ${h.approved ? '✓' : '✗'} ${h.summary}`).join(' | '));
      }
    } catch (err) {
      console.warn(`[design] ${backendName} composite failed, falling back to solid card:`, String(err));
      try {
        buffers = await renderAllSlides(brief);
      } catch (renderErr) {
        return NextResponse.json({ error: `Render failed: ${String(renderErr)}` }, { status: 500 });
      }
    }
  } else {
    try {
      buffers = await renderAllSlides(brief);
    } catch (err) {
      return NextResponse.json({ error: `Render failed: ${String(err)}` }, { status: 500 });
    }
  }

  // ── Gemini visual QA on primary card ────────────────────────────────────────
  let visualQA: QAResult | null = null;
  try {
    visualQA = await runQA({
      platform: piece.platform,
      content_type: piece.content_type,
      text_content: piece.text_content ?? '',
      supplementary: piece.supplementary ?? null,
      article_title: articleTitle,
      convergence_score: convergenceScore,
      image_base64: buffers[0].toString('base64'),
      image_mime: 'image/png',
    });
  } catch (err) {
    console.warn('[design] Gemini visual QA failed (non-fatal):', String(err));
  }

  // ── Collect old storage paths before deleting DB records ───────────────────
  const { data: oldVariants } = await supabase
    .from('social_design_variants')
    .select('storage_path')
    .eq('content_piece_id', body.piece_id);
  const oldStoragePaths = (oldVariants ?? []).map(v => v.storage_path).filter(Boolean);

  // ── Upload to Supabase Storage ──────────────────────────────────────────────
  const bucketName = 'social-designs';
  const uploadedVariants: {
    variant_label: string;
    image_url: string;
    storage_path: string;
    width: number;
    height: number;
  }[] = [];

  const dims = briefDimensions(brief);

  // Sanitize topic to a URL-safe slug (spaces → dashes, strip non-alphanumeric except dashes)
  const topicSlug = piece.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Timestamp ensures each generation gets a unique path — prevents CDN from
  // serving stale cached files when the same piece is regenerated.
  const genTs = Date.now();

  for (let i = 0; i < buffers.length; i++) {
    const label = buffers.length === 1 ? 'primary' : `slide_${i + 1}`;
    const path = `${topicSlug}/${body.piece_id}/${genTs}_${label}.png`;

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

  // ── Delete old storage files + DB records ──────────────────────────────────
  if (oldStoragePaths.length > 0) {
    await supabase.storage.from(bucketName).remove(oldStoragePaths);
  }
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
    visual_qa: visualQA,
    composited: usedComfyUI,
    generation_history: generationHistory,
    // What Gemini identified as the subject of the kept image — useful for debugging mismatches
    identified_subject: generationHistory?.at(-1)?.identified_subject ?? null,
  });
}
