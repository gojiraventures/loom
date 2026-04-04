'use client';

import { useState } from 'react';
import { useRole } from '@/hooks/useRole';

interface Props {
  backlogId: string;
  initialCount: number;
  initialVoted: boolean;
}

export function VoteButton({ backlogId, initialCount, initialVoted }: Props) {
  const { role, loading } = useRole();
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [working, setWorking] = useState(false);

  if (loading) return null;

  const isPaid = role === 'paid' || role === 'admin';

  // Non-paid: show static count + upgrade nudge
  if (!isPaid) {
    return (
      <a
        href="/upgrade"
        title="Members can vote on research priority"
        className="flex items-center gap-1.5 font-mono text-[10px] text-text-tertiary hover:text-gold transition-colors group"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 group-hover:text-gold transition-colors">
          <path d="M6 1l1.5 3H11l-2.75 2 1 3L6 7.25 2.75 9l1-3L1 4h3.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
        <span>{count}</span>
      </a>
    );
  }

  const toggle = async () => {
    if (working) return;
    setWorking(true);
    // Optimistic update
    const nextVoted = !voted;
    setVoted(nextVoted);
    setCount((c) => c + (nextVoted ? 1 : -1));

    const res = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backlog_id: backlogId }),
    });

    if (!res.ok) {
      // Revert on failure
      setVoted(voted);
      setCount((c) => c + (nextVoted ? -1 : 1));
    }
    setWorking(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={working}
      title={voted ? 'Remove vote' : 'Vote to prioritize this research'}
      className={`flex items-center gap-1.5 font-mono text-[10px] transition-colors disabled:opacity-50 ${
        voted
          ? 'text-gold'
          : 'text-text-tertiary hover:text-gold'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
        <path
          d="M6 1l1.5 3H11l-2.75 2 1 3L6 7.25 2.75 9l1-3L1 4h3.5z"
          fill={voted ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span>{count}</span>
    </button>
  );
}
