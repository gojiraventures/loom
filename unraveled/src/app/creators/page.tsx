import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'For Creators — UnraveledTruth',
  description: 'Use our research in your content. Everything on UnraveledTruth is free to reference, quote, and build on — just credit us.',
};

// ── Copy-paste credit blocks ──────────────────────────────────────────────────

const CREDIT_BLOCKS = [
  {
    platform: 'YouTube Description',
    content: `Research from UnraveledTruth — "[Article Title]"\nhttps://www.unraveledtruth.com/topics/[slug]`,
  },
  {
    platform: 'Podcast Show Notes',
    content: `Sources & Research:\nUnraveledTruth — "[Article Title]"\nhttps://www.unraveledtruth.com/topics/[slug]`,
  },
  {
    platform: 'X / Twitter',
    content: `Source: @unraveledtruth\nunraveledtruth.com`,
  },
  {
    platform: 'Instagram Caption',
    content: `Research: UnraveledTruth (unraveledtruth.com)`,
  },
  {
    platform: 'Video Lower Third / On-Screen',
    content: `Research: UnraveledTruth.com`,
  },
  {
    platform: 'Blog / Article',
    content: `This article draws on research from UnraveledTruth. Read the full analysis: [Article Title](https://www.unraveledtruth.com/topics/[slug])`,
  },
];

// ── Do / Don't guidelines ─────────────────────────────────────────────────────

const GUIDELINES = [
  { do: true,  text: 'Credit UnraveledTruth by name and link to the specific article you used.' },
  { do: true,  text: 'Present both sides of the debate. Our research is balanced for a reason — the advocate and skeptic both get a fair hearing.' },
  { do: true,  text: 'Use the convergence score in context. It\'s a measure of cross-cultural pattern strength, not a truth percentage.' },
  { do: false, text: 'Don\'t present our research as proving something we explicitly say is unresolved. If we call it an open question, it\'s an open question.' },
  { do: false, text: 'Don\'t strip the nuance to make a clickbait headline. "Scientists prove ancient civilizations had contact" is not what our research says.' },
  { do: false, text: 'Don\'t modify our logo beyond what\'s provided here. No recoloring, stretching, or adding effects.' },
];

// ── Brand colors ──────────────────────────────────────────────────────────────

const PALETTE = [
  { hex: '#0F0F0F', label: 'Background' },
  { hex: '#F5F0E8', label: 'Text / Cream' },
  { hex: '#D4B483', label: 'Gold' },
  { hex: '#2A5C5E', label: 'Teal' },
];

export default function CreatorsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6">

          {/* ── Page header ───────────────────────────────────────────────── */}
          <header className="py-20 border-b border-border">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-6">
              For Creators
            </span>
            <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] font-normal leading-[1.2] mb-5">
              Use Our Research.<br />Just Credit Us.
            </h1>
            <p className="text-[1.05rem] text-text-secondary leading-relaxed max-w-[600px]">
              Everything on UnraveledTruth is free to reference, quote, and build on. Make a
              video. Record a podcast. Write an article. All we ask is that you tell people
              where the research came from.
            </p>
          </header>

          {/* ── The Deal ──────────────────────────────────────────────────── */}
          <section className="py-16 border-b border-border">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-5">
              The Deal
            </span>
            <h2 className="font-serif text-2xl font-normal mb-4">Free to use. One condition.</h2>
            <p className="text-text-secondary mb-6">
              Our research is published under Creative Commons Attribution 4.0. That means you
              can share it, adapt it, build on it, and monetize content that uses it — for any
              purpose, including commercial — as long as you provide attribution.
            </p>

            <div className="border border-border border-l-[3px] border-l-gold bg-ground-light/30 p-8 my-8">
              <h3 className="font-serif text-xl font-normal mb-3">What attribution means in practice</h3>
              <p className="text-text-secondary text-[0.95rem]">
                Mention UnraveledTruth by name. Link to the specific article you used. That's
                it. No permission forms. No approval process. No waiting. If you want to build
                a 45-minute YouTube video around one of our articles tonight, you can. Just tell
                your audience where the research came from.
              </p>
            </div>

            <p className="text-text-secondary">
              We built this research so it could reach people. Every time you credit us, you're
              introducing your audience to a resource they'll come back to. That's worth more to
              us than any licensing fee.
            </p>
          </section>

          {/* ── Credit blocks ──────────────────────────────────────────────── */}
          <section className="py-16 border-b border-border">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-5">
              Attribution
            </span>
            <h2 className="font-serif text-2xl font-normal mb-3">Copy-paste credit lines</h2>
            <p className="text-text-secondary mb-8">
              Use whichever format fits your platform. Swap in the actual article title and URL.
            </p>

            <div className="space-y-4">
              {CREDIT_BLOCKS.map((block) => (
                <div key={block.platform} className="border border-border bg-ground-light/20 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-ground-light/40 border-b border-border">
                    <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-gold">
                      {block.platform}
                    </span>
                    {/* Copy button — client-side only, graceful without JS */}
                    <button
                      onClick={undefined}
                      data-copy={block.content}
                      className="font-mono text-[10px] px-3 py-1 border border-border text-text-secondary hover:border-gold/40 hover:text-text-primary transition-colors copy-btn"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="px-5 py-4 font-mono text-[12px] text-text-primary leading-relaxed whitespace-pre-wrap break-all">
                    {block.content}
                  </pre>
                </div>
              ))}
            </div>

            {/* Copy button script */}
            <script dangerouslySetInnerHTML={{ __html: `
              document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                  navigator.clipboard.writeText(btn.dataset.copy).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = 'Copied';
                    btn.style.color = '#D4B483';
                    btn.style.borderColor = 'rgba(212,180,131,0.4)';
                    setTimeout(() => {
                      btn.textContent = orig;
                      btn.style.color = '';
                      btn.style.borderColor = '';
                    }, 2000);
                  });
                });
              });
            ` }} />
          </section>

          {/* ── Brand assets ───────────────────────────────────────────────── */}
          <section className="py-16 border-b border-border">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-5">
              Brand Assets
            </span>
            <h2 className="font-serif text-2xl font-normal mb-3">Logos</h2>
            <p className="text-text-secondary mb-8">
              Use these when referencing UnraveledTruth in your content. Don't modify, recolor,
              or distort them.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {/* Dark */}
              <div className="border border-border bg-ground-light/20 p-8 flex flex-col items-center gap-4">
                <span className="font-serif text-[1.1rem]">
                  Unraveled<span className="text-gold">Truth</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
                  Dark
                </span>
              </div>
              {/* Light */}
              <div className="border border-border bg-[#F5F0E8] p-8 flex flex-col items-center gap-4">
                <span className="font-serif text-[1.1rem] text-[#1A1A1A]">
                  Unraveled<span className="text-[#9E8560]">Truth</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
                  Light
                </span>
              </div>
              {/* Compact */}
              <div className="border border-border bg-ground-light/20 p-8 flex flex-col items-center gap-4">
                <span className="font-serif text-[0.85rem]">
                  Unraveled<span className="text-gold">Truth</span>
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
                  Compact
                </span>
              </div>
              {/* Icon mark */}
              <div className="border border-border bg-ground-light/20 p-8 flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-gold/40 flex items-center justify-center">
                  <span className="font-serif text-xl text-gold">U</span>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
                  Icon
                </span>
              </div>
            </div>

            <h2 className="font-serif text-2xl font-normal mb-3">Color palette</h2>
            <p className="text-text-secondary mb-6">
              If you're designing graphics that reference our brand.
            </p>
            <div className="flex gap-4 flex-wrap">
              {PALETTE.map((c) => (
                <div key={c.hex} className="text-center">
                  <div
                    className="w-16 h-16 border border-border rounded-sm"
                    style={{ background: c.hex }}
                  />
                  <span className="font-mono text-[9px] text-text-tertiary mt-2 block">{c.hex}</span>
                  <span className="font-mono text-[9px] text-text-tertiary block">{c.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Guidelines ────────────────────────────────────────────────── */}
          <section className="py-16 border-b border-border">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-5">
              Usage Guidelines
            </span>
            <h2 className="font-serif text-2xl font-normal mb-6">A few things we ask</h2>

            <div>
              {GUIDELINES.map((g, i) => (
                <div key={i} className="flex gap-4 py-4 border-b border-border/40 last:border-b-0 items-start">
                  <div className="shrink-0 mt-0.5">
                    {g.do ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-teal">
                        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-red-400/70">
                        <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M6 6L12 12M12 6L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-[0.95rem] text-text-secondary">{g.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Media / partnerships ──────────────────────────────────────── */}
          <section className="py-16 border-b border-border">
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-5">
              Something Bigger?
            </span>
            <h2 className="font-serif text-2xl font-normal mb-4">
              Media, documentary, and partnership inquiries
            </h2>
            <p className="text-text-secondary mb-5">
              If you're working on something larger — a documentary, a book, a series, a media
              partnership — and want to collaborate more deeply with our research team, we'd love
              to hear about it.
            </p>
            <a
              href="mailto:team@unraveledtruth.com"
              className="text-gold hover:text-gold/80 transition-colors border-b border-gold/30 hover:border-gold/60 pb-px"
            >
              team@unraveledtruth.com
            </a>
          </section>

          {/* ── Page footer ───────────────────────────────────────────────── */}
          <div className="py-16 text-center">
            <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-4">
              No Ads. No Sponsors. Just Evidence.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
