import { createServerSupabaseClient } from '@/lib/supabase';

export interface LocationCard {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  location_type: string;
  short_bio: string | null;
  significance: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  classification_status: string;
  declassified_year: number | null;
  active: boolean;
  status: string;
  featured: boolean;
  created_at: string;
  updated_at: string;
  people_count: number;
  group_count: number;
  topic_count: number;
}

export async function listLocations(): Promise<LocationCard[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('location_cards')
    .select('*')
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('name');
  if (error) throw error;
  return (data ?? []) as LocationCard[];
}

export async function getLocationBySlug(slug: string): Promise<LocationCard | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('location_cards')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as LocationCard;
}

export async function upsertLocation(data: Record<string, unknown>): Promise<{ id: string }> {
  const supabase = createServerSupabaseClient();
  const { data: result, error } = await supabase
    .from('locations')
    .upsert(data, { onConflict: 'slug' })
    .select('id')
    .single();
  if (error) throw error;
  return result as { id: string };
}
