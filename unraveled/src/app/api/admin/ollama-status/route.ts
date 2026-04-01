import { NextResponse } from 'next/server';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OVERRIDE_PROVIDERS = (process.env.OLLAMA_OVERRIDE_PROVIDERS ?? '').trim();

export async function GET() {
  // If the override isn't configured, Ollama isn't in use — nothing to warn about
  if (!OVERRIDE_PROVIDERS) {
    return NextResponse.json({ enabled: false });
  }

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    const online = res.ok;
    return NextResponse.json({ enabled: true, online, url: OLLAMA_BASE_URL });
  } catch {
    return NextResponse.json({ enabled: true, online: false, url: OLLAMA_BASE_URL });
  }
}
