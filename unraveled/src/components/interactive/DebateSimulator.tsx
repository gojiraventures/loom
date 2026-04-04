'use client';

import { useEffect, useRef, useState } from 'react';
import type { DebateSimulatorData } from '@/lib/interactive/types';

interface ArgumentCardProps {
  text: string;
  index: number;
  side: 'advocate' | 'skeptic';
  visible: boolean;
}

function ArgumentCard({ text, index, side, visible }: ArgumentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280;
  // Use first sentence as the preview hook
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] ?? text.slice(0, 180);
  const color = side === 'advocate' ? '#5DBCB0' : '#C8956C';
  const bg    = side === 'advocate' ? 'rgba(93,188,176,0.04)' : 'rgba(200,149,108,0.04)';

  return (
    <div
      className="border border-border p-4 transition-all duration-300"
      style={{
        background: expanded ? bg : 'transparent',
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <div className="flex items-start gap-3">
        <span className="font-mono text-[9px] shrink-0 mt-0.5" style={{ color }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-secondary leading-[1.8]">
            {expanded || !isLong ? text : firstSentence + '…'}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-mono text-[8px] mt-2 transition-colors"
              style={{ color: `${color}99` }}
            >
              {expanded ? '↑ collapse' : '↓ expand'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props { data: DebateSimulatorData }

export function DebateSimulator({ data }: Props) {
  const { advocate, skeptic } = data;
  const [visible, setVisible] = useState(false);
  const [filter, setFilter]   = useState<'all' | 'advocate' | 'skeptic'>('all');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="border border-border bg-ground-light/20 p-6 sm:p-8">
      <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-2">
        Debate Simulator
      </span>
      <p className="text-sm text-text-secondary mb-6 max-w-xl leading-relaxed">
        Both cases in full. Expand any argument to read the complete text.
      </p>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'advocate', 'skeptic'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="font-mono text-[8px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors"
            style={{
              borderColor: filter === f
                ? f === 'advocate' ? '#5DBCB0' : f === 'skeptic' ? '#C8956C' : 'rgba(255,255,255,0.3)'
                : 'rgba(255,255,255,0.1)',
              color: filter === f
                ? f === 'advocate' ? '#5DBCB0' : f === 'skeptic' ? '#C8956C' : 'rgba(255,255,255,0.7)'
                : 'rgba(255,255,255,0.3)',
            }}
          >
            {f === 'all' ? 'Both cases' : f}
          </button>
        ))}
      </div>

      <div className={`grid gap-px ${filter === 'all' ? 'sm:grid-cols-2' : 'grid-cols-1'} border border-border`}>
        {/* Advocate column */}
        {(filter === 'all' || filter === 'advocate') && (
          <div>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-teal" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-teal">The Advocate</span>
              <span className="font-mono text-[8px] text-text-tertiary ml-auto">{advocate.paragraphs.length} arguments</span>
            </div>
            <div className="space-y-px">
              {advocate.paragraphs.map((p, i) => (
                <ArgumentCard key={i} text={p} index={i} side="advocate" visible={visible} />
              ))}
            </div>
          </div>
        )}

        {/* Skeptic column */}
        {(filter === 'all' || filter === 'skeptic') && (
          <div className={filter === 'all' ? 'border-t sm:border-t-0 sm:border-l border-border' : ''}>
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
              <div className="w-1.5 h-1.5 rounded-full bg-gold" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold">The Skeptic</span>
              <span className="font-mono text-[8px] text-text-tertiary ml-auto">{skeptic.paragraphs.length} arguments</span>
            </div>
            <div className="space-y-px">
              {skeptic.paragraphs.map((p, i) => (
                <ArgumentCard key={i} text={p} index={i} side="skeptic" visible={visible} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
