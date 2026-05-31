/**
 * GET  /api/admin/health/citations  — list unreviewed citation blocks
 * POST /api/admin/health/citations  — mark a citation as reviewed
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('citation_review_queue')
    .select('*')
    .eq('reviewed', false)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [], total: data?.length ?? 0 });
}

export async function POST(req: Request) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id, reviewer_note } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('citation_review_queue')
    .update({
      reviewed: true,
      reviewer_note: reviewer_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
