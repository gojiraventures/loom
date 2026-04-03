import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = createServerSupabaseClient();

  // Cancel all pending/running jobs first, then delete them
  await supabase
    .from('research_jobs')
    .update({ status: 'failed', error: 'Session cancelled by admin' })
    .eq('session_id', id)
    .in('status', ['pending', 'running', 'pending_approval']);

  await supabase.from('research_jobs').delete().eq('session_id', id);

  const { error } = await supabase.from('research_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_sessions')
    .select('id, topic, title, status, pipeline_locked, session_type, research_questions, synthesized_output, created_at, started_at, completed_at, error_log')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [] });
}
