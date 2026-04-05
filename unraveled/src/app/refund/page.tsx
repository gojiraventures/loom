import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Refund Policy — UnraveledTruth',
  description: 'UnraveledTruth refund and cancellation policy.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6 py-20">

          <header className="mb-12 border-b border-border pb-10">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-4">Legal</span>
            <h1 className="font-serif text-[clamp(2rem,4vw,2.8rem)] font-normal leading-[1.2] mb-3">Refund Policy</h1>
          </header>

          <div className="space-y-12 text-[0.95rem] leading-[1.8] text-text-secondary">

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Monthly Subscriptions</h2>
              <p className="mb-4">Monthly subscriptions are billed at the start of each billing period. They are non-refundable once the period has started.</p>
              <p>You can cancel at any time and retain access until the end of the period you have paid for.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Annual Subscriptions</h2>
              <p className="mb-4">Annual subscriptions may be refunded on a prorated basis if requested within 14 days of the billing date. After 14 days, refunds are considered on a case-by-case basis.</p>
              <p>To request a refund, email <a href="mailto:team@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">team@unraveledtruth.com</a> with your account email and the reason for your request. We aim to respond within 2 business days.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Exceptional Circumstances</h2>
              <p>If you were charged in error, experienced a technical issue that prevented access, or have another exceptional circumstance, contact us. We handle these situations individually and fairly.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">How to Cancel</h2>
              <p>You can cancel your subscription at any time from your <a href="/account" className="text-gold hover:text-gold/80 transition-colors border-b border-gold/30">account settings page</a>. No phone calls, no forms, no friction.</p>
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="font-serif text-xl text-text-primary mb-3">Contact</h2>
              <p>Billing questions: <a href="mailto:team@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">team@unraveledtruth.com</a></p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
