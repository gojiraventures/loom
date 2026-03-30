'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  type: 'person' | 'institution';
  name: string;
  slug: string | null;
  subtype: string | null;
  short_bio: string | null;
  photo_url: string | null;
  faith?: string | null;
  political_party?: string | null;
  transparency_tier?: string | null;
  year: number | null;
  died_year: number | null;
  connection_count: number;
  // simulation state
  x: number; y: number; vx: number; vy: number;
  fx?: number | null; fy?: number | null;
}

interface GraphEdge {
  id: string;
  source: string; target: string;
  type: string;
  edge_kind: 'pp' | 'pi' | 'ii';
  start_year: number | null;
  end_year: number | null;
  covert: boolean;
  membership_status: string | null;
  strength: number;
  description: string | null;
}

// ── Colour maps ───────────────────────────────────────────────────────────────

const PERSON_COLORS: Record<string, string> = {
  academic: '#38bdf8',
  journalist: '#fbbf24',
  whistleblower: '#fb923c',
  public_figure: '#a78bfa',
  controversial: '#f87171',
  historical_figure: '#94a3b8',
  independent_researcher: '#34d399',
  witness: '#f472b6',
  default: '#94a3b8',
};

const INST_COLORS: Record<string, string> = {
  intelligence: '#f87171',
  secret_society: '#d4af37',
  government_agency: '#60a5fa',
  university: '#34d399',
  museum: '#a78bfa',
  military: '#fb923c',
  religious: '#f472b6',
  think_tank: '#38bdf8',
  research_institute: '#34d399',
  default: '#94a3b8',
};

const EDGE_COLORS: Record<string, string> = {
  funded: '#f59e0b',
  investigated: '#d4af37',
  colleague: '#60a5fa',
  collaborator: '#34d399',
  mentor: '#a78bfa',
  endorsed: '#34d399',
  criticized: '#f87171',
  debated: '#fb923c',
  affiliated: '#94a3b8',
  front_for: '#f87171',
  succeeded: '#94a3b8',
  member: '#d4af37',
  employee: '#60a5fa',
  director: '#a78bfa',
  founder: '#fbbf24',
  default: '#4b5563',
};

function nodeColor(n: GraphNode): string {
  if (n.type === 'person') return PERSON_COLORS[n.subtype ?? 'default'] ?? PERSON_COLORS.default;
  return INST_COLORS[n.subtype ?? 'default'] ?? INST_COLORS.default;
}
function edgeColor(e: GraphEdge): string {
  return EDGE_COLORS[e.type] ?? EDGE_COLORS.default;
}
function nodeRadius(n: GraphNode): number {
  const base = n.type === 'institution' ? 20 : 16;
  return base + Math.min(n.connection_count * 1.5, 12);
}

// ── Hexagon path helper ───────────────────────────────────────────────────────
function hexPath(cx: number, cy: number, r: number): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  });
  return `M${pts.join('L')}Z`;
}

// ── Force simulation (web mode) ───────────────────────────────────────────────
function runForce(nodes: GraphNode[], edges: GraphEdge[], cx: number, cy: number, w: number, h: number) {
  const REPEL = 4500, IDEAL = 160, DAMP = 0.72, PAD = 70;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < 120; iter++) {
    const alpha = Math.pow(1 - iter / 120, 1.5);

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (REPEL / (d * d)) * alpha;
        a.vx -= (dx / d) * f; a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f; b.vy += (dy / d) * f;
      }
    }

    // Edge attraction
    edges.forEach(({ source, target, strength }) => {
      const s = nodeMap.get(source), t = nodeMap.get(target);
      if (!s || !t) return;
      const dx = t.x - s.x, dy = t.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - IDEAL * (1 / (strength || 1))) / d) * 0.25 * alpha;
      if (!s.fx) { s.vx += dx * f; s.vy += dy * f; }
      if (!t.fx) { t.vx -= dx * f; t.vy -= dy * f; }
    });

    // Weak center gravity
    nodes.forEach((n) => {
      if (n.fx == null) { n.vx += (cx - n.x) * 0.012 * alpha; n.vy += (cy - n.y) * 0.012 * alpha; }
    });

    // Integrate
    nodes.forEach((n) => {
      n.vx *= DAMP; n.vy *= DAMP;
      if (n.fx != null) { n.x = n.fx; } else { n.x = Math.max(PAD, Math.min(w - PAD, n.x + n.vx)); }
      if (n.fy != null) { n.y = n.fy; } else { n.y = Math.max(PAD, Math.min(h - PAD, n.y + n.vy)); }
    });
  }
}

// ── Timeline layout ───────────────────────────────────────────────────────────
function applyTimelineLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  w: number,
  h: number,
): { minYear: number; maxYear: number } {
  // Gather all years
  const years: number[] = [];
  nodes.forEach((n) => { if (n.year) years.push(n.year); if (n.died_year) years.push(n.died_year); });
  edges.forEach((e) => { if (e.start_year) years.push(e.start_year); if (e.end_year) years.push(e.end_year); });
  if (years.length === 0) years.push(1800, 2024);

  const minYear = Math.max(Math.min(...years) - 30, 1400);
  const maxYear = Math.min(Math.max(...years) + 10, 2030);
  const span = maxYear - minYear || 1;
  const PADX = 100, PADY = 80;
  const usableW = w - PADX * 2;

  // Institution band: top third, Person band: bottom half, Others: middle
  const instY = h * 0.28;
  const personY = h * 0.72;

  // Sort by year within each band to spread x
  const insts = nodes.filter((n) => n.type === 'institution');
  const people = nodes.filter((n) => n.type === 'person');

  // Assign x from year, spread duplicates
  const assignPositions = (group: GraphNode[], baseY: number) => {
    group.sort((a, b) => (a.year ?? 1900) - (b.year ?? 1900));
    const xCounts: Record<number, number> = {};
    group.forEach((n) => {
      const yr = n.year ?? Math.round((minYear + maxYear) / 2);
      const rawX = PADX + ((yr - minYear) / span) * usableW;
      const slot = Math.round(rawX / 40); // bucket
      xCounts[slot] = (xCounts[slot] ?? 0) + 1;
      const spread = (xCounts[slot] - 1) * 42;
      n.fx = Math.max(PADX, Math.min(w - PADX, rawX + (spread % 2 === 0 ? spread / 2 : -(spread + 1) / 2)));
      n.fy = baseY + ((xCounts[slot] - 1) % 3) * 48 - 48;
      n.x = n.fx; n.y = n.fy;
    });
  };

  assignPositions(insts, instY);
  assignPositions(people, personY);

  // Nodes with no year go to center of their band
  nodes.forEach((n) => {
    if (n.fx == null) {
      n.fx = w / 2;
      n.fy = n.type === 'institution' ? instY : personY;
      n.x = n.fx; n.y = n.fy;
    }
  });

  return { minYear, maxYear };
}

// ── Main component ────────────────────────────────────────────────────────────

interface FilterState {
  entityTypes: Set<string>;
  relTypes: Set<string>;
  membershipStatus: Set<string>;
}

export default function GraphExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'web' | 'timeline'>('web');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [panel, setPanel] = useState<GraphNode | null>(null);

  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef<{ startX: number; startY: number; startVx: number; startVy: number } | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    entityTypes: new Set(['person', 'institution']),
    relTypes: new Set(),
    membershipStatus: new Set(),
  });
  const [yearRange, setYearRange] = useState<[number, number]>([1400, 2030]);
  const [timelineRange, setTimelineRange] = useState<{ min: number; max: number }>({ min: 1400, max: 2030 });
  const [showFilters, setShowFilters] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/graph')
      .then((r) => r.json())
      .then(({ nodes: rawNodes, edges: rawEdges }) => {
        const { w, h } = dims;
        const cx = w / 2, cy = h / 2;
        const initialized = (rawNodes as GraphNode[]).map((n: GraphNode) => ({
          ...n,
          x: cx + (Math.random() - 0.5) * w * 0.6,
          y: cy + (Math.random() - 0.5) * h * 0.6,
          vx: 0, vy: 0,
        }));
        runForce(initialized, rawEdges, cx, cy, w, h);
        setNodes(initialized);
        setEdges(rawEdges);
        setLoading(false);

        // Pre-gather all rel types for filter menu
        const relTypes = new Set<string>((rawEdges as GraphEdge[]).map((e) => e.type));
        setFilters((f) => ({ ...f, relTypes: new Set() })); // start with all
        void relTypes;
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Responsive dims ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = Math.max(window.innerHeight - 200, 500);
      setDims({ w, h });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: Math.max(window.innerHeight - 200, 500) });
    return () => ro.disconnect();
  }, []);

  // ── Re-layout when mode changes ────────────────────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) return;
    const { w, h } = dims;

    if (mode === 'timeline') {
      const updated = nodes.map((n) => ({ ...n, fx: null, fy: null, vx: 0, vy: 0 }));
      const { minYear, maxYear } = applyTimelineLayout(updated, edges, w, h);
      setNodes(updated);
      setTimelineRange({ min: minYear, max: maxYear });
      setYearRange([minYear, maxYear]);
    } else {
      const updated = nodes.map((n) => ({ ...n, fx: null, fy: null }));
      runForce(updated, edges, w / 2, h / 2, w, h);
      setNodes(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dims]);

  // ── Derived: filtered nodes + edges ───────────────────────────────────────
  const visibleNodes = nodes.filter((n) => filters.entityTypes.has(n.type));
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

  const visibleEdges = edges.filter((e) => {
    if (!visibleNodeIds.has(e.source) || !visibleNodeIds.has(e.target)) return false;
    if (filters.relTypes.size > 0 && !filters.relTypes.has(e.type)) return false;
    if (filters.membershipStatus.size > 0 && e.membership_status && !filters.membershipStatus.has(e.membership_status)) return false;
    if (mode === 'timeline') {
      const ey = e.start_year ?? e.end_year;
      if (ey !== null && (ey < yearRange[0] || ey > yearRange[1])) return false;
    }
    return true;
  });

  const allRelTypes = Array.from(new Set(edges.map((e) => e.type))).sort();

  // ── Connections for selected node ─────────────────────────────────────────
  const panelConnections = panel ? edges.filter(
    (e) => e.source === panel.id || e.target === panel.id
  ).map((e) => {
    const otherId = e.source === panel.id ? e.target : e.source;
    const other = nodes.find((n) => n.id === otherId);
    return { edge: e, other };
  }) : [];

  // ── Pan / Zoom ─────────────────────────────────────────────────────────────
  const onWheel = useCallback((ev: React.WheelEvent) => {
    ev.preventDefault();
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    const mouseX = ev.clientX - svgRect.left;
    const mouseY = ev.clientY - svgRect.top;
    const factor = ev.deltaY < 0 ? 1.12 : 0.88;
    setView((v) => {
      const newScale = Math.max(0.2, Math.min(4, v.scale * factor));
      const scaleChange = newScale / v.scale;
      return {
        scale: newScale,
        x: mouseX - scaleChange * (mouseX - v.x),
        y: mouseY - scaleChange * (mouseY - v.y),
      };
    });
  }, []);

  const onPointerDown = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    if ((ev.target as Element).closest('[data-node]')) return;
    (ev.currentTarget as SVGSVGElement).setPointerCapture(ev.pointerId);
    dragging.current = { startX: ev.clientX, startY: ev.clientY, startVx: view.x, startVy: view.y };
  }, [view]);

  const onPointerMove = useCallback((ev: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = ev.clientX - dragging.current.startX;
    const dy = ev.clientY - dragging.current.startY;
    setView((v) => ({ ...v, x: dragging.current!.startVx + dx, y: dragging.current!.startVy + dy }));
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = null; }, []);

  // ── Node interaction ───────────────────────────────────────────────────────
  const onNodeClick = useCallback((ev: React.MouseEvent, node: GraphNode) => {
    ev.stopPropagation();
    if (ev.shiftKey) {
      setSelected((s) => {
        const next = new Set(s);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
    } else {
      setSelected(new Set([node.id]));
      setPanel(node);
    }
  }, []);

  const onSvgClick = useCallback(() => {
    setSelected(new Set());
    setPanel(null);
  }, []);

  // ── Render edge ───────────────────────────────────────────────────────────
  function renderEdge(e: GraphEdge, idx: number) {
    const s = nodes.find((n) => n.id === e.source);
    const t = nodes.find((n) => n.id === e.target);
    if (!s || !t) return null;

    const isHighlit = selected.size === 0 || selected.has(e.source) || selected.has(e.target);
    const color = edgeColor(e);
    const opacity = isHighlit ? (selected.size > 0 ? 0.85 : 0.45) : 0.08;

    const dx = t.x - s.x, dy = t.y - s.y;
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;

    // Arc curve: perpendicular offset based on edge kind
    const perpScale = e.edge_kind === 'pi' ? 0.35 : 0.2;
    const cx = mx - dy * perpScale, cy = my + dx * perpScale;

    const showYear = mode === 'timeline' && (e.start_year || e.end_year);
    const yearLabel = e.start_year === e.end_year
      ? `${e.start_year}`
      : `${e.start_year ?? '?'}–${e.end_year ?? ''}`;

    return (
      <g key={`e-${e.id}-${idx}`} opacity={opacity}>
        <path
          d={`M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`}
          fill="none"
          stroke={color}
          strokeWidth={isHighlit ? Math.max(1, e.strength * 0.6) : 0.8}
          strokeDasharray={e.covert || e.membership_status === 'assumed' ? '5,4' : undefined}
          strokeOpacity={0.9}
        />
        {/* Arrowhead */}
        <circle cx={(cx + t.x) / 2} cy={(cy + t.y) / 2} r={1.5} fill={color} opacity={0.6} />
        {/* Year label on timeline */}
        {showYear && isHighlit && (
          <text
            x={cx} y={cy - 5}
            textAnchor="middle"
            fontSize={8}
            fill={color}
            opacity={0.8}
            className="pointer-events-none select-none font-mono"
          >
            {yearLabel}
          </text>
        )}
        {/* Hover label */}
        {(hovered === e.source || hovered === e.target) && (
          <text
            x={cx} y={cy - 7}
            textAnchor="middle"
            fontSize={9}
            fill={color}
            opacity={0.95}
            className="pointer-events-none select-none"
          >
            {e.type.replace(/_/g, ' ')}
          </text>
        )}
      </g>
    );
  }

  // ── Render node ────────────────────────────────────────────────────────────
  function renderNode(n: GraphNode) {
    const r = nodeRadius(n);
    const color = nodeColor(n);
    const isSelected = selected.has(n.id);
    const isHov = hovered === n.id;
    const dimmed = selected.size > 0 && !isSelected && !edges.some(
      (e) => (e.source === n.id || e.target === n.id) && (selected.has(e.source) || selected.has(e.target))
    );

    const isPanel = panel?.id === n.id;

    return (
      <g
        key={n.id}
        data-node="1"
        transform={`translate(${n.x},${n.y})`}
        style={{ cursor: 'pointer' }}
        opacity={dimmed ? 0.15 : 1}
        onMouseEnter={() => setHovered(n.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={(ev) => onNodeClick(ev, n)}
      >
        {n.type === 'institution' ? (
          <path
            d={hexPath(0, 0, r)}
            fill="#0f0e0c"
            stroke={isSelected || isPanel ? '#d4af37' : color}
            strokeWidth={isSelected || isPanel ? 2.5 : isHov ? 1.5 : 1}
            opacity={0.95}
          />
        ) : (
          <circle
            r={r}
            fill="#0f0e0c"
            stroke={isSelected || isPanel ? '#d4af37' : color}
            strokeWidth={isSelected || isPanel ? 2.5 : isHov ? 1.5 : 1}
            opacity={0.95}
          />
        )}

        {/* Color fill dot */}
        <circle r={r * 0.35} fill={color} opacity={0.55} />

        {/* Name label */}
        <text
          y={r + 12}
          textAnchor="middle"
          fontSize={9}
          fill={isHov || isSelected ? '#e8e4dd' : '#6b6560'}
          className="pointer-events-none select-none"
          style={{ fontFamily: 'var(--font-mono, monospace)' }}
        >
          {n.name.split(' ').slice(-1)[0]}
        </text>
        {(isHov || isSelected) && (
          <text
            y={r + 23}
            textAnchor="middle"
            fontSize={7.5}
            fill="#4b4540"
            className="pointer-events-none select-none"
          >
            {n.name.split(' ').slice(0, -1).join(' ')}
          </text>
        )}

        {/* Year badge in timeline mode */}
        {mode === 'timeline' && n.year && (
          <text
            y={-r - 5}
            textAnchor="middle"
            fontSize={7}
            fill="#6b6560"
            className="pointer-events-none select-none font-mono"
          >
            {n.year}
          </text>
        )}
      </g>
    );
  }

  const { w, h } = dims;

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-ground flex-shrink-0 flex-wrap">
        {/* Mode toggle */}
        <div className="flex gap-1 border border-border rounded p-0.5">
          {(['web', 'timeline'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`font-mono text-[8px] uppercase tracking-widest px-3 py-1 rounded transition-colors ${mode === m ? 'bg-gold/10 text-gold' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {m === 'web' ? '⬡ Web' : '⌛ Timeline'}
            </button>
          ))}
        </div>

        {/* Entity type toggles */}
        <div className="flex gap-1">
          {(['person', 'institution'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilters((f) => {
                const next = new Set(f.entityTypes);
                next.has(t) ? next.delete(t) : next.add(t);
                return { ...f, entityTypes: next };
              })}
              className={`font-mono text-[8px] uppercase tracking-widest px-2.5 py-1 border rounded transition-colors ${filters.entityTypes.has(t) ? 'border-gold/40 text-gold' : 'border-border text-text-tertiary'}`}
            >
              {t === 'person' ? '○ People' : '⬡ Institutions'}
            </button>
          ))}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`font-mono text-[8px] uppercase tracking-widest px-2.5 py-1 border rounded transition-colors ${showFilters ? 'border-gold/40 text-gold' : 'border-border text-text-tertiary'}`}
        >
          ≡ Filter
        </button>

        {/* Stats */}
        <div className="ml-auto font-mono text-[8px] text-text-tertiary">
          {visibleNodes.length} nodes · {visibleEdges.length} edges
        </div>

        {/* Zoom controls */}
        <div className="flex gap-1">
          {[{ label: '+', delta: 1.2 }, { label: '−', delta: 0.83 }, { label: '⌖', delta: 0 }].map(({ label, delta }) => (
            <button
              key={label}
              onClick={() => {
                if (delta === 0) { setView({ x: 0, y: 0, scale: 1 }); }
                else setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(4, v.scale * delta)) }));
              }}
              className="font-mono text-[10px] text-text-tertiary border border-border w-6 h-6 rounded hover:text-gold hover:border-gold/30 transition-colors flex items-center justify-center"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border bg-ground-light flex flex-wrap gap-4 items-start flex-shrink-0">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary mb-1.5">Relationship types</p>
            <div className="flex flex-wrap gap-1">
              {allRelTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilters((f) => {
                    const next = new Set(f.relTypes);
                    next.has(t) ? next.delete(t) : next.add(t);
                    return { ...f, relTypes: next };
                  })}
                  className={`font-mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border rounded transition-colors ${filters.relTypes.has(t) ? 'text-gold border-gold/40' : 'text-text-tertiary border-border hover:text-text-secondary'}`}
                  style={{ borderColor: filters.relTypes.has(t) ? undefined : edgeColor({ type: t } as GraphEdge) + '44' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ backgroundColor: edgeColor({ type: t } as GraphEdge) }} />
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
              {filters.relTypes.size > 0 && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, relTypes: new Set() }))}
                  className="font-mono text-[7px] text-text-tertiary hover:text-gold transition-colors ml-1"
                >
                  clear
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary mb-1.5">Membership status</p>
            <div className="flex gap-1">
              {['confirmed', 'assumed', 'unknown'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => {
                    const next = new Set(f.membershipStatus);
                    next.has(s) ? next.delete(s) : next.add(s);
                    return { ...f, membershipStatus: next };
                  })}
                  className={`font-mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border rounded transition-colors ${filters.membershipStatus.has(s) ? 'text-gold border-gold/40' : 'text-text-tertiary border-border'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Timeline year slider ───────────────────────────────────────────── */}
      {mode === 'timeline' && (
        <div className="px-6 py-2 border-b border-border bg-ground flex items-center gap-4 flex-shrink-0">
          <span className="font-mono text-[8px] text-text-tertiary w-10">{yearRange[0]}</span>
          <div className="flex-1 relative h-4">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
            <input
              type="range"
              min={timelineRange.min}
              max={timelineRange.max}
              value={yearRange[0]}
              onChange={(e) => setYearRange([Math.min(+e.target.value, yearRange[1] - 10), yearRange[1]])}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              style={{ zIndex: 2 }}
            />
            <input
              type="range"
              min={timelineRange.min}
              max={timelineRange.max}
              value={yearRange[1]}
              onChange={(e) => setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0] + 10)])}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
              style={{ zIndex: 2 }}
            />
            {/* Visual track */}
            <div
              className="absolute top-1/2 h-0.5 bg-gold/40 -translate-y-1/2"
              style={{
                left: `${((yearRange[0] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`,
                right: `${100 - ((yearRange[1] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`,
              }}
            />
            <div
              className="absolute top-1/2 w-2 h-2 rounded-full bg-gold border border-gold/60 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${((yearRange[0] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`, zIndex: 3 }}
            />
            <div
              className="absolute top-1/2 w-2 h-2 rounded-full bg-gold border border-gold/60 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${((yearRange[1] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`, zIndex: 3 }}
            />
          </div>
          <span className="font-mono text-[8px] text-text-tertiary w-10 text-right">{yearRange[1]}</span>
          <span className="font-mono text-[8px] text-text-tertiary">
            {yearRange[1] - yearRange[0]}yr window
          </span>
        </div>
      )}

      {/* ── Canvas + Panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">
        {/* SVG graph */}
        <div className="flex-1 relative overflow-hidden" style={{ background: '#0a0907' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary animate-pulse">
                Building graph…
              </p>
            </div>
          )}

          {/* Timeline axis */}
          {mode === 'timeline' && !loading && (
            <svg
              className="absolute bottom-0 left-0 right-0 pointer-events-none"
              width={w} height={40}
              style={{ transform: `translateX(${view.x}px) scaleX(${view.scale})`, transformOrigin: '0 0' }}
            >
              {Array.from({ length: Math.ceil((timelineRange.max - timelineRange.min) / 100) + 1 }, (_, i) => {
                const yr = timelineRange.min + i * 100;
                const x = 100 + ((yr - timelineRange.min) / (timelineRange.max - timelineRange.min)) * (w - 200);
                return (
                  <g key={yr}>
                    <line x1={x} y1={0} x2={x} y2={6} stroke="#2a2620" strokeWidth={1} />
                    <text x={x} y={18} textAnchor="middle" fontSize={8} fill="#3d3830" className="font-mono">
                      {yr}
                    </text>
                  </g>
                );
              })}
              <line x1={0} y1={0} x2={w} y2={0} stroke="#1a1814" strokeWidth={1} />
            </svg>
          )}

          <svg
            ref={svgRef}
            width={w}
            height={h}
            className="absolute inset-0 w-full h-full select-none"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onSvgClick}
          >
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#111009" />
                <stop offset="100%" stopColor="#080706" />
              </radialGradient>
            </defs>
            <rect width={w} height={h} fill="url(#bgGrad)" />

            <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
              {/* Edges */}
              {visibleEdges.map((e, i) => renderEdge(e, i))}
              {/* Nodes */}
              {visibleNodes.map((n) => renderNode(n))}
            </g>
          </svg>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        {panel && (
          <div className="w-72 flex-shrink-0 border-l border-border bg-ground overflow-y-auto">
            <div className="p-4 border-b border-border flex items-start justify-between">
              <div>
                <p className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary mb-0.5">
                  {panel.type === 'institution' ? (panel.subtype ?? 'Institution') : (panel.subtype ?? 'Person')}
                </p>
                <h3 className="font-serif text-base leading-tight">{panel.name}</h3>
              </div>
              <button
                onClick={() => { setPanel(null); setSelected(new Set()); }}
                className="text-text-tertiary hover:text-text-primary ml-2 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Identity facts */}
            <div className="p-4 space-y-2.5 border-b border-border">
              {panel.year && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary w-16 flex-shrink-0">
                    {panel.type === 'person' ? 'Born' : 'Founded'}
                  </span>
                  <span className="text-xs">{panel.year}{panel.died_year ? ` – ${panel.died_year}` : ''}</span>
                </div>
              )}
              {panel.type === 'person' && panel.faith && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary w-16 flex-shrink-0">Faith</span>
                  <span className="text-xs">{panel.faith}</span>
                </div>
              )}
              {panel.type === 'person' && panel.political_party && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary w-16 flex-shrink-0">Party</span>
                  <span className="text-xs">{panel.political_party}</span>
                </div>
              )}
              {panel.type === 'institution' && panel.transparency_tier && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary w-16 flex-shrink-0">Opacity</span>
                  <span className="text-xs">{panel.transparency_tier.replace(/_/g, ' ')}</span>
                </div>
              )}
              {panel.short_bio && (
                <p className="text-xs text-text-tertiary leading-relaxed">{panel.short_bio}</p>
              )}
              {panel.slug && (
                <a
                  href={`/${panel.type === 'person' ? 'people' : 'institutions'}/${panel.slug}`}
                  className="inline-block font-mono text-[8px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors mt-1"
                >
                  Full profile →
                </a>
              )}
            </div>

            {/* Connections list */}
            <div className="p-4">
              <p className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary mb-3">
                {panelConnections.length} connection{panelConnections.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {panelConnections.map(({ edge, other }) => (
                  <div key={edge.id} className="group">
                    <div className="flex items-start gap-2">
                      <span
                        className="font-mono text-[7px] uppercase tracking-widest border px-1 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ color: edgeColor(edge), borderColor: edgeColor(edge) + '44' }}
                      >
                        {edge.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        {other?.slug ? (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); const node = nodes.find((n) => n.id === other.id); if (node) { setPanel(node); setSelected(new Set([node.id])); } }}
                            className="text-xs text-text-secondary hover:text-gold transition-colors text-left"
                          >
                            {other?.name ?? edge.target}
                          </button>
                        ) : (
                          <span className="text-xs text-text-tertiary">{other?.name ?? edge.target}</span>
                        )}
                        {(edge.start_year || edge.end_year) && (
                          <span className="font-mono text-[7px] text-text-tertiary ml-1">
                            {edge.start_year ?? '?'}{edge.end_year && edge.end_year !== edge.start_year ? `–${edge.end_year}` : ''}
                          </span>
                        )}
                        {edge.membership_status && edge.membership_status !== 'unknown' && (
                          <span className={`font-mono text-[7px] ml-1 ${edge.membership_status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {edge.membership_status}
                          </span>
                        )}
                        {edge.covert && <span className="font-mono text-[7px] text-red-400 ml-1">covert</span>}
                      </div>
                    </div>
                    {edge.description && (
                      <p className="text-[10px] text-text-tertiary mt-0.5 ml-0 leading-relaxed line-clamp-2">
                        {edge.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-border bg-ground flex gap-6 flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary">People</span>
          {Object.entries(PERSON_COLORS).filter(([k]) => k !== 'default').slice(0, 5).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1 font-mono text-[7px] text-text-tertiary">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <div className="w-px bg-border flex-shrink-0" />
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[7px] uppercase tracking-widest text-text-tertiary">Institutions</span>
          {Object.entries(INST_COLORS).filter(([k]) => k !== 'default').slice(0, 5).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1 font-mono text-[7px] text-text-tertiary">
              <span className="w-2 h-2 rounded flex-shrink-0" style={{ backgroundColor: color, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
              {type.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <div className="w-px bg-border flex-shrink-0" />
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-[7px] text-text-tertiary">― solid = confirmed</span>
          <span className="font-mono text-[7px] text-text-tertiary">╌ dashed = covert / assumed</span>
          <span className="font-mono text-[7px] text-text-tertiary">shift+click = multi-select</span>
        </div>
      </div>
    </div>
  );
}
