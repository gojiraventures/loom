'use client';

import { useState } from 'react';

// ── Dossier Tabs — People / Institutions ─────────────────────────────────────

const PEOPLE_CATEGORIES = [
  {
    key: 'whistleblower',
    dot: '#C8956C',
    label: 'Whistleblower',
    desc: 'Individuals who came forward with classified or suppressed information at personal risk',
  },
  {
    key: 'researcher',
    dot: '#6AADAD',
    label: 'Researcher',
    desc: 'Academics, independent scholars, and investigators pursuing evidence across disciplines',
  },
  {
    key: 'gatekeeper',
    dot: '#AD6A6A',
    label: 'Gatekeeper',
    desc: 'Officials who controlled access to evidence, collections, or publication channels',
  },
  {
    key: 'journalist',
    dot: '#8B7EC8',
    label: 'Journalist',
    desc: 'Reporters and filmmakers who brought suppressed stories to public attention',
  },
  {
    key: 'historical',
    dot: '#7E8EA0',
    label: 'Historical figure',
    desc: "Key figures from history whose decisions shaped what we know — and what we don't",
  },
];

const INSTITUTION_CATEGORIES = [
  {
    key: 'government',
    dot: '#AD6A6A',
    label: 'Government',
    desc: 'Agencies with classified programs, evidence custody, or disclosure authority',
  },
  {
    key: 'museum',
    dot: '#C8956C',
    label: 'Museum / Archive',
    desc: 'Collections that control access to physical evidence and archaeological remains',
  },
  {
    key: 'academic',
    dot: '#6AADAD',
    label: 'Academic',
    desc: 'Universities, journals, and societies that shape what counts as legitimate scholarship',
  },
  {
    key: 'religious',
    dot: '#8B7EC8',
    label: 'Religious',
    desc: 'Organizations that hold ancient texts, archives, and theological authority over interpretation',
  },
];

export function DossierTabs({
  peopleCount,
  institutionCount,
}: {
  peopleCount: number;
  institutionCount: number;
}) {
  const [active, setActive] = useState<'people' | 'institutions'>('people');

  const categories = active === 'people' ? PEOPLE_CATEGORIES : INSTITUTION_CATEGORIES;
  const totalCount = active === 'people' ? peopleCount : institutionCount;

  // Distribute total count across categories proportionally (best-effort)
  const perCat = Math.max(Math.floor(totalCount / categories.length), 1);
  const remainder = totalCount - perCat * (categories.length - 1);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-0">
        <button
          onClick={() => setActive('people')}
          className={`flex items-center gap-2 px-6 py-3 font-mono text-[0.7rem] tracking-[0.06em] uppercase border-b-2 transition-colors -mb-px ${
            active === 'people'
              ? 'border-gold text-gold'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
          </svg>
          People
          <span className={`text-[0.6rem] px-1.5 py-0.5 border ${active === 'people' ? 'border-[rgba(200,149,108,0.4)] text-gold bg-[rgba(200,149,108,0.05)]' : 'border-border text-text-tertiary bg-ground-light/40'}`}>
            {peopleCount}
          </span>
        </button>
        <button
          onClick={() => setActive('institutions')}
          className={`flex items-center gap-2 px-6 py-3 font-mono text-[0.7rem] tracking-[0.06em] uppercase border-b-2 transition-colors -mb-px ${
            active === 'institutions'
              ? 'border-gold text-gold'
              : 'border-transparent text-text-tertiary hover:text-text-secondary'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>
          </svg>
          Institutions
          <span className={`text-[0.6rem] px-1.5 py-0.5 border ${active === 'institutions' ? 'border-[rgba(200,149,108,0.4)] text-gold bg-[rgba(200,149,108,0.05)]' : 'border-border text-text-tertiary bg-ground-light/40'}`}>
            {institutionCount}
          </span>
        </button>
      </div>

      {/* Category list */}
      <div className="border border-t-0 border-border divide-y divide-border">
        {categories.map((cat, i) => {
          const count = i === categories.length - 1 ? remainder : perCat;
          return (
            <div
              key={cat.key}
              className="grid grid-cols-[180px_100px_1fr] gap-6 items-center px-6 py-4 hover:bg-ground-light/40 transition-colors cursor-default"
            >
              <div className="flex items-center gap-2 font-sans text-[0.85rem] font-medium">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.dot }} />
                {cat.label}
              </div>
              <div className="font-mono text-[0.65rem] text-gold tracking-[0.04em] whitespace-nowrap">
                {count} {active === 'people' ? 'profiles' : 'institutions'}
              </div>
              <div className="text-[0.8rem] text-text-secondary leading-[1.45]">{cat.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Relationship Filter Pills ────────────────────────────────────────────────

const FILTER_PILLS = ['All', 'Mentor / Student', 'Funded', 'Investigated', 'Contradicted', 'Co-appeared', 'Employed'];

export function RelationshipFilters() {
  const [active, setActive] = useState('All');

  return (
    <div className="flex items-center gap-4 px-6 py-4 border-t border-border bg-ground-light/40 flex-wrap">
      <span className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-text-tertiary whitespace-nowrap">
        Filter by
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill}
            onClick={() => setActive(pill)}
            className={`font-mono text-[0.6rem] tracking-[0.03em] px-3 py-1.5 border transition-colors ${
              active === pill
                ? 'border-[rgba(200,149,108,0.4)] text-gold bg-[rgba(200,149,108,0.05)]'
                : 'border-border text-text-tertiary hover:border-[rgba(255,255,255,0.12)] hover:text-text-secondary'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Community Signal — 3-column submission cards ─────────────────────────────

type FormKey = 'person' | 'institution' | 'research';

const FORMS = {
  person: {
    title: 'Suggest a person',
    desc: 'A researcher, whistleblower, gatekeeper, or figure connected to the evidence. We\'ll build their dossier and map their network.',
    placeholder: "Who should we investigate? What's their connection to the evidence?",
    cta: 'Submit person',
  },
  institution: {
    title: 'Flag an institution',
    desc: 'A museum, agency, university, or organization that controlled, suppressed, or shaped the narrative around evidence.',
    placeholder: "Which institution? What's the story?",
    cta: 'Submit institution',
  },
  research: {
    title: 'Request research',
    desc: "A topic, pattern, or anomaly you want our agents to investigate. The stranger and more specific, the better.",
    placeholder: "What do you want us to look into? What made you curious?",
    cta: 'Submit request',
  },
} as const;

function SubmissionCard({ formKey }: { formKey: FormKey }) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const form = FORMS[formKey];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitted(true);
    setValue('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  const icons: Record<FormKey, React.ReactNode> = {
    person: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><path d="M16 3l2 2-2 2" opacity="0.5"/>
      </svg>
    ),
    institution: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/><circle cx="15" cy="15" r="2" opacity="0.5"/>
      </svg>
    ),
    research: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <path d="M12 18v-6" opacity="0.5"/><path d="M9 15h6" opacity="0.5"/>
      </svg>
    ),
  };

  return (
    <div className="bg-ground-light/40 p-8 flex flex-col">
      <div className="text-[rgba(200,149,108,0.6)] mb-4">{icons[formKey]}</div>
      <div className="font-serif text-[1.1rem] font-medium mb-2">{form.title}</div>
      <p className="text-[0.8rem] leading-[1.55] text-text-secondary mb-5 flex-1">{form.desc}</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={form.placeholder}
          rows={3}
          className="w-full bg-ground border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-[rgba(200,149,108,0.4)] resize-none mb-3 transition-colors"
        />
        <button
          type="submit"
          className="font-mono text-[0.6rem] tracking-[0.08em] uppercase px-5 py-2 border border-border text-text-secondary hover:border-[rgba(200,149,108,0.4)] hover:text-gold transition-colors"
        >
          {submitted ? 'Received ✓' : form.cta}
        </button>
      </form>
    </div>
  );
}

export function CommunitySignal() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
      <SubmissionCard formKey="person" />
      <SubmissionCard formKey="institution" />
      <SubmissionCard formKey="research" />
    </div>
  );
}

// ── Email Signup ──────────────────────────────────────────────────────────────

export function EmailSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail('');
  };

  if (submitted) {
    return (
      <p className="font-mono text-[0.8rem] tracking-wider uppercase text-gold py-3">
        You&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-[440px] mx-auto">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 bg-ground-light border border-r-0 border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-[rgba(200,149,108,0.4)] transition-colors"
      />
      <button
        type="submit"
        className="font-mono text-[0.65rem] tracking-[0.1em] uppercase px-7 py-3 bg-gold text-ground border border-gold hover:bg-[#d9a87a] transition-colors shrink-0 font-medium"
      >
        Request access
      </button>
    </form>
  );
}
