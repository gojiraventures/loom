import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Must read raw body for signature verification — do not parse as JSON
export const runtime = 'nodejs';

async function getUserIdByCustomer(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  customerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    switch (event.type) {

      // ── New subscription started ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const supabaseUserId = session.metadata?.supabase_user_id;

        if (!supabaseUserId) {
          console.error('[stripe-webhook] no supabase_user_id in metadata');
          break;
        }

        // Fetch subscription to get period end (v22: period_end lives on items)
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
          expand: ['items'],
        });
        const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
        const expiresAt = new Date(periodEnd * 1000).toISOString();

        // Store stripe_customer_id and upgrade role
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', supabaseUserId);

        await supabase.rpc('upgrade_to_paid', {
          user_uuid: supabaseUserId,
          expires: expiresAt,
        });

        console.log(`[stripe-webhook] upgraded user ${supabaseUserId} → paid until ${expiresAt}`);
        break;
      }

      // ── Subscription renewed or plan changed ─────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await getUserIdByCustomer(supabase, customerId);
        if (!userId) break;

        if (sub.status === 'active') {
          const periodEnd = sub.items.data[0]?.current_period_end ?? 0;
          const expiresAt = new Date(periodEnd * 1000).toISOString();
          await supabase.rpc('upgrade_to_paid', { user_uuid: userId, expires: expiresAt });
        } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          await supabase
            .from('profiles')
            .update({ role: 'registered', subscription_status: sub.status })
            .eq('id', userId);
        }
        break;
      }

      // ── Subscription cancelled / payment failed ───────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const userId = await getUserIdByCustomer(supabase, customerId);
        if (!userId) break;

        await supabase
          .from('profiles')
          .update({ role: 'registered', subscription_status: 'cancelled' })
          .eq('id', userId);

        console.log(`[stripe-webhook] downgraded user ${userId} → registered`);
        break;
      }
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
