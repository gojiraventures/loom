const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

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
