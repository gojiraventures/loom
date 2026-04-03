import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/submissions?status=pending|backlogged|actioned|dismissed|all
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

// POST /api/submissions — public submission from site
export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { submission_type, content, email } = body as Record<string, unknown>;

  if (!submission_type || !['person', 'institution', 'research'].includes(submission_type as string)) {
    return NextResponse.json({ error: 'submission_type must be person, institution, or research' }, { status: 400 });
  }
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const typeLabels: Record<string, string> = {
    person: 'Person suggestion',
    institution: 'Institution flag',
    research: 'Research request',
  };

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      submission_type,
      title: typeLabels[submission_type as string] ?? (submission_type as string),
      description: content.trim(),
      content: content.trim(),
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}

// PATCH /api/submissions — update status or notes
export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, status, notes } = body as Record<string, unknown>;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (status) {
    patch.status = status;
    if (status === 'actioned') patch.actioned_at = new Date().toISOString();
  }
  if (typeof notes === 'string') {
    patch.notes = notes;
    patch.reviewer_notes = notes; // write to both columns for compatibility
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('submissions').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/submissions?id=...
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('submissions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
