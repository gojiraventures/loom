"use client";

import { ChevronRight } from "lucide-react";

interface ConvergenceCardProps {
  title: string;
  jawDrop: string;
  score: number;
  traditions: string[];
  href: string;
  index: number;
  heroImageUrl?: string | null;
  heroPosition?: string;
  isNew?: boolean;
}

export function ConvergenceCard({
  title,
  jawDrop,
  href,
  heroImageUrl,
  heroPosition = 'center',
}: ConvergenceCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col bg-[#0a0a0b] hover:bg-[#0e0e10] transition-colors duration-300"
    >
      {/* Image area — always rendered, blank if no image */}
      <div className="relative h-[200px] shrink-0 overflow-hidden">
        {heroImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImageUrl}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
              style={{ objectPosition: heroPosition }}
            />
            {/* Bottom scrim so title stays legible over any image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            {/* Title overlaid at bottom — only when image present */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-12">
              <h3 className="font-serif text-[1.15rem] leading-[1.2] text-[rgba(220,190,150,0.95)] group-hover:text-gold transition-colors duration-200">
                {title}
              </h3>
            </div>
          </>
        ) : (
          /* No image — blank dark area, title below */
          <div className="absolute inset-0 bg-[#111114]" />
        )}
      </div>

      {/* Text content — title here when no image, always has summary + link */}
      <div className="flex flex-col flex-1 px-5 pt-5 pb-6">
        {!heroImageUrl && (
          <h3 className="font-serif text-[1.15rem] leading-[1.2] mb-3 group-hover:text-gold transition-colors duration-200">
            {title}
          </h3>
        )}

        <p className="text-[0.9rem] text-text-secondary leading-[1.7] line-clamp-4 flex-1">
          {jawDrop}
        </p>

        <div className="flex items-center gap-1 mt-5 font-mono text-[0.7rem] tracking-[0.08em] uppercase text-gold">
          Read the evidence
          <ChevronRight size={13} />
        </div>
      </div>
    </a>
  );
}
