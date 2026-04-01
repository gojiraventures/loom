import Anthropic from '@anthropic-ai/sdk';
import type { LLMRequest, LLMResponse } from './types';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function queryClaude(request: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const ai = getClient();

  const systemPrompt = request.jsonMode
    ? `${request.systemPrompt}\n\nYou MUST respond with valid JSON only. No markdown, no explanations outside the JSON structure.`
    : request.systemPrompt;

  const message = await ai.messages.create({
    model: request.model ?? 'claude-sonnet-4-6',
    max_tokens: request.maxTokens ?? 8192,
    temperature: request.temperature ?? 0.4,
    system: systemPrompt,
    messages: [{ role: 'user', content: request.userPrompt }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  let parsed: unknown = undefined;
  if (request.jsonMode) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try fence-stripped content
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try { parsed = JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
      }
      // Try extracting first {...} or [...] block
      if (parsed === undefined) {
        const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (braceMatch) {
          try { parsed = JSON.parse(braceMatch[1]); } catch { /* leave undefined */ }
        }
      }
    }
  }

  return {
    text,
    parsed,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    provider: request.provider,
    durationMs: Date.now() - start,
  };
}
