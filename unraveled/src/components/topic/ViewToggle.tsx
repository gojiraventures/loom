import Link from 'next/link';

interface ViewToggleProps {
  slug: string;
  currentView: 'overview' | 'deep';
}

export function ViewToggle({ slug, currentView }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-px bg-black/30 rounded-sm p-0.5">
      <Link
        href={`/topics/${slug}`}
        className={`font-mono text-[8px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-colors ${
          currentView === 'overview'
            ? 'bg-gold text-black'
            : 'text-white/50 hover:text-white/75'
        }`}
      >
        Overview
      </Link>
      <Link
        href={`/topics/${slug}?view=deep`}
        className={`font-mono text-[8px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-sm transition-colors ${
          currentView === 'deep'
            ? 'bg-gold text-black'
            : 'text-white/50 hover:text-white/75'
        }`}
      >
        Deep Dive
      </Link>
    </div>
  );
}
