'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';

interface SearchHit {
  type: 'article' | 'person' | 'institution';
  slug: string;
  title: string;
  snippet: string | null;
  meta?: string | null;
}
interface SearchResponse {
  q: string;
  grouped: { articles: SearchHit[]; people: SearchHit[]; institutions: SearchHit[] };
  total: number;
}

const HREF: Record<SearchHit['type'], (slug: string) => string> = {
  article: (s) => `/topics/${s}`,
  person: (s) => `/people/${s}`,
  institution: (s) => `/institutions/${s}`,
};

function ResultGroup({ label, hits }: { label: string; hits: SearchHit[] }) {
  if (hits.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="font-mono text-[0.7rem] tracking-[0.12em] uppercase text-text-tertiary mb-3">
        {label} <span className="text-text-tertiary/60">({hits.length})</span>
      </h2>
      <div className="space-y-2">
        {hits.map((h) => (
          <Link
            key={`${h.type}-${h.slug}`}
            href={HREF[h.type](h.slug)}
            className="block border border-border rounded px-4 py-3 hover:border-gold/40 transition-colors"
          >
            <div className="text-text-primary font-medium leading-snug">{h.title}</div>
            {h.meta && <div className="font-mono text-[0.65rem] uppercase tracking-wider text-text-tertiary mt-0.5">{h.meta}</div>}
            {h.snippet && <div className="text-sm text-text-secondary mt-1 leading-snug">{h.snippet}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setData(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      setData(await res.json());
    } finally { setLoading(false); }
  }, []);

  // Run on initial load and whenever the URL query changes.
  useEffect(() => { run(initial); }, [initial, run]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(input.trim())}`);
    run(input);
  };

  return (
    <main className="max-w-[760px] mx-auto px-6 py-10">
      <h1 className="font-serif text-2xl mb-4">Search</h1>
      <form onSubmit={submit} className="mb-8">
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search articles, people, institutions…"
          className="w-full bg-ground border border-border rounded px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold/50"
        />
      </form>

      {loading && <p className="font-mono text-sm text-text-tertiary">Searching…</p>}

      {!loading && data && (
        data.total === 0 ? (
          <p className="text-text-secondary">No results for “{data.q}”.</p>
        ) : (
          <>
            <ResultGroup label="Articles" hits={data.grouped.articles} />
            <ResultGroup label="People" hits={data.grouped.people} />
            <ResultGroup label="Institutions" hits={data.grouped.institutions} />
          </>
        )
      )}

      {!loading && !data && initial.length < 2 && (
        <p className="text-text-secondary">Type at least two characters to search subjects, people, and institutions.</p>
      )}
    </main>
  );
}

export default function SearchPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <SearchInner />
      </Suspense>
    </>
  );
}
