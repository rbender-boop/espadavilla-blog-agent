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

## FINAL STATE (2026-11-11 21:30 UTC) — LIVE ON BOTH SITES
- New Anthropic key set in Vercel (both projects) and both .env.local files; all four verified (HTTP 200 / production runs).
- Translation prompt fixed: the canonical-facts sheet made the model 'correct' numbers (6,200→30,000 acres, invented $395 rate,
  added a Golf Digest #57 ranking). Removed; rule 7 now says translate faithfully. Number gate caught every bad version.
- Name check accepts hyphenated compounds (German 'Golf-Digest-Liste'). 
px tsx scripts/translate-local.ts --recheck
  re-runs the checker on blocked rows without an API call.
- Verified live: espadavilla cap-cana-golf-residences-villa-espada-playbook + things-to-do-villa-espada-non-golf-family;
  golfvilla where-can-i-rent-a-villa-with-direct-access-to-a-golf-course — all 4 languages 200, correct lang, matching
  hreflang on all 5 versions + x-default, tabs on /blog and /<lang>/blog, sitemap entries.
- Backfill runs on its own (1 translation + 1 publish per site every 5 min). Watch: select * from v_translation_status;
- Open question for Rob: playbook says Cap Cana is 6,200 acres; sargassum post says 30,000. One English post is wrong.

## STUCK-TRANSLATION AUDIT + FIX (2026-11-12)
Backfill had finished 03:21 UTC with 48 rows blocked (espadavilla 31, golfvilla 17); nothing pending/translating.
- 37 were checker false positives. translation-check.ts (both repos, commits 623cca5/e8fbfd2 espadavilla,
  d2ffe3f/61f98cf golfvilla) now normalizes both sides before comparing numbers: am/pm → 24h (incl. ranges,
  "1 or 2pm"), drops "24/7", "24-hour", "24 Stunden", fr "24 h/24", "7 j/7"; expands year ranges ("2008 bis 2010");
  fixes "Q1 2026" being read as 1202. English spelled-out numbers ("thirty days", "Eighty-three") are optional:
  allowed as digits in the translation, never required. Golfvilla got the hyphenated-name fix too.
- translate.ts prompt rule 3: keep approximations approximate ("mid-80s" never becomes 85); 24h clock is fine.
- 3 real drifts ("mid-80s" → "85 °F", golfvilla) reset to pending and re-translated under the new rule.
- 8 contact-info blocks: Rob chose to strip contact info from the English. Removed email/WhatsApp/restaurant phone
  from cap-cana-birthday-villa-milestone-celebrations, cap-cana-direct-booking-villa-espadavilla,
  punta-espada-restaurant-eden-roc-playing-from-villa-espada (edited_content, body_markdown, faq, summary);
  diff-live-vs-db showed 0 drift first; re-rendered live with rerender-published.ts --force (commits 8147ff6,
  7f0363c, 94f929d on espadavilla-com). Their 12 translations went stale and re-translate via cron.
- After `--recheck` all false positives approved; cron publishing resumed on both sites (verified 16:46/16:48 UTC).
- Leftover: untracked `translation-check.ts` at the espadavilla-blog-agent repo root (stray copy, not used).
