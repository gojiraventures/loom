import Anthropic from '@anthropic-ai/sdk';
import { jsonrepair } from 'jsonrepair';
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
    ? `${request.systemPrompt}\n\nCRITICAL OUTPUT FORMAT: Return raw JSON only. Do NOT use markdown code fences (\`\`\`). Do NOT wrap your response in \`\`\`json. Start your response directly with { and end with }. Any character before { or after } will break parsing.`
    : request.systemPrompt;

  const userPrompt = request.jsonMode
    ? `${request.userPrompt}\n\nREMINDER: Raw JSON only. Start with { — no code fences, no markdown.`
    : request.userPrompt;

  // Use streaming so long responses don't hit SDK or platform timeouts.
  // Extended output beta allows up to 64k output tokens for large synthesis jobs.
  const stream = ai.messages.stream({
    model: request.model ?? 'claude-sonnet-4-6',
    max_tokens: request.maxTokens ?? 8192,
    temperature: request.temperature ?? 0.4,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any, { headers: { 'anthropic-beta': 'output-128k-2025-02-19' } });

  const message = await stream.finalMessage();

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  const stopReason = message.stop_reason ?? undefined;

  // Warn in dev if we hit the token limit — the JSON will be truncated
  if (stopReason === 'max_tokens') {
    console.warn(`[claude] max_tokens hit for model ${message.model} — output truncated at ${message.usage.output_tokens} tokens. Consider increasing maxTokens or reducing input size.`);
  }

  let parsed: unknown = undefined;
  if (request.jsonMode) {
    // Attempt 1: bare JSON
    try { parsed = JSON.parse(text); } catch { /* continue */ }

    // Attempt 2: strip code fences if Claude ignored the instruction
    if (parsed === undefined) {
      const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) {
        try { parsed = JSON.parse(fenceMatch[1].trim()); } catch { /* continue */ }
      }
    }

    // Attempt 3: extract first {...} or [...] block
    if (parsed === undefined) {
      const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (braceMatch) {
        try { parsed = JSON.parse(braceMatch[1]); } catch { /* continue */ }
      }
    }

    // Attempt 4: jsonrepair from first { or [ — handles truncation + trailing commas
    if (parsed === undefined) {
      const start = Math.min(
        text.indexOf('{') === -1 ? Infinity : text.indexOf('{'),
        text.indexOf('[') === -1 ? Infinity : text.indexOf('['),
      );
      if (start !== Infinity) {
        try { parsed = JSON.parse(jsonrepair(text.slice(start))); } catch { /* leave undefined */ }
      }
    }
  }

  return {
    text,
    parsed,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    stopReason,
    provider: request.provider,
    durationMs: Date.now() - start,
  };
}
