'use client';

import { useState } from 'react';

interface MediaPlayerProps {
  embedUrl: string | null;
  watchUrl: string;
  title: string;
  type: 'youtube' | 'podcast' | 'article' | 'reddit_thread' | 'documentary';
  thumbnailUrl?: string;
}

export function MediaPlayer({ embedUrl, watchUrl, title, type, thumbnailUrl }: MediaPlayerProps) {
  const [playing, setPlaying] = useState(false);

  if (!embedUrl) {
    return (
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-gold border border-gold/30 px-3 py-1.5 hover:bg-gold/10 transition-colors rounded"
      >
        Open {type === 'podcast' ? 'Episode' : 'Link'} →
      </a>
    );
  }

  if (!playing) {
    return (
      <div className="relative group cursor-pointer" onClick={() => setPlaying(true)}>
        {/* Thumbnail */}
        <div className="relative aspect-video bg-ground-light border border-border overflow-hidden">
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/70 border border-white/20 flex items-center justify-center group-hover:bg-black/90 transition-colors">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
          {type === 'youtube' && (
            <div className="absolute bottom-2 right-2">
              <svg className="w-8 h-8" viewBox="0 0 90 20" fill="none">
                <rect width="90" height="20" rx="4" fill="#FF0000" />
                <text x="6" y="14" fill="white" fontSize="10" fontFamily="sans-serif" fontWeight="bold">YouTube</text>
              </svg>
            </div>
          )}
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mt-1 text-center">
          Click to play in-page
        </p>
      </div>
    );
  }

  // Podcast embed — Spotify or Listen Notes
  if (type === 'podcast') {
    const isSpotify = embedUrl.includes('open.spotify.com');
    return (
      <div className="space-y-2">
        <iframe
          src={embedUrl}
          height={isSpotify ? 232 : 180}
          width="100%"
          style={{ border: 'none', borderRadius: isSpotify ? 12 : 0 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={title}
        />
        <div className="flex justify-end">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] uppercase tracking-widest text-gold/60 hover:text-gold transition-colors"
          >
            Open in app →
          </a>
        </div>
      </div>
    );
  }

  // YouTube embed
  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-black border border-border overflow-hidden">
        <iframe
          src={`${embedUrl}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPlaying(false)}
          className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors"
        >
          ✕ Close player
        </button>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[9px] uppercase tracking-widest text-gold/60 hover:text-gold transition-colors"
        >
          Watch on YouTube →
        </a>
      </div>
    </div>
  );
}
