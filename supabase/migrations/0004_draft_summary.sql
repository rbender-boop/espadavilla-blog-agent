-- golfvilla-blog-agent — add answer-first summary to drafts (0004)
-- Additive + idempotent. Feeds the rendered answer-first lead block and the
-- BlogPosting "abstract" JSON-LD (GEO). Nullable so existing rows are unaffected.
alter table blog_post_drafts add column if not exists summary text;
