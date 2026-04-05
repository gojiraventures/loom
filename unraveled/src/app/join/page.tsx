import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Join — UnraveledTruth',
  description: 'Access the full research stack: dossiers, relationship maps, and deep cross-tradition evidence.',
};

const FREE_FEATURES = [
  'Full access to all published reports',
  'First 3 sources per article',
  'Rate and flag research quality',
  'Save articles to read later',
];

const PAID_FEATURES = [
  'Everything in free',
  'Dossiers — full profiles on people, groups, and locations',
  'Relationship graph — interactive cross-tradition connection map',
  'All sources, raw research files, and deep evidence chains',
  'Topic voting — influence what gets researched next',
  'Early access to new investigations',
];

export default function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col bg-ground text-text-primary">
      <Header />

      <main className="flex-1">

        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-16 sm:py-24">
            <span className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary">
              Membership
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl mt-3 mb-6 max-w-2xl leading-[1.1]">
              The full picture requires{' '}
              <span className="text-gold">the full stack.</span>
            </h1>
            <p className="text-text-secondary leading-relaxed max-w-xl text-lg">
              Dozens of civilizations. Thousands of years apart. The same stories, the same silence.
              Unraveled maps every connection — and members get the map.
            </p>
          </div>
        </section>

        {/* Tiers */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-14">
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">

              {/* Free */}
              <div className="border border-border p-8">
                <p className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary mb-2">Free</p>
                <p className="font-serif text-3xl mb-1">$0</p>
                <p className="font-mono text-[9px] text-text-tertiary mb-6">Forever</p>
                <ul className="space-y-3 mb-8">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-gold mt-0.5 shrink-0">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center font-mono text-[0.65rem] tracking-[0.08em] uppercase px-6 py-3 border border-border text-text-secondary hover:text-gold hover:border-gold/40 transition-colors"
                >
                  Create free account
                </Link>
              </div>

              {/* Paid */}
              <div className="border border-gold/40 p-8 relative">
                <div className="absolute top-0 right-0 font-mono text-[7px] tracking-[0.2em] uppercase px-3 py-1 bg-gold text-ground">
                  Full Access
                </div>
                <p className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary mb-2">Member</p>
                <p className="font-serif text-3xl mb-1">
                  $8<span className="text-text-tertiary text-lg">/mo</span>
                </p>
                <p className="font-mono text-[9px] text-text-tertiary mb-6">or $80/yr — save 2 months</p>
                <ul className="space-y-3 mb-8">
                  {PAID_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-gold mt-0.5 shrink-0">✦</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/upgrade"
                  className="block text-center font-mono text-[0.65rem] tracking-[0.08em] uppercase px-6 py-3 bg-gold text-ground hover:bg-gold/90 transition-colors"
                >
                  Become a member
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* Feature callouts */}
        <section className="border-b border-border">
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-14">
            <p className="font-mono text-[8px] tracking-[0.25em] uppercase text-text-tertiary mb-10">
              What members unlock
            </p>
            <div className="grid sm:grid-cols-2 gap-px bg-border">

              <div className="bg-ground p-8">
                <p className="font-serif text-xl mb-3">Dossiers</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Full research profiles on the people, groups, and locations at the center of every investigation.
                  Primary sources, cross-references, and a timeline of their appearances across traditions.
                </p>
              </div>

              <div className="bg-ground p-8">
                <p className="font-serif text-xl mb-3">Relationship Graph</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  An interactive map connecting figures, texts, and events across civilizations that never met.
                  Trace a myth from Mesopotamia to Mesoamerica and see every link in between.
                </p>
              </div>

              <div className="bg-ground p-8">
                <p className="font-serif text-xl mb-3">Full Source Stack</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Every citation, primary text, and raw research file behind each article.
                  Not just the conclusion — the full chain of evidence.
                </p>
              </div>

              <div className="bg-ground p-8">
                <p className="font-serif text-xl mb-3">Topic Voting</p>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Vote on what gets investigated next. Member votes directly shape the research queue —
                  the highest-voted topics are what we work on.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Sign in link */}
        <section>
          <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-10 text-center">
            <p className="font-mono text-[9px] text-text-tertiary">
              Already have an account?{' '}
              <Link href="/login" className="text-gold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
