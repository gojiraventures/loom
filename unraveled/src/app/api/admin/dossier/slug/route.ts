/**
 * POST /api/admin/dossier/slug  { topic }
 *
 * Returns an SEO/GEO-optimized slug suggestion for a dossier (does not save —
 * the admin reviews it, then Save Slug / Publish persists it). Guaranteed unique.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/auth';
import { generateSeoSlug, ensureUniqueSlug } from '@/lib/slug';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const { topic } = (await req.json().catch(() => ({}))) as { topic?: string };
  if (!topic) return NextResponse.json({ error: 'topic required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: dossier } = await supabase
    .from('topic_dossiers')
    .select('title, driving_question, summary, synthesized_output')
    .eq('topic', topic)
    .maybeSingle();

  if (!dossier) return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });

  const syn = dossier.synthesized_output as { title?: string; executive_summary?: string } | null;
  const title = (dossier.title as string | null) ?? syn?.title ?? topic;
  const summary = (dossier.summary as string | null) ?? syn?.executive_summary ?? null;

  const base = await generateSeoSlug({
    title,
    topic,
    drivingQuestion: dossier.driving_question as string | null,
    summary,
  });
  const slug = await ensureUniqueSlug(supabase, base, topic);

  return NextResponse.json({ slug });
}
