import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email } = body as Record<string, unknown>;
  if (typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }

  try {
    // Add contact to Resend audience
    await resend.contacts.create({
      email,
      audienceId: process.env.RESEND_AUDIENCE_ID ?? '',
      unsubscribed: false,
    });

    // Send welcome email
    await resend.emails.send({
      from: 'UnraveledTruth <team@research.unraveledtruth.com>',
      to: email,
      subject: 'You\'re on the list — UnraveledTruth',
      html: `
        <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; background: #0a0a0b; color: #e8e0d4;">
          <p style="font-family: monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7a6a; margin: 0 0 32px;">UnraveledTruth</p>
          <h1 style="font-size: 28px; font-weight: normal; margin: 0 0 16px; line-height: 1.2;">You're in.</h1>
          <p style="font-size: 15px; line-height: 1.8; color: #a89880; margin: 0 0 24px;">
            We'll notify you when new reports are published — cross-tradition evidence on ancient mysteries,
            suppressed histories, and the patterns that don't fit the standard narrative.
          </p>
          <p style="font-size: 15px; line-height: 1.8; color: #a89880; margin: 0 0 32px;">
            No ads. No sponsors. Just evidence.
          </p>
          <a href="https://unraveledtruth.com/reports" style="font-family: monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #c8956c; text-decoration: none; border: 1px solid rgba(200,149,108,0.4); padding: 10px 20px; display: inline-block;">
            Read the evidence →
          </a>
          <p style="font-family: monospace; font-size: 10px; color: #4a4035; margin: 48px 0 0; border-top: 1px solid #1a1a1e; padding-top: 24px;">
            You subscribed at unraveledtruth.com · <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #4a4035;">Unsubscribe</a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Newsletter signup error:', err);
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
