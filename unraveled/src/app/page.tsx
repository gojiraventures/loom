import Link from 'next/link';

export const metadata = {
  title: 'Coming Soon — UnraveledTruth',
  description: 'Something is being uncovered. UnraveledTruth launches soon.',
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center px-6 relative overflow-hidden">

      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 40px,
            rgba(200,149,108,0.5) 40px, rgba(200,149,108,0.5) 41px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 40px,
            rgba(200,149,108,0.5) 40px, rgba(200,149,108,0.5) 41px
          )`,
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,149,108,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 text-center max-w-2xl mx-auto">

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-10">
          <div className="w-8 h-px bg-gold/40" />
          <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-text-tertiary">
            Something is being uncovered
          </span>
          <div className="w-8 h-px bg-gold/40" />
        </div>

        {/* Wordmark */}
        <h1 className="font-serif text-[clamp(36px,8vw,80px)] font-normal leading-[1.0] tracking-tight mb-3">
          Unraveled<span className="text-gold">Truth</span>
        </h1>

        {/* Domain */}
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-text-tertiary mb-10">
          unraveledtruth.com
        </p>

        {/* Tagline */}
        <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-lg mx-auto mb-4">
          When geographically isolated civilizations independently describe the
          same phenomena — that&apos;s not coincidence.
        </p>
        <p className="text-base text-text-secondary/60 leading-relaxed max-w-md mx-auto mb-16">
          A cross-tradition evidence index. No verdicts. Just patterns — and the
          tension between those who believe them and those who don&apos;t.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4 justify-center mb-10">
          <div className="flex-1 max-w-[80px] h-px bg-border" />
          <span className="font-mono text-[8px] tracking-[0.3em] uppercase text-text-tertiary">Launching soon</span>
          <div className="flex-1 max-w-[80px] h-px bg-border" />
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest border border-gold/40 text-gold px-6 py-3 hover:bg-gold/10 transition-colors"
        >
          Sign In
          <span>→</span>
        </Link>
      </div>

      {/* Bottom credit */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-text-tertiary/40">
          Advocate · Skeptic · You Decide
        </span>
      </div>
    </div>
  );
}
