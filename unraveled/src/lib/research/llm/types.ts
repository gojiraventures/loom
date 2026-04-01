export type LLMProvider = 'gemini' | 'gemini-flash' | 'claude' | 'perplexity' | 'ollama';

export interface LLMRequest {
  provider: LLMProvider;
  model?: string;             // Override the default model for this provider
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;         // Request structured JSON output
  maxTokens?: number;
  temperature?: number;
  sessionId?: string;         // For cost tracking
  agentId?: string;           // For cost tracking
  skipOllamaOverride?: boolean; // When true, use the specified provider even when OLLAMA_OVERRIDE_PROVIDERS is set
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
