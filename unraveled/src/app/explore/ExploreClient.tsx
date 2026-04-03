'use client';

import dynamic from 'next/dynamic';

function GraphLoading() {
  return (
    <div className="flex-1 flex items-center justify-center bg-ground">
      <div className="font-mono text-xs tracking-[0.2em] uppercase text-text-tertiary animate-pulse">
        Building graph…
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <GraphExplorer />
    </div>
  );
}
