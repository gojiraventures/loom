import { createServerSupabaseClient } from '@/lib/supabase';

// Legacy hardcoded map — only used as fallback for the three seed topics
// that were published before the DB-driven publish flow existed.
const LEGACY_SLUG_TO_TOPIC: Record<string, string> = {
  'the-great-flood': 'global flood',
  'biblically-accurate-angels': 'biblically accurate angels',
  'watchers-nephilim': 'watchers nephilim',
};

/**
 * Resolves a URL slug to the internal topic key stored in topic_dossiers.
 * Checks the DB first (published dossiers with a slug), falls back to the
 * legacy hardcoded map for the three seed topics.
 */
export async function slugToTopic(slug: string): Promise<string | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_dossiers')
    .select('topic')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (data?.topic) return data.topic;
  return LEGACY_SLUG_TO_TOPIC[slug] ?? null;
}

/**
 * Returns featured published topics for the home page.
 */
export async function getFeaturedTopics(): Promise<{
  slug: string;
  topic: string;
  title: string;
  convergence_score: number;
  key_traditions: string[];
  summary: string | null;
}[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_dossiers')
    .select('slug, topic, title, best_convergence_score, key_traditions, summary')
    .eq('published', true)
    .eq('featured', true)
    .not('slug', 'is', null)
    .order('best_convergence_score', { ascending: false })
    .limit(6);

  return (data ?? []).map((d) => ({
    slug: d.slug,
    topic: d.topic,
    title: d.title ?? d.topic,
    convergence_score: d.best_convergence_score ?? 0,
    key_traditions: d.key_traditions ?? [],
    summary: d.summary,
  }));
}

/**
 * Returns aggregate stats for the dossiers and relationships preview sections.
 */
export async function getDossierStats(): Promise<{
  peopleCount: number;
  institutionCount: number;
  relationshipCount: number;
  entityCount: number;
}> {
  const supabase = createServerSupabaseClient();
  const [
    { count: peopleCount },
    { count: instCount },
    { count: relCount },
    { count: instRelCount },
  ] = await Promise.all([
    supabase.from('people').select('*', { count: 'exact', head: true }),
    supabase.from('institutions').select('*', { count: 'exact', head: true }),
    supabase.from('people_relationships').select('*', { count: 'exact', head: true }),
    supabase.from('institution_relationships').select('*', { count: 'exact', head: true }),
  ]);

  return {
    peopleCount: peopleCount ?? 0,
    institutionCount: instCount ?? 0,
    relationshipCount: (relCount ?? 0) + (instRelCount ?? 0),
    entityCount: (peopleCount ?? 0) + (instCount ?? 0),
  };
}

/**
 * Returns all published topics for the homepage and sitemap.
 */
export async function getPublishedTopics(): Promise<{
  slug: string;
  topic: string;
  title: string;
  convergence_score: number;
  key_traditions: string[];
  summary: string | null;
  published_at: string | null;
}[]> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from('topic_dossiers')
    .select('slug, topic, title, best_convergence_score, key_traditions, summary, published_at')
    .eq('published', true)
    .not('slug', 'is', null)
    .order('best_convergence_score', { ascending: false });

  return (data ?? []).map((d) => ({
    slug: d.slug,
    topic: d.topic,
    title: d.title ?? d.topic,
    convergence_score: d.best_convergence_score ?? 0,
    key_traditions: d.key_traditions ?? [],
    summary: d.summary,
    published_at: d.published_at ?? null,
  }));
}
