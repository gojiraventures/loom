'use client';

import { useState } from 'react';
import { useRole } from '@/hooks/useRole';

const CATEGORIES = [
  { value: 'factual_inaccuracy',    label: 'Factual inaccuracy' },
  { value: 'missing_source',        label: 'Missing source' },
  { value: 'outdated_information',  label: 'Outdated information' },
  { value: 'missing_context',       label: 'Missing context' },
  { value: 'other',                 label: 'Other' },
];

interface Props {
  articleId: string;
  articleTitle: string;
}

type FormState = 'idle' | 'submitting' | 'done' | 'error';

export function FeedbackForm({ articleId, articleTitle }: Props) {
  const { role, loading } = useRole();
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const canSubmit = ['registered', 'paid', 'admin'].includes(role);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFormState('submitting');

    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: articleId, article_title: articleTitle, category, content, source_url: sourceUrl }),
    });

    if (res.ok) {
      setFormState('done');
    } else {
      const json = await res.json().catch(() => ({}));
      setError((json as { error?: string }).error ?? 'Submission failed. Please try again.');
      setFormState('error');
    }
  };

  if (loading) return null;

  return (
    <section className="border-t border-border">
      <div className="max-w-[var(--spacing-content)] mx-auto px-6 py-8">

        {!open ? (
          <button
            onClick={() => canSubmit ? setOpen(true) : null}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-tertiary hover:text-text-secondary transition-colors group"
          >
            <span className="text-base leading-none group-hover:text-gold transition-colors">⚑</span>
            <span>Flag an issue with this research</span>
            {!canSubmit && !loading && (
              <a href="/login" className="text-gold hover:underline ml-1">(sign in)</a>
            )}
          </button>
        ) : formState === 'done' ? (
          <div className="border border-border bg-ground-light/40 px-6 py-8 max-w-xl">
            <p className="font-serif text-base mb-2">Feedback received.</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              Every submission is reviewed by a real person. We don't respond to every message
              but we read all of them, and your feedback directly shapes how we update and expand our research.
            </p>
          </div>
        ) : (
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
                Flag an issue
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="font-mono text-[9px] text-text-tertiary hover:text-text-primary transition-colors"
              >
                cancel
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                  Type of issue
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors appearance-none"
                >
                  <option value="" disabled>Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                  What specifically and where?
                </label>
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Describe the specific claim, section, or passage and what's wrong with it."
                  className="w-full bg-ground-light border border-border px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors resize-none"
                />
                <p className="font-mono text-[9px] text-text-tertiary mt-1 text-right">
                  {content.length}/2000
                </p>
              </div>

              {/* Source URL (optional) */}
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-text-tertiary mb-1.5">
                  Link to a source <span className="normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full bg-ground-light border border-border px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>

              {error && (
                <p className="font-mono text-[10px] text-red-400 border border-red-400/20 bg-red-400/5 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={formState === 'submitting'}
                className="font-mono text-[11px] uppercase tracking-widest border border-border text-text-secondary px-6 py-2.5 hover:border-gold/40 hover:text-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formState === 'submitting' ? 'Submitting…' : 'Submit feedback'}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
