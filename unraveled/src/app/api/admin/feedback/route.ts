import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/admin/feedback — all article_feedback submissions, high priority first
export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('id, article_id, title, category, description, source_url, priority, status, account_age_days, user_id, created_at, submitter_user_id')
    .eq('submission_type', 'article_feedback')
    .order('priority', { ascending: false }) // high > elevated > normal (alphabetical, but we sort client-side)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

// PATCH /api/admin/feedback — update status or priority on a submission
export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status?: string; priority?: string };
  const { id, status, priority } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: Record<string, string> = {};
  if (status) updates.status = status;
  if (priority) updates.priority = priority;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
