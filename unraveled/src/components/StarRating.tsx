'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';

interface Props {
  articleId: string; // the topic slug
}

interface RatingData {
  average: number | null;
  count: number;
  user_rating: number | null;
}

export function StarRating({ articleId }: Props) {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState<RatingData>({ average: null, count: 0, user_rating: null });
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchRatings = useCallback(async () => {
    const res = await fetch(`/api/ratings?article_id=${encodeURIComponent(articleId)}`);
    if (res.ok) setData(await res.json());
  }, [articleId]);

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings, user]); // re-fetch when auth state changes to get user_rating

  const submitRating = async (rating: number) => {
    if (!user || submitting) return;
    setSubmitting(true);

    // Optimistic update
    setData((prev) => ({ ...prev, user_rating: rating }));

    const res = await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId, rating }),
    });

    if (res.ok) {
      const updated = await res.json();
      setData(updated);
    } else {
      // Revert on error
      fetchRatings();
    }
    setSubmitting(false);
  };

  const displayRating = hovered ?? data.user_rating ?? 0;
  const isAuthenticated = !userLoading && !!user;

  return (
    <div className="flex flex-col items-center gap-3 py-8 border-t border-border">
      {/* Stars */}
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(null)}
        role={isAuthenticated ? 'radiogroup' : undefined}
        aria-label="Article rating"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= displayRating;
          return (
            <button
              key={star}
              type="button"
              disabled={!isAuthenticated || submitting}
              onClick={() => submitRating(star)}
              onMouseEnter={() => isAuthenticated && setHovered(star)}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              className={[
                'text-2xl transition-all duration-100 leading-none',
                isAuthenticated
                  ? 'cursor-pointer hover:scale-110'
                  : 'cursor-default',
                filled
                  ? 'text-gold'
                  : 'text-border',
              ].join(' ')}
              style={{ WebkitTextStroke: filled ? '0' : '1px currentColor' }}
            >
              {filled ? '★' : '☆'}
            </button>
          );
        })}
      </div>

      {/* Average + count */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-text-tertiary">
        {data.average !== null ? (
          <>
            <span className="text-text-secondary font-medium">{data.average.toFixed(1)}</span>
            <span>·</span>
            <span>{data.count.toLocaleString()} {data.count === 1 ? 'rating' : 'ratings'}</span>
          </>
        ) : (
          <span>No ratings yet</span>
        )}
        {data.user_rating && (
          <>
            <span>·</span>
            <span className="text-gold">You rated {data.user_rating}★</span>
          </>
        )}
      </div>

      {/* Auth prompt */}
      {!userLoading && !user && (
        <p className="font-mono text-[10px] text-text-tertiary">
          <a href="/login" className="text-gold hover:underline">Sign in</a>
          {' '}to rate this article
        </p>
      )}
    </div>
  );
}
