import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

function buildDossierText(output: Record<string, unknown>): string {
  const sections: string[] = [];

  if (output.executive_summary) sections.push(`[executive_summary]\n${output.executive_summary}`);
  if (output.advocate_case) sections.push(`[advocate_case]\n${output.advocate_case}`);
  if (output.skeptic_case) sections.push(`[skeptic_case]\n${output.skeptic_case}`);

  for (const f of (output.key_findings as { finding?: string }[] | undefined) ?? []) {
    if (f.finding) sections.push(`[key_findings]\n${f.finding}`);
  }

  for (const l of (output.jaw_drop_layers as { title?: string; content?: string }[] | undefined) ?? []) {
    const text = [l.title, l.content].filter(Boolean).join(': ');
    if (text) sections.push(`[jaw_drop_layers]\n${text}`);
  }

  return sections.join('\n\n');
}

export async function POST(req: NextRequest) {
  const { dossierId } = await req.json();
  if (!dossierId) return NextResponse.json({ error: 'dossierId required' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('id, title, synthesized_output')
    .eq('id', dossierId)
    .single();

  if (error || !dossier) {
    return NextResponse.json({ error: 'Dossier not found' }, { status: 404 });
  }

  if (!dossier.synthesized_output) {
    return NextResponse.json({ error: 'Dossier has no synthesized output' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const fullText = buildDossierText(dossier.synthesized_output as Record<string, unknown>);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0,
    system: `You are a senior editorial fact-checker reviewing research dossiers for an investigative intelligence platform called Unraveled.
Today's date is ${today}.

Your job is to identify content issues that would confuse, mislead, or leave critical gaps for a reader.
Focus especially on:
1. TEMPORAL AMBIGUITY — Names/brands that have changed over time (e.g., "X.com" in a PayPal context means the 1999 fintech, NOT Twitter/X; "Blackwater" was renamed Academi; "Facebook" is now Meta, etc.). Always flag when a historical name could be confused with a current entity.
2. MISSING CURRENT STATUS — Missing current ownership, leadership, or status updates.
3. PRONOUN/REFERENCE AMBIGUITY — "the company", "it", "they" when multiple organizations are in play.
4. UNQUALIFIED TIME-SENSITIVE CLAIMS — Facts stated as present-tense when they may have changed.
5. MISSING CONTEXT — Key facts needed to avoid misunderstanding.
6. FACTUAL GAPS — Important omitted facts any thorough report should include.

Be thorough but precise. Only flag real issues. Return ONLY valid JSON.`,
    messages: [{
      role: 'user',
      content: `Research dossier title: "${dossier.title}"

Content:
${fullText.slice(0, 12000)}

Return:
{
  "overall_quality": "high | medium | low",
  "editorial_summary": "2-3 sentence overview of the main issues",
  "flags": [
    {
      "id": "f1",
      "severity": "high | medium | low",
      "type": "temporal_ambiguity | missing_context | pronoun_ambiguity | unqualified_claim | factual_gap | missing_current_status",
      "section": "section name",
      "excerpt": "exact problematic phrase (max 100 chars)",
      "issue": "1-sentence description of the problem",
      "suggested_fix": "specific text change or addition to resolve this"
    }
  ]
}`,
    }],
  });

  const raw = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  const parsed = JSON.parse(cleaned);

  const review = {
    reviewed_at: new Date().toISOString(),
    model: 'claude-sonnet-4-6',
    overall_quality: parsed.overall_quality ?? 'medium',
    editorial_summary: parsed.editorial_summary ?? '',
    flags: (parsed.flags ?? []).map((f: Record<string, unknown>) => ({ ...f, status: 'pending' })),
    status: 'pending_review',
  };

  const { error: saveErr } = await supabase
    .from('topic_dossiers')
    .update({ editorial_review: review })
    .eq('id', dossierId);

  if (saveErr) {
    return NextResponse.json({ error: saveErr.message }, { status: 500 });
  }

  return NextResponse.json(review);
}
