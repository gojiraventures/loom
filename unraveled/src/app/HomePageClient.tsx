'use client';

import { useState } from 'react';

// ── Advocate / Skeptic Toggle ────────────────────────────────────────────────

export function AdvocateSkepticToggle() {
  const [side, setSide] = useState<'advocate' | 'skeptic'>('advocate');

  const advocate = {
    label: 'The Advocate',
    stance: 'The structural specificity cannot be accidental.',
    points: [
      'Independent civilizations separated by oceans describe the same sequence of events with matching detail.',
      'Geological evidence corroborates many of the described catastrophes within the same timeframes.',
      'The convergence across oral traditions predates any possibility of cross-contamination.',
    ],
    color: 'teal',
  };

  const skeptic = {
    label: 'The Skeptic',
    stance: 'Pattern-matching is a known cognitive bias.',
    points: [
      'Flood narratives exist because floods are universal human experiences — not because one flood happened.',
      'The "structural specificity" often dissolves under direct textual comparison.',
      'Selective citation of parallels ignores hundreds of non-matching traditions.',
    ],
    color: 'gold',
  };

  const active = side === 'advocate' ? advocate : skeptic;

  return (
    <div className="max-w-[var(--spacing-content)] mx-auto">
      {/* Toggle */}
      <div className="flex gap-px mb-8 border border-border w-fit">
        <button
          onClick={() => setSide('advocate')}
          className={`font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 transition-colors ${
            side === 'advocate'
              ? 'bg-teal/10 text-teal'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Advocate
        </button>
        <button
          onClick={() => setSide('skeptic')}
          className={`font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 transition-colors ${
            side === 'skeptic'
              ? 'bg-gold/10 text-gold'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Skeptic
        </button>
      </div>

      <div className="border border-border p-8 bg-ground-light/30">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              side === 'advocate' ? 'bg-teal' : 'bg-gold'
            }`}
          />
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            {active.label}
          </span>
        </div>

        <p className="font-serif text-xl sm:text-2xl leading-snug mb-6">
          &ldquo;{active.stance}&rdquo;
        </p>

        <ul className="space-y-3">
          {active.points.map((pt, i) => (
            <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
              <span
                className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${
                  side === 'advocate' ? 'bg-teal/60' : 'bg-gold/60'
                }`}
              />
              {pt}
            </li>
          ))}
        </ul>

        <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mt-6">
          Neither agent has the last word — you do.
        </p>
      </div>
    </div>
  );
}

// ── Community Signal Forms ────────────────────────────────────────────────────

export function CommunitySignal() {
  const [activeForm, setActiveForm] = useState<'tip' | 'topic' | 'source'>('tip');
  const [submitted, setSubmitted] = useState(false);
  const [value, setValue] = useState('');

  const forms = {
    tip: {
      label: 'Submit a Lead',
      placeholder: 'Describe a pattern you\'ve noticed across traditions…',
      cta: 'Submit Lead',
    },
    topic: {
      label: 'Suggest a Topic',
      placeholder: 'What phenomenon deserves investigation?',
      cta: 'Suggest Topic',
    },
    source: {
      label: 'Submit a Source',
      placeholder: 'Share a primary source, paper, or text with a URL…',
      cta: 'Submit Source',
    },
  };

  const active = forms[activeForm];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitted(true);
    setValue('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-[var(--spacing-content)] mx-auto">
      {/* Tabs */}
      <div className="flex gap-px mb-6 border-b border-border">
        {(Object.keys(forms) as Array<keyof typeof forms>).map((key) => (
          <button
            key={key}
            onClick={() => { setActiveForm(key); setSubmitted(false); setValue(''); }}
            className={`font-mono text-[9px] tracking-[0.2em] uppercase px-5 py-3 border-b-2 transition-colors -mb-px ${
              activeForm === key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {forms[key].label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={active.placeholder}
          rows={4}
          className="w-full bg-ground-light border border-border px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40 resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-text-tertiary">
            All submissions are reviewed before publication.
          </p>
          <button
            type="submit"
            className="font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2 border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
          >
            {submitted ? 'Received ✓' : active.cta}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Email CTA ─────────────────────────────────────────────────────────────────

export function EmailSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm">
      {submitted ? (
        <p className="font-mono text-[11px] tracking-wider uppercase text-gold py-2">
          You&apos;re on the list.
        </p>
      ) : (
        <>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="flex-1 bg-ground-light border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-gold/40"
          />
          <button
            type="submit"
            className="font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 transition-colors shrink-0"
          >
            Notify Me
          </button>
        </>
      )}
    </form>
  );
}
