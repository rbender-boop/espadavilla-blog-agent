# HANDOVER — Durable Drafting Pipeline: COMPLETED & VERIFIED IN PROD

**Date:** 2026-06-09 (UTC) / evening of 2026-06-08 ET
**Author:** Claude (session continuing from `HANDOVER-DURABLE-PIPELINE-2026-06-08.md`)
**Status:** ✅ DONE. Code landed, typechecks, smoke-passes, migration applied, deployed to prod, and a full Monday-style run was executed and verified end-to-end (including WhatsApp approval → publish).

---

## 0. TL;DR

The 504 timeout on the weekly draft cron is fixed and proven in production. The fix decouples the trigger from the work: the weekly cron now only **enqueues** a durable job row; a separate **polling worker** advances the job one checkpointed step at a time under a wall-clock budget, yielding to the DB before any platform timeout. We finished the remaining wiring from the prior handover, fixed the typecheck errors, applied migration 0003 to the **correct** Supabase project, deployed, and ran a real job start-to-finish.

**Verified run (this session):**
- Job `40ed2f31-aee0-47cd-bb28-9d8d93a359dd` → `done`, 0 errors, ran across 2 worker ticks.
- Draft `faa4938f-8147-498c-9f84-9be871109c4b` (slug `cap-cana-vs-casa-de-campo-golf`) → WhatsApp sent → Rob approved → **`published`**.

---

## 1. State we found at the start of this session

The prior handover said code was "~80% landed." In fact the §6 wiring items were **not started**:

- `src/app/api/cron/blog-pipeline-worker/route.ts` — directory existed but was **empty** (no route).
- `src/app/api/cron/draft-weekly-post/route.ts` — still the **old synchronous** drafter (the thing that 504'd).
- `vercel.json` — 5 crons, **no worker** entry.
- `src/lib/drafting/run-pipeline-local.ts` — **did not exist**; no `pipeline:local` script in `package.json`.
- Migration `0003_blog_agent_jobs.sql` — written on disk but **not applied** to any DB.
- `tsc --noEmit` — **failed** (the `exactOptionalPropertyTypes` issues flagged in the prior §9 watch-list).

The core library files from the prior session WERE present and complete: `src/lib/jobs/job-store.ts`, `src/lib/jobs/run-worker.ts`, `src/lib/drafting/pipeline.ts`, and the `generate-post.ts` edits.

---

## 2. What we did, in order

### 2.1 Wrote the four remaining wiring items (§6 of prior handover)

- **`src/app/api/cron/blog-pipeline-worker/route.ts`** (new) — GET route, `maxDuration = 300`, cron-auth gated, calls `runPipelineWorker()` and returns its summary.
- **`src/app/api/cron/draft-weekly-post/route.ts`** (overwritten) — now **enqueue-only**: `maxDuration = 60`, inserts a `blog_agent_runs` row, calls `enqueueJob('draft_weekly_post')`, returns instantly. Cannot time out. Idempotent (a duplicate fire reuses the open job).
- **`vercel.json`** (edited) — added `{ "path": "/api/cron/blog-pipeline-worker", "schedule": "*/2 13-16 * * 1" }`. Now **6 crons** total; the existing 5 are unchanged.
- **`src/lib/drafting/run-pipeline-local.ts`** (new) + **`package.json`** script `pipeline:local`. NOTE: this loads `.env.local` then falls back to `.env` (see §5 on why that matters).

**Deliberately skipped §6.5** (the optional `STEP_ORDER` assertion in `scripts/verify-offline.ts`): importing `STEP_ORDER` from `pipeline.ts` pulls the Supabase/Anthropic/unipile module graph into the offline, no-API-key smoke run and would break it. The smoke test stays pure.

### 2.2 Fixed the typecheck errors (all from `exactOptionalPropertyTypes: true`)

Under this strict flag, you may not assign `undefined` to an optional property — you must omit the key. Three spots, all fixed with conditional spreads:

- `src/lib/drafting/pipeline.ts` → `normalizeBrief()`:
  - `as_of: f.as_of ? String(f.as_of) : undefined` → `...(f.as_of ? { as_of: String(f.as_of) } : {})`
  - `notes: input.notes ? String(...) : undefined` → `...(input.notes ? { notes: String(input.notes) } : {})`
- `src/lib/jobs/run-worker.ts` → the `saveProgress(job, {...})` call: `state`/`topic_id`/`draft_id` could be `undefined`, so they're now spread conditionally only when defined.

After these, `npm run typecheck` passes clean.

### 2.3 Smoke test

`npm run smoke` → **all 26 checks pass** (render/sitemap/index/guard/negative-keyword checks). No regressions.

### 2.4 Migration 0003 — applied to the CORRECT project

The prior handover warned "the Supabase MCP points at the WRONG project (Fortis/Phil)." **Important correction for future sessions:** the Supabase MCP tools take an **explicit `project_id` argument**. The "wrong project" risk only bites if you let it default. There is a dedicated project named **`golfvilla-blog-agent`**, id **`genidekhqwsxvsboyrih`**.

Steps taken:
1. `list_projects` → found `genidekhqwsxvsboyrih` (golfvilla).
2. `list_tables(project_id=genidekhqwsxvsboyrih)` → confirmed `blog_topics`, `blog_post_drafts`, `blog_approval_messages`, `blog_voice_memories`, `blog_agent_runs` present; `blog_agent_jobs` **absent**.
3. `apply_migration(name='0003_blog_agent_jobs', project_id='genidekhqwsxvsboyrih', query=<0003 SQL>)` → `{success:true}`.
4. Re-listed tables → `blog_agent_jobs` now present (0 rows).

The migration is idempotent (`create table if not exists` + `create index if not exists`), so re-running it is safe.

**⚠️ RLS advisory (pre-existing, surfaced by the MCP):** all `blog_*` tables (now including `blog_agent_jobs`) have **Row Level Security disabled** — anyone with the anon key can read/write every row. We did NOT enable it: turning on RLS without policies would block the service-role app. This is a standing security item for Rob to decide on (see §6).

### 2.5 Commit & push (Rob ran git himself)

- Commit **`00ed2bf`** "feat: durable checkpointed drafting pipeline (fixes weekly-draft 504 timeout)" — 11 files changed, pushed to `main` (`f561409..00ed2bf`).
- The LF→CRLF warnings on push are harmless line-ending normalization.
- (Minor gotcha during the session: the first git attempt failed because the shell was in `C:\windows\system32` and the pasted commands included the `PS …>` prompt prefix — `PS` is PowerShell's alias for `Get-Process`. Fix was to `cd` into the repo and paste only the command text.)

### 2.6 Deploy

- Pushing `main` auto-deployed `dpl_Bd5ZNipwCrVXsgsna7CHZK989xY9` (commit `00ed2bf`) → **READY**. This registered the new worker cron.
- Later we did a second, manual prod deploy (`vercel --prod --yes`) to pick up a changed `CRON_SECRET` (see §3). That deploy aliased to `golfvilla-blog-agent.vercel.app` and went READY.

---

## 3. The CRON_SECRET / env saga (read this before trying to run prod manually)

We wanted to run the end-to-end immediately rather than wait for the Monday 13–16 UTC worker window (it was already ~01:33 UTC **Tuesday**, so the window was closed). That requires hitting the cron endpoints manually with `Authorization: Bearer <CRON_SECRET>`.

What we learned the hard way:

- **Sensitive Vercel env vars are write-only.** `ANTHROPIC_API_KEY`, `CRON_SECRET`, all `UNIPILE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN_GOLFVILLA`, `INBOUND_RESOLVE_SECRET` are marked **Sensitive**. `vercel env pull` returns them **empty** in every environment. You cannot read them back from the dashboard either (the value box shows placeholder text, not the stored value).
- Therefore: you **cannot run `pipeline:local` for real** (no Anthropic/WhatsApp keys locally) and you **cannot authenticate a manual cron trigger** unless you know/reset `CRON_SECRET`.
- `vercel env pull` of **production** was actually *worse* than the existing `.env.local` (it blanked even the non-sensitive Supabase URL). We restored `.env.local` to its prior working state (Supabase URL + service-role key populated; Anthropic/WhatsApp remain blank — unavoidable).

**Resolution:** Rob edited `CRON_SECRET` in the Vercel dashboard to a known value, then we **redeployed** (env changes only take effect on a new deployment). After redeploy, the Bearer trigger worked.

> ⚠️ `CRON_SECRET` is currently **`MY-SECRET-CRON-KEY-2026`** — guessable, and it is the ONLY gate on the public cron endpoints. **Rotate to a random value + redeploy** (see §6).

---

## 4. The verified end-to-end run (production)

All against `https://golfvilla-blog-agent.vercel.app` with the Bearer secret.

1. **Enqueue** — `GET /api/cron/draft-weekly-post` → `{"ok":true,"created":true,"job_id":"40ed2f31-aee0-47cd-bb28-9d8d93a359dd"}`
2. **Worker tick 1** — `GET /api/cron/blog-pipeline-worker` → `steps_run:["pick_topic","research","draft"]`, `final_step:"enforce"`, `status:"yielded"`. (Yielded before the soft budget, checkpointing at `enforce` — exactly the designed behavior that prevents a 504.)
3. **Worker tick 2** — same endpoint → `steps_run:["enforce","guard","persist","notify"]`, `status:"done"`.
4. **DB check** (`blog_agent_jobs` joined to `blog_post_drafts`):
   - job `status=done`, `step=done`, `attempts=0`, state `drafted=true / flagged=false / sent=true`
   - draft `faa4938f-8147-498c-9f84-9be871109c4b`, slug `cap-cana-vs-casa-de-campo-golf`, title "Cap Cana vs Casa de Campo Golf: The Group Planner's Guide", `draft_status=sent_for_approval`
   - timing: `started_at 01:42:42Z → completed_at 01:48:08Z` (~5.5 min, split safely across the two ticks; no single invocation came near the timeout)
5. **WhatsApp** — Rob received the approval message and **approved** it.
6. **Publish** — `drain-approved` path took the approved draft to `status=published` (`updated_at 01:49:29Z`). Post is live.

This exercised the entire production chain: enqueue → research (web_search) → draft → enforce → guard → persist → notify (WhatsApp) → human approval → publish.

---

## 5. How it runs from here (steady state)

- **Monday 13:00 UTC** — `draft-weekly-post` fires, enqueues one job, returns instantly.
- **Monday 13:00–16:00 UTC, every 2 min** — `blog-pipeline-worker` ticks. It claims the job (lease lock), advances steps under a soft wall-clock budget (`SOFT_BUDGET_MS=210s`), and won't START a heavy LLM step with `< MIN_HEAVY_MS=60s` left. It checkpoints to `blog_agent_jobs` on every step and releases the lease on yield. A typical job finishes in 1–2 ticks.
- **Every 15 min** — `drain-approved` publishes any approved drafts.
- Safety: a crashed tick's lease goes stale after `LEASE_MS=5min` and another tick takes over. After `max_attempts=3` failures on a step the job is marked `failed`, the topic is returned to `queued` (if no draft persisted), and Rob gets a WhatsApp.

### Manual run (for testing outside the Monday window)
```powershell
$s = "<CRON_SECRET>"
$base = "https://golfvilla-blog-agent.vercel.app"
curl.exe -H "Authorization: Bearer $s" "$base/api/cron/draft-weekly-post"   # enqueue
curl.exe -H "Authorization: Bearer $s" "$base/api/cron/blog-pipeline-worker" # repeat until status:"done"
```
Call the worker repeatedly until it returns `status:"done"` (or `idle:true` if there's nothing queued). Each call is safe to repeat — every step is idempotent.

---

## 6. Open items / follow-ups

1. **Rotate `CRON_SECRET`** (priority). It's currently the guessable `MY-SECRET-CRON-KEY-2026` and is the only auth on the public cron endpoints. Set a random value in Vercel (Settings → Environment Variables → CRON_SECRET, Production), then redeploy (`vercel --prod` or dashboard Redeploy). Because it's Sensitive, write down the value somewhere safe — you can't read it back.
2. **RLS disabled on all `blog_*` tables.** Decide whether to enable Row Level Security; if you do, you must add policies that still allow the service-role key full access, or the app breaks. Don't enable it bare.
3. **Local `.env.local` lacks Anthropic/WhatsApp keys** (they're Sensitive in Vercel, unpullable). So `pipeline:local` / `draft:local` can't do a real run locally without manually pasting those keys in. Prod is unaffected.
4. **§6.5 (offline STEP_ORDER assertion)** intentionally not added — see §2.1.
5. **Vercel cron count** — project is now at 6 crons. It deployed fine, so the plan allows it. Keep in mind if adding more.

---

## 7. Key references / IDs

- **Repo root:** `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- **GitHub:** `github.com/rbender-boop/golfvilla-blog-agent`, branch `main`, this work = commit `00ed2bf`
- **Vercel:** project `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`, prod domain `golfvilla-blog-agent.vercel.app`
- **Supabase (golfvilla):** project id `genidekhqwsxvsboyrih`, host `db.genidekhqwsxvsboyrih.supabase.co`. **Always pass this `project_id` to the Supabase MCP** — the Fortis/Phil tables live on a *different* project.
- **Prior handover:** `docs/HANDOVER-DURABLE-PIPELINE-2026-06-08.md`

---

## 8. Files touched this session

Code/config (committed in `00ed2bf`):
- `src/app/api/cron/blog-pipeline-worker/route.ts` — new worker cron route
- `src/app/api/cron/draft-weekly-post/route.ts` — overwritten to enqueue-only
- `vercel.json` — added worker cron (6 total)
- `src/lib/drafting/run-pipeline-local.ts` — new local runner
- `package.json` — added `pipeline:local` script
- `src/lib/drafting/pipeline.ts` — 2 `exactOptionalPropertyTypes` fixes in `normalizeBrief`
- `src/lib/jobs/run-worker.ts` — 1 `exactOptionalPropertyTypes` fix in the `saveProgress` call

Database:
- Applied `supabase/migrations/0003_blog_agent_jobs.sql` to Supabase project `genidekhqwsxvsboyrih`

Infra:
- Vercel `CRON_SECRET` (Production) changed; production redeployed twice (auto on push `dpl_Bd5Z…`, then manual `vercel --prod`)

Not committed (local only, gitignored): `.env.local` was temporarily overwritten then restored to its prior working state.

---

## 9. Verification commands (all currently green)
```bash
npm run typecheck   # passes
npm run smoke       # 26/26 pass
```
DB spot-check (Supabase MCP, project_id genidekhqwsxvsboyrih):
```sql
select j.status, j.step, d.status as draft_status, d.slug
from blog_agent_jobs j left join blog_post_drafts d on d.id = j.draft_id
order by j.created_at desc limit 5;
```


---

# SESSION 2 UPDATE — 2026-06-09 (GEO, approval-flow fix, facts reconciliation)

This section continues the handover above. All work below is committed and pushed
to `origin/main` and deployed READY to production.

## Commits shipped this session (newest first)
- `04808de` drafter: forbid invented nightly rates (use only canonical) + fix stale rate guard message
- `b11b3a2` facts: reconcile canonical to espadavilla.com/property-facts + update WhatsApp to (734) 755-6357
- `ea4290f` fix: flagged drafts go through the WhatsApp approve/reject/edit flow (with warning) instead of stranding
- `7cdea7e` fix: canonical (no trailing slash) internal CTA link
- `184f3a3` feat: answer-first summary + visible sources block (GEO)

Latest prod deploy: `dpl_5g22Drda8AugdQQiJJ3ygbPdisnH` = `04808de`, READY.

## 1. GEO features (184f3a3)
- Added answer-first `summary` (emit_post required field, normalizePost, insertPendingDraft, prompts in BOTH `pipeline.ts` buildDraftSystemPrompt and `generate-post.ts` buildSystemPrompt).
- Migration `supabase/migrations/0004_draft_summary.sql` applied to `genidekhqwsxvsboyrih` (adds `summary text`).
- `render-post.ts`: renders `.post-summary` block + `.post-sources` section, adds `abstract` to BlogPosting JSON-LD; `commit-post.ts` selects + passes summary/sources.

## 2. Flagged-draft approval-flow fix (ea4290f) — the big UX fix
- ROOT CAUSE: flagged drafts (risk_score>=1.0) only got a bare "held for review" WhatsApp with NO `blog_approval_messages` row and stayed `status=pending` — so there was no way to reply/approve/edit. Dead end.
- FIX: `pipeline.ts` notifyStep now routes BOTH clean and flagged drafts through `sendDraftForApproval` (idempotent on status=pending). `send-draft.ts` formatDraftMessage prepends a "⚠️ FLAGGED — REVIEW BEFORE APPROVING / Reason: <block_reason>" banner when risk_score>=1.0; `sendAllPendingDrafts` no longer skips flagged drafts.
- Reply rules (unchanged, now reachable for flagged too): bare `yes`=publish, bare `no`=skip, ANY other text = full-body replacement edit → system replies "EDIT RECEIVED — confirm to publish" → reply `yes` to publish. Edits replace BODY only; title/meta/FAQ/summary/sources unchanged.

## 3. Un-stranding technique (reusable)
A draft stuck in `pending` (created before the fix) can be re-sent WITHOUT any new endpoint:
1. Insert a `blog_agent_jobs` row: `status='queued'`, `step='notify'`, `draft_id=<id>`, `state={"flagged":true,"draftId":"<id>"}`.
2. Trigger the worker cron. The fixed notifyStep claims it (claimNextJob is oldest-queued, no job_type filter) and sends via sendDraftForApproval → status flips to `sent_for_approval`, approval row logged, ⚠️ banner included.
Used successfully on draft `9d61967a-ee7a-42ea-b089-52961bd13eec` (slug luxury-golf-villas-replacing-resort-blocks); Rob replied `no` to skip it.

## 4. Canonical facts reconciled to espadavilla.com/property-facts (b11b3a2)
SOURCE OF TRUTH is now `espadavilla.com/property-facts` (was the local CANONICAL-FACTS.md). Changes in `src/lib/facts.ts`:
- bathrooms: was `bathroomsFull: 9, bathroomsHalf: 2` → single `bathrooms: 9.5`
- rates: peak `4500`→`4000`; holiday `6500`→`{ usd: 7500, usdMax: 8500 }` (range $7,500–$8,500 by group size)
- coordinates → `lat 18.46165473258522, lng -68.41100413285815`
- pools → "Infinity pool, rooftop pool, and a 16-person hot tub."
- included → executive chef; butler (= villa manager); TWO maids; private transport + airport transfers; two 6-person carts; member guest-rate golf Punta Espada + Las Iguanas
- ADDED fields: `address`, `notAllInclusive` (food billed at cost), `beaches` (Eden Roc + Juanillo ~8 min), `airport` ~20-min transfer, `policy` (check-in 3pm/out 11am, no pets, CC/USD wire)
- buildFactsPromptBlock updated (Config uses 9.5 baths; added Important/Beaches/Policy lines; holiday shows range)
- Guard ALLOWED updated: bathrooms {9.5, 9}; rates {2500, 4000, 7500, 8500}; bathroom + rate violation messages now print canonical dynamically
- WhatsApp number → **+1 (734) 755-6357** in `facts.ts` booking line AND `src/lib/publish/site-chrome.ts` footer tel: link (was +1 (248) 254-3406). Booking email stays rob@espadavilla.com.

## 5. Invented-rate prompt hardening (04808de)
Repeated prod tests showed the drafter keeps inventing a hypothetical "$3,500/night" villa-math figure → guard flags it (correctly). FIX:
- HARD GROUNDING bullet added to BOTH draft prompts (`pipeline.ts` buildDraftSystemPrompt + `generate-post.ts` buildSystemPrompt): never invent a nightly rate or per-person price; only canonical rates ($2,500 / $4,000 / $7,500–$8,500); divide a canonical rate for per-person math; don't make up $3,500.
- Fixed stale guard rate-violation message in `facts.ts` (was hardcoded $2,500/$4,500/$6,500) to print canonical rates dynamically.
- Typecheck clean, smoke 26/26 throughout.

## Open items / follow-ups
- ROTATE `CRON_SECRET` off the guessable `MY-SECRET-CRON-KEY-2026` to a random value in Vercel (Sensitive) + redeploy.
- VERIFY `UNIPILE_WHATSAPP_OWNER_NUMBER` (Vercel env, the number that RECEIVES approval WhatsApps) — update to 17347556357 in Vercel + .env.local if Rob's receiving number changed (Claude can't edit Sensitive env). `scripts/set-vercel-env.sh` (untracked) may be for this.
- espadavilla.com ITSELF still shows old +1 (248) 254-3406 (property-facts page + footer wa.me/12482543406) — separate site, update there too.
- RLS still DISABLED on all blog_* tables (incl. blog_agent_jobs) — pending security decision.
