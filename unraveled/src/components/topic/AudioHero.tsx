interface AudioHeroProps {
  audioUrl: string;
  title: string;
}

export function AudioHero({ audioUrl, title }: AudioHeroProps) {
  return (
    <section className="border-b border-border bg-ground-light/10">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="shrink-0">
            <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary block mb-0.5">
              Audio Overview
            </span>
            <span className="font-serif text-sm text-gold leading-snug max-w-[14rem] block">
              {title}
            </span>
          </div>
          <audio
            controls
            src={audioUrl}
            className="flex-1 h-10 accent-gold w-full"
            preload="metadata"
          />
        </div>
      </div>
    </section>
  );
}
