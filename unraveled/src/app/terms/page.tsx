import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service — UnraveledTruth',
  description: 'Terms governing your use of UnraveledTruth.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6 py-20">

          <header className="mb-12 border-b border-border pb-10">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-4">Legal</span>
            <h1 className="font-serif text-[clamp(2rem,4vw,2.8rem)] font-normal leading-[1.2] mb-3">Terms of Service</h1>
            <p className="font-mono text-[11px] text-text-tertiary tracking-[0.05em]">Effective Date: April 2026</p>
          </header>

          <div className="space-y-12 text-[0.95rem] leading-[1.8] text-text-secondary">

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">What UnraveledTruth Is</h2>
              <p>UnraveledTruth is an independent research publication. We investigate historical mysteries, cross-cultural patterns, and contested narratives using a structured adversarial research method. Our content is for informational and research purposes. It is not legal, medical, financial, or professional advice of any kind.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Your Account</h2>
              <p className="mb-4">You must provide a valid email address and accurate information when creating an account. You are responsible for maintaining the security of your account.</p>
              <p>You may not create accounts for others, use automated tools to create accounts, or impersonate any person or entity. We reserve the right to terminate accounts that violate these terms or that we reasonably believe are being used abusively.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Subscriptions and Billing</h2>
              <p className="mb-4">Paid subscriptions are billed in advance on a monthly or annual basis. Subscriptions automatically renew unless cancelled before the renewal date.</p>
              <p>You can cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period — you retain access until then.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Refunds</h2>
              <p className="mb-4">Monthly subscriptions are non-refundable once the billing period has started.</p>
              <p className="mb-4">Annual subscriptions may be refunded on a prorated basis if requested within 14 days of the billing date. Refund requests after 14 days are considered on a case-by-case basis.</p>
              <p>To request a refund, contact <a href="mailto:support@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">support@unraveledtruth.com</a>. See our <a href="/refund" className="text-gold hover:text-gold/80 transition-colors border-b border-gold/30">Refund Policy</a> for full details.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Our Content</h2>
              <p className="mb-4">All research, articles, reports, dossiers, and data on UnraveledTruth are the intellectual property of UnraveledTruth unless otherwise attributed.</p>
              <p className="mb-4">Free content may be shared with attribution — a link back to the original article is required.</p>
              <p>Premium content accessed through a subscription may not be reproduced, redistributed, or published elsewhere without written permission.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Creator Attribution</h2>
              <p className="mb-4">Our research is available for use by content creators with attribution. Attribution means a clear, visible credit to UnraveledTruth with a link to the original source.</p>
              <p>Republishing full articles or substantial portions of research without permission is not permitted under creator attribution.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Your Submissions</h2>
              <p>When you submit feedback, corrections, or research tips through our platform, you grant us the right to use that information to improve our research. Submissions are private and will not be published or attributed to you without your explicit permission.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Disclaimer</h2>
              <p className="mb-4">UnraveledTruth publishes evidence-based research. We do not assert that any particular claim is true — we report what the evidence shows and how strongly independent sources converge. Readers are encouraged to review sources and form their own conclusions.</p>
              <p className="mb-4">Our convergence scores are a structural measurement, not a statement of fact. We make no warranties about the completeness, accuracy, or timeliness of our research.</p>
              <p>Historical and cross-cultural research is inherently interpretive. We publish the strongest case on each side of contested questions.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, UnraveledTruth is not liable for any indirect, incidental, or consequential damages arising from your use of the platform. Our total liability for any claim is limited to the amount you paid us in the 12 months preceding the claim.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Changes to These Terms</h2>
              <p>We may update these terms. We will notify registered users of material changes by email. Continued use of the platform after changes constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Governing Law</h2>
              <p>These terms are governed by the laws of the State of Texas, United States. Disputes will be resolved in the courts of Texas.</p>
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="font-serif text-xl text-text-primary mb-3">Contact</h2>
              <p>Legal questions: <a href="mailto:legal@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">legal@unraveledtruth.com</a></p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
