import { createServerSupabaseClient } from '@/lib/supabase';
import { queryClaude } from '@/lib/research/llm/claude';
import { parseJsonResponse } from '@/lib/research/llm/parse';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SynthesizedOutput, JawDropLayer } from '@/lib/research/types';

export interface EditorPassPayload {
  topic: string;
  title: string;
}

const EDITOR_SYSTEM = `You are the Editor-in-Chief of Unraveled — a publication that sits between rigorous scholarship and genuine curiosity. You are slightly cynical, deeply curious, and you write like a very smart person talking to an intelligent friend over coffee, not like a research report.

You are doing a final voice pass on a completed article. Your job is to rewrite the prose sections in human voice while keeping all factual content intact.

STYLE RULES — follow these precisely:

1. DASHES: Maximum one em dash (—) per paragraph. Prefer commas or parentheses. En dashes only for ranges.

2. SENTENCE RHYTHM: Vary length aggressively. Short sentences after long ones. Fragments are fine occasionally. If a paragraph sounds like a TED Talk voice-over, rewrite it.

3. BANNED PHRASES — never use these:
   - "the finding is surprising because"
   - "this is not a dismissal. It is an invitation"
   - "what the pipeline found"
   - "ordered by how difficult"
   - "structurally incompatible"
   - "the convergence score of X out of 100"
   Replace with: "here's the weird part", "what actually broke my brain", "this is where it gets messy", "the thing that still bugs me", etc.

4. TONE: Allow dry humor and mild snark. Use contractions freely. First or second person is fine in advocate/skeptic intros and open questions. Never say "the research pipeline" — say "what we found" or just dive in.

5. PARAGRAPHS: Max 4–5 sentences. End sections with a human-sounding kicker, not a summary.

6. GUT CHECK: Would a real human who is slightly obsessed with this topic write this sentence? If they'd only write it to sound smart — rewrite it.

Return ONLY valid JSON (no markdown fences) with the rewritten sections.`;

function buildEditorPrompt(topic: string, output: SynthesizedOutput): string {
  return `Topic: ${topic}
Title: ${output.title}

Rewrite the following prose sections in human voice. Keep all facts, findings, and evidence intact — only change the voice and style. Return ONLY valid JSON.

EXECUTIVE SUMMARY (current):
${output.executive_summary}

ADVOCATE CASE (current):
${output.advocate_case}

SKEPTIC CASE (current):
${output.skeptic_case}

JAW DROP LAYERS (current — rewrite title, content, evidence_hook for each; keep level numbers):
${JSON.stringify(output.jaw_drop_layers, null, 2)}

OPEN QUESTIONS (current — rewrite each question to sound like a human researcher, not a report):
${JSON.stringify(output.open_questions, null, 2)}

Return this exact JSON structure:
{
  "executive_summary": "rewritten string",
  "advocate_case": "rewritten string",
  "skeptic_case": "rewritten string",
  "jaw_drop_layers": [
    {
      "level": 1,
      "title": "rewritten title",
      "content": "rewritten content (minimum 80 words, keep all specific evidence)",
      "evidence_hook": "rewritten hook — one sentence that would make a sceptical professor pause"
    }
  ],
  "open_questions": ["rewritten question 1", "rewritten question 2"]
}`;
}

export async function handleEditorPass(job: ResearchJob): Promise<Record<string, unknown>> {
  const { topic } = job.params as unknown as EditorPassPayload;
  const supabase = createServerSupabaseClient();

  // Load current synthesized_output
  const { data: dossier, error } = await supabase
    .from('topic_dossiers')
    .select('synthesized_output, title')
    .eq('topic', topic)
    .single();

  if (error || !dossier) throw new Error(`No dossier found for topic: ${topic}`);
  if (!dossier.synthesized_output) throw new Error('synthesized_output is null — run assembly first');

  const output = dossier.synthesized_output as SynthesizedOutput;

  const response = await queryClaude({
    provider: 'claude',
    systemPrompt: EDITOR_SYSTEM,
    userPrompt: buildEditorPrompt(topic, output),
    jsonMode: true,
    maxTokens: 8192,
    temperature: 0.6, // slightly higher for voice/style
  });

  const edited = parseJsonResponse(response) as {
    executive_summary: string;
    advocate_case: string;
    skeptic_case: string;
    jaw_drop_layers: JawDropLayer[];
    open_questions: string[];
  };

  // Merge edited sections back into the full synthesized_output
  const revised: SynthesizedOutput = {
    ...output,
    executive_summary: edited.executive_summary ?? output.executive_summary,
    advocate_case: edited.advocate_case ?? output.advocate_case,
    skeptic_case: edited.skeptic_case ?? output.skeptic_case,
    jaw_drop_layers: edited.jaw_drop_layers ?? output.jaw_drop_layers,
    open_questions: edited.open_questions ?? output.open_questions,
    powerful_open_questions: (edited.open_questions ?? output.open_questions).slice(0, 5),
  };

  const { error: updateError } = await supabase
    .from('topic_dossiers')
    .update({
      synthesized_output: revised,
      updated_at: new Date().toISOString(),
    })
    .eq('topic', topic);

  if (updateError) throw new Error(`Failed to update dossier: ${updateError.message}`);

  return {
    topic,
    sections_edited: ['executive_summary', 'advocate_case', 'skeptic_case', 'jaw_drop_layers', 'open_questions'],
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
  };
}
