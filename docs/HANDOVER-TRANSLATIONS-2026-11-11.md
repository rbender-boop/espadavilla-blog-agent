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

## Step 3 — publisher + site (DONE in code, both repos, 2026-11-11)
- `src/lib/i18n/publish-translations.ts`: one atomic commit per post once its 4 languages are settled
  (or 2h after the first approval): translated pages (pipeline-owned, re-rendered from the DB),
  hreflang block PATCHED into the English post (English never re-rendered from the DB), /<lang>/blog
  index pages regenerated, English /blog index patched with language tabs + hreflang, sitemap, IndexNow.
- Guards: English URL must return 200 (redirected/removed posts are skipped before any API spend),
  contact-info guard on every rendered page, English draft must be status published.
- `render-post.ts`: optional `i18n` + `alternates`; English output verified byte-identical to before.
- Re-renders keep the hreflang block: espadavilla `preserve-site-blocks.ts`; golfvilla
  `scripts/rerender-local.ts` + `scripts/rerender-published.ts`.
- Paths: espadavilla `<lang>/blog/<slug>.html`; golfvilla `<lang>/blog/<slug>/index.html`.
- Tabs anchor: espadavilla after the breadcrumb; golfvilla after the first <h1> in main.blog-wrap.
- Cron: translate 1 pair + publish 1 ready post per run, every 5 min. Kill switches: TRANSLATE_POSTS=false,
  PUBLISH_TRANSLATIONS=false.
- Tests: `scripts/verify-translation-check.ts`, `scripts/verify-translation-publish.ts`.

## BLOCKER (2026-11-11 20:00 UTC)
The production ANTHROPIC_API_KEY on Vercel returns 401 invalid x-api-key (both projects' first runs failed),
same as the June key in .env.local. This also breaks the Dec 1 monthly drafting. Fix: new key from
console.anthropic.com → Vercel env ANTHROPIC_API_KEY (Production) on espadavilla-blog-agent AND
golfvilla-blog-agent → redeploy. Then reset failed rows so they retry immediately:
`update blog_post_translations set status='pending' where status='failed';` (both projects).
