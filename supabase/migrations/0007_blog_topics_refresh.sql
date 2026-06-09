-- Phase 4: refresh/decay loop — additive schema additions.
-- Purely additive + idempotent.

-- blog_topics: track which original published draft a refresh topic targets.
alter table blog_topics
  add column if not exists refreshes_draft_id uuid references blog_post_drafts(id);

comment on column blog_topics.refreshes_draft_id is
  'If source=''refresh-generator'', the blog_post_drafts.id of the published post this topic is refreshing.';

-- blog_post_drafts: snapshot latest GSC performance so decay trajectory is
-- visible in the DB without querying the GSC API each time.
alter table blog_post_drafts
  add column if not exists gsc_impressions_28d  int,
  add column if not exists gsc_clicks_28d       int,
  add column if not exists gsc_position_28d     numeric,
  add column if not exists gsc_checked_at       timestamptz;

comment on column blog_post_drafts.gsc_impressions_28d is 'Impressions in last 28d (updated by post-refresh cron).';
comment on column blog_post_drafts.gsc_clicks_28d      is 'Clicks in last 28d (updated by post-refresh cron).';
comment on column blog_post_drafts.gsc_position_28d    is 'Average position in last 28d, lower = better (updated by post-refresh cron).';
comment on column blog_post_drafts.gsc_checked_at      is 'Timestamp of the last GSC performance check for this draft.';

-- Index for the refresh generator: quickly find pending/active refresh topics.
create index if not exists blog_topics_refreshes_draft_idx
  on blog_topics (refreshes_draft_id)
  where refreshes_draft_id is not null;
