import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_backlog')
    .select('*')
    .order('status')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, topic, angle, research_questions, key_sources } = body;

  if (!title?.trim() || !topic?.trim()) {
    return NextResponse.json({ error: 'title and topic are required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_backlog')
    .insert({
      title: title.trim(),
      topic: topic.trim(),
      angle: angle?.trim() || null,
      research_questions: research_questions ?? [],
      key_sources: key_sources ?? [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  if (fields.status !== undefined) allowed.status = fields.status;
  if (fields.launched_session_id !== undefined) allowed.launched_session_id = fields.launched_session_id;
  if (fields.launched_at !== undefined) allowed.launched_at = fields.launched_at;

  if (fields.status === 'launched' && !fields.launched_at) {
    allowed.launched_at = new Date().toISOString();
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('research_backlog').update(allowed).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('research_backlog').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
