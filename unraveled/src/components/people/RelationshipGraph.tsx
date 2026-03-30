'use client';

import { useEffect, useRef, useState } from 'react';
import type { PersonRelationship } from '@/lib/people';

interface Node {
  id: string;
  name: string;
  slug: string | null;
  isCenter: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
  strength: number;
  bidirectional: boolean;
}

const REL_COLORS: Record<string, string> = {
  investigated: '#d4af37',
  colleague: '#60a5fa',
  collaborator: '#34d399',
  mentor: '#a78bfa',
  endorsed: '#34d399',
  criticized: '#f87171',
  debated: '#fb923c',
  associated: '#94a3b8',
  funded: '#f59e0b',
  employed: '#60a5fa',
  family: '#ec4899',
  co_appeared: '#818cf8',
  influenced: '#a78bfa',
  contradicted: '#f87171',
  interviewed: '#94a3b8',
  succeeded: '#94a3b8',
  default: '#94a3b8',
};

interface Props {
  centerPersonId: string;
  centerPersonName: string;
  relationships: PersonRelationship[];
}

export default function RelationshipGraph({ centerPersonId, centerPersonName, relationships }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 600, h: 400 });

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: Math.min(el.clientWidth * 0.55, 480) });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: Math.min(el.clientWidth * 0.55, 480) });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!relationships.length) return;
    const { w, h } = dims;
    const cx = w / 2, cy = h / 2;

    // Build unique nodes
    const nodeMap = new Map<string, Node>();
    nodeMap.set(centerPersonId, {
      id: centerPersonId, name: centerPersonName, slug: null, isCenter: true,
      x: cx, y: cy, vx: 0, vy: 0,
    });

    relationships.forEach((r) => {
      if (!nodeMap.has(r.target_id)) {
        nodeMap.set(r.target_id, {
          id: r.target_id, name: r.target_name, slug: r.target_slug,
          isCenter: false, x: cx + (Math.random() - 0.5) * 200, y: cy + (Math.random() - 0.5) * 200,
          vx: 0, vy: 0,
        });
      }
    });

    const edgeList: Edge[] = relationships.map((r) => ({
      source: centerPersonId,
      target: r.target_id,
      type: r.relationship_type,
      strength: r.strength,
      bidirectional: r.bidirectional,
    }));

    // Simple force simulation (50 iterations)
    const nodeList = Array.from(nodeMap.values());
    const IDEAL = 140;
    const REPEL = 3000;

    for (let iter = 0; iter < 80; iter++) {
      const alpha = 1 - iter / 80;

      // Repulsion between all nodes
      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          const a = nodeList[i], b = nodeList[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (REPEL / (dist * dist)) * alpha;
          a.vx -= (dx / dist) * force;
          a.vy -= (dy / dist) * force;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }
      }

      // Attraction along edges
      edgeList.forEach(({ source, target }) => {
        const s = nodeMap.get(source)!, t = nodeMap.get(target)!;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = ((dist - IDEAL) / dist) * 0.2 * alpha;
        if (!s.isCenter) { s.vx += dx * force; s.vy += dy * force; }
        if (!t.isCenter) { t.vx -= dx * force; t.vy -= dy * force; }
      });

      // Center gravity
      nodeList.forEach((n) => {
        if (!n.isCenter) {
          n.vx += (cx - n.x) * 0.01 * alpha;
          n.vy += (cy - n.y) * 0.01 * alpha;
        }
      });

      // Apply velocity + dampen
      const PAD = 56;
      nodeList.forEach((n) => {
        n.vx *= 0.7; n.vy *= 0.7;
        n.x = Math.max(PAD, Math.min(w - PAD, n.x + n.vx));
        n.y = Math.max(PAD, Math.min(h - PAD, n.y + n.vy));
      });
    }

    setNodes(nodeList);
    setEdges(edgeList);
  }, [relationships, centerPersonId, centerPersonName, dims]);

  if (!relationships.length) return null;
  const { w, h } = dims;

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        className="w-full"
        viewBox={`0 0 ${w} ${h}`}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e) => {
          const s = nodes.find((n) => n.id === e.source);
          const t = nodes.find((n) => n.id === e.target);
          if (!s || !t) return null;
          const color = REL_COLORS[e.type] ?? REL_COLORS.default;
          const isHovered = hovered === e.target || hovered === e.source;
          return (
            <g key={`${e.source}-${e.target}-${e.type}`}>
              <line
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1}
                strokeOpacity={isHovered ? 0.8 : 0.35}
                markerEnd={!e.bidirectional ? 'url(#arrow)' : undefined}
              />
              {/* Edge label */}
              {isHovered && (
                <text
                  x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6}
                  textAnchor="middle" fontSize={9}
                  fill={color} opacity={0.9}
                  className="font-mono pointer-events-none"
                >
                  {e.type.replace(/_/g, ' ')}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const isHov = hovered === n.id;
          const r = n.isCenter ? 22 : 14;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              style={{ cursor: n.slug ? 'pointer' : 'default' }}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => n.slug && !n.isCenter && window.open(`/people/${n.slug}`, '_self')}
            >
              <circle
                r={r}
                fill={n.isCenter ? '#d4af37' : '#1a1916'}
                stroke={n.isCenter ? '#d4af37' : (isHov ? '#d4af37' : '#3d3a33')}
                strokeWidth={n.isCenter ? 2 : (isHov ? 1.5 : 1)}
                opacity={0.95}
              />
              <text
                textAnchor="middle"
                dy={r + 14}
                fontSize={10}
                fill={isHov ? '#e8e4dd' : '#9b9589'}
                className="pointer-events-none select-none"
                style={{ fontFamily: 'var(--font-mono, monospace)' }}
              >
                {n.name.split(' ').slice(-1)[0]}
              </text>
              {isHov && (
                <text
                  textAnchor="middle"
                  dy={r + 26}
                  fontSize={8}
                  fill="#6b6560"
                  className="pointer-events-none select-none"
                >
                  {n.name.split(' ').slice(0, -1).join(' ')}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {Array.from(new Set(edges.map((e) => e.type))).map((type) => (
          <span key={type} className="flex items-center gap-1.5 font-mono text-[9px] text-text-tertiary">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: REL_COLORS[type] ?? REL_COLORS.default }}
            />
            {type.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
