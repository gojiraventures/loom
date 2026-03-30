import { createServerSupabaseClient } from '@/lib/supabase';
import type { LLMResponse } from './types';

// Approximate cost per 1M tokens (USD) as of March 2026
const COST_PER_1M_INPUT: Record<string, number> = {
  'gemini-2.5-pro':   2.00,
  'gemini-2.5-flash': 0.15,
  'claude-opus-4-6':  15.00,
  'claude-sonnet-4-6': 3.00,
  'sonar-pro':        3.00,
};
const COST_PER_1M_OUTPUT: Record<string, number> = {
  'gemini-2.5-pro':   8.00,
  'gemini-2.5-flash': 0.60,
  'claude-opus-4-6':  75.00,
  'claude-sonnet-4-6': 15.00,
  'sonar-pro':        15.00,
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const inputCost = ((COST_PER_1M_INPUT[model] ?? 2.0) / 1_000_000) * inputTokens;
  const outputCost = ((COST_PER_1M_OUTPUT[model] ?? 8.0) / 1_000_000) * outputTokens;
  return inputCost + outputCost;
}

export async function trackCost(
  response: LLMResponse,
  agentId: string,
  sessionId: string | null,
  queryPreview: string,
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const estimatedCost = estimateCost(response.model, response.inputTokens, response.outputTokens);

    await supabase.from('ai_research_log').insert({
      session_id: sessionId,
      agent_id: agentId,
      provider: response.provider,
      model: response.model,
      query_preview: queryPreview.slice(0, 500),
      input_tokens: response.inputTokens,
      output_tokens: response.outputTokens,
      estimated_cost_usd: estimatedCost,
      duration_ms: response.durationMs,
    });
  } catch {
    // Non-fatal — don't let cost tracking break the pipeline
    console.warn('[cost-tracker] Failed to log cost:', agentId, sessionId);
  }
}
