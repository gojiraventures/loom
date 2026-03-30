'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VizNarrative } from '@/lib/viz/types';

// ── Map projection ─────────────────────────────────────────────────────────
const MAP_W = 900;
const MAP_H = 460;
const projX = (lng: number) => ((lng + 180) / 360) * MAP_W;
const projY = (lat: number) => ((90 - lat) / 180) * MAP_H;

// ── Landmass dot grid ──────────────────────────────────────────────────────
const LAND_REGIONS = [
  { latMin: 25, latMax: 72, lngMin: -168, lngMax: -55 },
  { latMin: 7, latMax: 25, lngMin: -118, lngMax: -77 },
  { latMin: -56, latMax: 12, lngMin: -82, lngMax: -34 },
  { latMin: 36, latMax: 71, lngMin: -10, lngMax: 40 },
  { latMin: 55, latMax: 71, lngMin: 5, lngMax: 30 },
  { latMin: 50, latMax: 59, lngMin: -11, lngMax: 2 },
  { latMin: -35, latMax: 37, lngMin: -18, lngMax: 52 },
  { latMin: 12, latMax: 42, lngMin: 25, lngMax: 60 },
  { latMin: 40, latMax: 75, lngMin: 40, lngMax: 180 },
  { latMin: 6, latMax: 35, lngMin: 68, lngMax: 90 },
  { latMin: -8, latMax: 28, lngMin: 90, lngMax: 140 },
  { latMin: 18, latMax: 54, lngMin: 100, lngMax: 145 },
  { latMin: -40, latMax: -11, lngMin: 113, lngMax: 154 },
];

const LAND_POINTS: { x: number; y: number }[] = [];
for (let lat = -60; lat <= 75; lat += 5) {
  for (let lng = -170; lng <= 178; lng += 5) {
    if (LAND_REGIONS.some(r => lat >= r.latMin && lat <= r.latMax && lng >= r.lngMin && lng <= r.lngMax)) {
      LAND_POINTS.push({ x: projX(lng), y: projY(lat) });
    }
  }
}

// ── Colors ─────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  textual: '#C8956C',
  archaeological: '#6AADAD',
  geological: '#7E8EA0',
  oral_tradition: '#8B7EC8',
};

type EvidenceFilter = Record<string, boolean>;

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Canvas Renderer ─────────────────────────────────────────────────────────
function MapCanvas({
  narratives,
  currentYear,
  hoveredId,
  filter,
}: {
  narratives: VizNarrative[];
  currentYear: number;
  hoveredId: string | null;
  filter: EvidenceFilter;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = MAP_W * dpr;
    canvas.height = MAP_H * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const draw = () => {
      time += 0.012;
      ctx.clearRect(0, 0, MAP_W, MAP_H);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 12; i++) {
        const x = (i / 12) * MAP_W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_H); ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        const y = (i / 6) * MAP_H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_W, y); ctx.stroke();
      }

      // Equator
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.moveTo(0, MAP_H / 2); ctx.lineTo(MAP_W, MAP_H / 2); ctx.stroke();

      // Land dots
      LAND_POINTS.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fill();
      });

      const visible = narratives.filter(n => n.year <= currentYear && filter[n.type]);

      // Spread lines
      visible.forEach(n => {
        if (!n.spread) return;
        n.spread.forEach(s => {
          const target = narratives.find(t => t.id === s.to);
          if (!target || !filter[target.type]) return;
          if (s.year > currentYear) return;
          const x1 = projX(n.lng), y1 = projY(n.lat);
          const x2 = projX(target.lng), y2 = projY(target.lat);
          const progress = Math.min(1, (currentYear - n.year) / Math.max(1, s.year - n.year));
          if (progress <= 0) return;
          const cx = x1 + (x2 - x1) * progress;
          const cy = y1 + (y2 - y1) * progress;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(cx, cy);
          ctx.strokeStyle = `rgba(200,149,108,${0.2 * progress})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]);
          ctx.stroke();
          ctx.setLineDash([]);

          if (progress < 1) {
            const dotP = ((Math.sin(time * 1.8) + 1) / 2) * progress;
            const dx = x1 + (x2 - x1) * dotP;
            const dy = y1 + (y2 - y1) * dotP;
            ctx.beginPath();
            ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200,149,108,0.6)';
            ctx.fill();
          }
        });
      });

      // Narrative dots
      visible.forEach(n => {
        const x = projX(n.lng);
        const y = projY(n.lat);
        const isHovered = hoveredId === n.id;
        const col = TYPE_COLORS[n.type] || '#C8956C';
        const rgb = hexToRgb(col);
        const age = currentYear - n.year;
        const fadeIn = Math.min(1, age / 300);
        const baseR = (n.radius || 4) * fadeIn;
        const pulse = isHovered ? 0 : Math.sin(time * 1.5 + n.lng * 0.08) * 1.2;

        ctx.beginPath();
        ctx.arc(x, y, baseR + 10 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.05 * fadeIn})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, baseR + 4 + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.12 * fadeIn})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, isHovered ? baseR + 2 : baseR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${isHovered ? 1 : 0.82 * fadeIn})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 2 : 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.65 * fadeIn})`;
        ctx.fill();

        if (isHovered) {
          ctx.fillStyle = '#fff';
          ctx.font = `600 11px 'IBM Plex Mono', monospace`;
          ctx.textAlign = 'left';
          const lx = x + baseR + 10;
          const ly = y - 6;
          const metrics = ctx.measureText(n.title);
          ctx.fillStyle = 'rgba(8,9,10,0.94)';
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(lx - 6, ly - 14, metrics.width + 12, 36, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = col;
          ctx.font = `600 11px 'IBM Plex Mono', monospace`;
          ctx.fillText(n.title, lx, ly);
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.font = `400 9px 'IBM Plex Mono', monospace`;
          const yearStr = n.year < 0 ? `${Math.abs(n.year)} BCE` : `${n.year} CE`;
          ctx.fillText(`${n.tradition} · ${yearStr}`, lx, ly + 15);
        }
      });

      // Year watermark
      const yearText = currentYear < 0 ? `${Math.abs(currentYear)} BCE` : `${currentYear} CE`;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.font = `700 52px 'IBM Plex Mono', monospace`;
      ctx.textAlign = 'right';
      ctx.fillText(yearText, MAP_W - 20, MAP_H - 18);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [narratives, currentYear, hoveredId, filter]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export function ConvergenceMap({ narratives }: { narratives: VizNarrative[] }) {
  const MIN_YEAR = -10500;
  const MAX_YEAR = 700;

  const [currentYear, setCurrentYear] = useState(-2600);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<EvidenceFilter>({
    textual: true,
    archaeological: true,
    geological: true,
    oral_tradition: true,
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const visible = narratives.filter(n => n.year <= currentYear && filter[n.type]);
    const found = visible.find(n => {
      const dx = projX(n.lng) - mx;
      const dy = projY(n.lat) - my;
      return Math.sqrt(dx * dx + dy * dy) < 16;
    });
    setHoveredId(found?.id ?? null);
  }, [narratives, currentYear, filter]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const visible = narratives.filter(n => n.year <= currentYear && filter[n.type]);
    const found = visible.find(n => {
      const dx = projX(n.lng) - mx;
      const dy = projY(n.lat) - my;
      return Math.sqrt(dx * dx + dy * dy) < 16;
    });
    setSelectedId(found?.id === selectedId ? null : (found?.id ?? null));
  }, [narratives, currentYear, filter, selectedId]);

  const selected = selectedId ? narratives.find(n => n.id === selectedId) : null;
  const visibleCount = narratives.filter(n => n.year <= currentYear && filter[n.type]).length;

  const yearLabel = (y: number) => y < 0 ? `${Math.abs(y).toLocaleString()} BCE` : `${y} CE`;

  return (
    <div className="space-y-0">
      {/* Map wrapper */}
      <div
        ref={wrapperRef}
        className="relative w-full cursor-crosshair border border-border overflow-hidden"
        style={{ aspectRatio: `${MAP_W}/${MAP_H}` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredId(null)}
        onClick={handleClick}
      >
        <MapCanvas
          narratives={narratives}
          currentYear={currentYear}
          hoveredId={hoveredId}
          filter={filter}
        />
      </div>

      {/* Controls */}
      <div className="border border-t-0 border-border bg-ground-light/30 px-5 py-4 space-y-4">
        {/* Time scrubber */}
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary shrink-0">
            Year
          </span>
          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
            className="flex-1 h-px bg-border appearance-none cursor-pointer"
            style={{
              accentColor: 'var(--color-gold)',
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, rgba(200,149,108,0.6) 0%, rgba(200,149,108,0.6) ${((currentYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, rgba(255,255,255,0.08) ${((currentYear - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100}%, rgba(255,255,255,0.08) 100%)`,
            }}
          />
          <span className="font-mono text-xs text-gold shrink-0 w-24 text-right">
            {yearLabel(currentYear)}
          </span>
        </div>

        {/* Filter + count */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <button
                key={type}
                onClick={() => setFilter(f => ({ ...f, [type]: !f[type] }))}
                className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 border transition-all"
                style={{
                  borderColor: filter[type] ? color : 'rgba(255,255,255,0.08)',
                  color: filter[type] ? color : 'rgba(255,255,255,0.25)',
                  background: filter[type] ? `rgba(${hexToRgb(color)},0.08)` : 'transparent',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: filter[type] ? color : 'rgba(255,255,255,0.15)' }} />
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] text-text-tertiary">
            {visibleCount} narrative{visibleCount !== 1 ? 's' : ''} visible
          </span>
        </div>
      </div>

      {/* Selected detail panel */}
      {selected && (
        <div className="border border-t-0 border-border bg-ground-light/60 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: TYPE_COLORS[selected.type] }}
                />
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: TYPE_COLORS[selected.type] }}>
                  {selected.tradition} · {yearLabel(selected.year)}
                </span>
              </div>
              <h4 className="font-serif text-lg mb-2">{selected.title}</h4>
              <p className="text-sm text-text-secondary leading-relaxed max-w-2xl mb-2">{selected.desc}</p>
              <p className="font-mono text-[9px] text-text-tertiary">{selected.source}</p>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="font-mono text-[9px] text-text-tertiary hover:text-text-primary shrink-0 mt-0.5"
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
