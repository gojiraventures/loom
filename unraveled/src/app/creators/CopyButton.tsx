'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`font-mono text-[10px] px-3 py-1 border transition-colors ${
        copied
          ? 'border-gold/40 text-gold'
          : 'border-border text-text-secondary hover:border-gold/40 hover:text-text-primary'
      }`}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
