/**
 * GET /api/admin/jobs
 *
 * Returns all research jobs for the admin Jobs tab.
 * Ordered by created_at DESC, capped at 500 rows.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('research_jobs')
    .select()
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ jobs: data ?? [] });
}
