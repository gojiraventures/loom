import { createServerSupabaseClient } from '@/lib/supabase';

export interface PersonRow {
  id: string;
  slug: string | null;
  full_name: string;
  known_as: string[] | null;
  short_bio: string | null;
  bio: string | null;
  born_date: string | null;
  born_location: string | null;
  died_date: string | null;
  nationality: string | null;
  credibility_tier: string;
  current_role: string | null;
  work_history: unknown;
  education: unknown;
  notable_claims: unknown;
  key_positions: string[] | null;
  website_url: string | null;
  twitter_handle: string | null;
  wikipedia_url: string | null;
  photo_url: string | null;
  photo_storage_path: string | null;
  photo_status: string | null;
  status: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  last_researched_at: string | null;
}

export interface PersonCard extends PersonRow {
  relationship_count: number;
  media_count: number;
  topic_count: number;
}

export interface BioSection {
  id: string;
  person_id: string;
  section_type: string;
  title: string;
  content: string;
  sort_order: number;
  sources: unknown;
  agent_generated: boolean;
  manually_edited: boolean;
}

export interface PersonRelationship {
  id: string;
  source_id: string;
  source_name: string;
  source_slug: string | null;
  target_id: string;
  target_name: string;
  target_slug: string | null;
  relationship_type: string;
  description: string | null;
  strength: number;
  bidirectional: boolean;
  start_year: string | null;
  end_year: string | null;
}

export interface PersonMedia {
  id: string;
  person_id: string;
  media_type: string;
  title: string;
  platform: string | null;
  url: string | null;
  thumbnail_url: string | null;
  published_date: string | null;
  duration_minutes: number | null;
  description: string | null;
  approved: boolean;
  featured: boolean;
}

export interface PersonSocial {
  id: string;
  platform: string;
  url: string;
  handle: string | null;
  verified: boolean;
  follower_count: number | null;
  sort_order: number;
  platform_name?: string;
  icon_name?: string;
  platform_color?: string;
}

export interface PersonBook {
  id: string;
  book_id: string;
  relationship: string;
  context: string | null;
  title: string;
  author_name: string;
  cover_url: string | null;
  amazon_url: string | null;
  published_year: string | null;
  description: string | null;
}

export async function listPeople(opts?: { status?: string }): Promise<PersonCard[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase.from('people_cards').select('*').order('full_name');
  if (opts?.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PersonCard[];
}

export async function getPersonBySlug(slug: string): Promise<PersonCard | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_cards')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as PersonCard;
}

export async function getPersonById(id: string): Promise<PersonRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as PersonRow;
}

export async function getBioSections(personId: string): Promise<BioSection[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_bio_sections')
    .select('*')
    .eq('person_id', personId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as BioSection[];
}

export async function getPersonConnections(personId: string): Promise<PersonRelationship[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_connections')
    .select('*')
    .eq('source_id', personId);
  if (error) throw error;
  return (data ?? []) as PersonRelationship[];
}

export async function getPersonMedia(personId: string, approvedOnly = true): Promise<PersonMedia[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from('people_media')
    .select('*')
    .eq('person_id', personId)
    .order('published_date', { ascending: false });
  if (approvedOnly) query = query.eq('approved', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PersonMedia[];
}

export async function getPersonSocials(personId: string): Promise<PersonSocial[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_social_display')
    .select('*')
    .eq('person_id', personId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as PersonSocial[];
}

export async function getPersonBooks(personId: string): Promise<PersonBook[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_books_link')
    .select(`
      id, book_id, relationship, context,
      books (title, author_name, cover_url, amazon_url, published_year, description)
    `)
    .eq('person_id', personId);
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const book = r.books as Record<string, unknown>;
    return {
      id: r.id as string,
      book_id: r.book_id as string,
      relationship: r.relationship as string,
      context: r.context as string | null,
      title: book?.title as string,
      author_name: book?.author_name as string,
      cover_url: book?.cover_url as string | null,
      amazon_url: book?.amazon_url as string | null,
      published_year: book?.published_year as string | null,
      description: book?.description as string | null,
    };
  });
}

export async function upsertPerson(data: Partial<PersonRow> & { full_name: string }): Promise<PersonRow> {
  const supabase = createServerSupabaseClient();
  const { data: result, error } = await supabase
    .from('people')
    .upsert(data, { onConflict: 'slug' })
    .select()
    .single();
  if (error) throw error;
  return result as PersonRow;
}

export async function upsertBioSection(data: Omit<BioSection, 'id'> & { id?: string }): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('people_bio_sections')
    .upsert(data, { onConflict: 'id' });
  if (error) throw error;
}

export async function upsertRelationship(data: {
  person_a_id: string;
  person_b_id: string;
  relationship_type: string;
  description?: string;
  strength?: number;
  bidirectional?: boolean;
  start_year?: string;
}): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('people_relationships')
    .upsert(data, { onConflict: 'person_a_id,person_b_id,relationship_type' });
  if (error) throw error;
}

export async function deletePerson(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}
