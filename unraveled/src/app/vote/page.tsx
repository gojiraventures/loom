import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VoteButton } from '@/components/VoteButton';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createSessionSupabaseClient } from '@/lib/supabase-session';

interface BacklogItem {
  id: string;
  title: string;
  topic: string;
  theme: string | null;
  angle: string | null;
}

interface VoteRow {
  backlog_id: string;
}

export const revalidate = 60; // re-fetch vote counts every minute

export default async function VotePage() {
  const admin = createServerSupabaseClient();

  // Fetch all pending backlog items
  const { data: items } = await admin
    .from('research_backlog')
    .select('id, title, topic, theme, angle')
    .eq('status', 'pending')
    .order('theme', { ascending: true })
    .order('title', { ascending: true });

  const backlogItems = (items ?? []) as BacklogItem[];
  const ids = backlogItems.map((i) => i.id);

  // Vote counts
  const { data: voteCounts } = await admin
    .from('topic_votes')
    .select('backlog_id')
    .in('backlog_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);

  const countMap: Record<string, number> = {};
  for (const row of (voteCounts ?? []) as VoteRow[]) {
    countMap[row.backlog_id] = (countMap[row.backlog_id] ?? 0) + 1;
  }

  // Current user's votes
  let userVotedSet = new Set<string>();
  try {
    const session = await createSessionSupabaseClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const { data: myVotes } = await session
        .from('topic_votes')
        .select('backlog_id')
        .in('backlog_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      userVotedSet = new Set((myVotes ?? []).map((r: VoteRow) => r.backlog_id));
    }
  } catch {
    // unauthenticated — no user votes
  }

  // Sort each item by vote count desc, group by theme
  const sorted = [...backlogItems].sort(
    (a, b) => (countMap[b.id] ?? 0) - (countMap[a.id] ?? 0),
  );

  const groups: Record<string, BacklogItem[]> = {};
  for (const item of sorted) {
    const theme = item.theme ?? 'Other';
    if (!groups[theme]) groups[theme] = [];
    groups[theme].push(item);
  }

  const totalVotes = Object.values(countMap).reduce((s, n) => s + n, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-[var(--spacing-content)] mx-auto px-6 py-16 w-full">

        {/* Page header */}
        <div className="mb-12">
          <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-text-tertiary">
            Research Queue
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl mt-2 mb-4">
            What should we research next?
          </h1>
          <p className="text-text-secondary leading-relaxed max-w-2xl text-sm">
            Members vote to prioritize which topics enter the research pipeline. The highest-voted
            topics are scheduled first. Star a topic to cast your vote — one per topic.
          </p>
          <div className="flex items-center gap-6 mt-5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
              {backlogItems.length} topics pending
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
              {totalVotes} total votes
            </span>
          </div>
        </div>

        {/* Groups */}
        <div className="space-y-12">
          {Object.entries(groups).map(([theme, items]) => (
            <div key={theme}>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-gold">
                  {theme}
                </span>
                <div className="flex-1 border-t border-border/40" />
                <span className="font-mono text-[8px] text-text-tertiary">{items.length}</span>
              </div>

              <div className="space-y-px">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 py-4 px-4 border border-border bg-ground-light/10 hover:bg-ground-light/30 transition-colors"
                  >
                    {/* Vote button */}
                    <div className="shrink-0 pt-0.5 w-10 flex flex-col items-center gap-0.5">
                      <VoteButton
                        backlogId={item.id}
                        initialCount={countMap[item.id] ?? 0}
                        initialVoted={userVotedSet.has(item.id)}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-base leading-snug mb-1">{item.title}</h3>
                      {item.angle && (
                        <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">
                          {item.angle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Non-member nudge at bottom */}
        <div className="mt-16 border-t border-border/40 pt-8 text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-text-tertiary mb-3">
            Members only
          </p>
          <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed mb-5">
            Voting is available to paid members. Free accounts can browse the queue but not cast votes.
          </p>
          <a
            href="/upgrade"
            className="font-mono text-[11px] uppercase tracking-widest bg-gold/10 border border-gold/40 text-gold px-6 py-2.5 hover:bg-gold/20 transition-colors"
          >
            Become a member →
          </a>
        </div>

      </main>
      <Footer />
    </div>
  );
}
