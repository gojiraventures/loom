/**
 * DELETE /api/admin/research-queue/[id]  — remove a queued item (queued status only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createServerSupabaseClient();

  // Only allow deleting items that haven't started yet
  const { data: item } = await supabase
    .from('research_queue')
    .select('status')
    .eq('id', id)
    .single();

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.status !== 'queued') {
    return NextResponse.json({ error: 'Can only delete queued items' }, { status: 400 });
  }

  const { error } = await supabase.from('research_queue').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
