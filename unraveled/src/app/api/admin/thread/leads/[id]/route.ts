/**
 * THREAD Lead Actions
 *
 * PATCH /api/admin/thread/leads/[id]   Body: { status: 'queued'|'dismissed'|'in_progress'|'published' }
 * POST  /api/admin/thread/leads/[id]   — trigger deep research via Claude API
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createServerSupabaseClient();
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: string };

  if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });

  const { error } = await supabase
    .from('research_leads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = createServerSupabaseClient();
  const { id } = await params;

  // Fetch lead with full context
  const { data: lead, error: fetchError } = await supabase
    .from('research_leads')
    .select(`
      *,
      discovery_suggestions (
        entity_a_name, entity_a_type, entity_a_id,
        entity_b_name, entity_b_type, entity_b_id,
        suggested_relationship_type, suggested_strength,
        confidence_score, llm_reasoning, evidence_summary,
        suggested_new_entities, anomaly_notes,
        discovery_candidates (detection_method, detection_details)
      ),
      discovery_interestingness (
        surprise_score, bridge_score, covert_signal_score,
        temporal_anomaly_score, research_potential_score, anomaly_flags
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const sugg = lead.discovery_suggestions as Record<string, unknown>;
  const interest = lead.discovery_interestingness as Record<string, unknown>;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a lead researcher for UnraveledTruth, an investigative platform studying hidden connections across history, academia, intelligence, religion, and archaeology.

A high-potential undocumented connection has been discovered by our automated THREAD system and requires deep research analysis.

CONNECTION OVERVIEW:
${sugg?.entity_a_name} (${sugg?.entity_a_type}) ↔ ${sugg?.entity_b_name} (${sugg?.entity_b_type})
Relationship type: ${sugg?.suggested_relationship_type}
Strength: ${sugg?.suggested_strength}/5
Confidence: ${((sugg?.confidence_score as number) * 100).toFixed(0)}%

EVIDENCE:
${sugg?.evidence_summary}

LLM REASONING:
${sugg?.llm_reasoning}

ANOMALY NOTES:
${sugg?.anomaly_notes ?? 'None flagged'}

INTERESTINGNESS SCORES:
- Surprise (cross-domain): ${(((interest?.surprise_score as number) ?? 0) * 100).toFixed(0)}%
- Bridge (cluster connectivity): ${(((interest?.bridge_score as number) ?? 0) * 100).toFixed(0)}%
- Covert signal: ${(((interest?.covert_signal_score as number) ?? 0) * 100).toFixed(0)}%
- Temporal anomaly: ${(((interest?.temporal_anomaly_score as number) ?? 0) * 100).toFixed(0)}%
- Research potential: ${(((interest?.research_potential_score as number) ?? 0) * 100).toFixed(0)}%

EXISTING PITCH:
Title: ${lead.title}
${lead.pitch_summary}

Produce a comprehensive deep research package in JSON:
{
  "refined_title": "improved article headline",
  "executive_summary": "3-4 sentence summary of the key finding and why it matters",
  "article_outline": [
    {"section": "section title", "key_points": ["point 1", "point 2"], "primary_sources_needed": ["source type"]}
  ],
  "claims_to_verify": [
    {"claim": "specific claim", "verification_method": "how to verify", "source_type": "archive|database|testimony|document"}
  ],
  "counter_arguments": [
    {"argument": "skeptic argument", "response": "how to address it"}
  ],
  "entities_to_research": [
    {"name": "entity name", "type": "person|institution", "reason": "why relevant", "priority": "high|medium|low"}
  ],
  "connections_to_investigate": [
    {"entity_a": "name", "entity_b": "name", "hypothesis": "what the connection might be"}
  ],
  "investigative_lenses": ["lens name"],
  "estimated_depth": "quick_article|full_dossier|investigation",
  "confidence_assessment": "honest assessment of how solid this lead is",
  "risks": "any sensitivities or risks in publishing this"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = (message.content[0] as { type: string; text: string }).text;
    let deepResearch: unknown;
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      deepResearch = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: responseText };
    } catch {
      deepResearch = { raw: responseText };
    }

    await supabase
      .from('research_leads')
      .update({
        deep_research_output: deepResearch,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return NextResponse.json({ ok: true, deep_research: deepResearch });
  } catch (err) {
    console.error('[thread/leads/deep-research] Claude API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Deep research failed' },
      { status: 500 },
    );
  }
}
