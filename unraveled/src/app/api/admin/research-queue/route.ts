/**
 * GET  /api/admin/research-queue  — list all queue items
 * POST /api/admin/research-queue  — add a topic to the queue
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_queue')
    .select('*')
    .order('status', { ascending: true })
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const { topic, title, research_questions, description, source_urls, priority } = body;

  if (!topic?.trim()) return NextResponse.json({ error: 'topic required' }, { status: 400 });
  if (!title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_queue')
    .insert({
      topic: topic.trim(),
      title: title.trim(),
      research_questions: Array.isArray(research_questions) ? research_questions.map(String) : [],
      description: description?.trim() || null,
      source_urls: source_urls?.trim() || null,
      priority: typeof priority === 'number' ? priority : 50,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}
