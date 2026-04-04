import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSessionSupabaseClient } from '@/lib/supabase-session';
import { createServerSupabaseClient } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'UnraveledTruth <team@research.unraveledtruth.com>';
const DAILY_LIMIT = 3;

export async function POST(req: NextRequest) {
  const session = await createSessionSupabaseClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check role — registered+ only
  const admin = createServerSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, banned')
    .eq('id', user.id)
    .single();

  if (!profile || !['registered', 'paid', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (profile.banned) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  // ── Rate limit: 3 submissions per user per day ────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: limit } = await admin
    .from('submission_rate_limits')
    .select('feedback_count')
    .eq('user_id', user.id)
    .eq('submission_date', today)
    .single();

  if ((limit?.feedback_count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `Daily limit reached. You can submit up to ${DAILY_LIMIT} pieces of feedback per day.` },
      { status: 429 },
    );
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  const body = await req.json() as {
    article_id?: string;
    article_title?: string;
    category?: string;
    content?: string;
    source_url?: string;
  };

  const { article_id, article_title, category, content, source_url } = body;

  const VALID_CATEGORIES = [
    'factual_inaccuracy', 'missing_source', 'outdated_information',
    'missing_context', 'other',
  ];

  if (!article_id) return NextResponse.json({ error: 'article_id required' }, { status: 400 });
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!content?.trim() || content.trim().length < 10) {
    return NextResponse.json({ error: 'Please describe the issue in at least 10 characters' }, { status: 400 });
  }

  // ── Insert — escalation trigger fires automatically ───────────────────────
  const { data: submission, error: insertError } = await session
    .from('submissions')
    .insert({
      submission_type: 'article_feedback',
      title: article_title ?? article_id,
      description: content.trim(),
      article_id,
      category,
      content: content.trim(),
      source_url: source_url?.trim() || null,
      user_id: user.id,
      submitter_user_id: user.id,
      status: 'pending', // trigger may override to 'reviewing' for new accounts
    })
    .select('id, status')
    .single();

  if (insertError) {
    console.error('[feedback] insert error:', insertError.message);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  }

  // ── Update rate limit counter (upsert) ────────────────────────────────────
  await admin.from('submission_rate_limits').upsert(
    { user_id: user.id, submission_date: today, feedback_count: (limit?.feedback_count ?? 0) + 1 },
    { onConflict: 'user_id,submission_date' },
  );

  // ── Auto-response email ───────────────────────────────────────────────────
  if (user.email) {
    resend.emails.send({
      from: FROM,
      to: user.email,
      subject: 'We received your feedback — UnraveledTruth',
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; background: #0a0a0b; color: #e8e0d4;">
          <p style="font-family: monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a6a; margin: 0 0 32px;">UnraveledTruth</p>
          <h1 style="font-size: 24px; font-weight: normal; margin: 0 0 16px; line-height: 1.2;">We received your feedback.</h1>
          <p style="font-size: 15px; line-height: 1.8; color: #a89880; margin: 0 0 24px;">
            Thanks for helping us get this right. Every submission is reviewed by a real person.
            We don't respond to every message but we read all of them, and your feedback directly
            shapes how we update and expand our research.
          </p>
          <p style="font-family: monospace; font-size: 11px; color: #6a5a4a; border-left: 2px solid #2a2a2e; padding-left: 16px; margin: 0 0 32px;">
            Re: ${article_title ?? article_id}<br/>
            Category: ${category.replace(/_/g, ' ')}
          </p>
          <p style="font-size: 14px; line-height: 1.8; color: #6a5a4a; margin: 0;">
            — UnraveledTruth
          </p>
        </div>
      `,
    }).catch((err) => console.error('[feedback] email error:', err));
  }

  return NextResponse.json({ ok: true, id: submission.id });
}
