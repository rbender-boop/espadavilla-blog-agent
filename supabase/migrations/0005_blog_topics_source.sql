-- Add a nullable provenance column to blog_topics so we can tag where a topic
-- came from (manual seed, a strategy doc, or — later — the auto topic generator).
-- Purely additive + idempotent: existing rows keep source = NULL; nothing on the
-- live drafting path reads this column yet. It sets up dedup/auto-topic phases.

alter table blog_topics add column if not exists source text;

comment on column blog_topics.source is
  'Provenance of the topic row: e.g. ''strategy-doc-2026-06-09'', ''auto-generator'', or NULL for original manual seed.';
