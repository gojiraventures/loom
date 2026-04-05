'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

interface Props {
  slug: string;
  title: string;
  /** 'top' = compact icon-only row; 'bottom' = icon + label */
  placement?: 'top' | 'bottom';
}

const BASE_URL = 'https://unraveledtruth.com';

// Map article themes/tags to relevant subreddits
const SUBREDDITS = [
  { label: 'r/history', sub: 'history' },
  { label: 'r/AncientCivilizations', sub: 'AncientCivilizations' },
  { label: 'r/mythology', sub: 'mythology' },
  { label: 'r/UnresolvedMysteries', sub: 'UnresolvedMysteries' },
  { label: 'r/AlternativeHistory', sub: 'AlternativeHistory' },
];

export function ShareButtons({ slug, title, placement = 'top' }: Props) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const [redditOpen, setRedditOpen] = useState(false);

  const url = `${BASE_URL}/topics/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const xUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=unraveledtruth`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  // Instagram has no web share URL — copy link so user can paste in app
  const copyForInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 2500);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isBottom = placement === 'bottom';

  const btnClass = `flex items-center gap-1.5 font-mono transition-colors ${
    isBottom
      ? 'text-[10px] tracking-widest uppercase text-text-secondary hover:text-gold px-3 py-2 border border-border hover:border-gold/40'
      : 'text-[9px] text-text-tertiary hover:text-text-secondary'
  }`;

  return (
    <div className={`flex items-center gap-${isBottom ? '2' : '3'} relative`}>
      {/* X / Twitter */}
      <a
        href={xUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on X"
        className={btnClass}
      >
        {/* X icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.738l7.727-8.835L1.254 2.25H8.08l4.262 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
        {isBottom && <span>Share on X</span>}
      </a>

      {/* Reddit — with subreddit dropdown */}
      <div className="relative">
        <button
          onClick={() => setRedditOpen((o) => !o)}
          title="Share on Reddit"
          className={btnClass}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
          {isBottom && <span>Reddit</span>}
          {isBottom && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="ml-0.5 opacity-50">
              <path d="M1 2l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {redditOpen && (
          <div
            className="absolute z-50 top-full mt-1 left-0 bg-ground border border-border shadow-lg min-w-[180px]"
            onMouseLeave={() => setRedditOpen(false)}
          >
            <p className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary px-3 py-2 border-b border-border">
              Post to subreddit
            </p>
            {SUBREDDITS.map(({ label, sub }) => (
              <a
                key={sub}
                href={`https://reddit.com/r/${sub}/submit?url=${encodedUrl}&title=${encodedTitle}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setRedditOpen(false)}
                className="block font-mono text-[10px] text-text-secondary hover:text-gold hover:bg-ground-light/30 px-3 py-2 transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Facebook */}
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on Facebook"
        className={btnClass}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        {isBottom && <span>Facebook</span>}
      </a>

      {/* Instagram — copies link since IG has no web share URL */}
      <button
        onClick={copyForInstagram}
        title={igCopied ? 'Link copied — paste in Instagram' : 'Copy link for Instagram'}
        className={`${btnClass} ${igCopied ? (isBottom ? 'border-teal/40 text-teal' : 'text-teal') : ''}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
        {isBottom && <span>{igCopied ? 'Paste in Instagram' : 'Instagram'}</span>}
      </button>

      {/* LinkedIn */}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Share on LinkedIn"
        className={btnClass}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        {isBottom && <span>LinkedIn</span>}
      </a>

      {/* Copy Link */}
      <button
        onClick={copyLink}
        title={copied ? 'Copied!' : 'Copy link'}
        className={`${btnClass} ${copied ? (isBottom ? 'border-teal/40 text-teal' : 'text-teal') : ''}`}
      >
        {copied ? (
          <Check size={12} className="shrink-0" />
        ) : (
          <Link2 size={12} className="shrink-0" />
        )}
        {isBottom && <span>{copied ? 'Copied!' : 'Copy link'}</span>}
      </button>
    </div>
  );
}
