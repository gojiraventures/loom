/**
 * POST /api/admin/media/validate
 *
 * Validates all approved topic_media entries and removes dead links.
 * Checks YouTube via oEmbed, Spotify via oEmbed, others via HEAD.
 *
 * Body: { topic?: string }  — omit to validate ALL topics
 *
 * Returns: { checked, removed, kept, dead: [{ id, title, url, reason }] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateMediaUrls } from '@/lib/media/validate-url';
import { requireAdmin } from '@/lib/auth';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const body = await req.json().catch(() => ({})) as { topic?: string; dry_run?: boolean };
  const { topic, dry_run = false } = body;

  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('topic_media')
    .select('id, title, url, type, topic')
    .eq('approved', true);

  if (topic) query = query.eq('topic', topic);

  const { data: items, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items?.length) return NextResponse.json({ checked: 0, removed: 0, kept: 0, dead: [] });

  // Validate all URLs (5 concurrent)
  const results = await validateMediaUrls(
    items.map((i) => ({ id: i.id, url: i.url, type: i.type })),
    5,
  );

  const dead: { id: string; title: string; url: string; reason: string }[] = [];
  for (const [id, result] of results) {
    if (!result.valid) {
      const item = items.find((i) => i.id === id);
      dead.push({ id, title: item?.title ?? '', url: result.url ?? '', reason: result.reason ?? 'unknown' });
    }
  }

  if (!dry_run && dead.length > 0) {
    const { error: delErr } = await supabase
      .from('topic_media')
      .delete()
      .in('id', dead.map((d) => d.id));
    if (delErr) return NextResponse.json({ error: `Delete failed: ${delErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    checked: items.length,
    removed: dry_run ? 0 : dead.length,
    kept: items.length - dead.length,
    dead,
    dry_run,
  });
}
