/**
 * Groq LLM client — fast cloud inference for open-source models
 *
 * Groq runs the same open-source models as Ollama (llama, qwen, mixtral, gemma)
 * but on dedicated LPU hardware — typically 10-20x faster than local inference.
 * No guardrail differences vs local Ollama for the same model weights.
 *
 * API is OpenAI-compatible. Requires GROQ_API_KEY env var.
 *
 * Default model: llama-3.3-70b-versatile (best quality on Groq free tier)
 * Override with GROQ_MODEL env var.
 *
 * Available models (as of 2026):
 *   llama-3.3-70b-versatile    — best for research/analysis
 *   llama-3.1-8b-instant       — fastest, good for lightweight agents
 *   qwen-qwq-32b               — strong analytical reasoning
 *   mixtral-8x7b-32768         — large context window (32k)
 *   gemma2-9b-it               — Google's open model
 */
import type { LLMRequest, LLMResponse } from './types';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEFAULT_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const BASE_URL = 'https://api.groq.com/openai/v1';

export async function queryGroq(request: LLMRequest): Promise<LLMResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set');
  }

  const model = request.model ?? DEFAULT_MODEL;
  const start = Date.now();

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.userPrompt },
    ],
    temperature: request.temperature ?? 0.4,
    max_tokens: request.maxTokens ?? 4096,
    stream: false,
    ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Groq HTTP ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    model: string;
    choices: Array<{ message: { content: string }; finish_reason: string }>;
    usage: { prompt_tokens: number; completion_tokens: number };
  };

  const rawText = data.choices[0]?.message?.content ?? '';
  const durationMs = Date.now() - start;

  // QWQ and other reasoning models emit chain-of-thought inside <think>...</think> tags.
  // Strip it before storing — we only want the final answer, not the reasoning trace.
  const text = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  let parsed: unknown = undefined;
  if (request.jsonMode && text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Leave parsed undefined; caller will try JSON.parse(text) as fallback
    }
  }

  return {
    text,
    parsed,
    model: data.model ?? model,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    stopReason: data.choices[0]?.finish_reason,
    provider: 'groq',
    durationMs,
  };
}
