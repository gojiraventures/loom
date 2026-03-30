'use client';

import { useState } from 'react';
import { ConvergenceCard } from '@/components/ConvergenceCard';

interface Topic {
  slug: string;
  topic: string;
  title: string;
  convergence_score: number;
  key_traditions: string[];
  summary: string | null;
  published_at: string | null;
}

interface TopicsGridProps {
  topics: Topic[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isNew(published_at: string | null): boolean {
  if (!published_at) return false;
  return Date.now() - new Date(published_at).getTime() < THIRTY_DAYS_MS;
}

export function TopicsGrid({ topics }: TopicsGridProps) {
  const [activeTradition, setActiveTradition] = useState<string>('All');

  // Collect unique traditions across all topics
  const allTraditions = Array.from(
    new Set(topics.flatMap((t) => t.key_traditions))
  ).sort();

  const pills = ['All', ...allTraditions];

  const filtered =
    activeTradition === 'All'
      ? topics
      : topics.filter((t) => t.key_traditions.includes(activeTradition));

  return (
    <div>
      {/* Filter pills */}
      {allTraditions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {pills.map((pill) => (
            <button
              key={pill}
              onClick={() => setActiveTradition(pill)}
              className={[
                'font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded border transition-colors',
                activeTradition === pill
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-border text-text-tertiary hover:border-gold/30 hover:text-text-secondary',
              ].join(' ')}
            >
              {pill}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-text-tertiary text-sm font-mono">
          No topics match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px">
          {filtered.map((topic, i) => (
            <div key={topic.slug} className="relative">
              {isNew(topic.published_at) && (
                <span className="absolute top-4 right-4 z-10 font-mono text-[8px] tracking-[0.2em] uppercase px-2 py-0.5 bg-gold/15 text-gold border border-gold/30 rounded">
                  New
                </span>
              )}
              <ConvergenceCard
                index={i}
                title={topic.title}
                score={topic.convergence_score}
                traditions={topic.key_traditions}
                jawDrop={topic.summary ?? ''}
                href={`/topics/${topic.slug}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
