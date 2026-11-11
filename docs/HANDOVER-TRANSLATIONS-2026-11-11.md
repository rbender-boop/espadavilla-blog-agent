# Handover — blog translations (es / fr / de / pt), 2026-11-11

Rob's decision: every published blog post on espadavilla.com and golfvilla.com, old and new, also publishes in
Latin American Spanish (es-419), French (fr-FR), German (de-DE) and Brazilian Portuguese (pt-BR).
Translations auto-publish (no per-translation review). Scope: DB posts only (not legacy static posts).

## Step 1 — DB (DONE, both projects, migration `blog_post_translations`)
- Table `blog_post_translations` (one row per draft + lang), RLS on, service_role only.
- Trigger `trg_blog_drafts_translations_stale`: English content edit → its translations go `stale` (re-translated).
- View `v_translation_status`: per published post, published / stale / blocked counts.
- Status flow: pending → translating → approved (passed checks) → published; or fact_check_failed / failed.

## Step 2 — translate step (DONE in code, both blog-agent repos)
- `src/lib/i18n/languages.ts` — the 4 languages.
- `src/lib/i18n/translation-check.ts` — gate vs the English source: every number ≥13 kept and none added,
  protected names verbatim, every link kept, same FAQ count and heading count, length ratio 0.75–1.6.
- `src/lib/i18n/translate.ts` — model call (MODEL from generate-post, streaming, tool_choice auto).
- `src/app/api/cron/translate-published/route.ts` — 2 pairs per run, every 10 min. Kill switch: TRANSLATE_POSTS=false.
- `scripts/translate-local.ts`, `scripts/verify-translation-check.ts` (offline tests pass).
- Backfill = the cron itself: ~148 pairs at 12/hour ≈ 12–13 hours per site.
- NOTE: `.env.local` ANTHROPIC_API_KEY (June 2026) is rejected by the API (401). Prod uses the Vercel env key.

## Step 3 — publisher + site (NOT STARTED)
Render /<lang>/blog/<slug>, hreflang on all 5 versions + x-default, inLanguage/og:locale, translated FAQ JSON-LD,
sitemap + llms.txt entries, language tabs on /blog, re-render English posts with hreflang links.
Translations keyed to the current published English draft (refresh → new draft id → new translations).
Internal links inside translations still point to English URLs; localize in step 3 when the target translation exists.
