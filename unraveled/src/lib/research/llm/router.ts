import type { LLMRequest, LLMResponse } from './types';
import { queryGemini } from './gemini';
import { queryClaude } from './claude';
import { queryPerplexityLLM } from './perplexity';
import { queryOllama } from './ollama';
import { trackCost } from './cost-tracker';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [0, 2000, 4000]; // ms

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

export async function route(
  request: LLMRequest,
  agentId = 'unknown',
): Promise<LLMResponse> {
  const response = await withRetry(async () => {
    switch (request.provider) {
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
        throw new Error(`Unknown provider: ${request.provider}`);
    }
  });

  // Fire-and-forget cost tracking
  if (request.sessionId) {
    trackCost(response, agentId, request.sessionId ?? null, request.userPrompt.slice(0, 200));
  }

  return response;
}
