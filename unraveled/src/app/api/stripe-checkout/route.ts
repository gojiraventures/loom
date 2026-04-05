import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

const PRICE_IDS = {
  monthly: 'price_1TIfCN0twpkeumjyAsljnnKJ',
  annual:  'price_1TIfCR0twpkeumjymgOYNPBI',
} as const;

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unraveledtruth.com';

// POST /api/stripe-checkout
// Body: { plan: 'monthly' | 'annual' }
// Creates a Stripe checkout session and returns the URL to redirect to.
export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json() as { plan?: 'monthly' | 'annual' };
  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'plan must be "monthly" or "annual"' }, { status: 400 });
  }

  // Re-use existing Stripe customer if available
  const admin = createServerSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${BASE_URL}/account?upgraded=1`,
    cancel_url:  `${BASE_URL}/upgrade?cancelled=1`,
    metadata: {
      supabase_user_id: user.id, // webhook uses this to find the profile
    },
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  };

  // Attach to existing customer or pre-fill email
  if (profile?.stripe_customer_id) {
    checkoutParams.customer = profile.stripe_customer_id;
  } else {
    checkoutParams.customer_email = user.email;
  }

  const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);
  return NextResponse.json({ url: checkoutSession.url });
}
