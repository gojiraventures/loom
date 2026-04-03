/**
 * PATCH /api/admin/social/design/select
 * Sets one design variant as selected and deselects the rest for the piece.
 *
 * Body: { piece_id: string, variant_id: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { piece_id?: string; variant_id?: string };
  if (!body.piece_id || !body.variant_id) {
    return NextResponse.json({ error: 'piece_id and variant_id required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Deselect all variants for this piece
  await supabase
    .from('social_design_variants')
    .update({ selected: false })
    .eq('content_piece_id', body.piece_id);

  // Select the chosen one
  const { error } = await supabase
    .from('social_design_variants')
    .update({ selected: true })
    .eq('id', body.variant_id)
    .eq('content_piece_id', body.piece_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
