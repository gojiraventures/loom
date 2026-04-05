import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy — UnraveledTruth',
  description: 'How UnraveledTruth collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6 py-20">

          <header className="mb-12 border-b border-border pb-10">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-4">Legal</span>
            <h1 className="font-serif text-[clamp(2rem,4vw,2.8rem)] font-normal leading-[1.2] mb-3">Privacy Policy</h1>
            <p className="font-mono text-[11px] text-text-tertiary tracking-[0.05em]">Effective Date: April 2026</p>
          </header>

          <div className="space-y-12 text-[0.95rem] leading-[1.8] text-text-secondary">

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">What We Collect</h2>
              <p className="mb-4">When you create an account, we collect your email address and display name. If you sign in using a third-party provider — Google, GitHub, or X — we receive only the basic profile information that provider shares: your email address and display name. We do not request or store any additional profile data, social connections, posts, or activity from those platforms.</p>
              <p className="mb-4">When you subscribe, Stripe processes your payment information. We never see, store, or handle your card details. Stripe returns a customer identifier which we store alongside your subscription status.</p>
              <p>When you submit feedback or flag an article, we store the content of your submission, the article it relates to, and your account identifier. Submissions are private and visible only to UnraveledTruth administrators.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">What We Do Not Collect</h2>
              <ul className="space-y-2">
                {[
                  'We do not run advertising analytics.',
                  'We do not use tracking pixels.',
                  'We do not build behavioral profiles.',
                  'We do not monitor your reading patterns beyond what is necessary to deliver the service.',
                  'We do not sell, rent, or share your data with any third party for commercial purposes.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-gold shrink-0 mt-1">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">How We Use Your Data</h2>
              <p className="mb-4">Your email is used to send transactional messages — account confirmation, subscription receipts, and notifications you have opted into. We do not send unsolicited marketing email.</p>
              <p className="mb-4">Your subscription status is used to determine what content you can access.</p>
              <p>Your feedback submissions are used internally to improve research accuracy.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Third Parties We Use</h2>
              <div className="space-y-3">
                {[
                  ['Supabase', 'Database and authentication infrastructure, hosted in the United States.'],
                  ['Stripe', 'Payment processing. Stripe\'s privacy policy governs how they handle payment data.'],
                  ['Google, GitHub, X', 'Optional sign-in providers. Their privacy policies govern how they handle authentication.'],
                  ['Resend', 'Transactional email delivery.'],
                ].map(([name, desc]) => (
                  <div key={name as string} className="flex gap-4">
                    <span className="font-mono text-[11px] text-gold shrink-0 w-36 pt-0.5">{name}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4">We do not use Google Analytics, Meta Pixel, or any advertising network.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Cookies</h2>
              <p className="mb-4">We set a session cookie to keep you logged in. We do not set advertising cookies or third-party tracking cookies. If you decline cookies, you can still read all free content but cannot sign in.</p>
              <p>See our <a href="/cookies" className="text-gold hover:text-gold/80 transition-colors border-b border-gold/30">Cookie Policy</a> for full details.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Data Retention</h2>
              <p className="mb-4">Your account data is retained for as long as your account exists. If you delete your account, your personal data is removed within 30 days.</p>
              <p>Anonymized, non-identifiable data derived from research feedback may be retained indefinitely as part of our editorial record.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Your Rights</h2>
              <p>You can request a copy of your data, request correction of inaccurate data, or request deletion of your account and associated data at any time by contacting us at <a href="mailto:privacy@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">privacy@unraveledtruth.com</a>. EU and California residents have additional rights under GDPR and CCPA respectively — we honor all such requests.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Children</h2>
              <p>UnraveledTruth is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has created an account, contact us at <a href="mailto:privacy@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">privacy@unraveledtruth.com</a> and we will remove it promptly.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Changes</h2>
              <p>If we make material changes to this policy, we will notify registered users by email and update the effective date above.</p>
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="font-serif text-xl text-text-primary mb-3">Contact</h2>
              <p>Privacy questions: <a href="mailto:privacy@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">privacy@unraveledtruth.com</a></p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
