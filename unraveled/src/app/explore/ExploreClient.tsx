'use client';

import dynamic from 'next/dynamic';

function GraphLoading() {
  return (
    <div className="flex items-center justify-center h-screen bg-ground">
      <div className="font-mono text-xs tracking-[0.2em] uppercase text-text-tertiary animate-pulse">
        Loading graph…
      </div>
    </div>
  );
}

const GraphExplorer = dynamic(
  () => import('@/components/graph/GraphExplorer'),
  { ssr: false, loading: GraphLoading },
);

export function ExploreClient() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-ground">
      <GraphExplorer />
    </div>
  );
}
