import React from 'react';

export type StatusKind =
  | 'complete'
  | 'running'
  | 'failed'
  | 'pending'
  | 'queued'
  | 'approval'
  | 'draft'
  | 'published'
  | 'needs_review'
  | 'researched'
  | 'synthesizing'
  | 'debating'
  | 'converging'
  | 'cross_validating'
  | 'researching';

/** Map any raw status string to one of the semantic kinds above. */
function resolveKind(status: string): StatusKind {
  switch (status) {
    case 'complete':
    case 'published':
      return 'complete';
    case 'running':
    case 'researching':
    case 'cross_validating':
    case 'converging':
    case 'debating':
    case 'synthesizing':
      return 'running';
    case 'failed':
      return 'failed';
    case 'awaiting_approval':
    case 'needs_review':
      return 'approval';
    case 'queued':
    case 'pending':
      return 'pending';
    case 'draft':
      return 'draft';
    case 'researched':
      return 'researched';
    default:
      return 'pending';
  }
}

const KIND_STYLES: Record<StatusKind, { color: string; bg: string; label?: string }> = {
  complete:      { color: 'var(--status-complete)',  bg: 'var(--status-complete-bg)' },
  running:       { color: 'var(--status-running)',   bg: 'var(--status-running-bg)' },
  failed:        { color: 'var(--status-failed)',    bg: 'var(--status-failed-bg)' },
  pending:       { color: 'var(--status-pending)',   bg: 'var(--status-pending-bg)' },
  queued:        { color: 'var(--status-pending)',   bg: 'var(--status-pending-bg)' },
  approval:      { color: 'var(--status-approval)',  bg: 'var(--status-approval-bg)', label: 'Needs Approval' },
  draft:         { color: 'var(--status-pending)',   bg: 'var(--status-pending-bg)' },
  published:     { color: 'var(--status-complete)',  bg: 'var(--status-complete-bg)' },
  needs_review:  { color: 'var(--status-approval)',  bg: 'var(--status-approval-bg)', label: 'Needs Review' },
  researched:    { color: 'var(--status-running)',   bg: 'var(--status-running-bg)',  label: 'Researched' },
  synthesizing:  { color: 'var(--status-running)',   bg: 'var(--status-running-bg)',  label: 'Synthesizing' },
  debating:      { color: 'var(--status-running)',   bg: 'var(--status-running-bg)',  label: 'Debating' },
  converging:    { color: 'var(--status-running)',   bg: 'var(--status-running-bg)',  label: 'Converging' },
  cross_validating: { color: 'var(--status-running)', bg: 'var(--status-running-bg)', label: 'Validating' },
  researching:      { color: 'var(--status-running)', bg: 'var(--status-running-bg)', label: 'Researching' },
};

interface StatusBadgeProps {
  status: string;
  /** Override the display label */
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const kind = resolveKind(status);
  const { color, bg, label: defaultLabel } = KIND_STYLES[kind];
  const text = label ?? defaultLabel ?? status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center font-mono uppercase tracking-widest rounded px-1.5 py-px ${className}`}
      style={{
        fontSize: '8px',
        color,
        background: bg,
        border: `1px solid ${color}`,
        opacity: 0.9,
      }}
    >
      {kind === 'running' && (
        <span className="mr-1" style={{ fontSize: '6px' }}>●</span>
      )}
      {text}
    </span>
  );
}
