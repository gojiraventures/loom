'use client';

import { useState, useEffect, useRef } from 'react';

interface SharedElement {
  element: string;
  traditions: Record<string, boolean>;
}

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  count: number;
  color: string;
}

interface Edge {
  from: string;
  to: string;
  weight: number;
  elements: string[];
}

const TRADITION_COLORS: Record<string, string> = {
  Sumerian: '#6AADAD',
  Biblical: '#C8956C',
  Hindu: '#C47A6E',
  Greek: '#8B7EC8',
  Maya: '#6AAD7E',
  Chinese: '#AD6A8B',
  Norse: '#7E8EA0',
  Aboriginal: '#AD7E6A',
  Indigenous: '#6AAD7E',
  Egyptian: '#C4A44E',
};

function getColor(tradition: string): string {
  const first = tradition.split(' ')[0];
  return TRADITION_COLORS[first] || TRADITION_COLORS[tradition] || '#C8956C';
}

export function TraditionNetwork({ matrix }: { matrix: SharedElement[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selected, setSelected] = useState<string | null>(null);
  const nodesRef = useRef<Node[]>([]);

  // Build graph from matrix
  const allTraditions = [...new Set(matrix.flatMap(row => Object.keys(row.traditions)))];

  // Score each tradition
  const scores: Record<string, number> = {};
  allTraditions.forEach(t => {
    scores[t] = matrix.filter(row => row.traditions[t]).length;
  });

  // Top 10 by score
  const traditions = allTraditions.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)).slice(0, 10);

  // Build edges: traditions that share elements
  const edges: Edge[] = [];
  for (let i = 0; i < traditions.length; i++) {
    for (let j = i + 1; j < traditions.length; j++) {
      const shared = matrix.filter(row => row.traditions[traditions[i]] && row.traditions[traditions[j]]);
      if (shared.length > 0) {
        edges.push({
          from: traditions[i],
          to: traditions[j],
          weight: shared.length,
          elements: shared.map(s => s.element),
        });
      }
    }
  }

  const W = 600;
  const H = 360;

  // Place nodes in a force-directed circle layout
  useEffect(() => {
    const nodes: Node[] = traditions.map((t, i) => {
      const angle = (i / traditions.length) * Math.PI * 2 - Math.PI / 2;
      const r = Math.min(W, H) * 0.32;
      return {
        id: t,
        label: t.split(' ')[0],
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        count: scores[t] ?? 0,
        color: getColor(t),
      };
    });
    nodesRef.current = nodes;
  }, [traditions.join(',')]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const draw = () => {
      time += 0.008;
      ctx.clearRect(0, 0, W, H);

      const nodes = nodesRef.current;
      if (!nodes.length) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

      // Draw edges
      edges.forEach(edge => {
        const a = nodeMap[edge.from];
        const b = nodeMap[edge.to];
        if (!a || !b) return;

        const isHighlighted = selected === edge.from || selected === edge.to;
        const alpha = selected
          ? (isHighlighted ? 0.6 : 0.04)
          : Math.min(0.35, 0.05 + edge.weight * 0.06);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(200,149,108,${alpha})`;
        ctx.lineWidth = selected ? (isHighlighted ? edge.weight * 0.5 : 0.5) : edge.weight * 0.3;
        ctx.stroke();

        // Weight label on highlighted edges
        if (isHighlighted && selected) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          ctx.fillStyle = 'rgba(200,149,108,0.7)';
          ctx.font = `500 8px 'IBM Plex Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(`${edge.weight}`, mx, my);
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const isSelected = selected === node.id;
        const pulse = Math.sin(time * 1.2 + nodes.indexOf(node) * 0.8) * 1.5;
        const r = 6 + (node.count / Math.max(...nodes.map(n => n.count))) * 8;
        const rgb = node.color.slice(1).match(/.{2}/g)!.map(h => parseInt(h, 16)).join(',');

        // Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 10 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${isSelected ? 0.12 : 0.04})`;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${isSelected ? 0.2 : 0.08})`;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${isSelected ? 1 : selected ? 0.3 : 0.75})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();

        // Label
        const labelAlpha = selected ? (isSelected ? 1 : 0.2) : 0.75;
        ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
        ctx.font = `${isSelected ? '600' : '400'} 9px 'IBM Plex Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + r + 13);
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [edges, selected]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const hit = nodesRef.current.find(n => {
      const dx = n.x - mx, dy = n.y - my;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });
    setSelected(hit?.id === selected ? null : (hit?.id ?? null));
  };

  const selectedEdges = selected
    ? edges.filter(e => e.from === selected || e.to === selected)
        .sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', maxWidth: W, display: 'block', cursor: 'pointer' }}
        onClick={handleClick}
      />
      {selected && selectedEdges.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary mb-2">
            {selected} shares elements with:
          </p>
          <div className="space-y-1.5">
            {selectedEdges.slice(0, 5).map(edge => {
              const other = edge.from === selected ? edge.to : edge.from;
              return (
                <div key={`${edge.from}-${edge.to}`} className="flex items-start gap-3">
                  <span className="font-mono text-[9px] text-gold shrink-0 mt-0.5 w-6">{edge.weight}</span>
                  <div>
                    <span className="font-mono text-[10px] text-text-secondary">{other}</span>
                    <p className="text-[11px] text-text-tertiary">{edge.elements.slice(0, 3).join(', ')}{edge.elements.length > 3 ? ` +${edge.elements.length - 3} more` : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
