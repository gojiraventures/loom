-- Citation Review Queue
-- Stores findings blocked by the citation gate (unresolvable tier-1/2 sources).
-- Admin reviews these in the Content Health tab before they can be re-admitted.

create table if not exists citation_review_queue (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null,
  agent_id          text not null,
  claim_text        text not null,
  citation_raw      text not null,
  citation_type     text not null check (citation_type in ('doi', 'url', 'journal', 'book', 'canonical')),
  resolution_status text not null check (resolution_status in ('unresolvable', 'needs_human', 'paywall_suspected', 'resolved')),
  resolved_title    text,
  similarity_score  numeric(4,3),
  error_detail      text,
  reviewed          boolean not null default false,
  reviewer_note     text,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- Index for admin UI queries
create index if not exists citation_review_queue_unreviewed
  on citation_review_queue (reviewed, created_at desc);

create index if not exists citation_review_queue_session
  on citation_review_queue (session_id);

-- RLS: only service role can write; admins can read/update via service role client
alter table citation_review_queue enable row level security;

create policy "service role full access"
  on citation_review_queue
  using (true)
  with check (true);
