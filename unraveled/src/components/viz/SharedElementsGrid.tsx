'use client';

interface SharedElement {
  element: string;
  traditions: Record<string, boolean>;
}

export function SharedElementsGrid({ matrix }: { matrix: SharedElement[] }) {
  // Collect all traditions that appear in the matrix
  const allTraditions = [...new Set(matrix.flatMap(row => Object.keys(row.traditions)))];

  // Score traditions by how many elements they have
  const traditionScores = allTraditions.reduce<Record<string, number>>((acc, t) => {
    acc[t] = matrix.filter(row => row.traditions[t]).length;
    return acc;
  }, {});

  // Sort traditions by score descending, cap at 12 for readability
  const traditions = allTraditions
    .sort((a, b) => (traditionScores[b] ?? 0) - (traditionScores[a] ?? 0))
    .slice(0, 12);

  // Sort elements by how many traditions have them
  const elements = [...matrix]
    .sort((a, b) => {
      const aCount = traditions.filter(t => a.traditions[t]).length;
      const bCount = traditions.filter(t => b.traditions[t]).length;
      return bCount - aCount;
    });

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse" style={{ minWidth: Math.max(600, traditions.length * 72 + 240) }}>
        <thead>
          <tr>
            <th className="text-left py-3 pr-4 font-mono text-[9px] tracking-[0.2em] uppercase text-text-tertiary font-normal" style={{ minWidth: 220 }}>
              Structural Element
            </th>
            {traditions.map(t => (
              <th key={t} className="py-2 px-1 font-mono font-normal" style={{ width: 64 }}>
                <div
                  className="text-[8px] tracking-wider uppercase text-text-tertiary"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    whiteSpace: 'nowrap',
                    height: 88,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {t.split(' ')[0]}
                </div>
              </th>
            ))}
            <th className="py-2 px-3 font-mono text-[9px] tracking-wider uppercase text-text-tertiary font-normal text-right">
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {elements.map((row, i) => {
            const count = traditions.filter(t => row.traditions[t]).length;
            const pct = count / traditions.length;

            return (
              <tr
                key={row.element}
                className="border-t border-border/40 hover:bg-ground-light/30 transition-colors"
              >
                <td className="py-2.5 pr-4 text-sm text-text-secondary">
                  <span className="font-mono text-[9px] text-text-tertiary mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {row.element}
                </td>
                {traditions.map(t => {
                  const present = row.traditions[t] ?? false;
                  return (
                    <td key={t} className="py-2.5 px-1 text-center">
                      {present ? (
                        <span
                          className="inline-block w-4 h-4 rounded-sm"
                          style={{
                            background: `rgba(200,149,108,${0.3 + pct * 0.5})`,
                            border: '1px solid rgba(200,149,108,0.4)',
                          }}
                          title={t}
                        />
                      ) : (
                        <span
                          className="inline-block w-4 h-4 rounded-sm"
                          style={{ background: 'rgba(255,255,255,0.03)' }}
                        />
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 pl-3 text-right">
                  <span className="font-mono text-xs" style={{ color: `rgba(200,149,108,${0.4 + pct * 0.6})` }}>
                    {count}/{traditions.length}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
