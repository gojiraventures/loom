/**
 * Session-aware Supabase client for Server Components and API route handlers.
 * Uses the anon key + user's JWT from cookies so RLS is enforced.
 *
 * Import only in server-side code (Server Components, Route Handlers).
 * Never import in Client Components — use createBrowserSupabaseClient() instead.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSessionSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only, that's fine
          }
        },
      },
    },
  );
}
