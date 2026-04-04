'use client';

import { useEffect, useRef, useState } from 'react';
import type { SourceTypeBreakdownData } from '@/lib/interactive/types';

// Segment colors
const TYPE_COLORS: Record<string, string> = {
  journal:           '#5DBCB0',
  sacred_text:       '#C8956C',
  book:              '#A8A49A',
  archive:           '#7B9E9A',
  excavation_report: '#9B8870',
  government_record: '#7A7570',
  museum_db:         '#6B9E94',
  website:           '#8A8078',
  other:             '#5A5650',
};

function getColor(type: string, idx: number): string {
  const fallbacks = ['#5DBCB0','#C8956C','#A8A49A','#7B9E9A','#9B8870','#7A7570','#6B9E94','#8A8078'];
  return TYPE_COLORS[type] ?? fallbacks[idx % fallbacks.length];
}

interface Props { data: SourceTypeBreakdownData }

export function SourceTypeBreakdown({ data }: Props) {
  const { groups, total } = data;
  const [hovered, setHovered]   = useState<string | null>(null);
  const [visible, setVisible]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Build SVG donut segments
  const R = 68;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const segments = groups.map((g, i) => {
    const pct = g.count / total;
    const dash = pct * circumference;
    const gap  = circumference - dash;
    const seg  = { ...g, color: getColor(g.type, i), dash, gap, offset };
    offset += dash;
    return seg;
  });

  const hoveredGroup = groups.find((g) => g.type === hovered);

  return (
    <div ref={ref} className="border border-border bg-ground-light/20 p-6 sm:p-8">
      <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-6">
        Source Composition
      </span>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {segments.map((seg) => (
              <circle
                key={seg.type}
                cx={cx} cy={cy} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth={hovered === seg.type ? 18 : 12}
                strokeDasharray={`${visible ? seg.dash - 2 : 0} ${circumference}`}
                strokeDashoffset={-seg.offset}
                transform="rotate(-90 90 90)"
                style={{
                  transition: `stroke-dasharray 0.6s ease ${seg.offset / circumference * 0.4}s, stroke-width 0.15s`,
                  cursor: 'pointer',
                  opacity: hovered && hovered !== seg.type ? 0.35 : 1,
                }}
                onMouseEnter={() => setHovered(seg.type)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-2xl font-bold text-text-primary leading-none">
              {total}
            </span>
            <span className="font-mono text-[8px] text-text-tertiary mt-0.5">sources</span>
          </div>
        </div>

        {/* Legend + tooltip */}
        <div className="flex-1 min-w-0">
          {hoveredGroup ? (
            <div className="mb-4 p-3 border border-border/60 bg-ground-lighter/40">
              <p className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: getColor(hoveredGroup.type, groups.indexOf(hoveredGroup)) }}>
                {hoveredGroup.label}
              </p>
              <p className="font-mono text-[9px] text-text-tertiary mb-2">
                {hoveredGroup.count} source{hoveredGroup.count !== 1 ? 's' : ''}
              </p>
              <div className="space-y-0.5">
                {hoveredGroup.titles.map((t) => (
                  <p key={t} className="text-xs text-text-secondary leading-snug truncate">{t}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-mono text-[8px] text-text-tertiary mb-4">
              Hover a segment to see sources
            </p>
          )}

          <div className="space-y-1.5">
            {segments.map((seg, i) => (
              <button
                key={seg.type}
                onMouseEnter={() => setHovered(seg.type)}
                onMouseLeave={() => setHovered(null)}
                className="w-full flex items-center gap-3 text-left transition-opacity"
                style={{ opacity: hovered && hovered !== seg.type ? 0.4 : 1 }}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: getColor(seg.type, i) }} />
                <span className="text-xs text-text-secondary flex-1 truncate">{seg.label}</span>
                <span className="font-mono text-[9px] text-text-tertiary shrink-0">{seg.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
