# HANDOVER — Phase 3 (GSC demand-driven topic generation) COMPLETE

**Date:** 2026-06-09
**Session scope:** Built Phase 3 end-to-end: a lean Google Search Console client
(service-account + impersonation), a pure opportunity selector, a DB-backed topic
generator wired through the Phase 2 overlap router, a weekly cron, a connectivity
proof, and a recon tool. Live GSC API call verified. typecheck clean, smoke 44/44.

---

## 0. TL;DR
- **GSC connectivity is LIVE and proven** — delegation + impersonation + env vars
  all work. `scripts/gsc-check.ts` lists 34 properties (golfvilla.com = siteOwner)
  and pulls real query rows.
- Full pipeline works: fetch → drop forbidden geo → keep page-2 band → map to
  intent cluster → drop near-dupes (Phase 2 router) + already-queued → insert.
- **At principled defaults the generator inserts 0 today** — and that's correct.
  golfvilla.com is too young: it gets impressions but ranks deep (pos 28–96, ~0%
  CTR on everything). No genuine page-2 opportunities exist yet. The curated
  seed/strategy queue (17 queued) keeps draining meanwhile.
- Thresholds are now **env-configurable** (tune from Vercel, no redeploy) for when
  the site matures. Nothing was written to the DB this session.

---

## 1. Files added
- `src/lib/gsc/client.ts` — JWT service-account client (impersonation via
  `subject`). Exports `listGscSites()` + `querySearchAnalytics()`. Uses
  `google-auth-library` (added dep, `^9.15.0`) + its `.request()` — no `googleapis`.
- `src/lib/gsc/topic-select.ts` — PURE, no DB/network. `selectOpportunities()`,
  `clusterForQuery()`, `isNegativeGeo()`, `isOnTarget()`, `proposeTitle()`. Filters
  to the page-2 band + on-target intent, maps each query to a keyword cluster,
  builds a `GscCandidate` (title + primary/secondary kw + cluster + reason).
- `src/lib/gsc/topic-generator.ts` — DB glue. `generateTopicsFromGsc()`: fetch →
  select → dedupe (overlap router 'high' = skip; already-queued/published = skip;
  in-batch dup = skip) → insert survivors as `status='queued'`,
  `source='gsc-generator'`, `priority=300+` (behind the curated queue). Reads
  env threshold overrides; supports `dryRun` + injected `rows` (for tests/replay).
- `src/app/api/cron/gsc-topics/route.ts` — cron route, `isAuthorizedCron` gated,
  logs a `blog_agent_runs` row (run_type `gsc_topics`). `maxDuration=60`.
- `scripts/gsc-check.ts` — connectivity proof (run this first, always).
- `scripts/gsc-topics-local.ts` — local runner. Dry-run default; `--write` inserts.
- `scripts/gsc-diagnose.ts` — recon: prints the on-target query landscape
  (ignoring the band) so you can tune thresholds to where the property sits.

## 2. Files edited
- `vercel.json` — added `{ "/api/cron/gsc-topics", "0 12 * * 1" }` (Mon 12:00 UTC,
  one hour BEFORE draft-weekly-post at 13:00).
- `package.json` — dep `google-auth-library@^9.15.0`; scripts `gsc:check`,
  `gsc:topics`.
- `scripts/verify-offline.ts` — +10 Phase-3 assertions (now 44 checks, all pass).
- `src/lib/keyword-clusters.ts` is UNCHANGED but note: `clusterForQuery` weights a
  full seed-phrase match at +10 so it dominates accumulated weak token-overlap
  (fixed a mis-map of "cap cana villa rentals" → large_group; now → rental).

## 3. Verification done this session
- `npm run typecheck` → clean.
- `npm run smoke` → ALL 44 CHECKS PASSED.
- `npx tsx scripts/gsc-check.ts` → ✅ live: 34 properties, real query rows.
- `npx tsx scripts/gsc-topics-local.ts` (defaults) → 0 candidates (correct).
- Loosened demo (`GSC_MAX_POSITION=50 GSC_MIN_IMPRESSIONS=3 GSC_MAX_CTR=1`) →
  4 on-target, 1 skipped as already-queued ("caribbean golf villas" — dedupe
  works), would-insert 3 (all generic `category` head terms — see §5).

## 4. Env vars — selector tuning (all OPTIONAL; unset = principled defaults)
Set in Vercel (Production) to tune without a code redeploy:
- `GSC_MIN_POSITION` (default 5), `GSC_MAX_POSITION` (default 20)
- `GSC_MIN_IMPRESSIONS` (default 30)
- `GSC_MAX_CTR` (default 0.10)
- `GSC_TOPIC_LIMIT` (default 12)
Already-live GSC env (from prior session): `GSC_SERVICE_ACCOUNT_JSON` (base64,
secret), `GSC_IMPERSONATED_SUBJECT=rbender@fortisnetlease.com`,
`GSC_SITE_URL=sc-domain:golfvilla.com`, `GSC_SA_EMAIL` (reference).

## 5. Decision needed from Rob (NOT auto-decided)
The site currently has NO page-2 opportunities. Options:
1. **Leave defaults** → generator stays a no-op until rankings improve. Safe;
   recommended. The curated queue still feeds the drafter.
2. **Loosen the band** (e.g. `GSC_MAX_POSITION=50`, `GSC_MIN_IMPRESSIONS=3`) to
   seed from deep-ranking queries NOW. Caveat: today that surfaces mostly generic
   head terms ("villa golf", "golf villa rentals", "luxury golf villa") that the
   `category` money pages already cover and that produce look-alike titles. Low
   value until the site ranks better — hence default #1.
Run `npx tsx scripts/gsc-diagnose.ts` anytime to re-check the landscape.

## 6. To activate (when you decide)
1. Push (see git command below) — deploys the cron + code.
2. (Optional) Set any `GSC_*` threshold envs in Vercel.
3. Dry-run against prod data: `npx tsx scripts/gsc-topics-local.ts`.
4. When happy: `npx tsx scripts/gsc-topics-local.ts --write` (or let the Mon 12:00
   cron do it). New topics land `source='gsc-generator'`, `status='queued'`.

## 7. Standing open items (carried)
- **Rotate `CRON_SECRET`** — still the guessable `MY-SECRET-CRON-KEY-2026`. The new
  `/api/cron/gsc-topics` route is gated by it too, so rotating matters a bit more now.
- Optional: rotate the GSC SA key (shared in chat; read-only scope, low urgency).
- RLS still disabled on `blog_*` (pending security decision).
- Phase 4 (refresh/decay loop) — not started.
- Future: clone pipeline for espadavilla.com (`GSC_SITE_URL=sc-domain:espadavilla.com`;
  the SA already owns that property — confirmed in the gsc-check listing).

## 8. Key IDs / paths
- Local: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- GitHub: `github.com/rbender-boop/golfvilla-blog-agent`, branch `main`
- Supabase (golfvilla): project id `genidekhqwsxvsboyrih` — always pass project_id.
- Vercel: project `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`.
- Runtime: Bun (`--env-file=.env.local`) or `npx tsx`. Model `claude-sonnet-4-5-20250929`.
- Verify: `npm run typecheck` (clean) + `npm run smoke` (44/44).
