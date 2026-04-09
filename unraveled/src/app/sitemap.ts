import type { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unraveledtruth.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient();

  const [
    { data: topics },
    { data: people },
    { data: institutions },
  ] = await Promise.all([
    supabase
      .from('topic_dossiers')
      .select('slug, updated_at, published_at')
      .eq('published', true)
      .not('slug', 'is', null)
      .order('published_at', { ascending: false }),
    supabase
      .from('people_cards')
      .select('slug, updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .order('full_name'),
    supabase
      .from('institution_cards')
      .select('slug, updated_at')
      .eq('status', 'published')
      .not('slug', 'is', null)
      .order('name'),
  ]);

  const topicUrls: MetadataRoute.Sitemap = (topics ?? []).map((t) => ({
    url: `${BASE_URL}/topics/${t.slug}`,
    lastModified: t.updated_at ?? t.published_at ?? new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const peopleUrls: MetadataRoute.Sitemap = (people ?? []).map((p) => ({
    url: `${BASE_URL}/people/${p.slug}`,
    lastModified: p.updated_at ?? new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  const institutionUrls: MetadataRoute.Sitemap = (institutions ?? []).map((i) => ({
    url: `${BASE_URL}/institutions/${i.slug}`,
    lastModified: i.updated_at ?? new Date().toISOString(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/topics`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/people`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/institutions`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/method`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...topicUrls,
    ...peopleUrls,
    ...institutionUrls,
  ];
}
