-- Research Queue
-- Topics queued for fully-automated end-to-end research.
-- Cron picks the oldest queued item, runs all 5 phases, marks it complete.

create table if not exists research_queue (
  id                 uuid primary key default gen_random_uuid(),
  topic              text not null,
  title              text not null,
  research_questions text[] not null default '{}',
  description        text,
  source_urls        text,
  status             text not null default 'queued'
    check (status in ('queued', 'running', 'complete', 'failed')),
  session_id         uuid,
  error_detail       text,
  priority           integer not null default 50,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  completed_at       timestamptz
);

create index if not exists research_queue_status_idx
  on research_queue (status, priority asc, created_at asc);

alter table research_queue enable row level security;

create policy "service role full access"
  on research_queue
  using (true)
  with check (true);
