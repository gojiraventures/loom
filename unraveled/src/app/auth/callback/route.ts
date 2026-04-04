import { NextResponse } from 'next/server';
import { createSessionSupabaseClient } from '@/lib/supabase-session';

/**
 * OAuth callback handler.
 * Supabase redirects here after provider auth with a one-time `code`.
 * We exchange it for a session, set the cookie, then redirect the user.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSessionSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to intended destination (or home)
  const destination = next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(destination, url.origin));
}
