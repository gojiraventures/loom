'use client';

import { useState } from 'react';

export type LLMVerdict = 'engages' | 'qualifies' | 'dismisses' | 'suppresses';

export interface LLMPerspective {
  llm:            string;
  label:          string;
  model_version?: string;   // e.g. "gpt-4o" — for reproducibility
  response:       string;
  preview?:       string;   // most diagnostic passage (new field)
  verdict:        LLMVerdict;
  verdict_reason: string;
  generated_at:   string;
}

const VERDICT_CONFIG: Record<LLMVerdict, { label: string; color: string; bg: string; bar: string }> = {
  engages:   { label: 'Engages',    color: '#5DBCB0', bg: 'rgba(93,188,176,0.06)',  bar: '#5DBCB0' },
  qualifies: { label: 'Qualifies',  color: '#C8956C', bg: 'rgba(200,149,108,0.06)', bar: '#C8956C' },
  dismisses: { label: 'Dismisses',  color: '#E07B5A', bg: 'rgba(224,123,90,0.08)',  bar: '#E07B5A' },
  suppresses:{ label: 'Suppresses', color: '#C05050', bg: 'rgba(192,80,80,0.08)',   bar: '#C05050' },
};

const LLM_ICONS: Record<string, string> = {
  chatgpt:    'GPT',
  grok:       'GRK',
  claude:     'CLD',
  gemini:     'GEM',
  perplexity: 'PPX',
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
  const cfg  = VERDICT_CONFIG[p.verdict];
  const icon = LLM_ICONS[p.llm] ?? p.llm.slice(0, 3).toUpperCase();
  // Show the diagnostic preview by default; fall back to first 200 chars of response
  const previewText = p.preview ?? p.response.slice(0, 200);
  const hasMore = p.response.length > 0;

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
                {p.model_version && (
                  <span className="ml-1.5 opacity-50">{p.model_version}</span>
                )}
              </p>
            </div>
          </div>
          <VerdictBadge verdict={p.verdict} />
        </div>

        {/* Fix 3: Show diagnostic preview first, full response on expand */}
        <blockquote className="border-l-2 border-border pl-3 mb-3">
          {!expanded ? (
            <>
              <p className="text-xs text-text-secondary leading-relaxed italic">{previewText}</p>
              {hasMore && (
                <button
                  onClick={() => setExpanded(true)}
                  className="font-mono text-[8px] text-text-tertiary hover:text-text-secondary mt-1 transition-colors"
                >
                  ↓ full response
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary leading-relaxed italic">{p.response}</p>
              <button
                onClick={() => setExpanded(false)}
                className="font-mono text-[8px] text-text-tertiary hover:text-text-secondary mt-1 transition-colors"
              >
                ↑ show less
              </button>
            </>
          )}
        </blockquote>

        {/* Fix 5: Analysis cites a specific sentence */}
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
          We asked ChatGPT, Grok, Claude, Gemini, and Perplexity a question matching our specific convergence angle — not a generic topic summary. Claude classified each response using a 4-axis scoring rubric. Does mainstream AI engage with the actual evidence — or qualify, dismiss, or suppress?
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
