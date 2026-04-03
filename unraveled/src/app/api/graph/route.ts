import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function parseYear(val: string | null | undefined): number | null {
  if (!val) return null;
  const n = parseInt(val.toString().slice(0, 4), 10);
  return isNaN(n) ? null : n;
}

export async function GET() {
  const supabase = createServerSupabaseClient();

  const [
    { data: people },
    { data: institutions },
    { data: ppEdges },
    { data: piEdges },
    { data: iiEdges },
  ] = await Promise.all([
    supabase
      .from('people_cards')
      .select('id, full_name, slug, credibility_tier, short_bio, photo_url, born_date, died_date, faith, political_party, relationship_count')
      .eq('status', 'published'),
    supabase
      .from('institution_cards')
      .select('id, name, slug, institution_type, short_bio, logo_url, founded_year, dissolved_year, people_count, relationship_count, transparency_tier')
      .eq('status', 'published'),
    supabase
      .from('people_connections')
      .select('id, source_id, target_id, relationship_type, start_year, end_year, strength, bidirectional, description'),
    supabase
      .from('people_institutions')
      .select('id, person_id, institution_id, relationship, start_year, end_year, covert, declassified, membership_status, role_title, description'),
    supabase
      .from('institution_connections')
      .select('id, source_id, target_id, relationship_type, start_year, end_year, covert, declassified, description'),
  ]);

  // Build node list
  const nodes = [
    ...(people ?? []).map((p: Record<string, unknown>) => ({
      id: p.id as string,
      type: 'person' as const,
      name: p.full_name as string,
      slug: p.slug as string | null,
      subtype: p.credibility_tier as string | null,
      short_bio: p.short_bio as string | null,
      photo_url: p.photo_url as string | null,
      faith: p.faith as string | null,
      political_party: p.political_party as string | null,
      year: parseYear(p.born_date as string),
      died_year: parseYear(p.died_date as string),
      connection_count: (p.relationship_count as number) ?? 0,
    })),
    ...(institutions ?? []).map((inst: Record<string, unknown>) => ({
      id: inst.id as string,
      type: 'institution' as const,
      name: inst.name as string,
      slug: inst.slug as string | null,
      subtype: inst.institution_type as string | null,
      short_bio: inst.short_bio as string | null,
      photo_url: (inst.logo_url as string | null) ?? null,
      transparency_tier: inst.transparency_tier as string | null,
      year: parseYear(inst.founded_year as string),
      died_year: parseYear(inst.dissolved_year as string),
      connection_count: ((inst.people_count as number) ?? 0) + ((inst.relationship_count as number) ?? 0),
    })),
  ];

  // Build edge list
  const edges = [
    ...(ppEdges ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      source: e.source_id as string,
      target: e.target_id as string,
      type: e.relationship_type as string,
      edge_kind: 'pp' as const,
      start_year: parseYear(e.start_year as string),
      end_year: parseYear(e.end_year as string),
      covert: false,
      membership_status: null,
      strength: (e.strength as number) ?? 3,
      description: e.description as string | null,
    })),
    ...(piEdges ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      source: e.person_id as string,
      target: e.institution_id as string,
      type: e.relationship as string,
      edge_kind: 'pi' as const,
      start_year: parseYear(e.start_year as string),
      end_year: parseYear(e.end_year as string),
      covert: (e.covert as boolean) ?? false,
      membership_status: e.membership_status as string | null,
      strength: 3,
      description: e.description as string | null,
    })),
    ...(iiEdges ?? []).map((e: Record<string, unknown>) => ({
      id: e.id as string,
      source: e.source_id as string,
      target: e.target_id as string,
      type: e.relationship_type as string,
      edge_kind: 'ii' as const,
      start_year: parseYear(e.start_year as string),
      end_year: parseYear(e.end_year as string),
      covert: (e.covert as boolean) ?? false,
      membership_status: null,
      strength: 3,
      description: e.description as string | null,
    })),
  ];

  // Return all published nodes — isolates are still useful to see in the graph
  return NextResponse.json({ nodes, edges });
}
