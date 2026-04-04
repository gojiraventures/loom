import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Browser client — for Client Components.
 * Uses anon key with the user's session from cookies.
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Server client (service role) — for admin API routes.
 * Bypasses RLS entirely. Never expose to users.
 */
export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
