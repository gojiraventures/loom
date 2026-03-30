"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { ConvergenceScore } from "@/components/ui/ConvergenceScore";
import { TraditionPill } from "@/components/ui/TraditionPill";

interface ConvergenceCardProps {
  title: string;
  jawDrop: string;
  score: number;
  traditions: string[];
  href: string;
  index: number;
}

export function ConvergenceCard({
  title,
  jawDrop,
  score,
  traditions,
  href,
  index,
}: ConvergenceCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      className="block p-6 border border-border transition-colors duration-200"
      style={{
        background: hovered ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary">
            Topic {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="font-serif text-2xl mt-1 mb-3">{title}</h3>
          <div className="flex flex-wrap mb-3">
            {traditions.map((t) => (
              <TraditionPill key={t} id={t} />
            ))}
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{jawDrop}</p>
        </div>
        <ConvergenceScore score={score} />
      </div>
      <div className="flex items-center gap-1 mt-4 font-mono text-[11px] tracking-wide uppercase text-gold">
        Read the evidence
        <ChevronRight size={14} />
      </div>
    </a>
  );
}
