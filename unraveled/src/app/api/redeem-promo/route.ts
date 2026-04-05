import { NextRequest, NextResponse } from 'next/server';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 });

  const admin = createServerSupabaseClient();
  const normalised = code.trim().toUpperCase();

  // Fetch the code
  const { data: promo, error } = await admin
    .from('promo_codes')
    .select('*')
    .eq('code', normalised)
    .eq('active', true)
    .maybeSingle();

  if (error || !promo) {
    return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 });
  }

  // Check code-level expiry
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 });
  }

  // Check max uses
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 });
  }

  // Check if user already redeemed this code
  const { data: profile } = await admin
    .from('profiles')
    .select('redeemed_promo_code, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.redeemed_promo_code) {
    return NextResponse.json({ error: 'You have already redeemed a promo code' }, { status: 400 });
  }

  // Calculate expiry
  const promoExpiresAt = promo.duration_days
    ? new Date(Date.now() + promo.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Apply to profile (upsert in case no profile row yet)
  await admin.from('profiles').upsert({
    id: user.id,
    role: 'paid',
    redeemed_promo_code: normalised,
    promo_expires_at: promoExpiresAt,
  }, { onConflict: 'id' });

  // Increment uses
  await admin
    .from('promo_codes')
    .update({ uses_count: promo.uses_count + 1 })
    .eq('id', promo.id);

  return NextResponse.json({
    ok: true,
    permanent: !promo.duration_days,
    expiresAt: promoExpiresAt,
  });
}
