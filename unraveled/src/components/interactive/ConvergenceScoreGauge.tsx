'use client';

import { useEffect, useRef, useState } from 'react';
import type { ConvergenceScoreGaugeData } from '@/lib/interactive/types';

const BANDS = [
  { min: 80, label: 'Extraordinary convergence', color: '#5DBCB0' },
  { min: 60, label: 'Strong convergence',         color: '#C8956C' },
  { min: 40, label: 'Moderate convergence',       color: '#A8A49A' },
  { min: 20, label: 'Weak convergence',           color: '#6B6660' },
  { min: 0,  label: 'Insufficient convergence',   color: '#3A3733' },
];

function getBand(score: number) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

interface Props { data: ConvergenceScoreGaugeData }

export function ConvergenceScoreGauge({ data }: Props) {
  const { score, traditions } = data;
  const [displayed, setDisplayed] = useState(0);
  const [visible, setVisible]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const band = getBand(score);

  // Scroll-triggered reveal
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Count-up animation
  useEffect(() => {
    if (!visible) return;
    const duration = 1200;
    const start = performance.now();
    const frame = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setDisplayed(Math.round(eased * score));
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [visible, score]);

  // SVG arc parameters
  const R = 80;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - displayed / 100);

  return (
    <div ref={ref} className="border border-border bg-ground-light/20 p-6 sm:p-8">
      <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-6">
        Convergence Score Breakdown
      </span>

      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Arc gauge */}
        <div className="relative shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="14"
            />
            {/* Fill arc */}
            <circle
              cx={cx} cy={cy} r={R}
              fill="none"
              stroke={band.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 100 100)"
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          {/* Center number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold leading-none" style={{ color: band.color }}>
              {displayed}
            </span>
            <span className="font-mono text-[9px] text-text-tertiary mt-1">/100</span>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: band.color }}>
            {band.label}
          </p>

          {/* Score bands legend */}
          <div className="space-y-2 mb-6">
            {BANDS.map((b) => (
              <div key={b.min} className="flex items-center gap-3">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: b.color, opacity: score >= b.min ? 1 : 0.3 }}
                />
                <div className="flex-1 h-px" style={{ background: score >= b.min ? `${b.color}30` : 'rgba(255,255,255,0.05)' }} />
                <span className="font-mono text-[8px] text-text-tertiary shrink-0" style={{ opacity: score >= b.min ? 1 : 0.4 }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>

          {/* Traditions */}
          {traditions.length > 0 && (
            <div>
              <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-text-tertiary mb-2">
                {traditions.length} independent traditions
              </p>
              <div className="flex flex-wrap gap-1">
                {traditions.map((t) => (
                  <span key={t} className="font-mono text-[7px] tracking-wider uppercase px-1.5 py-0.5 border border-border/50 text-text-tertiary">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="font-mono text-[8px] text-text-tertiary/40 mt-6 border-t border-border/30 pt-4">
        Score measures structural agreement across geographically isolated traditions — not the probability the claim is true.
      </p>
    </div>
  );
}
