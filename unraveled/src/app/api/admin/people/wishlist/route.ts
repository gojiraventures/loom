import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_wishlist')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ wishlist: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();
  const { person_name, relationship_type, source_person_name, description } = body as {
    person_name: string;
    relationship_type?: string;
    source_person_name?: string;
    description?: string;
  };

  if (!person_name?.trim()) {
    return NextResponse.json({ error: 'person_name required' }, { status: 400 });
  }

  // Avoid duplicates
  const { data: existing } = await supabase
    .from('people_wishlist')
    .select('id')
    .eq('person_name', person_name.trim())
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ item: existing, duplicate: true });
  }

  const { data, error } = await supabase
    .from('people_wishlist')
    .insert({ person_name: person_name.trim(), relationship_type, source_person_name, description })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request) {
  const supabase = createServerSupabaseClient();
  const body = await request.json() as { id: string; status: string };
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  const { error } = await supabase.from('people_wishlist').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const { error } = await supabase.from('people_wishlist').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
