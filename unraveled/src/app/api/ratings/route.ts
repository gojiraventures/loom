import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createSessionSupabaseClient } from '@/lib/supabase-session';

// GET /api/ratings?article_id=xxx
// Public: returns aggregate average + count.
// If the requester is logged in, also returns their existing rating.
export async function GET(req: NextRequest) {
  const articleId = req.nextUrl.searchParams.get('article_id');
  if (!articleId) return NextResponse.json({ error: 'article_id required' }, { status: 400 });

  const supabase = createServerSupabaseClient(); // service role for aggregate

  const { data: rows, error } = await supabase
    .from('article_ratings')
    .select('rating, user_id')
    .eq('article_id', articleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const count = rows?.length ?? 0;
  const average = count > 0
    ? Math.round((rows!.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : null;

  // Check for user's own rating if they're logged in
  let userRating: number | null = null;
  try {
    const session = await createSessionSupabaseClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const mine = rows?.find((r) => r.user_id === user.id);
      userRating = mine?.rating ?? null;
    }
  } catch {
    // No session — fine, userRating stays null
  }

  return NextResponse.json({ average, count, user_rating: userRating });
}

// POST /api/ratings
// Body: { article_id: string, rating: 1-5 }
// Requires auth. Upserts (not inserts) so users can change their rating.
export async function POST(req: NextRequest) {
  const body = await req.json() as { article_id?: string; rating?: number };
  const { article_id, rating } = body;

  if (!article_id) return NextResponse.json({ error: 'article_id required' }, { status: 400 });
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }

  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Upsert — conflict on (article_id, user_id) updates the rating in place
  const { error } = await session
    .from('article_ratings')
    .upsert({ article_id, user_id: user.id, rating }, { onConflict: 'article_id,user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return updated aggregate for optimistic UI refresh
  const admin = createServerSupabaseClient();
  const { data: rows } = await admin
    .from('article_ratings')
    .select('rating')
    .eq('article_id', article_id);

  const count = rows?.length ?? 0;
  const average = count > 0
    ? Math.round((rows!.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
    : null;

  // Auto-flag low-rated articles in admin (< 2.5 avg with > 10 ratings)
  if (count > 10 && average !== null && average < 2.5) {
    const adminClient = createServerSupabaseClient();
    await adminClient.from('topic_dossiers')
      .update({ flagged_low_rating: true })
      .eq('slug', article_id)
      .then(() => null, () => null); // best-effort, column may not exist yet
  }

  return NextResponse.json({ ok: true, average, count, user_rating: rating });
}
