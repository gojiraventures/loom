import { createServerSupabaseClient } from '@/lib/supabase';
import { queryClaude } from '@/lib/research/llm/claude';
import { parseJsonResponse } from '@/lib/research/llm/parse';
import type { ResearchJob } from '@/lib/research/storage/jobs';
import type { SynthesizedOutput, JawDropLayer } from '@/lib/research/types';

export interface EditorPassPayload {
  topic: string;
  title: string;
}

const EDITOR_SYSTEM = `You are the Editor-in-Chief of Unraveled. Your editorial voice: National Geographic wonder + The Economist precision + a faint Vice smirk when something is absurd or circular. Authoritative, elegant, never stuffy, never bro-casual.

You are doing a final voice pass on a completed article. Your job is to rewrite the prose sections in human voice while keeping all factual content, sources, and evidence intact.

STYLE RULES — follow these precisely:

1. DASHES: Maximum one em dash (—) per paragraph. Prefer commas or parentheses. En dashes only for ranges (e.g., 7,000–10,000 years ago).

2. SENTENCE RHYTHM: Vary length elegantly. Short, crisp sentences for punch — but no fragments or slangy choppiness. Read every paragraph aloud. If it sounds like an AI research summary or a TED Talk, rewrite it.

3. FORBIDDEN PHRASES — ban completely, never use:
   - "pipeline" or "research swarm" or "what the pipeline found"
   - "convergence score of X out of 100"
   - "ordered by how difficult each finding is to explain away"
   - "structurally incompatible"
   - "the finding is surprising because"
   Replace with higher-register alternatives (rotate these):
   - "What emerges from the evidence…"
   - "The pattern that keeps surfacing…"
   - "Here's where the picture begins to blur…"
   - "The detail that refuses to fit is…"
   - "The contradiction worth lingering on…"
   - "What actually complicates the picture…"
   - "The loose thread that refuses to be tied…"

4. TONE: Dry, understated wit when the evidence is ironic or circular. Light skepticism is fine ("the claim rests on softer ground than it appears"). Contractions allowed (it's, don't, can't). Occasional direct address in advocate/skeptic or open-questions sections — but keep it measured. Never say "the research pipeline."

5. PARAGRAPHS: 3–5 sentences. End major sections with a crisp, slightly provocative kicker instead of a summary sentence. "In Their Own Words" sections stay exactly as they are — do not touch them.

6. GUT CHECK: Would this read naturally in National Geographic, The Economist, or a long-form Vice piece? If not, rewrite.

Return ONLY valid JSON (no markdown fences) with the rewritten sections.`;

function buildEditorPrompt(topic: string, output: SynthesizedOutput): string {
  return `Topic: ${topic}
Title: ${output.title}

Apply your editorial voice pass to the sections below. All facts, named sources, specific evidence, and findings must survive intact — only the voice and style changes. Tone target: National Geographic wonder + The Economist precision + faint Vice smirk when warranted. Return ONLY valid JSON.

EXECUTIVE SUMMARY (current — rewrite in editorial voice, 3–5 sentence paragraphs, provocative kicker at end):
${output.executive_summary}

ADVOCATE CASE (current — steel-man the strongest argument, keep evidence, elevate the prose):
${output.advocate_case}

SKEPTIC CASE (current — steel-man the strongest skeptical objections, keep evidence, elevate the prose):
${output.skeptic_case}

JAW DROP LAYERS (current — rewrite title, content, evidence_hook for each layer; keep level numbers; content must stay ≥80 words with all specific evidence intact):
${JSON.stringify(output.jaw_drop_layers, null, 2)}

OPEN QUESTIONS (current — rewrite each as a specific, researchable question a serious scholar would lose sleep over; no generic gaps):
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
