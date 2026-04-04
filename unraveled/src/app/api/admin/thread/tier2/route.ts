/**
 * THREAD Tier 2 + Tier 3 — Ollama Deep Scan + Interestingness Scoring
 *
 * POST /api/admin/thread/tier2
 * Body: { batch_size?: number (default 20), min_method_priority?: string }
 *
 * Flow:
 *  1. Fetch unprocessed discovery_candidates (max batch_size)
 *  2. For each candidate: build context package, call Ollama, parse response
 *  3. Write discovery_suggestions
 *  4. Mark candidates as processed
 *  5. Run Tier 3 scoring on new suggestions (confidence >= 0.3)
 *  6. Generate research_leads for research_potential_score >= 0.7
 *
 * Called by: n8n cron workflow (2am daily) or admin "Process Queue" button
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryOllama } from '@/lib/research/llm/ollama';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Method priority for partial queue processing
const METHOD_PRIORITY: Record<string, number> = {
  name_mention: 1,
  date_overlap: 2,
  shared_institution: 3,
  shared_tags: 4,
  geographic_proximity: 5,
};

// Domain category mapping for surprise scoring
const DOMAIN_CATEGORIES: Record<string, string> = {
  academic: 'academic',
  independent_researcher: 'academic',
  journalist: 'media',
  public_figure: 'media',
  whistleblower: 'dissident',
  witness: 'dissident',
  historical_figure: 'historical',
  intelligence: 'intelligence',
  military: 'intelligence',
  government_agency: 'government',
  think_tank: 'government',
  secret_society: 'esoteric',
  religious: 'esoteric',
  university: 'academic',
  research_institute: 'academic',
  museum: 'cultural',
};

const CROSS_DOMAIN_SURPRISE: Record<string, Record<string, number>> = {
  academic: { intelligence: 0.8, esoteric: 0.7, dissident: 0.6, government: 0.5, media: 0.4 },
  intelligence: { academic: 0.8, esoteric: 0.9, dissident: 0.7, media: 0.6 },
  esoteric: { intelligence: 0.9, academic: 0.7, government: 0.8 },
  dissident: { intelligence: 0.7, government: 0.6 },
};

// ── Tier 2: Ollama inference ──────────────────────────────────────────────────

async function runOllamaOnCandidate(candidate: Record<string, unknown>, contextA: string, contextB: string, existingA: string[], existingB: string[]): Promise<Record<string, unknown> | null> {
  const systemPrompt = `You are a research analyst for UnraveledTruth, an investigative platform studying hidden connections across history, academia, intelligence, religion, and archaeology. You assess whether undocumented relationships exist between people and institutions.

Be analytical, specific, and honest about confidence levels. If evidence is thin, say so. Never fabricate connections — base everything on the provided context.

Respond ONLY in valid JSON matching the exact schema requested. No prose, no markdown.`;

  const userPrompt = `Analyze whether a meaningful undocumented relationship exists between these two entities.

ENTITY A: ${candidate.entity_a_name} (${candidate.entity_a_type})
${contextA}

ENTITY B: ${candidate.entity_b_name} (${candidate.entity_b_type})
${contextB}

EXISTING CONNECTIONS (A): ${existingA.length > 0 ? existingA.join('; ') : 'none documented'}
EXISTING CONNECTIONS (B): ${existingB.length > 0 ? existingB.join('; ') : 'none documented'}

DETECTION SIGNAL: ${candidate.detection_method} — ${JSON.stringify(candidate.detection_details)}

TASK: Determine if a plausible direct or indirect relationship exists.

Relationship type must be one of: colleague, collaborator, mentor, student, funded, employed, affiliated, investigated, contradicted, criticized, succeeded, preceded, front_for, recruited, influenced

Respond with this JSON schema exactly:
{
  "relationship_exists": boolean,
  "relationship_type": string,
  "strength": 1-5,
  "confidence": 0.0-1.0,
  "reasoning": "concise explanation of the evidence",
  "evidence_summary": "human-readable summary for editorial team",
  "suggested_new_entities": ["name1", "name2"],
  "anomaly_notes": "anything unusual, suspicious, or potentially covert — or null"
}`;

  try {
    const response = await queryOllama({
      provider: 'ollama',
      systemPrompt,
      userPrompt,
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 1024,
    });

    const parsed = (response.parsed ?? JSON.parse(response.text)) as Record<string, unknown>;
    return parsed;
  } catch (err) {
    console.error('[thread/tier2] Ollama error for candidate', candidate.id, err);
    return null;
  }
}

// ── Tier 3: Interestingness scoring ──────────────────────────────────────────

function scoreSurprise(
  aSubtype: string | null,
  bSubtype: string | null,
  aHasCovertEdges: boolean,
  bHasCovertEdges: boolean,
): number {
  const aCat = DOMAIN_CATEGORIES[aSubtype ?? ''] ?? 'unknown';
  const bCat = DOMAIN_CATEGORIES[bSubtype ?? ''] ?? 'unknown';

  let score = 0.2; // baseline — same domain

  if (aCat !== bCat && aCat !== 'unknown' && bCat !== 'unknown') {
    const crossScore = CROSS_DOMAIN_SURPRISE[aCat]?.[bCat]
      ?? CROSS_DOMAIN_SURPRISE[bCat]?.[aCat]
      ?? 0.5;
    score = crossScore;
  }

  if (aHasCovertEdges || bHasCovertEdges) score = Math.min(1, score + 0.1);
  return parseFloat(score.toFixed(3));
}

function scoreBridge(
  entityAId: string,
  entityBId: string,
  allEdges: Array<{ source: string; target: string }>,
): number {
  // Build adjacency sets
  const neighborsOf = (id: string): Set<string> => {
    const neighbors = new Set<string>();
    for (const e of allEdges) {
      if (e.source === id) neighbors.add(e.target);
      if (e.target === id) neighbors.add(e.source);
    }
    return neighbors;
  };

  const aNeighbors = neighborsOf(entityAId);
  const bNeighbors = neighborsOf(entityBId);

  // Count shared neighbors (common ground)
  let sharedCount = 0;
  for (const n of aNeighbors) {
    if (bNeighbors.has(n)) sharedCount++;
  }

  // BFS to find shortest path between A and B
  const visited = new Set<string>([entityAId]);
  const queue: Array<{ id: string; dist: number }> = [{ id: entityAId, dist: 0 }];
  let shortestPath = Infinity;

  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    if (id === entityBId) { shortestPath = dist; break; }
    if (dist > 4) continue; // don't search beyond 4 hops
    for (const e of allEdges) {
      let next: string | null = null;
      if (e.source === id && !visited.has(e.target)) next = e.target;
      if (e.target === id && !visited.has(e.source)) next = e.source;
      if (next) { visited.add(next); queue.push({ id: next, dist: dist + 1 }); }
    }
  }

  // Score: higher when no common neighbors and no existing short path
  let score = 0.3;
  if (shortestPath === Infinity) score = 0.9; // completely separate clusters
  else if (shortestPath >= 4) score = 0.75;
  else if (shortestPath === 3) score = 0.55;
  else if (shortestPath === 2) score = 0.35;

  if (sharedCount === 0) score = Math.min(1, score + 0.1);
  if (aNeighbors.size > 5 && bNeighbors.size > 5) score = Math.min(1, score + 0.1);

  return parseFloat(score.toFixed(3));
}

function scoreCovertSignal(
  suggestion: Record<string, unknown>,
  aHasCovertEdges: boolean,
  bHasCovertEdges: boolean,
  sharedIndirectCount: number,
): number {
  let score = 0;

  if (sharedIndirectCount > 3) score += 0.5;
  else if (sharedIndirectCount > 1) score += 0.3;

  if (aHasCovertEdges) score += 0.2;
  if (bHasCovertEdges) score += 0.2;
  if (suggestion.anomaly_notes) score += 0.1;

  const relType = (suggestion.suggested_relationship_type as string) ?? '';
  if (relType === 'front_for' || relType === 'recruited') score += 0.2;

  return parseFloat(Math.min(1, score).toFixed(3));
}

function scoreTemporalAnomaly(detectionDetails: Record<string, unknown>): number {
  let score = 0;

  const aStart = detectionDetails.a_years as { start: number | null; end: number | null } | undefined;
  const bStart = detectionDetails.b_years as { start: number | null; end: number | null } | undefined;

  if (!aStart || !bStart) return 0;

  const aS = aStart.start;
  const aE = aStart.end;
  const bS = bStart.start;
  const bE = bStart.end;

  if (aS && aE && bS && bE) {
    const overlapStart = Math.max(aS, bS);
    const overlapEnd = Math.min(aE, bE);
    const overlapYears = overlapEnd - overlapStart;

    if (overlapYears > 0 && overlapYears <= 3) score = 0.7; // very tight overlap
    else if (overlapYears > 0 && overlapYears <= 8) score = 0.4;
    else if (overlapYears > 0) score = 0.2;

    // Suspicious succession: A ends, B starts within 2 years
    if (aE && bS && Math.abs(aE - bS) <= 2) score = Math.max(score, 0.8);
    if (bE && aS && Math.abs(bE - aS) <= 2) score = Math.max(score, 0.8);
  }

  return parseFloat(Math.min(1, score).toFixed(3));
}

// ── Lead generation via Ollama ────────────────────────────────────────────────

async function generateResearchLead(
  suggestion: Record<string, unknown>,
  interestingness: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const systemPrompt = `You are an editorial researcher for UnraveledTruth, an investigative platform studying hidden connections across history, academia, intelligence, and archaeology. Generate compelling research lead pitches for the editorial team.

Respond ONLY in valid JSON. No prose, no markdown.`;

  const anomalyDescriptions: string[] = [];
  if ((interestingness.surprise_score as number) > 0.6) {
    anomalyDescriptions.push(`Cross-domain surprise (${((interestingness.surprise_score as number) * 100).toFixed(0)}%): entities from very different fields`);
  }
  if ((interestingness.bridge_score as number) > 0.6) {
    anomalyDescriptions.push(`Bridge connection (${((interestingness.bridge_score as number) * 100).toFixed(0)}%): links otherwise separate clusters`);
  }
  if ((interestingness.covert_signal_score as number) > 0.4) {
    anomalyDescriptions.push(`Covert signal (${((interestingness.covert_signal_score as number) * 100).toFixed(0)}%): pattern resembles known covert relationships`);
  }
  if ((interestingness.temporal_anomaly_score as number) > 0.5) {
    anomalyDescriptions.push(`Temporal anomaly (${((interestingness.temporal_anomaly_score as number) * 100).toFixed(0)}%): suspicious timing overlap`);
  }

  const userPrompt = `A high-potential connection has been discovered. Generate a research lead for the editorial team.

ENTITIES: ${suggestion.entity_a_name} (${suggestion.entity_a_type}) ↔ ${suggestion.entity_b_name} (${suggestion.entity_b_type})
RELATIONSHIP: ${suggestion.suggested_relationship_type} (strength: ${suggestion.suggested_strength}/5, confidence: ${((suggestion.confidence_score as number) * 100).toFixed(0)}%)
EVIDENCE: ${suggestion.evidence_summary}
ANOMALIES:
${anomalyDescriptions.map((a) => `  - ${a}`).join('\n')}
${suggestion.anomaly_notes ? `ANOMALY NOTES: ${suggestion.anomaly_notes}` : ''}

Generate a research lead JSON:
{
  "title": "compelling article headline (the kind that makes the 2am crowd click)",
  "pitch_summary": "2-3 paragraph pitch explaining what is interesting and why readers would care",
  "evidence_chain": [{"entity": "name", "connection": "what happened", "year": "year or null"}],
  "suggested_entities_to_add": ["name1", "name2"],
  "suggested_lenses": ["Archaeological Record" | "Indigenous Oral Traditions" | "Peer-Reviewed Science" | "Institutional Analysis" | "Whistleblower & Declassified" | "Cross-Cultural Pattern Analysis"],
  "estimated_research_depth": "quick_article" | "full_dossier" | "investigation"
}`;

  try {
    const response = await queryOllama({
      provider: 'ollama',
      systemPrompt,
      userPrompt,
      jsonMode: true,
      temperature: 0.5,
      maxTokens: 1500,
    });
    return (response.parsed ?? JSON.parse(response.text)) as Record<string, unknown>;
  } catch (err) {
    console.error('[thread/tier2] Lead gen error', err);
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const supabase = createServerSupabaseClient();
  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min((body.batch_size as number) ?? 20, 50);

  // Fetch unprocessed candidates, sorted by method priority
  const { data: rawCandidates } = await supabase
    .from('discovery_candidates')
    .select('*')
    .eq('processed_by_tier2', false)
    .order('created_at', { ascending: true })
    .limit(batchSize * 3); // fetch more, then sort by priority

  if (!rawCandidates || rawCandidates.length === 0) {
    return NextResponse.json({ ok: true, message: 'No unprocessed candidates', processed: 0 });
  }

  // Sort by detection method priority
  const candidates = rawCandidates
    .sort((a, b) => (METHOD_PRIORITY[a.detection_method] ?? 99) - (METHOD_PRIORITY[b.detection_method] ?? 99))
    .slice(0, batchSize);

  // Fetch all published entity data for context building
  const [
    { data: allPeople },
    { data: allInstitutions },
    { data: piMemberships },
    { data: ppEdges },
    { data: iiEdges },
    { data: piEdges },
  ] = await Promise.all([
    supabase.from('people_cards').select('id, full_name, short_bio, institution_type, faith, political_party, credibility_tier').eq('status', 'published'),
    supabase.from('institution_cards').select('id, name, short_bio, institution_type, transparency_tier').eq('status', 'published'),
    supabase.from('people_institutions').select('person_id, institution_id, relationship, start_year, end_year, covert'),
    supabase.from('people_connections').select('source_id, target_id, relationship_type'),
    supabase.from('institution_connections').select('source_id, target_id, relationship_type, covert'),
    supabase.from('people_institutions').select('person_id, institution_id, covert'),
  ]);

  const peopleById = new Map((allPeople ?? []).map((p) => [p.id, p]));
  const institutionsById = new Map((allInstitutions ?? []).map((i) => [i.id, i]));

  // Build edge list for bridge scoring
  const allEdges: Array<{ source: string; target: string }> = [
    ...(ppEdges ?? []).map((e) => ({ source: e.source_id, target: e.target_id })),
    ...(iiEdges ?? []).map((e) => ({ source: e.source_id, target: e.target_id })),
    ...(piEdges ?? []).map((e) => ({ source: e.person_id, target: e.institution_id })),
  ];

  // Build covert edge sets
  const covertEntities = new Set<string>();
  for (const e of (iiEdges ?? [])) { if (e.covert) { covertEntities.add(e.source_id); covertEntities.add(e.target_id); } }
  for (const e of (piEdges ?? [])) { if (e.covert) { covertEntities.add(e.person_id); covertEntities.add(e.institution_id); } }

  // Build entity→existing connections map for context
  const entityConnections = new Map<string, string[]>();
  for (const e of (ppEdges ?? [])) {
    const sName = peopleById.get(e.source_id)?.full_name ?? e.source_id;
    const tName = peopleById.get(e.target_id)?.full_name ?? e.target_id;
    entityConnections.set(e.source_id, [...(entityConnections.get(e.source_id) ?? []), `${e.relationship_type} → ${tName}`]);
    entityConnections.set(e.target_id, [...(entityConnections.get(e.target_id) ?? []), `${e.relationship_type} ← ${sName}`]);
  }
  for (const m of (piMemberships ?? [])) {
    const instName = institutionsById.get(m.institution_id)?.name ?? m.institution_id;
    const pName = peopleById.get(m.person_id)?.full_name ?? m.person_id;
    entityConnections.set(m.person_id, [...(entityConnections.get(m.person_id) ?? []), `${m.relationship ?? 'member'} @ ${instName}`]);
    entityConnections.set(m.institution_id, [...(entityConnections.get(m.institution_id) ?? []), `member: ${pName}`]);
  }

  function buildEntityContext(type: string, id: string): string {
    if (type === 'person') {
      const p = peopleById.get(id);
      if (!p) return 'No profile available.';
      return [
        p.full_name,
        p.credibility_tier ? `Credibility: ${p.credibility_tier}` : null,
        p.faith ? `Faith: ${p.faith}` : null,
        p.political_party ? `Political: ${p.political_party}` : null,
        p.short_bio ? `Bio: ${p.short_bio}` : null,
      ].filter(Boolean).join(' | ');
    } else {
      const i = institutionsById.get(id);
      if (!i) return 'No profile available.';
      return [
        i.name,
        i.institution_type ? `Type: ${i.institution_type}` : null,
        i.transparency_tier ? `Transparency: ${i.transparency_tier}` : null,
        i.short_bio ? `Bio: ${i.short_bio}` : null,
      ].filter(Boolean).join(' | ');
    }
  }

  function getSubtype(type: string, id: string): string | null {
    if (type === 'person') return (peopleById.get(id) as Record<string, unknown>)?.credibility_tier as string | null ?? null;
    return institutionsById.get(id)?.institution_type ?? null;
  }

  // ── Process each candidate ────────────────────────────────────────────────

  const results = { processed: 0, suggestions_created: 0, leads_created: 0, errors: 0 };
  const newSuggestionIds: string[] = [];

  for (const candidate of candidates) {
    const contextA = buildEntityContext(candidate.entity_a_type, candidate.entity_a_id);
    const contextB = buildEntityContext(candidate.entity_b_type, candidate.entity_b_id);
    const existingA = entityConnections.get(candidate.entity_a_id) ?? [];
    const existingB = entityConnections.get(candidate.entity_b_id) ?? [];

    // Add 2-second delay between Ollama calls to avoid overwhelming the queue
    if (results.processed > 0) await new Promise((r) => setTimeout(r, 2000));

    const llmResult = await runOllamaOnCandidate(candidate, contextA, contextB, existingA, existingB);

    // Mark candidate as processed regardless of result
    await supabase
      .from('discovery_candidates')
      .update({ processed_by_tier2: true, processed_at: new Date().toISOString() })
      .eq('id', candidate.id);

    results.processed++;

    if (!llmResult || !llmResult.relationship_exists) continue;
    if ((llmResult.confidence as number) < 0.25) continue;

    const { data: suggestion, error: suggestionError } = await supabase
      .from('discovery_suggestions')
      .insert({
        candidate_id: candidate.id,
        entity_a_type: candidate.entity_a_type,
        entity_a_id: candidate.entity_a_id,
        entity_a_name: candidate.entity_a_name,
        entity_b_type: candidate.entity_b_type,
        entity_b_id: candidate.entity_b_id,
        entity_b_name: candidate.entity_b_name,
        suggested_relationship_type: llmResult.relationship_type ?? 'affiliated',
        suggested_strength: llmResult.strength ?? 3,
        confidence_score: Math.min(1, Math.max(0, (llmResult.confidence as number) ?? 0)),
        llm_reasoning: llmResult.reasoning ?? null,
        evidence_summary: llmResult.evidence_summary ?? null,
        suggested_new_entities: llmResult.suggested_new_entities ?? [],
        anomaly_notes: llmResult.anomaly_notes ?? null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (suggestionError || !suggestion) { results.errors++; continue; }

    results.suggestions_created++;
    newSuggestionIds.push(suggestion.id);
  }

  // ── Tier 3: Score new suggestions ─────────────────────────────────────────

  const highScorerIds: Array<{ suggestionId: string; score: number; interestId: string }> = [];

  for (const suggestionId of newSuggestionIds) {
    const { data: sugg } = await supabase
      .from('discovery_suggestions')
      .select('*, discovery_candidates(*)')
      .eq('id', suggestionId)
      .single();

    if (!sugg || (sugg.confidence_score as number) < 0.3) continue;

    const aSubtype = getSubtype(sugg.entity_a_type, sugg.entity_a_id);
    const bSubtype = getSubtype(sugg.entity_b_type, sugg.entity_b_id);
    const aHasCovert = covertEntities.has(sugg.entity_a_id);
    const bHasCovert = covertEntities.has(sugg.entity_b_id);

    // Count shared indirect connections
    const aNeighbors = new Set(allEdges.filter((e) => e.source === sugg.entity_a_id || e.target === sugg.entity_a_id).map((e) => e.source === sugg.entity_a_id ? e.target : e.source));
    const bNeighbors = new Set(allEdges.filter((e) => e.source === sugg.entity_b_id || e.target === sugg.entity_b_id).map((e) => e.source === sugg.entity_b_id ? e.target : e.source));
    let sharedIndirect = 0;
    for (const n of aNeighbors) { if (bNeighbors.has(n)) sharedIndirect++; }

    const detectionDetails = (sugg.discovery_candidates?.detection_details ?? {}) as Record<string, unknown>;

    const surpriseScore = scoreSurprise(aSubtype, bSubtype, aHasCovert, bHasCovert);
    const bridgeScore = scoreBridge(sugg.entity_a_id, sugg.entity_b_id, allEdges);
    const covertScore = scoreCovertSignal(sugg, aHasCovert, bHasCovert, sharedIndirect);
    const temporalScore = scoreTemporalAnomaly(detectionDetails);

    const researchPotential = parseFloat(
      ((surpriseScore * 0.3) + (bridgeScore * 0.25) + (covertScore * 0.25) + (temporalScore * 0.2)).toFixed(3),
    );

    const anomalyFlags: string[] = [];
    if (surpriseScore > 0.7) anomalyFlags.push(`Cross-domain surprise: ${aSubtype ?? 'unknown'} × ${bSubtype ?? 'unknown'}`);
    if (bridgeScore > 0.7) anomalyFlags.push('Bridge connection: links separate clusters');
    if (covertScore > 0.5) anomalyFlags.push('Covert signal: pattern matches known covert relationships');
    if (temporalScore > 0.6) anomalyFlags.push('Temporal anomaly: suspicious timing overlap');
    if (sugg.anomaly_notes) anomalyFlags.push(`LLM flagged: ${sugg.anomaly_notes}`);

    const { data: interest } = await supabase
      .from('discovery_interestingness')
      .insert({
        suggestion_id: suggestionId,
        surprise_score: surpriseScore,
        bridge_score: bridgeScore,
        covert_signal_score: covertScore,
        temporal_anomaly_score: temporalScore,
        research_potential_score: researchPotential,
        anomaly_flags: anomalyFlags,
      })
      .select('id')
      .single();

    if (interest && researchPotential >= 0.7) {
      highScorerIds.push({ suggestionId, score: researchPotential, interestId: interest.id });
    }
  }

  // ── Lead generation for high scorers ─────────────────────────────────────

  for (const { suggestionId, score, interestId } of highScorerIds) {
    const { data: sugg } = await supabase
      .from('discovery_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    const { data: interest } = await supabase
      .from('discovery_interestingness')
      .select('*')
      .eq('id', interestId)
      .single();

    if (!sugg || !interest) continue;

    await new Promise((r) => setTimeout(r, 2000));
    const lead = await generateResearchLead(sugg, interest);
    if (!lead) continue;

    await supabase.from('research_leads').insert({
      interestingness_id: interestId,
      suggestion_id: suggestionId,
      title: (lead.title as string) ?? `Connection: ${sugg.entity_a_name} ↔ ${sugg.entity_b_name}`,
      pitch_summary: lead.pitch_summary ?? null,
      evidence_chain: lead.evidence_chain ?? [],
      suggested_entities_to_add: [
        ...(Array.isArray(lead.suggested_entities_to_add) ? lead.suggested_entities_to_add : []),
        ...(Array.isArray(sugg.suggested_new_entities) ? sugg.suggested_new_entities : []),
      ],
      suggested_lenses: lead.suggested_lenses ?? [],
      estimated_research_depth: lead.estimated_research_depth ?? 'full_dossier',
      research_potential_score: score,
      status: 'new',
    });

    results.leads_created++;
  }

  return NextResponse.json({
    ok: true,
    ...results,
    high_scorers: highScorerIds.length,
  });
}

// Vercel Cron calls GET — proxy to the batch processor
export async function GET() {
  return POST(new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch_size: 20 }),
  }));
}
