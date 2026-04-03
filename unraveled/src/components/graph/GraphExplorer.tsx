'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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
  academic:              '#3D8A8D',
  journalist:            '#D4B483',
  whistleblower:         '#C07050',
  public_figure:         '#A8A49A',
  historical_figure:     '#8A7BA8',
  independent_researcher:'#4A9E6A',
  witness:               '#C07898',
  default:               '#7A746E',
};

const INST_COLORS: Record<string, string> = {
  intelligence:      '#8B4A4A',
  secret_society:    '#9E8560',
  government_agency: '#A05040',
  university:        '#2A5C5E',
  museum:            '#4A7A7C',
  military:          '#7A5A3A',
  religious:         '#8A6A9A',
  think_tank:        '#4A6A8A',
  research_institute:'#4A7A6A',
  default:           '#5A5450',
};

// Edges: most are neutral; only funding/employment/opposition get color
const EDGE_COLORS: Record<string, string> = {
  funded:       '#D4B483',
  founder:      '#D4B483',
  member:       '#9E8560',
  affiliated:   '#9E8560',
  employee:     '#3D8A8D',
  director:     '#3D8A8D',
  colleague:    '#3D8A8D',
  collaborator: '#3D8A8D',
  criticized:   '#8B4A4A',
  front_for:    '#8B4A4A',
  debated:      '#A05040',
  default:      '#3A3530',
};

function nodeColor(n: GraphNode): string {
  if (n.type === 'person') return PERSON_COLORS[n.subtype ?? 'default'] ?? PERSON_COLORS.default;
  return INST_COLORS[n.subtype ?? 'default'] ?? INST_COLORS.default;
}
function edgeColor(e: GraphEdge): string {
  return EDGE_COLORS[e.type] ?? EDGE_COLORS.default;
}

// Size by connection count (radius in SVG units)
function nodeRadius(n: GraphNode): number {
  const c = n.connection_count;
  if (c <= 2)  return 16;
  if (c <= 5)  return 22;
  if (c <= 10) return 28;
  return 34;
}

// ── Force simulation ──────────────────────────────────────────────────────────
function runForce(nodes: GraphNode[], edges: GraphEdge[], cx: number, cy: number, w: number, h: number) {
  const REPEL = 18000, IDEAL = 300, DAMP = 0.68, PAD = 100;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < 200; iter++) {
    const alpha = Math.pow(1 - iter / 200, 1.5);

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

    edges.forEach(({ source, target, strength }) => {
      const s = nodeMap.get(source), t = nodeMap.get(target);
      if (!s || !t) return;
      const dx = t.x - s.x, dy = t.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - IDEAL * (1 / (strength || 1))) / d) * 0.25 * alpha;
      if (!s.fx) { s.vx += dx * f; s.vy += dy * f; }
      if (!t.fx) { t.vx -= dx * f; t.vy -= dy * f; }
    });

    nodes.forEach((n) => {
      if (n.fx == null) { n.vx += (cx - n.x) * 0.012 * alpha; n.vy += (cy - n.y) * 0.012 * alpha; }
    });

    nodes.forEach((n) => {
      n.vx *= DAMP; n.vy *= DAMP;
      if (n.fx != null) { n.x = n.fx; } else { n.x = Math.max(PAD, Math.min(w - PAD, n.x + n.vx)); }
      if (n.fy != null) { n.y = n.fy; } else { n.y = Math.max(PAD, Math.min(h - PAD, n.y + n.vy)); }
    });
  }
}

// ── Timeline layout ───────────────────────────────────────────────────────────
function applyTimelineLayout(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number): { minYear: number; maxYear: number } {
  const years: number[] = [];
  nodes.forEach((n) => { if (n.year) years.push(n.year); if (n.died_year) years.push(n.died_year); });
  edges.forEach((e) => { if (e.start_year) years.push(e.start_year); if (e.end_year) years.push(e.end_year); });
  if (years.length === 0) years.push(1800, 2024);

  const minYear = Math.max(Math.min(...years) - 30, 1400);
  const maxYear = Math.min(Math.max(...years) + 10, 2030);
  const span = maxYear - minYear || 1;
  const PADX = 120, usableW = w - PADX * 2;
  const instY = h * 0.28, personY = h * 0.72;

  const assignPositions = (group: GraphNode[], baseY: number) => {
    group.sort((a, b) => (a.year ?? 1900) - (b.year ?? 1900));
    const xCounts: Record<number, number> = {};
    group.forEach((n) => {
      const yr = n.year ?? Math.round((minYear + maxYear) / 2);
      const rawX = PADX + ((yr - minYear) / span) * usableW;
      const slot = Math.round(rawX / 44);
      xCounts[slot] = (xCounts[slot] ?? 0) + 1;
      const spread = (xCounts[slot] - 1) * 44;
      n.fx = Math.max(PADX, Math.min(w - PADX, rawX + (spread % 2 === 0 ? spread / 2 : -(spread + 1) / 2)));
      n.fy = baseY + ((xCounts[slot] - 1) % 3) * 52 - 52;
      n.x = n.fx; n.y = n.fy;
    });
  };

  assignPositions(nodes.filter((n) => n.type === 'institution'), instY);
  assignPositions(nodes.filter((n) => n.type === 'person'), personY);

  nodes.forEach((n) => {
    if (n.fx == null) {
      n.fx = w / 2; n.fy = n.type === 'institution' ? instY : personY;
      n.x = n.fx; n.y = n.fy;
    }
  });

  return { minYear, maxYear };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Main component ────────────────────────────────────────────────────────────

interface FilterState {
  entityTypes: Set<string>;
  relTypes: Set<string>;
  membershipStatus: Set<string>;
}

export default function GraphExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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

  // Legend category filters (highlight specific subtypes)
  const [highlightedSubtypes, setHighlightedSubtypes] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Node dragging
  const nodeDragRef = useRef<{ nodeId: string; startScreenX: number; startScreenY: number; startNx: number; startNy: number } | null>(null);
  const userPositionedRef = useRef(false); // true once user has manually placed any node

  // Panel resize
  const [panelWidth, setPanelWidth] = useState(320);
  const panelDragRef = useRef<{ startX: number; startW: number } | null>(null);

  const onGripDown = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    panelDragRef.current = { startX: ev.clientX, startW: panelWidth };
  }, [panelWidth]);

  const onGripMove = useCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (!panelDragRef.current) return;
    const dx = panelDragRef.current.startX - ev.clientX; // drag left = wider
    setPanelWidth(Math.max(240, Math.min(680, panelDragRef.current.startW + dx)));
  }, []);

  const onGripUp = useCallback(() => { panelDragRef.current = null; }, []);

  // ── localStorage position persistence ─────────────────────────────────────
  const POS_KEY = 'ut-graph-positions-v1';
  const loadSavedPositions = (): Record<string, { x: number; y: number }> | null => {
    try { const s = localStorage.getItem(POS_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  };
  const savePositions = useCallback((ns: GraphNode[]) => {
    try {
      const pos: Record<string, { x: number; y: number }> = {};
      ns.forEach((n) => { pos[n.id] = { x: n.x, y: n.y }; });
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch { /* quota exceeded etc */ }
  }, []);
  const resetPositions = useCallback(() => {
    try { localStorage.removeItem(POS_KEY); } catch { /* ignore */ }
    userPositionedRef.current = false;
    const { w, h } = dims;
    const updated = nodes.map((n) => ({ ...n, fx: null, fy: null, x: w / 2 + (Math.random() - 0.5) * w * 0.6, y: h / 2 + (Math.random() - 0.5) * h * 0.6, vx: 0, vy: 0 }));
    runForce(updated, edges, w / 2, h / 2, w, h);
    setNodes(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, nodes, edges]);

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/graph')
      .then((r) => r.json())
      .then(({ nodes: rawNodes, edges: rawEdges }) => {
        const { w, h } = dims;
        const cx = w / 2, cy = h / 2;
        const saved = loadSavedPositions();
        const initialized = (rawNodes as GraphNode[]).map((n: GraphNode) => {
          const pos = saved?.[n.id];
          return { ...n, x: pos?.x ?? cx + (Math.random() - 0.5) * w * 0.6, y: pos?.y ?? cy + (Math.random() - 0.5) * h * 0.6, vx: 0, vy: 0 };
        });
        if (!saved) {
          runForce(initialized, rawEdges, cx, cy, w, h);
        } else {
          userPositionedRef.current = true;
        }
        setNodes(initialized);
        setEdges(rawEdges);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Responsive dims ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width;
      // Walk up to the closest ancestor with a real height if el itself is 0
      let h = el.clientHeight;
      if (!h) h = el.parentElement?.clientHeight ?? 0;
      if (!h) h = window.innerHeight - 56;
      setDims({ w: Math.max(w, 300), h: Math.max(h, 400) });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Also observe the parent so we catch flex-resolved heights
    if (el.parentElement) ro.observe(el.parentElement);
    measure();
    return () => ro.disconnect();
  }, []);

  // ── Re-layout when mode/dims change ───────────────────────────────────────
  useEffect(() => {
    if (nodes.length === 0) return;
    const { w, h } = dims;
    if (mode === 'timeline') {
      const updated = nodes.map((n) => ({ ...n, fx: null, fy: null, vx: 0, vy: 0 }));
      const { minYear, maxYear } = applyTimelineLayout(updated, edges, w, h);
      setNodes(updated);
      setTimelineRange({ min: minYear, max: maxYear });
      setYearRange([minYear, maxYear]);
    } else if (!userPositionedRef.current) {
      // Only re-run force if user hasn't manually placed nodes
      const updated = nodes.map((n) => ({ ...n, fx: null, fy: null }));
      runForce(updated, edges, w / 2, h / 2, w, h);
      setNodes(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dims]);

  // ── Derived ────────────────────────────────────────────────────────────────
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

  const connectedToSelected = useMemo(() => {
    if (selected.size === 0) return new Set<string>();
    const connected = new Set<string>();
    edges.forEach((e) => {
      if (selected.has(e.source)) connected.add(e.target);
      if (selected.has(e.target)) connected.add(e.source);
    });
    return connected;
  }, [selected, edges]);

  const panelConnections = panel ? edges.filter(
    (e) => e.source === panel.id || e.target === panel.id
  ).map((e) => {
    const otherId = e.source === panel.id ? e.target : e.source;
    return { edge: e, other: nodes.find((n) => n.id === otherId) };
  }) : [];

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 8);
  }, [nodes, searchQuery]);

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
      return { scale: newScale, x: mouseX - scaleChange * (mouseX - v.x), y: mouseY - scaleChange * (mouseY - v.y) };
    });
  }, []);

  const onPointerDown = useCallback((ev: React.PointerEvent<SVGSVGElement>) => {
    if ((ev.target as Element).closest('[data-node]')) return;
    (ev.currentTarget as SVGSVGElement).setPointerCapture(ev.pointerId);
    dragging.current = { startX: ev.clientX, startY: ev.clientY, startVx: view.x, startVy: view.y };
  }, [view]);

  const onPointerMove = useCallback((ev: React.PointerEvent) => {
    if (nodeDragRef.current) {
      const { nodeId, startScreenX, startScreenY, startNx, startNy } = nodeDragRef.current;
      const dx = (ev.clientX - startScreenX) / view.scale;
      const dy = (ev.clientY - startScreenY) / view.scale;
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, x: startNx + dx, y: startNy + dy } : n));
    } else if (dragging.current) {
      setView((v) => ({ ...v, x: dragging.current!.startVx + ev.clientX - dragging.current!.startX, y: dragging.current!.startVy + ev.clientY - dragging.current!.startY }));
    }
  }, [view.scale]);

  const onPointerUp = useCallback(() => {
    if (nodeDragRef.current) {
      nodeDragRef.current = null;
      userPositionedRef.current = true;
      setNodes((current) => { savePositions(current); return current; });
    }
    dragging.current = null;
  }, [savePositions]);

  // ── Center on a node ───────────────────────────────────────────────────────
  const centerOnNode = useCallback((n: GraphNode) => {
    const { w, h } = dims;
    setView({ x: w / 2 - n.x, y: h / 2 - n.y, scale: 1.4 });
  }, [dims]);

  // ── Node interaction ───────────────────────────────────────────────────────
  const onNodeClick = useCallback((ev: React.MouseEvent, node: GraphNode) => {
    ev.stopPropagation();
    if (ev.shiftKey) {
      setSelected((s) => { const next = new Set(s); next.has(node.id) ? next.delete(node.id) : next.add(node.id); return next; });
    } else {
      setSelected(new Set([node.id]));
      setPanel(node);
    }
  }, []);

  const onSvgClick = useCallback(() => { setSelected(new Set()); setPanel(null); }, []);

  // ── Toggle legend subtype highlight ──────────────────────────────────────
  const toggleSubtype = useCallback((subtype: string) => {
    setHighlightedSubtypes((s) => {
      const next = new Set(s);
      next.has(subtype) ? next.delete(subtype) : next.add(subtype);
      return next;
    });
  }, []);

  // ── Render edge ───────────────────────────────────────────────────────────
  function renderEdge(e: GraphEdge, idx: number) {
    const s = nodes.find((n) => n.id === e.source);
    const t = nodes.find((n) => n.id === e.target);
    if (!s || !t) return null;

    const isConnectedToSelected = selected.size > 0 && (selected.has(e.source) || selected.has(e.target));
    const isHighlit = selected.size === 0 || isConnectedToSelected;
    const color = edgeColor(e);
    const opacity = isHighlit ? (selected.size > 0 ? 0.85 : 0.4) : 0.06;
    const thickness = isConnectedToSelected
      ? Math.max(1.5, e.strength * 0.8)
      : Math.max(0.8, e.strength * 0.5);

    const dx = t.x - s.x, dy = t.y - s.y;
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
    const perpScale = e.edge_kind === 'pi' ? 0.3 : 0.18;
    const qx = mx - dy * perpScale, qy = my + dx * perpScale;

    const showYear = mode === 'timeline' && (e.start_year || e.end_year);
    const yearLabel = e.start_year === e.end_year ? `${e.start_year}` : `${e.start_year ?? '?'}–${e.end_year ?? ''}`;
    const showTypeLabel = (hovered === e.source || hovered === e.target) && isHighlit;

    return (
      <g key={`e-${e.id}-${idx}`} opacity={opacity}>
        <path
          d={`M${s.x},${s.y} Q${qx},${qy} ${t.x},${t.y}`}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={e.covert || e.membership_status === 'assumed' ? '6,4' : undefined}
          strokeOpacity={0.9}
        />
        {/* Year label with background pill */}
        {showYear && isHighlit && (
          <g>
            <rect x={qx - 22} y={qy - 19} width={44} height={16} rx={3} ry={3} fill="#0d0c0a" opacity={0.75} />
            <text x={qx} y={qy - 7} textAnchor="middle" fontSize={12} fill="#A8A49A" className="pointer-events-none select-none font-mono">
              {yearLabel}
            </text>
          </g>
        )}
        {/* Hover: relationship type label */}
        {showTypeLabel && (
          <g>
            <rect x={qx - 30} y={qy - 20} width={60} height={14} rx={3} ry={3} fill="#0d0c0a" opacity={0.8} />
            <text x={qx} y={qy - 10} textAnchor="middle" fontSize={11} fill="#A8A49A" opacity={0.95} className="pointer-events-none select-none">
              {e.type.replace(/_/g, ' ')}
            </text>
          </g>
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

    const dimmedBySelection = selected.size > 0 && !isSelected && !connectedToSelected.has(n.id);
    const dimmedByLegend = highlightedSubtypes.size > 0 && !highlightedSubtypes.has(n.subtype ?? 'default');
    const dimmed = dimmedBySelection || dimmedByLegend;
    const opacity = dimmed ? 0.25 : 1;

    const borderColor = isSelected ? color : (isHov ? color + 'CC' : color + '80');
    const borderWidth = isSelected ? 3 : isHov ? 2 : 1.5;
    const fillColor = color + '18'; // ~10% opacity fill

    const label = truncate(n.name, 24);
    const subLabel = n.subtype ? n.subtype.replace(/_/g, ' ') : null;

    // Glow filter id per node (unique enough based on color)
    const glowId = `glow-${n.id.slice(0, 8)}`;

    return (
      <g
        key={n.id}
        data-node="1"
        transform={`translate(${n.x},${n.y})`}
        style={{ cursor: nodeDragRef.current?.nodeId === n.id ? 'grabbing' : 'grab' }}
        opacity={opacity}
        onMouseEnter={() => setHovered(n.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={(ev) => { if (!nodeDragRef.current) onNodeClick(ev, n); }}
        onPointerDown={(ev) => {
          ev.stopPropagation();
          svgRef.current?.setPointerCapture(ev.pointerId);
          nodeDragRef.current = { nodeId: n.id, startScreenX: ev.clientX, startScreenY: ev.clientY, startNx: n.x, startNy: n.y };
        }}
      >
        {isSelected && (
          <defs>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={color} floodOpacity="0.25" />
            </filter>
          </defs>
        )}

        {n.type === 'institution' ? (
          // Rounded square (squircle) for institutions
          <rect
            x={-r * 0.85}
            y={-r * 0.85}
            width={r * 1.7}
            height={r * 1.7}
            rx={r * 0.28}
            ry={r * 0.28}
            fill={fillColor}
            stroke={borderColor}
            strokeWidth={borderWidth}
            filter={isSelected ? `url(#${glowId})` : undefined}
          />
        ) : (
          // Circle for people
          <circle
            r={r}
            fill={fillColor}
            stroke={borderColor}
            strokeWidth={borderWidth}
            filter={isSelected ? `url(#${glowId})` : undefined}
          />
        )}

        {/* Center dot */}
        <circle r={r * 0.22} fill={color} opacity={isSelected ? 0.9 : 0.6} />

        {/* Name label — always visible */}
        <text
          y={r + 16}
          textAnchor="middle"
          fontSize={14}
          fill="#F5F0E8"
          fontWeight={400}
          className="pointer-events-none select-none"
          style={{ fontFamily: 'var(--font-sans, sans-serif)' }}
        >
          {label}
        </text>

        {/* Subtype label */}
        {subLabel && (
          <text
            y={r + 30}
            textAnchor="middle"
            fontSize={12}
            fill="#A8A49A"
            fontWeight={300}
            className="pointer-events-none select-none"
            style={{ fontFamily: 'var(--font-mono, monospace)' }}
          >
            {subLabel}
          </text>
        )}

        {/* Year badge in timeline mode */}
        {mode === 'timeline' && n.year && (
          <g>
            <rect x={-18} y={-r - 20} width={36} height={14} rx={3} ry={3} fill="#0d0c0a" opacity={0.7} />
            <text
              y={-r - 9}
              textAnchor="middle"
              fontSize={12}
              fill="#A8A49A"
              className="pointer-events-none select-none font-mono"
            >
              {n.year}
            </text>
          </g>
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
        <div className="flex gap-0.5 border border-border rounded p-0.5">
          {(['web', 'timeline'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1 rounded transition-colors ${mode === m ? 'bg-gold/10 text-gold' : 'text-text-tertiary hover:text-text-secondary'}`}
            >
              {m === 'web' ? '○ Web' : '≡ Timeline'}
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
              className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border rounded transition-colors ${filters.entityTypes.has(t) ? 'border-gold/40 text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
            >
              {t === 'person' ? '○ People' : '□ Institutions'}
            </button>
          ))}
        </div>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border rounded transition-colors ${showFilters ? 'border-gold/40 text-gold' : 'border-border text-text-tertiary hover:text-text-secondary'}`}
        >
          ≡ Filter
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-[240px]">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search entities…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            className="w-full font-mono text-[11px] bg-ground-light border border-border px-3 py-1.5 text-text-secondary placeholder-text-tertiary focus:outline-none focus:border-gold/40 rounded"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-ground border border-border shadow-lg z-50 rounded overflow-hidden">
              {searchResults.map((n) => (
                <button
                  key={n.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-ground-light/60 text-left transition-colors"
                  onClick={() => {
                    setPanel(n);
                    setSelected(new Set([n.id]));
                    centerOnNode(n);
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: nodeColor(n) }} />
                  <span className="font-mono text-[11px] text-text-secondary">{n.name}</span>
                  <span className="font-mono text-[9px] text-text-tertiary ml-auto">{n.subtype?.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="ml-auto font-mono text-[11px] text-text-tertiary shrink-0">
          {visibleNodes.length} nodes · {visibleEdges.length} edges
        </div>

        {/* Reset layout */}
        {userPositionedRef.current && (
          <button
            onClick={resetPositions}
            className="font-mono text-[10px] text-text-tertiary border border-border px-2 py-1 rounded hover:text-gold hover:border-gold/30 transition-colors shrink-0"
            title="Reset to auto-layout"
          >
            ↺ reset layout
          </button>
        )}

        {/* Zoom controls */}
        <div className="flex gap-1">
          {[{ label: '+', delta: 1.2 }, { label: '−', delta: 0.83 }, { label: '⌖', delta: 0 }].map(({ label, delta }) => (
            <button
              key={label}
              onClick={() => {
                if (delta === 0) setView({ x: 0, y: 0, scale: 1 });
                else setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(4, v.scale * delta)) }));
              }}
              className="font-mono text-[11px] text-text-tertiary border border-border w-7 h-7 rounded hover:text-gold hover:border-gold/30 transition-colors flex items-center justify-center"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-border bg-ground-light flex flex-wrap gap-5 items-start flex-shrink-0">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Relationship type</p>
            <div className="flex flex-wrap gap-1">
              {allRelTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilters((f) => {
                    const next = new Set(f.relTypes);
                    next.has(t) ? next.delete(t) : next.add(t);
                    return { ...f, relTypes: next };
                  })}
                  className={`font-mono text-[10px] px-2 py-0.5 border rounded transition-colors ${filters.relTypes.has(t) ? 'text-gold border-gold/40' : 'text-text-tertiary border-border hover:text-text-secondary'}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1" style={{ backgroundColor: edgeColor({ type: t } as GraphEdge) }} />
                  {t.replace(/_/g, ' ')}
                </button>
              ))}
              {filters.relTypes.size > 0 && (
                <button onClick={() => setFilters((f) => ({ ...f, relTypes: new Set() }))} className="font-mono text-[10px] text-text-tertiary hover:text-gold transition-colors ml-1">
                  clear
                </button>
              )}
            </div>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-2">Confirmation</p>
            <div className="flex gap-1">
              {['confirmed', 'assumed', 'unknown'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => {
                    const next = new Set(f.membershipStatus);
                    next.has(s) ? next.delete(s) : next.add(s);
                    return { ...f, membershipStatus: next };
                  })}
                  className={`font-mono text-[10px] px-2 py-0.5 border rounded transition-colors ${filters.membershipStatus.has(s) ? 'text-gold border-gold/40' : 'text-text-tertiary border-border hover:text-text-secondary'}`}
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
        <div className="px-6 py-2.5 border-b border-border bg-ground flex items-center gap-4 flex-shrink-0">
          <span className="font-mono text-[11px] text-text-secondary w-12">{yearRange[0]}</span>
          <div className="flex-1 relative h-5">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />
            <input type="range" min={timelineRange.min} max={timelineRange.max} value={yearRange[0]}
              onChange={(e) => setYearRange([Math.min(+e.target.value, yearRange[1] - 10), yearRange[1]])}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: 2 }} />
            <input type="range" min={timelineRange.min} max={timelineRange.max} value={yearRange[1]}
              onChange={(e) => setYearRange([yearRange[0], Math.max(+e.target.value, yearRange[0] + 10)])}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" style={{ zIndex: 2 }} />
            <div className="absolute top-1/2 h-0.5 bg-gold/40 -translate-y-1/2"
              style={{ left: `${((yearRange[0] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`, right: `${100 - ((yearRange[1] - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%` }} />
            {[yearRange[0], yearRange[1]].map((yr) => (
              <div key={yr} className="absolute top-1/2 w-2.5 h-2.5 rounded-full bg-gold border border-gold/60 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${((yr - timelineRange.min) / (timelineRange.max - timelineRange.min)) * 100}%`, zIndex: 3 }} />
            ))}
          </div>
          <span className="font-mono text-[11px] text-text-secondary w-12 text-right">{yearRange[1]}</span>
          <span className="font-mono text-[11px] text-text-tertiary shrink-0">
            {yearRange[1] - yearRange[0]}yr window
          </span>
        </div>
      )}

      {/* ── Canvas + Panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 relative">

        {/* SVG graph */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#09080a' }}>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary animate-pulse">Building graph…</p>
            </div>
          )}
          {!loading && visibleNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="font-mono text-[11px] text-text-tertiary">No entities match this filter. Try broadening your selection.</p>
            </div>
          )}

          {/* Timeline axis */}
          {mode === 'timeline' && !loading && (
            <svg className="absolute bottom-0 left-0 right-0 pointer-events-none" width={w} height={44}
              style={{ transform: `translateX(${view.x}px) scaleX(${view.scale})`, transformOrigin: '0 0' }}>
              <line x1={0} y1={0} x2={w} y2={0} stroke="#2a2622" strokeWidth={1} />
              {Array.from({ length: Math.ceil((timelineRange.max - timelineRange.min) / 100) + 1 }, (_, i) => {
                const yr = timelineRange.min + i * 100;
                const x = 120 + ((yr - timelineRange.min) / (timelineRange.max - timelineRange.min)) * (w - 240);
                return (
                  <g key={yr}>
                    <line x1={x} y1={0} x2={x} y2={8} stroke="#3a3630" strokeWidth={1} />
                    <text x={x} y={24} textAnchor="middle" fontSize={12} fill="#A8A49A" className="font-mono">{yr}</text>
                  </g>
                );
              })}
            </svg>
          )}

          <svg
            ref={svgRef}
            width={w}
            height={h}
            className="absolute inset-0 w-full h-full select-none"
            style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={onSvgClick}
          >
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#110f0d" />
                <stop offset="100%" stopColor="#080608" />
              </radialGradient>
            </defs>
            <rect width={w} height={h} fill="url(#bgGrad)" />

            <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
              {visibleEdges.map((e, i) => renderEdge(e, i))}
              {visibleNodes.map((n) => renderNode(n))}
            </g>
          </svg>
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────── */}
        {panel && (
          <>
          {/* Drag grip — sits on the left edge of the panel */}
          <div
            className="flex-shrink-0 flex items-center justify-center border-l border-r border-border bg-ground hover:bg-gold/5 transition-colors"
            style={{ width: 14, cursor: 'col-resize', touchAction: 'none' }}
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
          >
            <div className="flex flex-col gap-[4px]">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className="w-[3px] h-[3px] rounded-full bg-text-tertiary/50" />
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 border-r border-border bg-ground overflow-y-auto flex flex-col" style={{ width: panelWidth }}>
            {/* Header */}
            <div className="p-5 border-b border-border flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-1">
                  {(panel.subtype ?? panel.type).replace(/_/g, ' ')}
                </p>
                <h3 className="font-serif text-[1.1rem] leading-tight">{panel.name}</h3>
              </div>
              <button onClick={() => { setPanel(null); setSelected(new Set()); }}
                className="text-text-tertiary hover:text-text-primary ml-3 text-sm mt-0.5 shrink-0">✕</button>
            </div>

            {/* Identity facts */}
            <div className="p-5 space-y-2.5 border-b border-border">
              {panel.year && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary w-16 shrink-0">
                    {panel.type === 'person' ? 'Born' : 'Founded'}
                  </span>
                  <span className="text-sm">{panel.year}{panel.died_year ? ` – ${panel.died_year}` : ''}</span>
                </div>
              )}
              {panel.type === 'person' && panel.faith && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary w-16 shrink-0">Faith</span>
                  <span className="text-sm">{panel.faith}</span>
                </div>
              )}
              {panel.type === 'person' && panel.political_party && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary w-16 shrink-0">Party</span>
                  <span className="text-sm">{panel.political_party}</span>
                </div>
              )}
              {panel.type === 'institution' && panel.transparency_tier && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary w-16 shrink-0">Opacity</span>
                  <span className="text-sm">{panel.transparency_tier.replace(/_/g, ' ')}</span>
                </div>
              )}
              {panel.short_bio && (
                <p className="text-[0.82rem] text-text-secondary leading-relaxed pt-1">{panel.short_bio}</p>
              )}
              {panel.slug && (
                <a href={`/${panel.type === 'person' ? 'people' : 'institutions'}/${panel.slug}`}
                  className="inline-block font-mono text-[10px] uppercase tracking-widest text-gold hover:text-gold/80 transition-colors mt-1">
                  Full profile →
                </a>
              )}
            </div>

            {/* Connections list */}
            <div className="p-5 flex-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-4">
                Connections ({panelConnections.length})
              </p>
              <div className="space-y-4">
                {panelConnections.map(({ edge, other }) => (
                  <div key={edge.id}>
                    <div className="flex items-start gap-2.5">
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest border px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ color: edgeColor(edge), borderColor: edgeColor(edge) + '55' }}
                      >
                        {edge.type.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 min-w-0">
                        {other ? (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setPanel(other); setSelected(new Set([other.id])); centerOnNode(other); }}
                            className="text-[0.82rem] text-text-secondary hover:text-gold transition-colors text-left leading-snug"
                          >
                            {other.name}
                          </button>
                        ) : (
                          <span className="text-[0.82rem] text-text-tertiary">{edge.target}</span>
                        )}
                        {(edge.start_year || edge.end_year) && (
                          <span className="font-mono text-[9px] text-text-tertiary ml-1.5">
                            {edge.start_year ?? '?'}{edge.end_year && edge.end_year !== edge.start_year ? `–${edge.end_year}` : ''}
                          </span>
                        )}
                        <div className="flex gap-2 mt-0.5">
                          {edge.membership_status && edge.membership_status !== 'unknown' && (
                            <span className={`font-mono text-[9px] ${edge.membership_status === 'confirmed' ? 'text-teal' : 'text-amber-500/70'}`}>
                              {edge.membership_status}
                            </span>
                          )}
                          {edge.covert && <span className="font-mono text-[9px] text-red-400/70">covert</span>}
                        </div>
                      </div>
                    </div>
                    {edge.description && (
                      <p className="text-[11px] text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">
                        {edge.description}
                      </p>
                    )}
                  </div>
                ))}
                {panelConnections.length === 0 && (
                  <p className="text-[0.82rem] text-text-tertiary">No documented connections.</p>
                )}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="border-t border-border bg-ground flex-shrink-0 overflow-x-auto">
        <div className="px-5 py-3 flex gap-6 items-start min-w-max">

          {/* People */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-2">People</p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(PERSON_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => {
                const active = highlightedSubtypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleSubtype(type)}
                    className={`flex items-center gap-1.5 transition-opacity ${active ? 'opacity-100' : (highlightedSubtypes.size > 0 ? 'opacity-40' : 'opacity-80')} hover:opacity-100`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-mono text-[11px] text-text-secondary">{type.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px self-stretch bg-border flex-shrink-0" />

          {/* Institutions */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-2">Institutions</p>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(INST_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => {
                const active = highlightedSubtypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleSubtype(type)}
                    className={`flex items-center gap-1.5 transition-opacity ${active ? 'opacity-100' : (highlightedSubtypes.size > 0 ? 'opacity-40' : 'opacity-80')} hover:opacity-100`}
                  >
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-mono text-[11px] text-text-secondary">{type.replace(/_/g, ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px self-stretch bg-border flex-shrink-0" />

          {/* Edges key */}
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-text-tertiary mb-2">Edges</p>
            <div className="flex gap-4 items-center">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#7A746E" strokeWidth="1.5" /></svg>
                confirmed
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-secondary">
                <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#7A746E" strokeWidth="1.5" strokeDasharray="4,3" /></svg>
                inferred
              </span>
              <span className="font-mono text-[11px] text-text-tertiary">shift+click = multi-select</span>
            </div>
          </div>

          {/* Clear legend filter if active */}
          {highlightedSubtypes.size > 0 && (
            <button onClick={() => setHighlightedSubtypes(new Set())}
              className="ml-auto font-mono text-[10px] text-text-tertiary hover:text-gold transition-colors self-center shrink-0">
              clear filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
