-- golfvilla-blog-agent — initial schema
-- DEDICATED blog Supabase project. All tables blog_*-prefixed. Purely additive.
-- Safe to re-run: every statement is IF NOT EXISTS / idempotent.

-- blog_topics ────────────────────────────────────────────────────────────────
create table if not exists blog_topics (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null,
  cluster               text,            -- evergreen|tournament|tourism|luxury_trend|comparison|seasonal|planning
  status                text not null default 'queued',  -- queued|drafting|published|retired
  priority              int  not null default 100,       -- lower = sooner
  target_internal_links text[] not null default '{}',    -- money pages this post should link to
  primary_keyword       text,
  secondary_keywords    text[] not null default '{}',
  geo_questions         text[] not null default '{}',
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists blog_topics_status_priority_idx on blog_topics (status, priority);

-- blog_post_drafts ─────────────────────────────────────────────────────────────
create table if not exists blog_post_drafts (
  id                uuid primary key default gen_random_uuid(),
  topic_id          uuid references blog_topics(id),
  status            text not null default 'pending',
    -- pending|sent_for_approval|pending_edit_confirmation|approved|published|skipped|failed|expired
  meta_title        text,             -- <= 60 chars (enforced in app)
  meta_description  text,             -- <= 155 chars (enforced in app)
  slug              text,             -- extensionless URL segment, e.g. 'cap-cana-vs-casa-de-campo'
  h1                text,
  body_html         text,             -- rendered article body (H2s, paragraphs, FAQ)
  body_markdown     text,             -- pre-render source (re-render on edit)
  faq               jsonb,            -- [{q,a}, ...]
  social_captions   jsonb,            -- 5 captions
  hashtags          text[] not null default '{}',
  word_count        int,
  internal_links    jsonb,            -- [{anchor,url}, ...] actually used
  sources           jsonb,            -- web_search citations for timely facts
  edited_content    text,             -- Rob's pasted edit, if any
  risk_score        numeric,          -- fabrication-guard flag (1.0 = flagged)
  block_reason      text,
  committed_path    text,             -- repo path of the published file
  live_url          text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists blog_post_drafts_status_idx on blog_post_drafts (status);
create index if not exists blog_post_drafts_topic_idx on blog_post_drafts (topic_id);
-- One published file per repo path (idempotent publish guard at the DB layer).
create unique index if not exists blog_post_drafts_committed_path_uidx
  on blog_post_drafts (committed_path) where committed_path is not null;

-- blog_approval_messages ───────────────────────────────────────────────────────
create table if not exists blog_approval_messages (
  id                   uuid primary key default gen_random_uuid(),
  draft_id             uuid references blog_post_drafts(id),
  draft_type           text not null default 'post',     -- post (room for future kinds)
  channel              text not null default 'whatsapp',
  unipile_chat_id      text,
  unipile_message_id   text,
  sent_text            text,
  sent_at              timestamptz,
  response_text        text,
  response_received_at timestamptz,
  resolution           text,          -- approved|edited|skipped|expired|error
  resolved_at          timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists blog_approval_messages_unresolved_idx
  on blog_approval_messages (sent_at desc) where resolution is null;
create index if not exists blog_approval_messages_chat_idx on blog_approval_messages (unipile_chat_id);

-- blog_voice_memories ──────────────────────────────────────────────────────────
-- Edit-derived learnings, injected into the drafter prompt over time (Phase 6).
create table if not exists blog_voice_memories (
  id           uuid primary key default gen_random_uuid(),
  scope        text not null default 'post',
  memory_text  text not null,
  weight       numeric not null default 1.0,
  is_active    boolean not null default true,
  approved     boolean not null default true,
  source_type  text,
  created_at   timestamptz not null default now()
);
create index if not exists blog_voice_memories_active_idx
  on blog_voice_memories (is_active, approved, weight desc);

-- blog_agent_runs ──────────────────────────────────────────────────────────────
create table if not exists blog_agent_runs (
  id                 uuid primary key default gen_random_uuid(),
  run_type           text,
  status             text,            -- running|success|partial|failure
  items_created      int  not null default 0,
  items_processed    int  not null default 0,
  error_message      text,
  error_notified_at  timestamptz,
  metadata           jsonb,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index if not exists blog_agent_runs_failure_idx
  on blog_agent_runs (started_at desc) where status = 'failure';
