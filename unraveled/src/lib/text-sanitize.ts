/**
 * Deterministic house-style enforcement for generated prose.
 *
 * The prompts tell every writing step "never use em/en dashes" — but LLMs do
 * not reliably obey "never" instructions, and a single unedited step (or a
 * stray example dash inside a prompt) is enough to leak them into published
 * text. This is the guaranteed backstop: it runs on the final text regardless
 * of what the model did.
 */

/** Replace em/en dashes with house-style punctuation. Never touches other characters. */
export function stripTypographicDashes(text: string): string {
  return text
    // "word — word" (spaced em dash, the common parenthetical/aside usage) -> comma
    .replace(/ +— +/g, ', ')
    // any remaining em dash (no surrounding spaces) -> comma
    .replace(/—/g, ', ')
    // en dash used as a numeric range, e.g. "7,000–10,000" -> "7,000 to 10,000"
    .replace(/(\d)\s*–\s*(\d)/g, '$1 to $2')
    // any remaining en dash -> hyphen
    .replace(/–/g, '-');
}

/**
 * Applies stripTypographicDashes to every string value in an object/array tree,
 * via a JSON round-trip so every nested field is covered without having to
 * enumerate them. Safe because em/en dash characters never appear in JSON
 * syntax, only inside string values.
 */
export function sanitizeDashesDeep<T>(value: T): T {
  const json = JSON.stringify(value);
  if (!json) return value;
  return JSON.parse(stripTypographicDashes(json)) as T;
}
