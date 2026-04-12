interface OriginContextProps {
  text: string;
}

export function OriginContext({ text }: OriginContextProps) {
  const paragraphs = text.split('\n\n').filter(Boolean);

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary block mb-5">
          Origin &amp; Context
        </span>
        <div className="max-w-2xl space-y-4">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-base text-text-secondary leading-[1.85]">
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
