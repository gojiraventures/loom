/**
 * GET /api/admin/service-health
 *
 * Live status of every external dependency (LLM providers, database, email).
 * Protected by the /admin layout. Runs all probes in parallel; never caches.
 */
import { NextResponse } from 'next/server';
import { checkAllServices } from '@/lib/admin/service-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const services = await checkAllServices();
  const summary = {
    total: services.length,
    ok: services.filter((s) => s.ok).length,
    down: services.filter((s) => s.configured && !s.ok).length,
    unconfigured: services.filter((s) => !s.configured).length,
    deprecationWarnings: services.filter(
      (s) => s.ok && s.expectedModels?.some((m) => !m.present),
    ).length,
  };
  return NextResponse.json({ services, summary, checkedAt: new Date().toISOString() });
}
