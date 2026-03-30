import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { LLMRequest, LLMResponse } from './types';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set');
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function queryGemini(request: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  const ai = getClient();

  const model = ai.getGenerativeModel({
    model: request.provider === 'gemini-flash'
      ? 'gemini-2.5-flash'
      : 'gemini-2.5-pro',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      maxOutputTokens: request.maxTokens ?? 8192,
      temperature: request.temperature ?? 0.4,
      ...(request.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
    systemInstruction: request.systemPrompt,
  });

  const result = await model.generateContent(request.userPrompt);
  const response = result.response;
  const text = response.text();

  let parsed: unknown = undefined;
  if (request.jsonMode) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code blocks
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { parsed = JSON.parse(match[1]); } catch { /* leave undefined */ }
      }
    }
  }

  const usage = response.usageMetadata;

  return {
    text,
    parsed,
    model: request.provider === 'gemini-flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro',
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    provider: request.provider,
    durationMs: Date.now() - start,
  };
}
