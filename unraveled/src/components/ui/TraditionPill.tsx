const TRADITION_COLORS: Record<string, { label: string; color: string }> = {
  biblical: { label: "Biblical", color: "var(--color-tradition-biblical)" },
  sumerian: { label: "Sumerian", color: "var(--color-tradition-sumerian)" },
  hindu: { label: "Hindu", color: "var(--color-tradition-hindu)" },
  greek: { label: "Greek", color: "var(--color-tradition-greek)" },
  mesoamerican: { label: "Mesoamerican", color: "var(--color-tradition-mesoamerican)" },
  egyptian: { label: "Egyptian", color: "var(--color-tradition-egyptian)" },
  norse: { label: "Norse", color: "var(--color-tradition-norse)" },
  chinese: { label: "Chinese", color: "var(--color-tradition-chinese)" },
};

export function TraditionPill({ id }: { id: string }) {
  const t = TRADITION_COLORS[id];
  if (!t) return null;
  return (
    <span
      className="inline-block font-mono text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm border mr-1.5 mb-1"
      style={{ borderColor: t.color, color: t.color }}
    >
      {t.label}
    </span>
  );
}
