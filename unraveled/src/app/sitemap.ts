import type { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unraveled.ai';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerSupabaseClient();

  const { data: topics } = await supabase
    .from('topic_dossiers')
    .select('slug, updated_at, published_at')
    .eq('published', true)
    .not('slug', 'is', null)
    .order('published_at', { ascending: false });

  const topicUrls: MetadataRoute.Sitemap = (topics ?? []).map((t) => ({
    url: `${BASE_URL}/topics/${t.slug}`,
    lastModified: t.updated_at ?? t.published_at ?? new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 0.8,
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
      url: `${BASE_URL}/method`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...topicUrls,
  ];
}
