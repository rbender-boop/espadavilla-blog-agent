-- golfvilla-blog-agent — durable job pipeline (0003)
-- Purely additive + idempotent. Decouples the weekly draft cron from the work:
-- the cron enqueues a row here; a polling worker advances ONE checkpointed step
-- per tick under a soft wall-clock budget, so no single invocation can time out.

create table if not exists blog_agent_jobs (
  id            uuid primary key default gen_random_uuid(),
  job_type      text not null default 'draft_weekly_post',
  status        text not null default 'queued',   -- queued|running|done|failed
  step          text not null default 'pick_topic',
    -- pick_topic|research|draft|enforce|guard|persist|notify|done
  topic_id      uuid references blog_topics(id),
  draft_id      uuid references blog_post_drafts(id),
  state         jsonb not null default '{}'::jsonb, -- checkpointed working data
  attempts      int  not null default 0,            -- consecutive failures of current step
  max_attempts  int  not null default 3,
  last_error    text,
  locked_at     timestamptz,                        -- worker lease (stale after lease window)
  run_id        uuid,                               -- link to blog_agent_runs (best-effort)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

-- Worker finds claimable work fast (active + not freshly locked).
create index if not exists blog_agent_jobs_active_idx
  on blog_agent_jobs (created_at) where status in ('queued', 'running');
create index if not exists blog_agent_jobs_type_status_idx
  on blog_agent_jobs (job_type, status);
