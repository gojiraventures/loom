"use client";

export function ConvergenceScore({
  score,
  size = 48,
}: {
  score: number;
  size?: number;
}) {
  const r = size * 0.375;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score > 80 ? "var(--color-gold)" : score > 60 ? "var(--color-teal)" : "#7E8EA0";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="3"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.23}
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {score}
      </text>
    </svg>
  );
}
