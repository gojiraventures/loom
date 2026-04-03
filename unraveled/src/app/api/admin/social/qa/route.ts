/**
 * POST /api/admin/social/qa
 * Runs Gemini QA on a content piece (and optional design image).
 *
 * Body: {
 *   piece_id: string        — social_content_pieces.id
 *   image_base64?: string   — optional design PNG (base64)
 *   image_mime?: string     — e.g. "image/png"
 * }
 *
 * Returns QAResult and stores it in social_qa_results.
 * Also updates social_content_pieces.status to 'flagged' or 'blocked' if warranted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { runQA } from '@/lib/social/qa-agent';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    piece_id?: string;
    image_base64?: string;
    image_mime?: string;
  };

  if (!body.piece_id) {
    return NextResponse.json({ error: 'piece_id required' }, { status: 400 });
  }

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

  // Load the dossier for article metadata
  const { data: dossier } = await supabase
    .from('topic_dossiers')
    .select('title, best_convergence_score')
    .eq('topic', piece.topic)
    .single();

  const articleTitle = dossier?.title ?? piece.topic;
  const convergenceScore = dossier?.best_convergence_score ?? 0;

  // Run QA
  let qaResult;
  try {
    qaResult = await runQA({
      platform: piece.platform,
      content_type: piece.content_type,
      text_content: piece.text_content ?? '',
      supplementary: piece.supplementary ?? null,
      article_title: articleTitle,
      convergence_score: convergenceScore,
      image_base64: body.image_base64,
      image_mime: body.image_mime,
    });
  } catch (err) {
    return NextResponse.json({ error: `QA agent error: ${String(err)}` }, { status: 500 });
  }

  // Store QA result
  const { data: stored, error: storeErr } = await supabase
    .from('social_qa_results')
    .upsert({
      content_piece_id: body.piece_id,
      result: qaResult.result,
      issues: qaResult.issues,
      summary: qaResult.summary,
      checked_at: new Date().toISOString(),
      overridden_by_human: false,
    }, { onConflict: 'content_piece_id' })
    .select()
    .single();

  if (storeErr) {
    console.error('Failed to store QA result:', storeErr);
    // Don't fail the request — still return the result
  }

  // Update piece status if blocked or flagged, only if currently draft/approved
  if (['draft', 'approved'].includes(piece.status)) {
    if (qaResult.result === 'block') {
      await supabase
        .from('social_content_pieces')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', body.piece_id);
    }
    // 'flag' does not change status — human decides
  }

  return NextResponse.json({
    qa: qaResult,
    piece_id: body.piece_id,
    auto_rejected: qaResult.result === 'block' && ['draft', 'approved'].includes(piece.status),
  });
}
