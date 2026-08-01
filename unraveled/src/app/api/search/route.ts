/**
 * GET /api/search?q=...
 *
 * Public site search across published articles, people, and institutions.
 * Keyword (ilike) match on titles/names/summaries — fast and index-friendly at
 * this corpus size. Only ever returns published/public content.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface SearchHit {
  type: 'article' | 'person' | 'institution';
  slug: string;
  title: string;
  snippet: string | null;
  meta?: string | null;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ q, hits: [], grouped: { articles: [], people: [], institutions: [] } });

  // Sanitize for PostgREST .or() wildcards (which use * and are comma-delimited).
  const term = q.replace(/[,()*%]/g, ' ').replace(/\s+/g, ' ').trim();
  const w = `*${term}*`;
  const supabase = createServerSupabaseClient();

  const [articlesRes, peopleRes, institutionsRes] = await Promise.all([
    supabase
      .from('topic_dossiers')
      .select('slug, title, topic, summary')
      .eq('published', true)
      .not('slug', 'is', null)
      .or(`title.ilike.${w},summary.ilike.${w},topic.ilike.${w}`)
      .limit(25),
    supabase
      .from('people')
      .select('slug, full_name, short_bio, current_role, nationality')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .or(`full_name.ilike.${w},short_bio.ilike.${w},current_role.ilike.${w}`)
      .limit(25),
    supabase
      .from('institutions')
      .select('slug, name, short_name, short_bio, institution_type')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .or(`name.ilike.${w},short_name.ilike.${w},short_bio.ilike.${w}`)
      .limit(25),
  ]);

  const articles: SearchHit[] = (articlesRes.data ?? []).map((d) => ({
    type: 'article',
    slug: d.slug as string,
    title: (d.title as string) ?? (d.topic as string),
    snippet: (d.summary as string | null)?.slice(0, 180) ?? null,
  }));
  const people: SearchHit[] = (peopleRes.data ?? []).map((p) => ({
    type: 'person',
    slug: p.slug as string,
    title: p.full_name as string,
    snippet: (p.short_bio as string | null)?.slice(0, 160) ?? null,
    meta: [p.current_role, p.nationality].filter(Boolean).join(' · ') || null,
  }));
  const institutions: SearchHit[] = (institutionsRes.data ?? []).map((i) => ({
    type: 'institution',
    slug: i.slug as string,
    title: i.name as string,
    snippet: (i.short_bio as string | null)?.slice(0, 160) ?? null,
    meta: (i.institution_type as string | null) ?? null,
  }));

  // Rank: title/name matches that start with the term first.
  const lower = term.toLowerCase();
  const rank = (h: SearchHit) => (h.title.toLowerCase().startsWith(lower) ? 0 : h.title.toLowerCase().includes(lower) ? 1 : 2);
  for (const list of [articles, people, institutions]) list.sort((a, b) => rank(a) - rank(b));

  return NextResponse.json({
    q,
    grouped: { articles, people, institutions },
    total: articles.length + people.length + institutions.length,
  });
}
