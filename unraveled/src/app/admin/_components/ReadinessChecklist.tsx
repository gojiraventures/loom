import React from 'react';

type CheckStatus = 'pass' | 'fail' | 'pending';

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  note?: string;
}

interface ReadinessChecklistProps {
  items: CheckItem[];
  className?: string;
}

const CHECK_STYLES: Record<CheckStatus, { color: string; symbol: string }> = {
  pass:    { color: 'var(--status-complete)', symbol: '✓' },
  fail:    { color: 'var(--status-failed)',   symbol: '✕' },
  pending: { color: 'var(--color-text-tertiary)', symbol: '–' },
};

export function ReadinessChecklist({ items, className = '' }: ReadinessChecklistProps) {
  const passed  = items.filter((i) => i.status === 'pass').length;
  const total   = items.length;
  const allPass = passed === total;

  return (
    <div className={className}>
      {/* Summary */}
      <p
        className="mb-2"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: allPass ? 'var(--status-complete)' : 'var(--status-failed)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {allPass ? `Ready — ${passed}/${total} checks passed` : `${passed}/${total} checks passed`}
      </p>

      <ul className="space-y-1">
        {items.map((item) => {
          const { color, symbol } = CHECK_STYLES[item.status];
          return (
            <li key={item.id} className="flex items-baseline gap-2">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color, flexShrink: 0, width: '10px' }}>
                {symbol}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                {item.label}
                {item.note && (
                  <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '4px' }}>
                    — {item.note}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
