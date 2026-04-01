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

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text;

  try {
    return JSON.parse(candidate);
  } catch (err) {
    // If the fence-stripped content also failed, try the raw text one more time
    // (covers cases where the model emitted partial fences mid-text)
    if (candidate !== text) {
      try {
        return JSON.parse(text);
      } catch {
        // fall through to the throw below
      }
    }
    throw new Error(
      `JSON parse failed: ${err instanceof Error ? err.message : String(err)}. ` +
        `Response started with: ${text.slice(0, 120)}`,
    );
  }
}
