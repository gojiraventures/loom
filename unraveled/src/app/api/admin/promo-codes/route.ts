import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';

// GET /api/admin/promo-codes — list all codes
export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const admin = createServerSupabaseClient();
  const { data } = await admin
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  return NextResponse.json({ codes: data ?? [] });
}

// POST /api/admin/promo-codes — create a code
export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await req.json() as {
    code?: string;
    description?: string;
    max_uses?: number | null;
    duration_days?: number | null;
    expires_at?: string | null;
  };

  if (!body.code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const admin = createServerSupabaseClient();
  const { data, error } = await admin
    .from('promo_codes')
    .insert({
      code: body.code.trim().toUpperCase(),
      description: body.description ?? null,
      max_uses: body.max_uses ?? null,
      duration_days: body.duration_days ?? null,
      expires_at: body.expires_at ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ code: data });
}

// PATCH /api/admin/promo-codes — toggle active
export async function PATCH(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { id, active } = await req.json() as { id: string; active: boolean };
  const admin = createServerSupabaseClient();

  await admin.from('promo_codes').update({ active }).eq('id', id);
  return NextResponse.json({ ok: true });
}
