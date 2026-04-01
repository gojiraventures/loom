/**
 * Ollama LLM client — free local inference
 *
 * Connects to a locally running Ollama instance (default: http://localhost:11434).
 * Override with OLLAMA_BASE_URL env var.
 *
 * Recommended models by VRAM:
 *   4GB  → llama3.2:3b, phi3:mini
 *   8GB  → llama3.1:8b, mistral:7b, gemma2:9b
 *   16GB → llama3.1:14b, qwen2.5:14b
 *   24GB → llama3.1:32b, mixtral:8x7b (MoE, fits in ~26GB)
 *   48GB → llama3.3:70b (quantized), qwen2.5:72b (quantized)
 *
 * Set OLLAMA_MODEL to override the default model used when an agent
 * specifies provider: 'ollama' without a specific model.
 */
import type { LLMRequest, LLMResponse } from './types';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1:8b';
// 32b models can take 3-5 min per request; allow 10 min so queued requests don't abort while waiting
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '600000', 10);

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
}

export async function queryOllama(request: LLMRequest): Promise<LLMResponse> {
  const model = request.model ?? DEFAULT_MODEL;

  const start = Date.now();

  const messages: OllamaChatMessage[] = [
    { role: 'system', content: request.systemPrompt },
    { role: 'user', content: request.userPrompt },
  ];

  const body = {
    model,
    messages,
    stream: false,
    options: {
      temperature: request.temperature ?? 0.4,
      num_predict: request.maxTokens ?? 4096,
    },
    ...(request.jsonMode ? { format: 'json' } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Ollama timeout after ${OLLAMA_TIMEOUT_MS / 1000}s at ${OLLAMA_BASE_URL}`);
    }
    throw new Error(
      `Ollama connection failed at ${OLLAMA_BASE_URL} — is Ollama running? (${err instanceof Error ? err.message : String(err)})`,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Ollama HTTP ${res.status}: ${text}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  const text = data.message?.content ?? '';
  const durationMs = Date.now() - start;

  let parsed: unknown = undefined;
  if (request.jsonMode && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Leave parsed undefined; executor will try JSON.parse(text) as fallback
    }
  }

  return {
    text,
    parsed,
    model: data.model ?? model,
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
    provider: 'ollama',
    durationMs,
  };
}
