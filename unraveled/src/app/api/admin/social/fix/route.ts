/**
 * POST /api/admin/social/fix
 * Body: { piece_id: string }
 *
 * Takes a flagged content piece + its QA issues and asks Claude to produce
 * a corrected version that addresses every issue while preserving voice,
 * meaning, and platform limits.
 *
 * The fixed text is saved back to the piece (status → draft for re-review).
 * For thread posts, each post in supplementary.posts is also corrected.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const maxDuration = 60;

const CHAR_LIMITS: Record<string, number> = {
  x:         280,
  instagram: 2200,
  facebook:  63206,
};

const PLATFORM_VOICE: Record<string, string> = {
  x:         'Social Writer — high compression, counterintuitive lead, sentence fragments for emphasis, 1-2 hashtags max',
  instagram: 'Magazine Writer — Senior editor register (Aeon/Atlantic), intelligent reader assumed, varied sentence rhythm',
  facebook:  'Magazine Writer — long-form, no hashtags, invites genuine discussion',
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { piece_id?: string };
  if (!body.piece_id) return NextResponse.json({ error: 'piece_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Load piece
  const { data: piece, error: pieceErr } = await supabase
    .from('social_content_pieces')
    .select('*')
    .eq('id', body.piece_id)
    .single();

  if (pieceErr || !piece) return NextResponse.json({ error: 'Piece not found' }, { status: 404 });

  // Load QA result
  const { data: qaRow } = await supabase
    .from('social_qa_results')
    .select('result, issues, summary')
    .eq('content_piece_id', body.piece_id)
    .single();

  if (!qaRow || qaRow.result === 'pass') {
    return NextResponse.json({ error: 'No QA issues to fix' }, { status: 400 });
  }

  const limit = CHAR_LIMITS[piece.platform] ?? 9999;
  const voice = PLATFORM_VOICE[piece.platform] ?? 'editorial, intellectual, specific';
  const issues = (qaRow.issues ?? []) as { category: string; severity: string; description: string; suggestion: string }[];
  const issueList = issues.map((i, n) =>
    `[${n + 1}] ${i.severity.toUpperCase()} — ${i.category}: ${i.description}${i.suggestion ? `\n    Fix: ${i.suggestion}` : ''}`
  ).join('\n');

  const supplementary = piece.supplementary as { posts?: string[]; slides?: { header?: string; body: string }[] } | null;
  const isThread = supplementary?.posts && supplementary.posts.length > 0;

  // Build the prompt
  const prompt = isThread
    ? `Fix this X thread. Address every QA issue. Each post must be ≤ 280 characters. Preserve URL at end of final post. Return ONLY a JSON array of strings — the corrected posts in order. No other output.

ORIGINAL POSTS:
${supplementary!.posts!.map((p, i) => `[${i + 1}] (${p.length} chars)\n${p}`).join('\n\n')}

QA ISSUES TO FIX:
${issueList}

VOICE: ${voice}
Return ONLY a JSON array: ["post 1 text", "post 2 text", ...]`
    : `Fix this ${piece.platform} post. Address every QA issue. Keep under ${limit} characters. Preserve any URL at the end. Return ONLY the corrected post text — no quotes, no JSON, no commentary.

ORIGINAL POST (${piece.text_content?.length ?? 0} chars):
${piece.text_content}

QA ISSUES TO FIX:
${issueList}

VOICE: ${voice}
HARD LIMIT: ${limit} characters total including URL.
RULES: No en dashes (–) or em dashes (—). No "mind-blowing", "shocking", "ancient wisdom". Keep the intellectual substance intact.
Return ONLY the fixed post text.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  let newText: string = piece.text_content ?? '';
  let newSupplementary = supplementary;

  if (isThread) {
    try {
      const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const posts = JSON.parse(cleaned) as string[];
      newText = posts[0] ?? newText;
      newSupplementary = { ...supplementary, posts };
    } catch {
      // Parse failed — leave text unchanged, surface error
      return NextResponse.json({ error: 'Could not parse fixed thread posts from Claude', raw: raw.slice(0, 300) }, { status: 500 });
    }
  } else {
    newText = raw;
    // Hard-trim if still over limit (safety net)
    if (piece.platform === 'x' && newText.length > 280) {
      const urlMatch = newText.match(/\n\nhttps?:\/\/\S+$/);
      if (urlMatch) {
        const urlPart = urlMatch[0];
        const maxBody = 280 - urlPart.length;
        newText = newText.slice(0, newText.length - urlPart.length).slice(0, maxBody).replace(/\s+\S*$/, '') + urlPart;
      } else {
        newText = newText.slice(0, 280).replace(/\s+\S*$/, '');
      }
    }
  }

  // Save fixed text — reset to draft so human re-reviews
  const { error: updateErr } = await supabase
    .from('social_content_pieces')
    .update({
      text_content: newText,
      supplementary: newSupplementary,
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', body.piece_id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Clear the old QA result so it gets re-run fresh
  await supabase
    .from('social_qa_results')
    .delete()
    .eq('content_piece_id', body.piece_id);

  return NextResponse.json({
    ok: true,
    text_content: newText,
    supplementary: newSupplementary,
    char_count: newText.length,
  });
}
