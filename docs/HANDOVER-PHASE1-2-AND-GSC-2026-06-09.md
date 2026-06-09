# HANDOVER — Phases 1 & 2 complete + GSC ready for Phase 3

**Date:** 2026-06-09
**Session scope:** Expanded keyword/topic coverage (Phase 1), built the intent-overlap
router + cluster linking (Phase 2), and fully set up Google Search Console access
(service account + domain-wide delegation + impersonation) for the upcoming Phase 3
topic generator. **Phases 3 & 4 are NOT started — to be built in a fresh session.**

---

## 0. TL;DR
- Topic queue extended 6 → 17 (additive; existing order preserved). New keyword
  cluster taxonomy + soft-avoid list now feed every draft prompt.
- Phase 2 intent-overlap router live: differentiates by ANGLE, never penalizes
  keyword/entity overlap, links each post to its cluster pillar + a sibling, and
  flags only genuine near-duplicates through the existing WhatsApp approval flow.
- GSC access fully configured via service account + domain-wide delegation +
  impersonation. All env vars set in Vercel (Production) + `.env.local`. Verified
  end-to-end only at the credential/round-trip level — **live API call not yet tested**
  (that's the first Phase 3 step).
- typecheck + smoke green throughout (smoke now 35 checks).

---

## 1. Phase 1 — keyword strategy + topics (DONE, committed `5ad6d3f`)
- Migration `supabase/migrations/0005_blog_topics_source.sql` — added nullable
  `source` column to `blog_topics`. Applied to Supabase project `genidekhqwsxvsboyrih`.
- Migration `supabase/migrations/0006_seed_strategy_topics.sql` — 11 deduped topics
  from `docs/golfvilla-keyword-strategy.md` (dropped doc #9 = exact dup of published
  Cap Cana vs Casa de Campo). Priorities 110–210 (existing queue 50–100 unchanged;
  pickNextTopic orders ascending = lower picked first). `source='strategy-doc-2026-06-09'`.
  Applied via Supabase MCP. Queue 6 → 17 queued.
- `src/lib/keyword-clusters.ts` (new) — the strategy doc's 10 intent clusters
  (packages, punta_espada, category, rental, staffed, large_group, group_event,
  comparison, planning, caribbean) + SOFT_AVOID_TERMS + `buildClusterTaxonomyBlock()`
  + `checkSoftAvoid()` (advisory only, NOT wired to hard-flag).
- `src/lib/keywords.ts` — appends the cluster taxonomy + soft-avoid guidance to
  `buildKeywordPromptBlock`; added optional `cluster` to `TopicKeywords`.
- `src/lib/drafting/pipeline.ts` + `generate-post.ts` — pass `cluster` into the block.
- No new primary-keyword collisions introduced (only the pre-existing `luxury golf
  villas` pair remains, predating this work).

## 2. Phase 2 — intent-overlap router (DONE, committed `67c2147`)
- `src/lib/drafting/overlap-score.ts` (new, PURE/no DB) — scores a candidate topic
  vs published posts → level `none` | `cluster` | `high`. 'high' requires SAME
  normalized primary keyword AND title-angle Jaccard ≥ 0.4 (entity vocab stripped,
  light singularization). Also returns pillar hint + sibling links + differentiation
  guidance. `pillarForCluster()` maps every cluster (old + new) to a money-page pillar.
- `src/lib/drafting/overlap.ts` (new) — thin Supabase wrapper; degrades to advisory
  'none' on any DB error so it can never block the pipeline.
- `src/lib/drafting/pipeline.ts` — `pickTopicStep` runs the router, appends the pillar
  hint + sibling blog URLs to the draft's internal links, carries `overlap` in job
  state; `generateDraft`/`buildDraftUserPrompt` inject a "CLUSTER & DIFFERENTIATION"
  block; `guardStep` flags level 'high' via the EXISTING flag/blockReason → WhatsApp
  approval-banner path (never strands — Rob can approve anyway).
- `scripts/verify-offline.ts` — +9 router assertions (now 35 checks, all pass).
- Design principle (per Rob): keyword/entity overlap is GOOD for SEO+GEO authority;
  only same-JOB articles are the problem. Validated: a villa-vs-resort rewrite → 'high';
  the "DR Tourism" topic (shares `luxury golf villas`, different angle) → 'cluster'.

## 3. Google Search Console access (DONE — config only)
**Model:** service account + **domain-wide delegation + impersonation** (NOT a direct
property user — the GSC UI silently rejects service-account emails).
- SA: `search-console-agent@golfvilla-search-console.iam.gserviceaccount.com`
  (GCP project `golfvilla-search-console`).
- Delegation authorized in Workspace Admin → Security → API Controls → Domain-wide
  Delegation: client ID `115283306924568576295`, scope `.../auth/webmasters.readonly`.
- Impersonation subject: `rbender@fortisnetlease.com` (Owner of BOTH golfvilla.com
  and espadavilla.com). Code MUST set `subject` to this or the SA has no GSC access.
- Env vars (Vercel Production + `.env.local`, both set this session):
  - `GSC_SERVICE_ACCOUNT_JSON` — base64 of the key JSON (Sensitive). 3208-char string;
    round-trip to valid service_account JSON verified.
  - `GSC_IMPERSONATED_SUBJECT` = `rbender@fortisnetlease.com` (just added to Vercel + pushed).
  - `GSC_SITE_URL` = `sc-domain:golfvilla.com`.
  - `GSC_SA_EMAIL` = the SA email (reference; non-secret).
  - Legacy OAuth `GSC_CLIENT_ID`/`GSC_CLIENT_SECRET` are RETIRED (can be deleted from Vercel).
- `.gitignore` now blocks `*-search-console-*.json` etc. so a key file can't be committed.
- Full detail: `docs/GSC-SETUP-2026-06-09.md`.
- ⚠️ The SA private key (and the old OAuth client secret) were shared in chat — optional
  but tidy to rotate the SA key in GCP (delete key id `330bf7ab…`, generate a new one,
  re-base64 into env) at some point. Read-only scope, low urgency.

---

## 4. Phase 3 — NEXT (not started). Demand-driven topic generation
Plan agreed this session:
1. **GSC client module** (`src/lib/gsc/*`): TypeScript/Bun, NOT Python. Use
   `google-auth-library` JWT client built from the decoded base64 key with
   `scopes:['https://www.googleapis.com/auth/webmasters.readonly']` and
   `subject: process.env.GSC_IMPERSONATED_SUBJECT`. Add the `googleapis` (or
   `google-auth-library` + REST) dependency.
2. **Connectivity check FIRST** — a one-shot script/endpoint that lists the SA's
   verified GSC properties and pulls a few sample queries. This PROVES the delegation
   + impersonation + env vars work before anything touches the cron. (The live API
   call has not yet been made — this is step one.)
3. **Topic generator** — query the Search Analytics API for page-2 opportunities
   (impressions, avg position ~6–20, low CTR) + rising queries; filter to on-target
   intent using `keywords.ts` NEGATIVE_TERMS + `keyword-clusters.ts` taxonomy; run
   each candidate through the Phase 2 router (`overlap-score.ts`) to skip near-dupes;
   insert survivors into `blog_topics` as `status='queued'`, `source='gsc-generator'`,
   mapped to a cluster + primary/secondary keywords. New cron BEFORE the draft cron.

## 5. Phase 4 — NEXT (not started). Refresh / content-decay loop
Once dozens of posts exist, sometimes refresh a decaying winner instead of writing
new. Add `last_refreshed_at`; a refresh job that re-runs research + updates an
existing post rather than minting post #N+1 in the same cluster.

---

## 6. Standing open items (carried from prior handovers)
- **Rotate `CRON_SECRET`** — still the guessable `MY-SECRET-CRON-KEY-2026`; it's the
  only gate on the public cron endpoints. Set a random value in Vercel + redeploy.
- **RLS disabled** on all `blog_*` tables — pending security decision (don't enable
  bare; the service-role app needs full access).
- **espadavilla.com itself** still shows the old phone `+1 (248) 254-3406` (separate
  site; update there).
- Future: clone this pipeline for an **espadavilla.com** blog writer (own `blog_topics`,
  `GSC_SITE_URL=sc-domain:espadavilla.com`) once golfvilla.com is perfected.

## 7. Key IDs / paths
- Local: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- GitHub: `github.com/rbender-boop/golfvilla-blog-agent`, branch `main`
- Supabase (golfvilla): project id `genidekhqwsxvsboyrih` — **always pass project_id**
  (a separate Fortis/Phil project shares the MCP).
- Vercel: project `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`,
  prod `golfvilla-blog-agent.vercel.app`.
- Model: `claude-sonnet-4-5-20250929`. Runtime: Bun (pass `--env-file=.env.local`).
- Verify: `npm run typecheck` (clean) + `npm run smoke` (35/35).
