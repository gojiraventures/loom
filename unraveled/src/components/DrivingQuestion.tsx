interface DrivingQuestionProps {
  question: string | null | undefined;
}

export function DrivingQuestion({ question }: DrivingQuestionProps) {
  if (!question?.trim()) return null;

  return (
    <section className="px-6 pt-10 pb-0">
      <div className="max-w-[var(--spacing-content)] mx-auto">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-tertiary block mb-3">
          Investigating
        </span>
        <p className="font-serif text-[clamp(1.2rem,2.8vw,1.6rem)] font-light leading-[1.35] text-text-secondary max-w-3xl">
          {question}
        </p>
        <div className="mt-6 border-t border-border/50" />
      </div>
    </section>
  );
}
