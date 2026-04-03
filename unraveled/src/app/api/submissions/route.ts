import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { queryAnthropic } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

interface ModerationResult {
  flagged: boolean;
  reason: string | null;
}

async function moderate(content: string): Promise<ModerationResult> {
  try {
    const result = await queryAnthropic(
      `Classify this user-submitted text for a research platform. Is it clean or does it contain hate speech, threats, slurs, obscenities, harassment, or clearly abusive content?

Text: "${content.slice(0, 500)}"

Return ONLY valid JSON:
{
  "flagged": true or false,
  "reason": "one sentence reason if flagged, null if clean"
}`,
      'You are a content moderation classifier. Return ONLY valid JSON, no prose.'
    );
    const cleaned = result.content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as ModerationResult;
  } catch {
    return { flagged: false, reason: null };
  }
}

// ── GET /api/submissions?status=pending|backlogged|actioned|dismissed|flagged|all ──

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? 'pending';
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (status === 'pending') {
    // 'submitted' is the legacy table default — treat same as 'pending'
    query = query.in('status', ['pending', 'submitted']).eq('moderation_status', 'clean');
  } else if (status === 'flagged') {
    query = query.eq('moderation_status', 'flagged');
  } else if (status !== 'all') {
    query = query.eq('status', status).eq('moderation_status', 'clean');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

// ── POST /api/submissions — public submission ─────────────────────────────────

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { submission_type, content, email } = body as Record<string, unknown>;

  if (!submission_type || !['person', 'institution', 'research'].includes(submission_type as string)) {
    return NextResponse.json({ error: 'submission_type must be person, institution, or research' }, { status: 400 });
  }
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const ip = getClientIP(req);
  const supabase = createServerSupabaseClient();

  // ── Rate limit: 1 per type per IP per calendar day ────────────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('submission_type', submission_type as string)
    .gte('created_at', todayStart.toISOString());

  if ((count ?? 0) >= 1) {
    return NextResponse.json(
      { error: "You've already submitted this type today. Try again tomorrow." },
      { status: 429 }
    );
  }

  // ── Content moderation ────────────────────────────────────────────────────
  const mod = await moderate(content.trim());

  const typeLabels: Record<string, string> = {
    person: 'Person suggestion',
    institution: 'Institution flag',
    research: 'Research request',
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      submission_type,
      title: typeLabels[submission_type as string] ?? (submission_type as string),
      description: content.trim(),
      content: content.trim(),
      status: 'pending',
      ip_address: ip,
      moderation_status: mod.flagged ? 'flagged' : 'clean',
      moderation_reason: mod.reason ?? null,
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return success to the user regardless of moderation outcome
  // (don't tell bad actors their content was flagged)
  return NextResponse.json({ submission: { id: data.id } });
}

// ── PATCH /api/submissions ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { id, status, notes } = body as Record<string, unknown>;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (status) {
    patch.status = status;
    if (status === 'actioned') patch.actioned_at = new Date().toISOString();
  }
  if (typeof notes === 'string') {
    patch.notes = notes;
    patch.reviewer_notes = notes;
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('submissions').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// ── DELETE /api/submissions?id=... ────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('submissions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
