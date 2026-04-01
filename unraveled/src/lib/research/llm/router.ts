import type { LLMRequest, LLMResponse } from './types';
import { queryGemini } from './gemini';
import { queryClaude } from './claude';
import { queryPerplexityLLM } from './perplexity';
import { queryOllama } from './ollama';
import { trackCost } from './cost-tracker';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 2000, 4000]; // ms

// Redirect specified providers to Ollama for local dev cost savings.
// Set OLLAMA_OVERRIDE_PROVIDERS=gemini,gemini-flash in .env.local to enable.
const OLLAMA_OVERRIDE = new Set(
  (process.env.OLLAMA_OVERRIDE_PROVIDERS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
);

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      const delay = RETRY_DELAYS[attempt] ?? 4000;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Exhausted retries');
}

async function dispatchRequest(request: LLMRequest, provider: string): Promise<LLMResponse> {
  switch (provider) {
    case 'gemini':
    case 'gemini-flash':
      return queryGemini(request);
    case 'claude':
      return queryClaude(request);
    case 'perplexity':
      return queryPerplexityLLM(request);
    case 'ollama':
      return queryOllama(request);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function route(
  request: LLMRequest,
  agentId = 'unknown',
): Promise<LLMResponse> {
  const ollamaOverrideActive = !request.skipOllamaOverride && OLLAMA_OVERRIDE.has(request.provider);

  const response = await withRetry(async () => {
    if (ollamaOverrideActive) {
      // Strip the cloud model name so Ollama falls back to OLLAMA_MODEL env var
      const ollamaRequest = { ...request, model: undefined };
      try {
        return await queryOllama(ollamaRequest);
      } catch (err) {
        // Ollama unreachable — fall back to the original cloud provider
        const isConnectionError = err instanceof Error && (
          err.message.includes('fetch failed') ||
          err.message.includes('connection failed') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('timeout')
        );
        if (isConnectionError) {
          console.warn(`[router] Ollama unavailable, falling back to ${request.provider} for agent ${agentId}`);
          return dispatchRequest(request, request.provider);
        }
        throw err;
      }
    }

    return dispatchRequest(request, request.provider);
  });

  // Fire-and-forget cost tracking
  if (request.sessionId) {
    trackCost(response, agentId, request.sessionId ?? null, request.userPrompt.slice(0, 200));
  }

  return response;
}
