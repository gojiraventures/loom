'use client';

import { useState, useMemo } from 'react';
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

type SortOption = 'score' | 'newest' | 'oldest' | 'az';

const SORT_LABELS: Record<SortOption, string> = {
  score: 'Highest Score',
  newest: 'Newest',
  oldest: 'Oldest',
  az: 'A → Z',
};

export function TopicsGrid({ topics }: TopicsGridProps) {
  const [activeTradition, setActiveTradition] = useState<string>('All');
  const [sort, setSort] = useState<SortOption>('score');

  const allTraditions = Array.from(
    new Set(topics.flatMap((t) => t.key_traditions))
  ).sort();

  const pills = ['All', ...allTraditions];

  const sorted = useMemo(() => {
    const list = [...topics];
    switch (sort) {
      case 'score':
        return list.sort((a, b) => b.convergence_score - a.convergence_score);
      case 'newest':
        return list.sort((a, b) =>
          new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime()
        );
      case 'oldest':
        return list.sort((a, b) =>
          new Date(a.published_at ?? 0).getTime() - new Date(b.published_at ?? 0).getTime()
        );
      case 'az':
        return list.sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [topics, sort]);

  const filtered =
    activeTradition === 'All'
      ? sorted
      : sorted.filter((t) => t.key_traditions.includes(activeTradition));

  return (
    <div>
      {/* Sort + filter controls */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mr-1">Sort:</span>
          {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={[
                'font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded border transition-colors',
                sort === opt
                  ? 'border-gold/60 bg-gold/10 text-gold'
                  : 'border-border text-text-tertiary hover:border-gold/30 hover:text-text-secondary',
              ].join(' ')}
            >
              {SORT_LABELS[opt]}
            </button>
          ))}
        </div>

        {allTraditions.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mr-1">Filter:</span>
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
      </div>

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
