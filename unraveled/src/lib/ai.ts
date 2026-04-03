const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface AIResponse {
  content: string;
  model: string;
}

export async function queryAnthropic(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt || "You are a rigorous research assistant.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  return {
    content: data.content?.[0]?.text || "",
    model: "claude",
  };
}

export async function queryPerplexity(
  prompt: string
): Promise<AIResponse> {
  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a fact-checking research assistant. Cite sources.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: "perplexity",
  };
}

export async function queryOpenAI(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
    }),
  });

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: "gpt-4o",
  };
}

export async function queryGrok(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const response = await fetch(XAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.XAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: [
        { role: "system", content: systemPrompt || "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
    }),
  });

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    model: "grok-3",
  };
}

export async function queryGemini(
  prompt: string,
  systemPrompt?: string
): Promise<AIResponse> {
  const response = await fetch(
    `${GEMINI_API_URL}?key=${process.env.GOOGLE_AI_API_KEY!}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemPrompt
          ? { parts: [{ text: systemPrompt }] }
          : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
    }
  );

  const data = await response.json();
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    model: "gemini-2.0-flash",
  };
}

export async function crossReference(prompt: string) {
  const [anthropic, perplexity] = await Promise.allSettled([
    queryAnthropic(prompt),
    queryPerplexity(prompt),
  ]);

  return {
    anthropic: anthropic.status === "fulfilled" ? anthropic.value : null,
    perplexity: perplexity.status === "fulfilled" ? perplexity.value : null,
  };
}
