import React from 'react';

type StepStatus = 'complete' | 'running' | 'pending' | 'failed';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
}

interface ProgressStepperProps {
  steps: Step[];
  className?: string;
}

const STEP_STYLES: Record<StepStatus, { color: string; bg: string; symbol: string }> = {
  complete: { color: 'var(--status-complete)', bg: 'var(--status-complete-bg)', symbol: '✓' },
  running:  { color: 'var(--status-running)',  bg: 'var(--status-running-bg)',  symbol: '●' },
  pending:  { color: 'var(--color-text-tertiary)', bg: 'transparent',           symbol: '○' },
  failed:   { color: 'var(--status-failed)',   bg: 'var(--status-failed-bg)',   symbol: '✕' },
};

export function ProgressStepper({ steps, className = '' }: ProgressStepperProps) {
  return (
    <ol className={`flex flex-col gap-1 ${className}`}>
      {steps.map((step, i) => {
        const { color, bg, symbol } = STEP_STYLES[step.status];
        const isLast = i === steps.length - 1;
        return (
          <li key={step.id} className="flex items-start gap-3">
            {/* Connector column */}
            <div className="flex flex-col items-center">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: bg, border: `1px solid ${color}` }}
              >
                <span style={{ fontSize: '8px', color, fontFamily: 'var(--font-mono)' }}>{symbol}</span>
              </div>
              {!isLast && (
                <div className="w-px flex-1 mt-1" style={{ background: 'var(--color-border)', minHeight: '12px' }} />
              )}
            </div>
            {/* Label */}
            <p
              className="pt-0.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: step.status === 'pending' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
              }}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
