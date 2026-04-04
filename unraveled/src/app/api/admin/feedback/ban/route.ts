import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// POST /api/admin/feedback/ban
// Body: { user_id: string }
// Sets banned=true on profile and signs out all sessions via Supabase Admin API.
export async function POST(req: NextRequest) {
  const { user_id } = await req.json() as { user_id?: string };
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient();

  // Set banned flag
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ banned: true })
    .eq('id', user_id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Revoke all sessions via Supabase Admin API
  const { error: signOutError } = await supabase.auth.admin.signOut(user_id, 'global');
  if (signOutError) {
    console.error('[ban] session revoke error:', signOutError.message);
    // Non-fatal — profile is banned, sessions will expire naturally
  }

  return NextResponse.json({ ok: true });
}
