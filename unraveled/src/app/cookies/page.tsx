import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Cookie Policy — UnraveledTruth',
  description: 'How UnraveledTruth uses cookies.',
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6 py-20">

          <header className="mb-12 border-b border-border pb-10">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-4">Legal</span>
            <h1 className="font-serif text-[clamp(2rem,4vw,2.8rem)] font-normal leading-[1.2] mb-3">Cookie Policy</h1>
            <p className="font-mono text-[11px] text-text-tertiary tracking-[0.05em]">Effective Date: April 2026</p>
          </header>

          <div className="space-y-12 text-[0.95rem] leading-[1.8] text-text-secondary">

            <section className="border border-border border-l-[3px] border-l-gold bg-ground-light/20 p-6">
              <h2 className="font-serif text-lg text-text-primary mb-3">The Short Version</h2>
              <p>We use one cookie. It keeps you logged in. That&apos;s it.</p>
              <p className="mt-2">We don&apos;t use advertising cookies. We don&apos;t use tracking cookies. We don&apos;t share cookie data with anyone.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">What We Set</h2>
              <div className="border border-border p-5">
                <div className="flex gap-4">
                  <span className="font-mono text-[11px] text-gold shrink-0 w-32 pt-0.5">Session cookie</span>
                  <p>Set by Supabase when you sign in. Keeps you authenticated between page visits. Expires when you sign out or after 7 days of inactivity. This cookie is strictly necessary for the service to function.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">What We Don&apos;t Set</h2>
              <p>We do not set Google Analytics cookies, Meta Pixel cookies, advertising network cookies, or any third-party tracking cookies.</p>
              <p className="mt-3 font-mono text-[11px] tracking-[0.06em] uppercase text-text-tertiary">No ads. No sponsors. No tracking.</p>
            </section>

            <section>
              <h2 className="font-serif text-xl text-text-primary mb-4">Your Choices</h2>
              <p>You can decline cookies in your browser settings. If you do, you can still read all free content on UnraveledTruth but you will not be able to sign in or access member features.</p>
            </section>

            <section className="border-t border-border pt-8">
              <h2 className="font-serif text-xl text-text-primary mb-3">Contact</h2>
              <p>Cookie questions: <a href="mailto:privacy@unraveledtruth.com" className="text-gold hover:text-gold/80 transition-colors">privacy@unraveledtruth.com</a></p>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
