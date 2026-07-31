/**
 * Service Health — live reachability + deprecation checks for every external
 * dependency the platform relies on (LLM providers, database, email).
 *
 * Each check is a lightweight, low-cost probe:
 *  - LLM providers: hit the provider's /models endpoint and confirm the
 *    specific model(s) the pipeline uses are still listed. A missing model is
 *    the earliest signal of a deprecation/rename.
 *  - Perplexity has no usable models list, so we send a 1-token completion.
 *  - Supabase: a trivial count query against a known table.
 *  - Resend: list domains (auth-only, no send).
 *
 * Nothing here throws — every probe resolves to a ServiceStatus so one dead
 * provider never blocks the rest of the dashboard.
 */
import { createServerSupabaseClient } from '@/lib/supabase';

export type ServiceCategory = 'llm' | 'database' | 'email';

export interface ExpectedModel {
  model: string;
  present: boolean;
}

export interface ServiceStatus {
  id: string;
  name: string;
  category: ServiceCategory;
  /** True if the required env/API key is set. */
  configured: boolean;
  /** True if the live probe succeeded. */
  ok: boolean;
  httpStatus?: number;
  latencyMs?: number;
  /** Human-readable summary of the result. */
  detail: string;
  /** For LLM providers: the models the pipeline expects, and whether each is still offered. */
  expectedModels?: ExpectedModel[];
  /** Where this service is used in the platform. */
  usedFor: string;
  checkedAt: string;
}

const TIMEOUT_MS = 8000;

async function timedFetch(url: string, init: RequestInit): Promise<{ res: Response; ms: number }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, ms: Date.now() - start };
  } finally {
    clearTimeout(t);
  }
}

/** Extract model IDs from either an OpenAI-style {data:[{id}]} or Gemini-style {models:[{name}]} body. */
function extractModelIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.data)) {
    return b.data.map((m) => (m as { id?: string }).id ?? '').filter(Boolean);
  }
  if (Array.isArray(b.models)) {
    // Gemini returns "models/gemini-2.5-flash" — strip the prefix
    return b.models
      .map((m) => (m as { name?: string }).name ?? '')
      .map((n) => n.replace(/^models\//, ''))
      .filter(Boolean);
  }
  return [];
}

/**
 * Generic OpenAI-compatible / Gemini "list models" probe.
 * Confirms the key works and that each expected model is still listed.
 */
async function checkModelsEndpoint(opts: {
  id: string;
  name: string;
  usedFor: string;
  envVar: string;
  url: string;
  headers: (key: string) => Record<string, string>;
  expected: string[];
}): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const key = process.env[opts.envVar];
  const base: ServiceStatus = {
    id: opts.id,
    name: opts.name,
    category: 'llm',
    configured: !!key,
    ok: false,
    usedFor: opts.usedFor,
    detail: '',
    checkedAt,
    expectedModels: opts.expected.map((model) => ({ model, present: false })),
  };

  if (!key) return { ...base, detail: `${opts.envVar} is not set` };

  try {
    const { res, ms } = await timedFetch(opts.url, { headers: opts.headers(key) });
    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = undefined; }

    if (!res.ok) {
      const msg = (parsed as { error?: { message?: string } })?.error?.message ?? text.slice(0, 200);
      return { ...base, httpStatus: res.status, latencyMs: ms, detail: `HTTP ${res.status}: ${msg}` };
    }

    const ids = extractModelIds(parsed);
    const expectedModels = opts.expected.map((model) => ({
      model,
      present: ids.some((id) => id === model || id.startsWith(model)),
    }));
    const missing = expectedModels.filter((m) => !m.present).map((m) => m.model);

    return {
      ...base,
      ok: true,
      httpStatus: res.status,
      latencyMs: ms,
      expectedModels,
      detail: missing.length
        ? `Reachable, but expected model(s) not listed: ${missing.join(', ')} — possible deprecation/rename`
        : `Reachable · ${ids.length} models available`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, detail: msg.includes('abort') ? `Timeout after ${TIMEOUT_MS}ms` : msg };
  }
}

async function checkAnthropic(): Promise<ServiceStatus> {
  return checkModelsEndpoint({
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    usedFor: 'Skeptic / cross-validation / debate / synthesis',
    envVar: 'ANTHROPIC_API_KEY',
    url: 'https://api.anthropic.com/v1/models?limit=100',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    expected: ['claude-sonnet-4-6'],
  });
}

async function checkGemini(): Promise<ServiceStatus> {
  const key = process.env.GOOGLE_AI_API_KEY ?? '';
  return checkModelsEndpoint({
    id: 'gemini',
    name: 'Google (Gemini)',
    usedFor: 'Primary research (Layer 1) · synthesis sections · editor pass',
    envVar: 'GOOGLE_AI_API_KEY',
    url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=200`,
    headers: () => ({}),
    expected: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  });
}

async function checkGroq(): Promise<ServiceStatus> {
  return checkModelsEndpoint({
    id: 'groq',
    name: 'Groq',
    usedFor: 'pseudoscience-historian reviewer (Qwen lineage anchor)',
    envVar: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    expected: ['qwen/qwen3.6-27b'],
  });
}

async function checkOpenAI(): Promise<ServiceStatus> {
  return checkModelsEndpoint({
    id: 'openai',
    name: 'OpenAI',
    usedFor: 'Configured — not currently in the research pipeline',
    envVar: 'OPENAI_API_KEY',
    url: 'https://api.openai.com/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    expected: [],
  });
}

async function checkXAI(): Promise<ServiceStatus> {
  return checkModelsEndpoint({
    id: 'xai',
    name: 'xAI (Grok)',
    usedFor: 'Configured — not currently in the research pipeline',
    envVar: 'XAI_API_KEY',
    url: 'https://api.x.ai/v1/models',
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
    expected: [],
  });
}

async function checkPerplexity(): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const key = process.env.PERPLEXITY_API_KEY;
  const base: ServiceStatus = {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'llm',
    configured: !!key,
    ok: false,
    usedFor: 'Fact-checking (Sonar lineage)',
    detail: '',
    checkedAt,
    expectedModels: [{ model: 'sonar-pro', present: false }],
  };
  if (!key) return { ...base, detail: 'PERPLEXITY_API_KEY is not set' };

  try {
    // No models list endpoint — send a minimal 1-token completion to verify auth + model.
    const { res, ms } = await timedFetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar-pro', messages: [{ role: 'user', content: 'ping' }], max_tokens: 16 }),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 200);
      try { msg = (JSON.parse(text) as { error?: { message?: string } }).error?.message ?? msg; } catch { /* keep raw */ }
      // 400 about the model name = the model was renamed/deprecated
      const modelGone = res.status === 400 && /model/i.test(msg);
      return {
        ...base,
        httpStatus: res.status,
        latencyMs: ms,
        detail: modelGone ? `sonar-pro rejected — possible deprecation: ${msg}` : `HTTP ${res.status}: ${msg}`,
      };
    }
    return {
      ...base,
      ok: true,
      httpStatus: res.status,
      latencyMs: ms,
      expectedModels: [{ model: 'sonar-pro', present: true }],
      detail: 'Reachable · sonar-pro responding',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, detail: msg.includes('abort') ? `Timeout after ${TIMEOUT_MS}ms` : msg };
  }
}

async function checkResend(): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const key = process.env.RESEND_API_KEY;
  const base: ServiceStatus = {
    id: 'resend',
    name: 'Resend (Email)',
    category: 'email',
    configured: !!key,
    ok: false,
    usedFor: 'Transactional + notification email',
    detail: '',
    checkedAt,
  };
  if (!key) return { ...base, detail: 'RESEND_API_KEY is not set' };
  try {
    const { res, ms } = await timedFetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const text = await res.text();
    if (!res.ok) return { ...base, httpStatus: res.status, latencyMs: ms, detail: `HTTP ${res.status}: ${text.slice(0, 160)}` };
    return { ...base, ok: true, httpStatus: res.status, latencyMs: ms, detail: 'Reachable · API key valid' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, detail: msg.includes('abort') ? `Timeout after ${TIMEOUT_MS}ms` : msg };
  }
}

async function checkSupabase(): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const base: ServiceStatus = {
    id: 'supabase',
    name: 'Supabase (Database)',
    category: 'database',
    configured,
    ok: false,
    usedFor: 'Job queue, findings, all persistence',
    detail: '',
    checkedAt,
  };
  if (!configured) return { ...base, detail: 'Supabase URL or service-role key not set' };
  try {
    const supabase = createServerSupabaseClient();
    const start = Date.now();
    const { error, count } = await supabase
      .from('research_jobs')
      .select('*', { count: 'exact', head: true });
    const ms = Date.now() - start;
    if (error) return { ...base, latencyMs: ms, detail: `Query failed: ${error.message}` };
    return { ...base, ok: true, latencyMs: ms, detail: `Reachable · ${count ?? 0} research jobs` };
  } catch (err) {
    return { ...base, detail: err instanceof Error ? err.message : String(err) };
  }
}

/** Runs every service probe in parallel. Never throws. */
export async function checkAllServices(): Promise<ServiceStatus[]> {
  const results = await Promise.allSettled([
    checkGemini(),
    checkAnthropic(),
    checkPerplexity(),
    checkGroq(),
    checkOpenAI(),
    checkXAI(),
    checkSupabase(),
    checkResend(),
  ]);
  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          id: 'unknown',
          name: 'Unknown service',
          category: 'llm' as ServiceCategory,
          configured: false,
          ok: false,
          usedFor: '',
          detail: String(r.reason),
          checkedAt: new Date().toISOString(),
        },
  );
}
