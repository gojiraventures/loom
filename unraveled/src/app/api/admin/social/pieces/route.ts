/**
 * GET  /api/admin/social/pieces?topic=...&platform=...&status=...
 *   Returns content pieces, optionally filtered.
 *
 * PATCH /api/admin/social/pieces
 *   Body: { id, status?, text_content?, supplementary?, scheduled_at? }
 *   Updates a single piece (approve / edit / reject / schedule).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get('topic');
  const platform = searchParams.get('platform');
  const status = searchParams.get('status');

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('social_content_pieces')
    .select('*')
    .order('day_offset', { ascending: true })
    .order('sort_order', { ascending: true });

  if (topic) query = query.eq('topic', topic);
  if (platform) query = query.eq('platform', platform);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pieces: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as {
    id: string;
    status?: string;
    text_content?: string;
    supplementary?: Record<string, unknown>;
    scheduled_at?: string | null;
  };

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) update.status = body.status;
  if (body.text_content !== undefined) update.text_content = body.text_content;
  if (body.supplementary !== undefined) update.supplementary = body.supplementary;
  if (body.scheduled_at !== undefined) update.scheduled_at = body.scheduled_at;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('social_content_pieces')
    .update(update)
    .eq('id', body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ piece: data });
}
