import { NextRequest, NextResponse } from 'next/server';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET /api/votes?ids=uuid1,uuid2,...
// Returns vote counts for the given backlog IDs, plus the current user's voted set.
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];

  const admin = createServerSupabaseClient();

  // Vote counts per backlog item
  const { data: counts } = await admin
    .from('topic_votes')
    .select('backlog_id')
    .in('backlog_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  const countMap: Record<string, number> = {};
  for (const row of counts ?? []) {
    countMap[row.backlog_id] = (countMap[row.backlog_id] ?? 0) + 1;
  }

  // Current user's votes (empty set if not logged in)
  let userVotes: string[] = [];
  try {
    const session = await createSessionSupabaseClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const { data: myVotes } = await session
        .from('topic_votes')
        .select('backlog_id')
        .in('backlog_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      userVotes = (myVotes ?? []).map((r) => r.backlog_id);
    }
  } catch {
    // unauthenticated — ignore
  }

  return NextResponse.json({ counts: countMap, userVotes });
}

// POST /api/votes
// Body: { backlog_id: string }
// Toggles the current user's vote (insert or delete).
export async function POST(req: NextRequest) {
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Role check — paid only
  const admin = createServerSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['paid', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Membership required to vote.' }, { status: 403 });
  }

  const { backlog_id } = await req.json() as { backlog_id?: string };
  if (!backlog_id) return NextResponse.json({ error: 'backlog_id required' }, { status: 400 });

  // Check if already voted
  const { data: existing } = await session
    .from('topic_votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('backlog_id', backlog_id)
    .single();

  if (existing) {
    // Un-vote
    await session.from('topic_votes').delete().eq('id', existing.id);
    return NextResponse.json({ voted: false });
  } else {
    // Vote
    await session.from('topic_votes').insert({ user_id: user.id, backlog_id });
    return NextResponse.json({ voted: true });
  }
}
