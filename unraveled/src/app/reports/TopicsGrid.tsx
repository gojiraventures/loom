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
  heroImageUrl: string | null;
  heroPosition: string;
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
  const [sort, setSort] = useState<SortOption>('score');

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

  return (
    <div>
      {/* Sort — compact, right-aligned */}
      <div className="flex items-center justify-end gap-1.5 mb-5">
        <span className="font-mono text-[8px] uppercase tracking-widest text-text-tertiary mr-1">Sort:</span>
        {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
          <button
            key={opt}
            onClick={() => setSort(opt)}
            className={[
              'font-mono text-[8px] tracking-[0.12em] uppercase px-2.5 py-1 border transition-colors',
              sort === opt
                ? 'border-gold/50 text-gold'
                : 'border-border text-text-tertiary hover:text-text-secondary',
            ].join(' ')}
          >
            {SORT_LABELS[opt]}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 text-center text-text-tertiary text-sm font-mono">No reports published yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px border border-border">
          {sorted.map((topic, i) => (
            <ConvergenceCard
              key={topic.slug}
              index={i}
              title={topic.title}
              score={topic.convergence_score}
              traditions={topic.key_traditions}
              jawDrop={topic.summary ?? ''}
              href={`/topics/${topic.slug}`}
              heroImageUrl={topic.heroImageUrl}
              heroPosition={topic.heroPosition}
              isNew={isNew(topic.published_at)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
