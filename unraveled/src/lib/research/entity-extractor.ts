/**
 * Phase 8 — Entity Extraction
 *
 * After synthesis, asks Claude to extract named people and institutions
 * from the research findings. Creates bare-bones `needs_review` records
 * in the people / institutions tables so a human can review and accept them.
 *
 * Existing records (matched by slug or name) are linked but not duplicated.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { AgentFinding, SynthesizedOutput } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ExtractedDiscourseEntry {
  sentiment: 'positive' | 'negative' | 'mixed';
  claim: string;
  claim_source: string;
  claim_source_url?: string | null;
  response_summary?: string | null;
  response_source?: string | null;
  response_source_url?: string | null;
}

export interface ExtractedPerson {
  name: string;
  role_in_topic: string;       // "researcher", "whistleblower", "critic", etc.
  credibility_tier: string;    // our tier vocab
  relationship_to_topic: string; // short description of why they matter
  confidence: number;          // 0–1
  public_discourse?: ExtractedDiscourseEntry[];
}

export interface ExtractedInstitution {
  name: string;
  institution_type: string;    // our type vocab
  role_in_topic: string;       // "suppressor", "researcher", "custodian", etc.
  relationship_to_topic: string;
  confidence: number;
}

export interface ExtractionResult {
  people: ExtractedPerson[];
  institutions: ExtractedInstitution[];
  created_people: number;
  linked_people: number;
  created_institutions: number;
  linked_institutions: number;
  errors: string[];
}

const SYSTEM = `You are an entity extraction specialist for an evidence-index research platform.
Given research findings about a topic, extract all named people and institutions that are directly relevant.
Be conservative — only include entities explicitly mentioned in the findings, not speculative ones.
Return ONLY valid JSON, no prose.`;

function buildPrompt(topic: string, output: SynthesizedOutput, findings: AgentFinding[]): string {
  // Sample up to 30 findings to keep the prompt manageable
  const sampleFindings = findings
    .slice(0, 30)
    .map((f) => `[${f.agent_id}] ${f.claim_text}`)
    .join('\n');

  const summaryText = [
    output.executive_summary,
    output.key_findings?.map((k) => k.finding).join('\n'),
    output.advocate_case,
    output.skeptic_case,
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000); // cap to avoid huge prompts

  return `Topic: "${topic}"

Research summary:
${summaryText}

Sample findings:
${sampleFindings}

Extract all named people and institutions that are directly relevant to this topic.

Return this JSON:
{
  "people": [
    {
      "name": "full name as mentioned",
      "role_in_topic": "one short phrase — e.g. 'archaeologist who disputed mainstream dating'",
      "credibility_tier": "one of: academic|journalist|independent_researcher|whistleblower|public_figure|historical_figure|witness|unclassified — describes the person's primary professional role, never editorial judgment",
      "relationship_to_topic": "1-2 sentence explanation of their relevance",
      "confidence": 0.9,
      "public_discourse": [
        {
          "sentiment": "one of: positive|negative|mixed",
          "claim": "specific, attributed public claim about this person — not a vague characterisation",
          "claim_source": "publication, named individual, institution, or identifiable community",
          "claim_source_url": null,
          "response_summary": "if the person has publicly responded to this claim, summarize their stated position — or null",
          "response_source": "where the person made their response — or null",
          "response_source_url": null
        }
      ]
    }
  ],
  "institutions": [
    {
      "name": "institution name as mentioned",
      "institution_type": "one of: museum|university|government_agency|military|intelligence|religious|secret_society|think_tank|research_institute|foundation|media_org|corporation|ngo|professional_society|library_archive|observatory|archaeological_org|medical|other",
      "role_in_topic": "one of: custodian|researcher|suppressor|classifier|publisher|funder|investigator|debunker|gatekeeper|related",
      "relationship_to_topic": "1-2 sentence explanation",
      "confidence": 0.8
    }
  ]
}

Rules:
- Only include entities explicitly named in the research, not implied or speculative
- Minimum confidence 0.6 to include
- Skip entities that are clearly mythological/fictional (e.g. "Noah", "Gilgamesh")
- Do not include individual researchers unless they are prominent named figures
- Return empty arrays if nothing qualifies
- For public_discourse: only include claims documented in public sources — do not generate from your own assessment. If you cannot find sourced claims, return an empty array. Do not fabricate discourse entries.
- credibility_tier describes role, not reputation — never use "controversial" or any editorial judgment`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function extractAndQueueEntities(
  sessionId: string,
  topic: string,
  output: SynthesizedOutput,
  findings: AgentFinding[],
): Promise<ExtractionResult> {
  const result: ExtractionResult = {
    people: [],
    institutions: [],
    created_people: 0,
    linked_people: 0,
    created_institutions: 0,
    linked_institutions: 0,
    errors: [],
  };

  // ── Call Claude ───────────────────────────────────────────────────────────
  let extracted: { people: ExtractedPerson[]; institutions: ExtractedInstitution[] };
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      temperature: 0.1,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(topic, output, findings) }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    extracted = JSON.parse(cleaned);
  } catch (err) {
    result.errors.push(`Entity extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  result.people = extracted.people ?? [];
  result.institutions = extracted.institutions ?? [];

  const supabase = createServerSupabaseClient();

  // ── Process people ────────────────────────────────────────────────────────
  for (const person of result.people) {
    if (!person.name || person.confidence < 0.6) continue;
    try {
      const slug = slugify(person.name);

      // Check if already exists
      const { data: existing } = await supabase
        .from('people')
        .select('id, slug, status')
        .or(`slug.eq.${slug},full_name.ilike.${person.name}`)
        .maybeSingle();

      let personDbId: string | null = null;

      if (existing) {
        // Already exists — link to this topic via people_topics if not already linked
        await supabase.from('people_topics').upsert(
          {
            person_id: existing.id,
            topic_id: sessionId, // use session as topic proxy for now
            role: person.role_in_topic as string,
            context: person.relationship_to_topic,
          },
          { onConflict: 'person_id,topic_id,role', ignoreDuplicates: true },
        );
        personDbId = existing.id;
        result.linked_people++;
      } else {
        // Create needs_review stub
        const { data: newPerson, error } = await supabase.from('people').insert({
          slug,
          full_name: person.name,
          short_bio: person.relationship_to_topic,
          credibility_tier: person.credibility_tier ?? 'unclassified',
          key_positions: [person.role_in_topic],
          status: 'needs_review',
          source_session_id: sessionId,
          extraction_notes: `Auto-extracted from research session on "${topic}". Confidence: ${Math.round(person.confidence * 100)}%`,
        }).select('id').single();
        if (error) {
          result.errors.push(`Failed to create person "${person.name}": ${error.message}`);
        } else {
          personDbId = newPerson?.id ?? null;
          result.created_people++;
        }
      }

      // Write any public_discourse entries extracted for this person
      if (personDbId && Array.isArray(person.public_discourse)) {
        for (const entry of person.public_discourse) {
          if (!entry.claim || !entry.claim_source || !entry.sentiment) continue;
          await supabase.from('public_discourse').insert({
            person_id: personDbId,
            sentiment: entry.sentiment,
            claim: entry.claim,
            claim_source: entry.claim_source,
            claim_source_url: entry.claim_source_url ?? null,
            response_summary: entry.response_summary ?? null,
            response_source: entry.response_source ?? null,
            response_source_url: entry.response_source_url ?? null,
            extracted_by: 'ai',
          });
        }
      }
    } catch (err) {
      result.errors.push(`Person "${person.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Process institutions ───────────────────────────────────────────────────
  for (const inst of result.institutions) {
    if (!inst.name || inst.confidence < 0.6) continue;
    try {
      const slug = slugify(inst.name);

      const { data: existing } = await supabase
        .from('institutions')
        .select('id, slug, status')
        .or(`slug.eq.${slug},name.ilike.${inst.name}`)
        .maybeSingle();

      if (existing) {
        await supabase.from('institution_topics').upsert(
          {
            institution_id: existing.id,
            topic_id: sessionId,
            role: inst.role_in_topic as string,
            context: inst.relationship_to_topic,
          },
          { onConflict: 'institution_id,topic_id,role', ignoreDuplicates: true },
        );
        result.linked_institutions++;
      } else {
        const { error } = await supabase.from('institutions').insert({
          slug,
          name: inst.name,
          institution_type: inst.institution_type ?? 'other',
          short_bio: inst.relationship_to_topic,
          status: 'needs_review',
          source_session_id: sessionId,
          extraction_notes: `Auto-extracted from research session on "${topic}". Confidence: ${Math.round(inst.confidence * 100)}%.`,
        });
        if (error) {
          result.errors.push(`Failed to create institution "${inst.name}": ${error.message}`);
        } else {
          result.created_institutions++;
        }
      }
    } catch (err) {
      result.errors.push(`Institution "${inst.name}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `[entity-extractor] Session ${sessionId}: ` +
    `+${result.created_people} people, ~${result.linked_people} linked, ` +
    `+${result.created_institutions} institutions, ~${result.linked_institutions} linked`,
  );

  return result;
}
