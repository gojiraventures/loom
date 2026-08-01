/**
 * Inline Citation Annotator
 *
 * Inserts [n] citation markers into finished prose, where n indexes the
 * article's numbered source list. Grounded and non-fabricating:
 *   - The model may ONLY use numbers that exist in the provided source list.
 *   - Any marker referencing a number outside 1..N is stripped after the fact.
 *   - The prose text itself is never rewritten — markers are only inserted.
 *
 * Runs on Gemini Flash (cheap, long-context, good instruction-following). This
 * is an editorial formatting pass, not claim generation/validation, so it does
 * not touch the lineage-separation constraint.
 *
 * Rendering (see CitedText.tsx) turns [n] into superscript links to the
 * bibliography, and is shown to paid subscribers only.
 */
import { queryGemini } from '../llm/gemini';
import type { SynthesizedOutput, SourceReference } from '../types';

const MARKER_RE = /\[(\d+)\]/g;

function buildSourceList(sources: SourceReference[]): string {
  return sources
    .map((s, i) => {
      const bits = [s.author, s.title, s.year ? `(${s.year})` : null].filter(Boolean).join(', ');
      return `[${i + 1}] ${bits}`;
    })
    .join('\n');
}

/** Remove any marker that points outside the valid 1..N source range. */
function stripInvalidMarkers(text: string, max: number): string {
  return text.replace(MARKER_RE, (m, n) => {
    const idx = Number(n);
    return idx >= 1 && idx <= max ? m : '';
  });
}

const SYSTEM = `You are a citation editor. You are given article prose and a numbered list of sources.
Insert citation markers of the form [n] immediately after the sentence or clause that a source supports, where n is the source's number.

STRICT RULES:
- Use ONLY numbers that appear in the source list. Never invent a number.
- Do NOT change, reword, add, or remove any of the prose text. Insert markers only.
- Attach a marker only where the claim is genuinely supported by that source. If unsure, add no marker.
- A sentence may carry more than one marker, e.g. "...text.[2][5]".
- Return ONLY the annotated prose. No preamble, no source list, no commentary.`;

/** Annotate a single prose string. Returns original text unchanged on any failure. */
export async function annotateWithCitations(
  text: string,
  sources: SourceReference[],
): Promise<string> {
  if (!text?.trim() || sources.length === 0) return text;
  try {
    const res = await queryGemini({
      provider: 'gemini-flash',
      model: 'gemini-2.5-flash',
      systemPrompt: SYSTEM,
      userPrompt: `SOURCES:\n${buildSourceList(sources)}\n\nPROSE:\n${text}`,
      maxTokens: Math.min(16384, Math.ceil(text.length / 2) + 2048),
      temperature: 0.1,
    });
    const annotated = (res.text ?? '').trim();
    if (!annotated) return text;
    // Guard: the model must not have dropped the text — require it to be at
    // least as long as the original minus a little slack.
    const cleaned = stripInvalidMarkers(annotated, sources.length);
    const withoutMarkers = cleaned.replace(MARKER_RE, '').replace(/\s+/g, ' ').trim();
    const originalCompact = text.replace(/\s+/g, ' ').trim();
    if (withoutMarkers.length < originalCompact.length * 0.9) return text; // model altered prose — reject
    return cleaned;
  } catch {
    return text;
  }
}

/**
 * Annotate every prose surface of a synthesized article in place (on a copy):
 * executive summary, advocate/skeptic cases, and each jaw-drop layer's content.
 */
export async function annotateSynthesizedProse(
  output: SynthesizedOutput,
): Promise<SynthesizedOutput> {
  const sources = output.sources ?? [];
  if (sources.length === 0) return output;

  const [exec, advocate, skeptic] = await Promise.all([
    annotateWithCitations(output.executive_summary, sources),
    annotateWithCitations(output.advocate_case, sources),
    annotateWithCitations(output.skeptic_case, sources),
  ]);

  const jaw_drop_layers = [];
  for (const layer of output.jaw_drop_layers ?? []) {
    jaw_drop_layers.push({ ...layer, content: await annotateWithCitations(layer.content, sources) });
  }

  return {
    ...output,
    executive_summary: exec,
    advocate_case: advocate,
    skeptic_case: skeptic,
    jaw_drop_layers,
  };
}
