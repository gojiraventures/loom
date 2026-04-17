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

  // ── Hard rule checks (platform limits, no AI needed) ─────────────────────────
  const X_LIMIT = 280;
  const hardIssues: { category: string; severity: 'block'; description: string; suggestion: string }[] = [];

  if (piece.platform === 'x') {
    const mainText: string = piece.text_content ?? '';
    if (mainText.length > X_LIMIT) {
      hardIssues.push({
        category: 'platform',
        severity: 'block',
        description: `Text is ${mainText.length} characters — exceeds X's hard 280-char limit by ${mainText.length - X_LIMIT}.`,
        suggestion: 'Shorten the body text to leave room for the URL. Edit and trim before approving.',
      });
    }
    // Also check individual thread posts
    const posts: string[] = (piece.supplementary as { posts?: string[] } | null)?.posts ?? [];
    posts.forEach((post, i) => {
      if (post.length > X_LIMIT) {
        hardIssues.push({
          category: 'platform',
          severity: 'block',
          description: `Thread post ${i + 1} is ${post.length} characters — exceeds 280-char limit by ${post.length - X_LIMIT}.`,
          suggestion: `Shorten thread post ${i + 1}.`,
        });
      }
    });
  }

  // If hard violations exist, return block immediately without calling the AI
  if (hardIssues.length > 0) {
    const qaResult = {
      result: 'block' as const,
      issues: hardIssues,
      summary: `Hard block: ${hardIssues.map(i => i.description).join(' ')}`,
    };

    await supabase.from('social_qa_results').upsert({
      content_piece_id: body.piece_id,
      result: qaResult.result,
      issues: qaResult.issues,
      summary: qaResult.summary,
      checked_at: new Date().toISOString(),
      overridden_by_human: false,
    }, { onConflict: 'content_piece_id' });

    if (['draft', 'approved'].includes(piece.status)) {
      await supabase
        .from('social_content_pieces')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', body.piece_id);
    }

    return NextResponse.json({
      qa: qaResult,
      piece_id: body.piece_id,
      auto_rejected: ['draft', 'approved'].includes(piece.status),
    });
  }

  // ── AI QA ─────────────────────────────────────────────────────────────────────
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
