-- espadavilla-blog-agent — enqueue race-safety guard (0008)
-- Purely additive + idempotent.
--
-- enqueueJob() in src/lib/jobs/job-store.ts relies on a unique partial index to
-- make enqueue idempotent: its SELECT-then-INSERT catches unique-violation 23505
-- when a concurrent fire (e.g. manual + scheduled, or a retry) races between the
-- SELECT and the INSERT, and returns the existing job instead of creating a
-- duplicate active job. Without this index that catch path is dead code and two
-- active jobs of the same type can be created, producing duplicate drafts.
--
-- This index was present in golfvilla-blog-agent but was omitted from the
-- espadavilla clone's 0003; added here to close the gap. Safe to run any time:
-- at most one active (queued|running) job per job_type is expected.
create unique index if not exists blog_agent_jobs_one_active_per_type_uidx
  on blog_agent_jobs (job_type) where status in ('queued', 'running');
