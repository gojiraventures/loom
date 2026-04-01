import type { LLMResponse } from './types';

/**
 * Extracts and parses JSON from an LLM response, handling markdown code fences.
 *
 * Priority:
 *   1. response.parsed — already extracted by the provider client (fast path)
 *   2. Strip ``` fences from response.text and parse
 *   3. Parse response.text directly (bare JSON)
 *
 * Throws with a descriptive error if all three paths fail.
 */
export function parseJsonResponse(response: LLMResponse): unknown {
  if (response.parsed !== undefined) return response.parsed;

  const text = response.text.trim();

  // Attempt 1: bare JSON
  try { return JSON.parse(text); } catch { /* continue */ }

  // Attempt 2: extract content from a ```json ... ``` or ``` ... ``` fence
  // (not anchored — handles preamble/postamble text around the fence)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const fenced = fenceMatch[1].trim();
    try { return JSON.parse(fenced); } catch { /* continue */ }
  }

  // Attempt 3: extract the first {...} or [...] block from anywhere in the text
  const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[1]); } catch { /* continue */ }
  }

  // Attempt 4: partial JSON repair — response was likely truncated before closing braces.
  // Find the opening { or [ and try to close it.
  const openBrace = text.indexOf('{');
  const openBracket = text.indexOf('[');
  const start = openBrace === -1 ? openBracket : openBracket === -1 ? openBrace : Math.min(openBrace, openBracket);
  if (start !== -1) {
    const partial = text.slice(start);
    // Count unclosed braces/brackets and append closers
    let depth = 0;
    let inString = false;
    let escape = false;
    const closers: string[] = [];
    for (const ch of partial) {
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') { depth++; closers.push('}'); }
      else if (ch === '[') { depth++; closers.push(']'); }
      else if (ch === '}' || ch === ']') { depth--; closers.pop(); }
    }
    const repaired = partial.trimEnd().replace(/[,\s]+$/, '') + closers.reverse().join('');
    try { return JSON.parse(repaired); } catch { /* continue */ }
  }

  throw new Error(
    `JSON parse failed — could not extract valid JSON. ` +
      `Response started with: ${text.slice(0, 120)}`,
  );
}
