import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const metadata = {
  title: 'Contact — UnraveledTruth',
  description: 'Get in touch with the UnraveledTruth research team.',
};

const CONTACTS = [
  {
    category: 'Research & Editorial',
    desc: 'Found something we missed? Have a source that challenges or supports our findings? That\'s the kind of message we want.',
    email: 'team@unraveledtruth.com',
  },
  {
    category: 'Corrections',
    desc: 'If you believe something we published is factually incorrect, tell us specifically what, where, and what the correct information is. Include a source if you have one.',
    email: 'team@unraveledtruth.com',
  },
  {
    category: 'Creator Attribution & Licensing',
    desc: 'Using our research in your content? Questions about attribution or licensing for commercial use?',
    email: 'team@unraveledtruth.com',
  },
  {
    category: 'Subscriptions & Billing',
    desc: 'Account issues, billing questions, refund requests.',
    email: 'team@unraveledtruth.com',
  },
  {
    category: 'Privacy & Legal',
    desc: 'Data requests, privacy questions, legal correspondence.',
    email: 'team@unraveledtruth.com',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-[760px] mx-auto px-6">

          <header className="py-20 border-b border-border">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold block mb-6">Contact</span>
            <h1 className="font-serif text-[clamp(2rem,5vw,3rem)] font-normal leading-[1.2] mb-5">
              Get in Touch
            </h1>
            <p className="text-[1.05rem] text-text-secondary leading-relaxed max-w-[560px]">
              We read everything. We can&apos;t respond to everything. But if your message is specific and substantive, we will.
            </p>
          </header>

          <div className="divide-y divide-border">
            {CONTACTS.map((c) => (
              <div key={c.email} className="py-10">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary block mb-3">
                  {c.category}
                </span>
                <p className="text-[0.95rem] text-text-secondary leading-relaxed mb-4 max-w-[560px]">
                  {c.desc}
                </p>
                <a
                  href={`mailto:${c.email}`}
                  className="text-gold hover:text-gold/80 transition-colors border-b border-gold/30 hover:border-gold/60 pb-px font-mono text-[0.85rem]"
                >
                  {c.email}
                </a>
              </div>
            ))}
          </div>

          <div className="py-12 border-t border-border">
            <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-tertiary leading-relaxed">
              We do not accept unsolicited pitches, guest posts, link exchange requests, or sponsored content inquiries.
              UnraveledTruth does not accept advertising or sponsorships.
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
