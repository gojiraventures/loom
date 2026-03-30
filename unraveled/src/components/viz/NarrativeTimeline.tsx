'use client';

import { useState } from 'react';
import type { VizNarrative } from '@/lib/viz/types';

const TYPE_COLORS: Record<string, string> = {
  textual: '#C8956C',
  archaeological: '#6AADAD',
  geological: '#7E8EA0',
  oral_tradition: '#8B7EC8',
};

function yearLabel(y: number) {
  return y < 0 ? `${Math.abs(y).toLocaleString()} BCE` : `${y} CE`;
}

export function NarrativeTimeline({ narratives }: { narratives: VizNarrative[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Sort by year, exclude geological (they're physical evidence, not narratives)
  const events = [...narratives]
    .filter(n => n.type !== 'geological')
    .sort((a, b) => a.year - b.year);

  const MIN = Math.min(...events.map(e => e.year));
  const MAX = Math.max(...events.map(e => e.year));
  const RANGE = MAX - MIN;

  const xPct = (year: number) => ((year - MIN) / RANGE) * 100;

  const selected = selectedId ? events.find(e => e.id === selectedId) : null;

  // Cluster by proximity to avoid label overlap
  const LANES = 4;
  const lanes: (VizNarrative | null)[][] = Array.from({ length: LANES }, () => []);
  const eventLanes: Record<string, number> = {};

  events.forEach(ev => {
    // Find a lane where there's no recent event within 4% of timeline width
    let placed = false;
    for (let l = 0; l < LANES; l++) {
      const last = lanes[l].filter(Boolean).at(-1);
      if (!last || xPct(ev.year) - xPct(last!.year) > 4) {
        lanes[l].push(ev);
        eventLanes[ev.id] = l;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Put in least-used lane
      const minLane = lanes.reduce((min, l, i) => l.length < lanes[min].length ? i : min, 0);
      lanes[minLane].push(ev);
      eventLanes[ev.id] = minLane;
    }
  });

  const LANE_H = 32;
  const TOP_OFFSET = 20;
  const AXIS_Y = TOP_OFFSET + LANES * LANE_H + 8;
  const TOTAL_H = AXIS_Y + 40;

  // Key epoch markers
  const EPOCHS = [
    { year: -9000, label: '9000 BCE' },
    { year: -6000, label: '6000 BCE' },
    { year: -4000, label: '4000 BCE' },
    { year: -2000, label: '2000 BCE' },
    { year: 0, label: '0 CE' },
    { year: 600, label: '600 CE' },
  ].filter(e => e.year >= MIN - 500 && e.year <= MAX + 500);

  // Fixed SVG width — container scrolls horizontally
  const SVG_W = 1200;
  const PAD = 60; // horizontal padding inside SVG so edge labels don't clip

  return (
    <div className="space-y-0">
      <div
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div style={{ width: SVG_W + PAD * 2 }}>
          <svg
            viewBox={`${-PAD} 0 ${SVG_W + PAD * 2} ${TOTAL_H}`}
            width={SVG_W + PAD * 2}
            height={TOTAL_H}
            style={{ display: 'block' }}
          >
            {/* Epoch gridlines */}
            {EPOCHS.map(ep => {
              const x = (xPct(ep.year) / 100) * SVG_W;
              return (
                <g key={ep.year}>
                  <line
                    x1={x} y1={TOP_OFFSET - 8} x2={x} y2={AXIS_Y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={0.5}
                  />
                  <text
                    x={x} y={AXIS_Y + 16}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.25)"
                    fontSize={8}
                    fontFamily="'IBM Plex Mono', monospace"
                    letterSpacing={1}
                  >
                    {ep.label}
                  </text>
                </g>
              );
            })}

            {/* Axis line */}
            <line
              x1={0} y1={AXIS_Y} x2={SVG_W} y2={AXIS_Y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={0.5}
            />

            {/* Events */}
            {events.map(ev => {
              const x = (xPct(ev.year) / 100) * SVG_W;
              const lane = eventLanes[ev.id] ?? 0;
              const cy = TOP_OFFSET + lane * LANE_H + LANE_H / 2;
              const col = TYPE_COLORS[ev.type] || '#C8956C';
              const isSelected = selectedId === ev.id;

              return (
                <g
                  key={ev.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(ev.id === selectedId ? null : ev.id)}
                >
                  {/* Vertical drop to axis */}
                  <line
                    x1={x} y1={cy + 5} x2={x} y2={AXIS_Y}
                    stroke={isSelected ? col : 'rgba(255,255,255,0.08)'}
                    strokeWidth={0.5}
                    strokeDasharray="2,3"
                  />

                  {/* Dot */}
                  <circle
                    cx={x} cy={cy}
                    r={isSelected ? 6 : 4}
                    fill={isSelected ? col : `rgba(${parseInt(col.slice(1, 3), 16)},${parseInt(col.slice(3, 5), 16)},${parseInt(col.slice(5, 7), 16)},0.8)`}
                  />
                  <circle cx={x} cy={cy} r={isSelected ? 2.5 : 1.5} fill="rgba(255,255,255,0.8)" />

                  {/* Label (short) */}
                  <text
                    x={x} y={cy - 9}
                    textAnchor="middle"
                    fill={isSelected ? col : 'rgba(255,255,255,0.4)'}
                    fontSize={7.5}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight={isSelected ? '600' : '400'}
                  >
                    {ev.tradition.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Selected detail */}
      {selected && (
        <div className="border-t border-border bg-ground-light/40 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_COLORS[selected.type] }}
                />
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: TYPE_COLORS[selected.type] }}>
                  {selected.tradition}
                </span>
                <span className="font-mono text-[9px] text-text-tertiary">
                  {yearLabel(selected.year)}
                </span>
                <span className="font-mono text-[9px] text-text-tertiary border border-border px-1.5">
                  {selected.region}
                </span>
              </div>
              <h4 className="font-serif text-base mb-1.5">{selected.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-1.5">{selected.desc}</p>
              <p className="font-mono text-[9px] text-text-tertiary">{selected.source}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="font-mono text-[9px] text-text-tertiary hover:text-text-primary shrink-0 mt-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-border bg-ground-light/20 px-5 py-3 flex flex-wrap gap-4">
        {Object.entries(TYPE_COLORS).filter(([t]) => t !== 'geological').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="font-mono text-[9px] tracking-wider uppercase text-text-tertiary">
              {type.replace('_', ' ')}
            </span>
          </div>
        ))}
        <span className="font-mono text-[9px] text-text-tertiary ml-auto">
          Click any marker to expand
        </span>
      </div>
    </div>
  );
}
