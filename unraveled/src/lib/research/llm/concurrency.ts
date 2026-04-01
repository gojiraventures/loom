/**
 * Concurrency utilities for LLM agent runners.
 *
 * When OLLAMA_OVERRIDE_PROVIDERS is set, all gemini/gemini-flash calls are
 * redirected to a local Ollama server, which processes requests sequentially.
 * Firing dozens of agents simultaneously causes connection drops. Use
 * runWithConcurrency to cap in-flight requests when in Ollama mode.
 */

export const IS_OLLAMA_MODE = !!(process.env.OLLAMA_OVERRIDE_PROVIDERS?.trim());
export const OLLAMA_CONCURRENCY = parseInt(process.env.OLLAMA_CONCURRENCY ?? '3', 10);

/**
 * Run async tasks over an array with a max concurrency cap.
 * Behaves like Promise.allSettled but limits simultaneous in-flight tasks.
 */
export async function runWithConcurrency<T, I>(
  items: I[],
  concurrency: number,
  fn: (item: I) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
