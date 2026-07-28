# Handover — cron HTTP-status hardening + Data-Cache parity guard (2026-07-10)

## TL;DR
- Follow-on from the golfvilla false-staleness-alert incident (see golfvilla `docs/HANDOVER-STALE-READ-CACHE-FIX-2026-07-10.md`). Rob asked to apply the same fix here.
- **espadavilla was NOT vulnerable to that stale-read bug** — its `src/lib/supabase.ts` already forced `cache: 'no-store'` (added 2026-06-09, see `docs/HANDOVER-2026-06-09-SESSION3-CACHE-FIX-PREFIX-ROUTING.md`, for the cached-empty-`status=approved` read that stalled publishing). That's why espadavilla never emitted a single `stale_alert_sent` row despite running identical monitor logic.
- Added the `fetchCache = 'force-no-store'` route guard on `failure-monitor` for parity with golfvilla (belt-and-suspenders; client already covers it).
- **Then found & fixed a systemic issue:** 6 of 8 cron routes returned **HTTP 200 on hard failures**, so Vercel's cron dashboard/alerting would never flag them. All now return **500** on true failure.
- Typecheck exits 0. **Push PENDING** — see §5 for the command.

---

## 1. Context — why espadavilla was already safe from the cache bug
- The golfvilla incident: Next.js App Router Data Cache cached supabase-js GET (select) reads; the failure-monitor served a frozen "newest run" snapshot for hours → false hourly staleness alerts with a monotonically growing age.
- espadavilla's `src/lib/supabase.ts` **already** wraps the client's global fetch with `cache: 'no-store'` (from the 2026-06-09 session-3 fix). So every read here already hits PostgREST live. No live vulnerability existed; no client change was needed.
- Confirmation: espadavilla `blog_agent_runs` (Supabase `qqjrujrrqxtfsuikakuu`) has **zero** `stale_alert_sent` rows, ever — consistent with the monitor always reading fresh.

## 2. Parity guard added
`src/app/api/cron/failure-monitor/route.ts`:
```ts
export const fetchCache = 'force-no-store'; // parity w/ golfvilla 2026-07-10 stale-read fix; client already forces no-store
```
Redundant given the client-level fix, but keeps both agents hardened identically.

## 3. Systemic fix — cron routes were masking hard failures as HTTP 200
The agent catches errors and logs `status='failure'` to `blog_agent_runs`, but most routes then returned **HTTP 200** — so Vercel's cron dashboard/alerting never registered the failure. `blog_agent_runs` stays the truth source, but the HTTP layer should surface hard failures too. Fixed every route to return **500 on a true failure**:

| Route | Before | After |
|---|---|---|
| `failure-monitor` | 200 on error | **500** on error (+ `fetchCache` guard) |
| `voice-refinement` | 200 on error | **500** on error |
| `gsc-topics` | 200 on error | **500** on error |
| `draft-weekly-post` | 200 on error | **500** on error |
| `drain-approved` | always 200 | **500** on `status='failure'` only |
| `expire-stale-drafts` | always 200 | **500** on `status='failure'` |
| `blog-pipeline-worker` | 200 when summary `failed` | **500** when `failed` |
| `post-refresh` | already 500 | unchanged |

- **Deliberate exception:** `drain-approved` `status='partial'` (some individual drafts failed to publish but the cron itself ran) **stays 2xx** — fail-soft, consistent with the "never block/aux-fail the publish path" principle. Only a full `failure` (the whole `publishAllApproved()` threw) returns 500.
- Pattern used for the status-variable routes:
  ```ts
  return NextResponse.json(payload, status === 'failure' ? { status: 500 } : undefined);
  ```

- **Verified:** `npm run typecheck` → exit 0.

## 4. Files changed this session (full paths)
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\failure-monitor\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\voice-refinement\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\gsc-topics\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\draft-weekly-post\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\drain-approved\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\expire-stale-drafts\route.ts`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\cron\blog-pipeline-worker\route.ts`

## 5. Git command (PENDING — Rob to run)
```powershell
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"; git add src/app/api/cron/; git commit -m "fix(cron): return HTTP 500 on hard failures so Vercel registers them; add fetchCache no-store guard on failure-monitor"; git push
```
(This handover doc is under `docs/` — `git add docs/` or `git add -A` if you want it committed too.)

## 6. Post-deploy note
- No behavior change on the happy path; only the HTTP status on failing cron runs changes (200 → 500). All routes are auth-gated under `/api/cron` (`isAuthorizedCron`), so the 500s are never user-facing — they only reach Vercel's scheduler, which is the point.

## 7. Open items / recommendations
- **Run the same HTTP-status sweep on golfvilla's crons** — this session only fixed golfvilla's `failure-monitor`; its other routes likely share the 200-masks-failure pattern. (Flagged in the golfvilla handover too.)
- Still outstanding from prior sessions: port `/api/health?deep=1` deep mode to espadavilla (currently env-presence only); add ESLint config; espadavilla Weeks 3–4 SEO tasks.

## 8. Standing facts (unchanged)
- espadavilla: Supabase `qqjrujrrqxtfsuikakuu`, Vercel `prj_LlQslaqdJQOgCzYfryGbG8XNkXT1` / team `team_5kyP9NiGKlZKAM1kiPmrCpu1`, domain `espadavilla-blog-agent.vercel.app`, publish repo `rbender-boop/espadavilla-com`.
- 8 crons; `drain_approved` every 15 min heartbeat; `blog_pipeline_worker` Mon/Thu 13:00–16:00 UTC only.
- `blog_agent_runs` remains the authoritative pipeline-health source; these HTTP-status fixes are a complementary second signal at the Vercel layer, not a replacement.
