import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const [
    { data: peopleStats },
    { data: instStats },
    { data: locStats },
    { data: dossierCoverage },
    { data: lastRuns },
  ] = await Promise.all([
    supabase.rpc('health_people_stats'),
    supabase.rpc('health_institution_stats'),
    supabase.rpc('health_location_stats'),
    supabase.rpc('health_dossier_coverage'),
    supabase
      .from('maintenance_runs')
      .select('action, status, started_at, finished_at, summary, error')
      .order('started_at', { ascending: false })
      .limit(20),
  ]);

  // Build last-run map: action → most recent run
  const lastRunMap: Record<string, typeof lastRuns extends (infer T)[] | null ? T : never> = {};
  for (const run of lastRuns ?? []) {
    if (!lastRunMap[run.action]) lastRunMap[run.action] = run;
  }

  return NextResponse.json({
    people: peopleStats?.[0] ?? {},
    institutions: instStats?.[0] ?? {},
    locations: locStats?.[0] ?? {},
    dossiers: dossierCoverage?.[0] ?? {},
    lastRuns: lastRunMap,
  });
}
