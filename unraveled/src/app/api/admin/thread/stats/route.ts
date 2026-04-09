/**
 * THREAD Stats — Dashboard counts
 * GET /api/admin/thread/stats
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const [
    { count: totalCandidates },
    { count: pendingCandidates },
    { count: totalSuggestions },
    { count: pendingSuggestions },
    { count: approvedSuggestions },
    { count: totalLeads },
    { count: newLeads },
    { count: totalPeople },
    { count: enrichedPeople },
    { count: totalInstitutions },
    { count: enrichedInstitutions },
    { data: topLead },
    { data: recentCandidate },
  ] = await Promise.all([
    supabase.from('discovery_candidates').select('*', { count: 'exact', head: true }),
    supabase.from('discovery_candidates').select('*', { count: 'exact', head: true }).eq('processed_by_tier2', false),
    supabase.from('discovery_suggestions').select('*', { count: 'exact', head: true }),
    supabase.from('discovery_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('discovery_suggestions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('research_leads').select('*', { count: 'exact', head: true }),
    supabase.from('research_leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('people_cards').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('people_cards').select('*', { count: 'exact', head: true }).eq('status', 'published').not('bio_enriched_at', 'is', null),
    supabase.from('institution_cards').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('institution_cards').select('*', { count: 'exact', head: true }).eq('status', 'published').not('bio_enriched_at', 'is', null),
    supabase.from('research_leads')
      .select('title, research_potential_score, entity_a_name:suggestion_id(entity_a_name), entity_b_name:suggestion_id(entity_b_name)')
      .order('research_potential_score', { ascending: false })
      .limit(1),
    supabase.from('discovery_candidates')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  // Ghost nodes: aggregate suggested_new_entities from all suggestions
  const { data: ghostData } = await supabase
    .from('discovery_suggestions')
    .select('suggested_new_entities')
    .not('suggested_new_entities', 'eq', '[]');

  const ghostCounts = new Map<string, number>();
  for (const row of (ghostData ?? [])) {
    for (const name of (row.suggested_new_entities as string[]) ?? []) {
      const normalized = name.trim();
      if (normalized.length > 2) {
        ghostCounts.set(normalized, (ghostCounts.get(normalized) ?? 0) + 1);
      }
    }
  }
  const ghostNodes = Array.from(ghostCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    candidates: {
      total: totalCandidates ?? 0,
      pending_tier2: pendingCandidates ?? 0,
    },
    suggestions: {
      total: totalSuggestions ?? 0,
      pending_review: pendingSuggestions ?? 0,
      approved: approvedSuggestions ?? 0,
    },
    leads: {
      total: totalLeads ?? 0,
      new: newLeads ?? 0,
    },
    enrichment: {
      people_total: totalPeople ?? 0,
      people_enriched: enrichedPeople ?? 0,
      institutions_total: totalInstitutions ?? 0,
      institutions_enriched: enrichedInstitutions ?? 0,
    },
    ghost_nodes: ghostNodes,
    last_scan_at: recentCandidate?.[0]?.created_at ?? null,
    top_lead: topLead?.[0] ?? null,
  });
}
