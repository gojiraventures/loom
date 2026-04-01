import { jsonrepair } from 'jsonrepair';
import type { LLMResponse } from './types';

/**
 * Extracts and parses JSON from an LLM response, handling markdown code fences
 * and truncated responses (e.g. when the LLM hits its token limit mid-JSON).
 *
 * Priority:
 *   1. response.parsed — already extracted by the provider client (fast path)
 *   2. Strip ``` fences and parse
 *   3. Parse bare text
 *   4. jsonrepair — handles truncation, trailing commas, unquoted keys, etc.
 */
export function parseJsonResponse(response: LLMResponse): unknown {
  if (response.parsed !== undefined) return response.parsed;

  const text = response.text.trim();

  // Attempt 1: bare JSON
  try { return JSON.parse(text); } catch { /* continue */ }

  // Attempt 2: extract content from a ```json ... ``` or ``` ... ``` fence
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const fenced = fenceMatch[1].trim();
    try { return JSON.parse(fenced); } catch { /* continue */ }
    // Also try repairing the fenced content
    try { return JSON.parse(jsonrepair(fenced)); } catch { /* continue */ }
  }

  // Attempt 3: extract the first {...} or [...] block from anywhere in the text
  const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[1]); } catch { /* continue */ }
  }

  // Attempt 4: jsonrepair on the full text — handles truncation, unquoted keys,
  // trailing commas, mid-string cutoff, and other LLM JSON malformations
  try { return JSON.parse(jsonrepair(text)); } catch { /* continue */ }

  // Attempt 5: jsonrepair on the first JSON-looking substring
  const start = Math.min(
    text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
    text.indexOf('[') === -1 ? Infinity : text.indexOf('['),
  );
  if (start !== Infinity) {
    try { return JSON.parse(jsonrepair(text.slice(start))); } catch { /* continue */ }
  }

  throw new Error(
    `JSON parse failed — could not extract valid JSON. ` +
      `Response started with: ${text.slice(0, 120)}`,
  );
}
