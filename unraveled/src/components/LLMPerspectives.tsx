'use client';

import { useState } from 'react';

export type LLMVerdict = 'engages' | 'qualifies' | 'dismisses' | 'suppresses';

export interface LLMPerspective {
  llm: string;
  label: string;
  response: string;
  verdict: LLMVerdict;
  verdict_reason: string;
  generated_at: string;
}

const VERDICT_CONFIG: Record<LLMVerdict, { label: string; color: string; bg: string; bar: string }> = {
  engages:   { label: 'Engages',    color: '#5DBCB0', bg: 'rgba(93,188,176,0.06)',  bar: '#5DBCB0' },
  qualifies: { label: 'Qualifies',  color: '#C8956C', bg: 'rgba(200,149,108,0.06)', bar: '#C8956C' },
  dismisses: { label: 'Dismisses',  color: '#E07B5A', bg: 'rgba(224,123,90,0.08)',  bar: '#E07B5A' },
  suppresses:{ label: 'Suppresses', color: '#C05050', bg: 'rgba(192,80,80,0.08)',   bar: '#C05050' },
};

const LLM_ICONS: Record<string, string> = {
  chatgpt: 'GPT',
  grok:    'GRK',
  claude:  'CLD',
  gemini:  'GEM',
};

function VerdictBadge({ verdict }: { verdict: LLMVerdict }) {
  const cfg = VERDICT_CONFIG[verdict];
  return (
    <span
      className="font-mono text-[9px] tracking-[0.2em] uppercase px-2 py-0.5 border"
      style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function PerspectiveCard({ p }: { p: LLMPerspective }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = VERDICT_CONFIG[p.verdict];
  const icon = LLM_ICONS[p.llm] ?? p.llm.slice(0, 3).toUpperCase();
  const isLong = p.response.length > 200;

  return (
    <div className="relative border border-border overflow-hidden" style={{ background: cfg.bg }}>
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.bar }} />
      <div className="pl-5 pr-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="font-mono text-[10px] font-bold w-8 h-8 flex items-center justify-center border shrink-0"
              style={{ color: cfg.color, borderColor: `${cfg.color}30` }}
            >
              {icon}
            </span>
            <div>
              <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-primary leading-tight">
                {p.label}
              </p>
              <p className="font-mono text-[8px] text-text-tertiary mt-0.5">
                {new Date(p.generated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <VerdictBadge verdict={p.verdict} />
        </div>

        <blockquote className="border-l-2 border-border pl-3 mb-3">
          <p className="text-xs text-text-secondary leading-relaxed italic">
            {expanded || !isLong ? p.response : p.response.slice(0, 200) + '…'}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[8px] text-text-tertiary hover:text-text-secondary mt-1 transition-colors"
            >
              {expanded ? '↑ show less' : '↓ read more'}
            </button>
          )}
        </blockquote>

        <p className="font-mono text-[9px] leading-snug" style={{ color: `${cfg.color}CC` }}>
          {p.verdict_reason}
        </p>
      </div>
    </div>
  );
}

interface Props {
  perspectives: LLMPerspective[];
}

export function LLMPerspectives({ perspectives }: Props) {
  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
          AI Consensus Check
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-2">
          How the Major AIs Handle This Topic
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-8">
          We asked ChatGPT, Grok, Claude, and Gemini the same question and had Claude analyze each response.
          Does mainstream AI engage — or does it qualify, dismiss, or suppress?
        </p>

        <div className="flex flex-wrap gap-3 mb-8">
          {(Object.entries(VERDICT_CONFIG) as [LLMVerdict, typeof VERDICT_CONFIG[LLMVerdict]][]).map(([v, cfg]) => (
            <div key={v} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.bar }} />
              <span className="font-mono text-[9px] uppercase text-text-tertiary">{cfg.label}</span>
              <span className="font-mono text-[8px] text-text-tertiary/50">—</span>
              <span className="font-mono text-[8px] text-text-tertiary/60">
                {v === 'engages'    && 'addresses it substantively'}
                {v === 'qualifies'  && 'hedges heavily'}
                {v === 'dismisses'  && 'calls it fringe'}
                {v === 'suppresses' && 'refuses to engage'}
              </span>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-px border border-border">
          {perspectives.map((p) => <PerspectiveCard key={p.llm} p={p} />)}
        </div>

        <p className="font-mono text-[8px] text-text-tertiary/40 mt-4">
          Verbatim responses from each AI's API, analyzed by Claude. Generated{' '}
          {new Date(perspectives[0]?.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.
        </p>
      </div>
    </section>
  );
}
