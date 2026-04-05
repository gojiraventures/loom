import { NextResponse } from 'next/server';
import { createSessionSupabaseClient } from '@/lib/supabase-session';

export const ADMIN_EMAILS = new Set(['mikeburnsinnovate@gmail.com', 'mike@xfuel.ai']);

/**
 * Call at the top of every /api/admin/* handler.
 * Returns the verified user or a 401/403 NextResponse.
 */
export async function requireAdmin(): Promise<
  { user: Awaited<ReturnType<Awaited<ReturnType<typeof createSessionSupabaseClient>>['auth']['getUser']>>['data']['user']; error: null } |
  { user: null; error: NextResponse }
> {
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!user.email || !ADMIN_EMAILS.has(user.email)) {
    return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, error: null };
}
