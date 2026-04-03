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
    // h-14 = 56px header. Explicit height so flex children resolve h-full correctly.
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      <GraphExplorer />
    </div>
  );
}
