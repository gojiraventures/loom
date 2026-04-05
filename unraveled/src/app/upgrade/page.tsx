import { PaywallPrompt } from '@/components/PaywallPrompt';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PromoCodeInput } from './PromoCodeInput';

export default function UpgradePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-[var(--spacing-content)] mx-auto px-6 py-16 w-full">
        <div className="max-w-lg mx-auto">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            Membership
          </span>
          <h1 className="font-serif text-3xl mt-2 mb-4">Unlock the full research stack.</h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            Free accounts get full articles, source previews, and the ability to rate and flag research.
            Members get everything — the full relationship graph, all dossiers, raw research files, deep reports, and topic voting.
          </p>
          <PaywallPrompt feature="Full member access" />

          <div className="mt-12 border-t border-border pt-10">
            <PromoCodeInput />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
