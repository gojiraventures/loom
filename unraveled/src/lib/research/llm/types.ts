export type LLMProvider = 'gemini' | 'gemini-flash' | 'claude' | 'perplexity' | 'ollama';

export interface LLMRequest {
  provider: LLMProvider;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;         // Request structured JSON output
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;         // For cost tracking
  agentId?: string;           // For cost tracking
}

export interface LLMResponse {
  text: string;
  parsed?: unknown;           // Parsed JSON if jsonMode was requested
  model: string;
  inputTokens: number;
  outputTokens: number;
  provider: LLMProvider;
  durationMs: number;
}

export interface LLMError {
  provider: LLMProvider;
  message: string;
  retryable: boolean;
}
