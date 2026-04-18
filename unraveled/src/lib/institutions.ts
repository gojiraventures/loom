import { createServerSupabaseClient } from '@/lib/supabase';

export interface InstitutionCard {
  id: string;
  slug: string | null;
  name: string;
  short_name: string | null;
  known_as: string[] | null;
  short_bio: string | null;
  bio: string | null;
  institution_type: string;
  sub_type: string | null;
  founded_year: string | null;
  founded_location: string | null;
  founder: string | null;
  headquarters_city: string | null;
  headquarters_state: string | null;
  headquarters_country: string | null;
  active: boolean;
  transparency_tier: string;
  relevance_summary: string | null;
  controversy_summary: string | null;
  website_url: string | null;
  wikipedia_url: string | null;
  grokipedia_url: string | null;
  logo_url: string | null;
  logo_storage_path: string | null;
  logo_status: string | null;
  status: string | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
  last_researched_at: string | null;
  people_count: number;
  topic_count: number;
  event_count: number;
  department_count: number;
  relationship_count: number;
}

export interface BioSection {
  id: string;
  institution_id: string;
  section_type: string;
  title: string;
  content: string;
  sort_order: number;
  agent_generated: boolean;
}

export interface InstitutionConnection {
  id: string;
  source_id: string;
  source_name: string;
  source_slug: string | null;
  target_id: string;
  target_name: string;
  target_slug: string | null;
  relationship_type: string;
  description: string | null;
  covert: boolean;
  declassified: boolean;
  start_year: string | null;
  end_year: string | null;
}

export interface InstitutionEvent {
  id: string;
  institution_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string | null;
  end_date: string | null;
  classified: boolean;
  declassified: boolean;
  declassified_source: string | null;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  short_name: string | null;
  description: string | null;
  founded_year: string | null;
  relevance_summary: string | null;
}

export interface PersonInstitution {
  id: string;
  person_id: string;
  institution_id: string;
  relationship: string;
  role_title: string | null;
  description: string | null;
  start_year: string | null;
  end_year: string | null;
  covert: boolean;
  declassified: boolean;
  membership_status: string;
  full_name: string;
  person_slug: string | null;
  short_bio: string | null;
  credibility_tier: string;
}

export async function listInstitutions(): Promise<InstitutionCard[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_cards')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as InstitutionCard[];
}

export async function getInstitutionBySlug(slug: string): Promise<InstitutionCard | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_cards')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data as InstitutionCard;
}

export async function getInstitutionById(id: string): Promise<InstitutionCard | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_cards')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as InstitutionCard;
}

export async function getBioSections(institutionId: string): Promise<BioSection[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_bio_sections')
    .select('*')
    .eq('institution_id', institutionId)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as BioSection[];
}

export async function getInstitutionConnections(institutionId: string): Promise<InstitutionConnection[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_connections')
    .select('*')
    .or(`source_id.eq.${institutionId},target_id.eq.${institutionId}`);
  if (error) throw error;
  return (data ?? []) as InstitutionConnection[];
}

export async function getInstitutionEvents(institutionId: string): Promise<InstitutionEvent[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_events')
    .select('*')
    .eq('institution_id', institutionId)
    .order('event_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as InstitutionEvent[];
}

export async function getInstitutionDepartments(institutionId: string): Promise<Department[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('institution_departments')
    .select('*')
    .eq('institution_id', institutionId)
    .order('founded_year');
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function getPeopleAtInstitution(institutionId: string): Promise<PersonInstitution[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('people_institutions')
    .select(`
      id, person_id, institution_id, relationship, role_title, description,
      start_year, end_year, covert, declassified,
      people (full_name, slug, short_bio, credibility_tier)
    `)
    .eq('institution_id', institutionId)
    .order('start_year', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as Record<string, unknown>;
    const person = r.people as Record<string, unknown>;
    return {
      id: r.id as string,
      person_id: r.person_id as string,
      institution_id: r.institution_id as string,
      relationship: r.relationship as string,
      role_title: r.role_title as string | null,
      description: r.description as string | null,
      start_year: r.start_year as string | null,
      end_year: r.end_year as string | null,
      covert: r.covert as boolean,
      declassified: r.declassified as boolean,
      membership_status: (r.membership_status as string) ?? 'unknown',
      full_name: person?.full_name as string,
      person_slug: person?.slug as string | null,
      short_bio: person?.short_bio as string | null,
      credibility_tier: person?.credibility_tier as string,
    };
  });
}

export async function getInstitutionDiscourse(institutionId: string): Promise<import('@/components/PublicDiscourseSection').DiscourseEntry[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('public_discourse')
    .select('id, sentiment, claim, claim_source, claim_source_url, response_summary, response_source, response_source_url, extracted_by')
    .eq('institution_id', institutionId)
    .order('sentiment');
  if (error) return [];
  return (data ?? []) as import('@/components/PublicDiscourseSection').DiscourseEntry[];
}

export async function upsertInstitution(data: Record<string, unknown>): Promise<{ id: string }> {
  const supabase = createServerSupabaseClient();
  const { data: result, error } = await supabase
    .from('institutions')
    .upsert(data, { onConflict: 'slug' })
    .select('id')
    .single();
  if (error) throw error;
  return result as { id: string };
}

export async function upsertBioSection(institutionId: string, section: Record<string, unknown>): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('institution_bio_sections')
    .upsert({ ...section, institution_id: institutionId }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteInstitution(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('institutions').delete().eq('id', id);
  if (error) throw error;
}
