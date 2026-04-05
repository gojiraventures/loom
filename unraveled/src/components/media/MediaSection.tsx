'use client';

import { useState } from 'react';
import { MediaPlayer } from './MediaPlayer';

interface MediaItem {
  id: string;
  type: 'youtube' | 'podcast' | 'article' | 'reddit_thread' | 'documentary';
  title: string;
  description: string | null;
  url: string;
  embed_url: string | null;
  thumbnail_url: string | null;
  channel_name: string | null;
  channel_subscriber_count: number | null;
  view_count: number | null;
  duration_seconds: number | null;
  published_at: string | null;
  quality_score: number;
  is_anchor?: boolean;
  featured?: boolean;
}

interface MediaSectionProps {
  items: MediaItem[];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCount(n: number | null): string {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function MediaCard({ item, onExpand, expanded }: { item: MediaItem; onExpand: () => void; expanded: boolean }) {
  const typeLabel = item.type === 'youtube' ? 'Video' : item.type === 'podcast' ? 'Podcast' : item.type;
  const typeColor = item.type === 'youtube' ? 'text-red-400 border-red-400/30' : 'text-sky-400 border-sky-400/30';
  const isFeatured = item.featured || item.is_anchor;

  return (
    <div className={`border bg-ground-light/30 ${isFeatured ? 'border-gold/30' : 'border-border'}`}>
      <div className="flex gap-3 p-4">
        {/* Thumbnail / icon */}
        <div className="shrink-0 w-24 h-16 bg-ground border border-border/50 overflow-hidden rounded">
          {item.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail_url}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                el.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-text-tertiary text-2xl">${item.type === 'youtube' ? '▶' : '🎧'}</div>`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary text-2xl">
              {item.type === 'youtube' ? '▶' : '🎧'}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {isFeatured && (
                  <span className="font-mono text-[8px] uppercase tracking-widest border border-gold/50 text-gold bg-gold/10 px-1 py-0.5">
                    Featured
                  </span>
                )}
                <span className={`font-mono text-[8px] uppercase tracking-widest border px-1 py-0.5 ${typeColor}`}>
                  {typeLabel}
                </span>
                {item.duration_seconds && (
                  <span className="font-mono text-[8px] text-text-tertiary">{formatDuration(item.duration_seconds)}</span>
                )}
                {item.view_count && (
                  <span className="font-mono text-[8px] text-text-tertiary">{formatCount(item.view_count)} views</span>
                )}
              </div>
              <h3 className="text-sm text-text-primary leading-snug line-clamp-2">{item.title}</h3>
              {item.channel_name && (
                <p className="font-mono text-[9px] text-text-tertiary mt-0.5">
                  {item.channel_name}
                  {item.channel_subscriber_count ? ` · ${formatCount(item.channel_subscriber_count)} subscribers` : ''}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={onExpand}
                className="font-mono text-[8px] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1 rounded transition-colors whitespace-nowrap"
              >
                {expanded ? '▲ Hide' : '▶ Play'}
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[8px] uppercase tracking-widest border border-border text-text-tertiary hover:text-gold hover:border-gold/30 px-2 py-1 rounded transition-colors"
              >
                ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <MediaPlayer
            embedUrl={item.embed_url}
            watchUrl={item.url}
            title={item.title}
            type={item.type}
            thumbnailUrl={item.thumbnail_url ?? undefined}
          />
          {item.description && (
            <p className="text-xs text-text-tertiary mt-3 leading-relaxed line-clamp-3">{item.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MediaSection({ items }: MediaSectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'youtube' | 'podcast'>('all');

  // Sort: featured/anchors first, then by quality_score desc
  const sorted = [...items].sort((a, b) => {
    const aFeatured = (a.featured || a.is_anchor) ? 1 : 0;
    const bFeatured = (b.featured || b.is_anchor) ? 1 : 0;
    if (bFeatured !== aFeatured) return bFeatured - aFeatured;
    return (b.quality_score ?? 0) - (a.quality_score ?? 0);
  });

  const videos = sorted.filter((i) => i.type === 'youtube');
  const podcasts = sorted.filter((i) => i.type === 'podcast');
  const filtered = filter === 'all' ? sorted : sorted.filter((i) => i.type === filter);

  if (items.length === 0) return null;

  return (
    <section className="border-b border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 pt-12 pb-12">
        <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
          Watch & Listen
        </span>
        <h2 className="font-serif text-2xl sm:text-3xl mt-2 mb-2">
          Documentaries, Interviews & Podcasts
        </h2>
        <p className="text-text-secondary mb-6 max-w-xl text-sm">
          Curated videos and podcast episodes on this topic. Watch in-page or open on the platform.
        </p>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6">
          {([['all', `All (${items.length})`], ['youtube', `Video (${videos.length})`], ['podcast', `Podcast (${podcasts.length})`]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border rounded transition-colors ${
                filter === key ? 'border-gold/50 text-gold bg-gold/10' : 'border-border text-text-tertiary hover:border-gold/30'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-px">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              expanded={expanded === item.id}
              onExpand={() => setExpanded(expanded === item.id ? null : item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
