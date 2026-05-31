import React from 'react';

type NoticeKind = 'info' | 'success' | 'warning' | 'error';

interface InlineNoticeProps {
  kind?: NoticeKind;
  message: string;
  className?: string;
}

const KIND_STYLES: Record<NoticeKind, { color: string; bg: string; prefix: string }> = {
  info:    { color: 'var(--status-pending)',  bg: 'var(--status-pending-bg)',  prefix: 'ℹ' },
  success: { color: 'var(--status-complete)', bg: 'var(--status-complete-bg)', prefix: '✓' },
  warning: { color: 'var(--status-running)',  bg: 'var(--status-running-bg)',  prefix: '!' },
  error:   { color: 'var(--status-failed)',   bg: 'var(--status-failed-bg)',   prefix: '✕' },
};

export function InlineNotice({ kind = 'info', message, className = '' }: InlineNoticeProps) {
  const { color, bg, prefix } = KIND_STYLES[kind];
  return (
    <div
      className={`rounded px-3 py-2 flex items-start gap-2 ${className}`}
      style={{ background: bg, border: `1px solid ${color}` }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, flexShrink: 0, marginTop: '1px' }}>
        {prefix}
      </span>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color, lineHeight: 1.5 }}>
        {message}
      </p>
    </div>
  );
}
