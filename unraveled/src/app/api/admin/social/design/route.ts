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
import { generateImagesGrok, isGrokAvailable } from '@/lib/external/grok-image';
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

  // ── Render — with image background if available ───────────────────────────
  // bufferSets: each entry is an array of card buffers for one "variant".
  // Grok produces up to 4 visual variants; ComfyUI/fal produce 1.
  let bufferSets: Buffer[][] = [];
  let usedComfyUI = false;
  let generationHistory: import('@/lib/external/comfyui').ValidationAttempt[] | null = null;
  let imageBackendError: string | null = null;

  const hasImagePrompt = !!brief.image_prompt;

  // Backend selection: grok > fal.ai > comfyui
  const imageBackend = process.env.IMAGE_BACKEND ?? 'comfyui'; // 'grok' | 'falai' | 'comfyui'
  const grokReady  = imageBackend === 'grok'   && hasImagePrompt && isGrokAvailable();
  const falReady   = imageBackend === 'falai'  && hasImagePrompt && isFalAvailable();
  const comfyReady = imageBackend === 'comfyui' && hasImagePrompt && await checkAvailable();

  if (grokReady && brief.image_prompt) {
    // ── Grok: generate 4 image variants, composite each into a card ──────────
    try {
      // Append Grok style flags; strip any old Midjourney flags first just in case
      const basePrompt = brief.image_prompt
        .replace(/--\w[\w-]*(?:\s+\S+)?/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const grokPrompt = `${basePrompt} --stylize 225 --v 6`;

      console.log('[design] Using Grok for image generation');
      const variants = await generateImagesGrok(grokPrompt, 1);

      for (const v of variants) {
        try {
          const heroBuffer = await compositeWithBackground(v.buffer, brief);
          if (brief.template === 'carousel_slide' && brief.slides && brief.slides.length > 1) {
            const remainingSlides = await renderAllSlides(brief);
            bufferSets.push([heroBuffer, ...remainingSlides.slice(1)]);
          } else {
            bufferSets.push([heroBuffer]);
          }
        } catch (err) {
          console.warn(`[design] Grok variant ${v.index} composite failed:`, String(err));
        }
      }

      if (bufferSets.length === 0) throw new Error('All Grok variants failed to composite');
      usedComfyUI = true; // reuse flag — means "image background was used"
    } catch (err) {
      imageBackendError = String(err);
      console.error('[design] Grok generation FAILED — falling back to solid card:', imageBackendError);
      bufferSets = [];
    }
  } else if ((falReady || comfyReady) && brief.image_prompt) {
    // ── ComfyUI / fal.ai: single variant ─────────────────────────────────────
    const generateFn = falReady ? generateImageFalAI : generateImageComfyUI;
    const backendName = falReady ? 'fal.ai' : 'ComfyUI';
    try {
      const cleanPrompt = brief.image_prompt
        .replace(/--\w[\w-]*(?:\s+\S+)?/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const comfyPrompt = `${cleanPrompt} ${COMFYUI_TAIL_BLOCK}`;
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

      const heroBuffer = await compositeWithBackground(bgResult.buffer, brief);

      if (brief.template === 'carousel_slide' && brief.slides && brief.slides.length > 1) {
        const remainingSlides = await renderAllSlides(brief);
        bufferSets = [[heroBuffer, ...remainingSlides.slice(1)]];
      } else {
        bufferSets = [[heroBuffer]];
      }

      usedComfyUI = true;
      generationHistory = bgResult.history;
      if (bgResult.attempts > 1) {
        console.log(`[design] ${backendName} validated in ${bgResult.attempts} attempt(s):`, bgResult.history.map(h => `#${h.attempt} ${h.approved ? '✓' : '✗'} ${h.summary}`).join(' | '));
      }
    } catch (err) {
      imageBackendError = String(err);
      console.warn(`[design] ${backendName} composite failed, falling back to solid card:`, imageBackendError);
      bufferSets = [];
    }
  }

  // Fallback: solid-color card (no image background)
  if (bufferSets.length === 0) {
    try {
      bufferSets = [await renderAllSlides(brief)];
    } catch (err) {
      return NextResponse.json({ error: `Render failed: ${String(err)}` }, { status: 500 });
    }
  }

  // ── Gemini visual QA on primary card (first buffer of first variant set) ────
  let visualQA: QAResult | null = null;
  try {
    visualQA = await runQA({
      platform: piece.platform,
      content_type: piece.content_type,
      text_content: piece.text_content ?? '',
      supplementary: piece.supplementary ?? null,
      article_title: articleTitle,
      convergence_score: convergenceScore,
      image_base64: bufferSets[0][0].toString('base64'),
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
  // bufferSets layout:
  //   Grok (4 visual variants):  [[hero_v1], [hero_v2], [hero_v3], [hero_v4]]
  //   Carousel with Grok:        [[slide1_v1, slide2_v1, ...], [slide1_v2, ...], ...]
  //   ComfyUI/fal (1 variant):   [[hero]] or [[slide1, slide2, ...]]
  //   Solid fallback:            [[slide1]] or [[slide1, slide2, ...]]
  //
  // Each (variantIdx, slideIdx) pair → one row in social_design_variants.
  // Label convention:
  //   Single-image, single-variant:  "primary"
  //   Single-image, multi-variant:   "grok_1", "grok_2", ...
  //   Carousel, single-variant:      "slide_1", "slide_2", ...
  //   Carousel, multi-variant:       "grok_1_slide_1", "grok_1_slide_2", ...

  const bucketName = 'social-designs';
  const uploadedVariants: {
    variant_label: string;
    image_url: string;
    storage_path: string;
    width: number;
    height: number;
  }[] = [];

  const dims = briefDimensions(brief);
  const isMultiVariant = bufferSets.length > 1;
  const isCarousel = bufferSets[0].length > 1;

  const topicSlug = piece.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const genTs = Date.now();

  for (let vi = 0; vi < bufferSets.length; vi++) {
    const buffers = bufferSets[vi];
    for (let si = 0; si < buffers.length; si++) {
      let label: string;
      if (!isMultiVariant && !isCarousel) {
        label = 'primary';
      } else if (isMultiVariant && !isCarousel) {
        label = `grok_${vi + 1}`;
      } else if (!isMultiVariant && isCarousel) {
        label = `slide_${si + 1}`;
      } else {
        label = `grok_${vi + 1}_slide_${si + 1}`;
      }

      const path = `${topicSlug}/${body.piece_id}/${genTs}_${label}.png`;

      const { error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(path, buffers[si], { contentType: 'image/png', upsert: true });

      if (uploadErr) {
        console.error('Upload error:', uploadErr);
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path);

      uploadedVariants.push({
        variant_label: label,
        image_url: urlData.publicUrl,
        storage_path: path,
        width: dims.width,
        height: dims.height,
      });
    }
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
  // For Grok multi-variant: select the first hero card ("grok_1") by default.
  // For single-variant / carousel: select the first row.
  const defaultLabel = isMultiVariant ? 'grok_1' : uploadedVariants[0]?.variant_label;

  const { data: inserted, error: insertErr } = await supabase
    .from('social_design_variants')
    .insert(
      uploadedVariants.map((v) => ({
        content_piece_id: body.piece_id,
        variant_label: v.variant_label,
        template_type: brief.template,
        image_url: v.image_url,
        storage_path: v.storage_path,
        width: v.width,
        height: v.height,
        selected: v.variant_label === defaultLabel,
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
    grok_variants: isMultiVariant ? bufferSets.length : null,
    image_backend_error: imageBackendError,
    visual_qa: visualQA,
    composited: usedComfyUI,
    generation_history: generationHistory,
    identified_subject: generationHistory?.at(-1)?.identified_subject ?? null,
  });
}
