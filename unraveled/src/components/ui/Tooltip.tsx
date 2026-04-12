"use client";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  /** Applied to the outer wrapper span — use to preserve flex/grid layout */
  className?: string;
  position?: "top" | "top-right" | "bottom";
}

export function Tooltip({ content, children, className, position = "top" }: TooltipProps) {
  const posClass =
    position === "top"
      ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
      : position === "top-right"
      ? "bottom-full mb-2 right-0"
      : "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <span className={`relative group ${className ?? "inline-flex"}`}>
      {children}
      <span
        className={[
          "pointer-events-none absolute z-50 w-72 px-4 py-3",
          "bg-[#0e0e0e] border border-white/20",
          "shadow-[0_4px_24px_rgba(0,0,0,0.8)]",
          "font-mono text-[10px] tracking-[0.04em] leading-[1.8] text-white/85",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          posClass,
        ].join(" ")}
      >
        {content}
      </span>
    </span>
  );
}
