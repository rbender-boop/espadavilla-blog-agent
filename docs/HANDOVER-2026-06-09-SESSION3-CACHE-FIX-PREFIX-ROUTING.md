# Handover — Session 3 (2026-06-09): publish-loop fix + EV/GV prefix routing

Continues from `HANDOVER-ESPADAVILLA-BUILD-2026-06-09.md` and
`HANDOVER-2026-06-09-SESSION2-ROUTING.md`. This session fixed why an approved post
never published, repaired deploy plumbing, and added project-prefix approval
routing across all three agents. The espadavilla approve→publish loop is now
fully operational and verified end-to-end.

## TL;DR — current state
- espadavilla approve→publish loop: **WORKING**, tested end-to-end via WhatsApp.
- Two posts published this session (both legitimate Villa Espada content):
  - `/blog/staying-at-villa-espada-day-on-property` (commit `49f91e52`)
  - `/blog/tennis-and-padel-cap-cana` (commit `8488df0b`)
- Shared-WhatsApp collision is now structurally impossible (prefix routing).
- All three Vercel projects auto-deploy from GitHub `main` pushes.

## Key IDs / paths
- Supabase project (espadavilla blog): `qqjrujrrqxtfsuikakuu`
- Vercel team: `team_5kyP9NiGKlZKAM1kiPmrCpu1`
- Vercel projects: espadavilla `prj_LlQslaqdJQOgCzYfryGbG8XNkXT1`,
  linkedin-agent `prj_MxwwiCArQbII2fRdkyYIA9MGPnHG`,
  golfvilla `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`
- Publish target repo: `rbender-boop/espadavilla-com`
- Local repos:
  - `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
  - `C:\Users\rbend\Desktop\Claude Projects\LinkendIN Agent`
  - `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`

## Root cause #1 — approved post never published (Next.js fetch cache)
**Symptom:** a draft sat at `status='approved'` but `drain-approved` kept
returning an empty result set and never published it.

**Why:** Next.js App Router patches global `fetch` and caches GET responses by
default. `supabase-js` reads via `fetch`, so the `status=eq.approved` GET got
cached as an empty array on an early cron run (when nothing was approved) and
every later drain reused that stale empty result. Inserts/updates are POSTs and
were never cached — which is why writes worked while reads went stale, and why
local runs and fresh deploys always looked fine (different/empty cache).

**Fix:** `src/lib/supabase.ts` — create the client with a no-store fetch:
`global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) }`.
Covers every read (drain, resolver, pipeline). Commit `85b9f97`.
Verified in prod with a sentinel approved row: drain now reads it fresh.

## Root cause #2 — deploys weren't reaching production
- Local commit `f4ec7d0` (the golfvilla→espadavilla chrome/prompt fix) had never
  been pushed; remote `main` was still at `379dfb0`. Now pushed.
- The espadavilla **Vercel project was not Git-connected** — all prior deploys
  were CLI (`vercel --prod`) only, so `git push` did nothing. Connected it
  (Settings → Git → `rbender-boop/espadavilla-blog-agent`, branch `main`).
  It now auto-deploys on push. (linkedin-agent and golfvilla were already
  Git-connected and auto-deploy fine.)

## Manual publish helper (committed)
`scripts/publish-one-local.ts` — runs the real `publishApprovedDraft` against the
live DB + repo from local, bypassing prod. Used to publish the first post while
the drain bug was still being diagnosed. Usage:
`npx tsx scripts/publish-one-local.ts <draftId>`. Keep as a break-glass tool.

## Feature — EV/GV approval-prefix routing (eliminates shared-WhatsApp collision)
**Problem:** the LinkedIn agent, golfvilla blog, and espadavilla blog all share
one WhatsApp self-chat. A bare "yes" was ambiguous and previously got consumed by
the wrong agent. The old guards (staggered cron days + freshest-pending router)
were not robust under manual/off-day testing.

**Design (additive — bare replies still behave as before):** routing is decided
in the LinkedIn webhook (the single inbound brain) by an explicit project tag:
- reply starts with `EV` → strip tag → forward ONLY to espadavilla resolver
- reply starts with `GV` → strip tag → forward ONLY to golfvilla resolver
- anything else → unchanged (LinkedIn's own flow + existing fallback)

So `EV YES` only ever touches espadavilla; `GV YES` only golfvilla; the other
agents never see it (so e.g. golfvilla can't silently save `EV YES` as an edit).

**Files changed:**
- linkedin-agent: `src/app/api/webhooks/unipile/route.ts` (prefix short-circuit at
  top of `handleWhatsAppReply`), `src/lib/blog-forward.ts` (`forwardToBlogTarget`).
  Commit `25c077bd`.
- espadavilla: `src/lib/whatsapp/send-draft.ts` (message → `EV YES`/`EV NO`),
  `src/lib/whatsapp/parse-reply.ts` (strips a leading `EV` tag, defense-in-depth).
  Commit `a958dae8`.
- golfvilla: same two files, `GV` variant. Commit `92e77f40`.

**Env vars set on linkedin-agent Vercel (required for EV routing):**
- `BLOG_RESOLVE_URL_ESPADAVILLA` = `https://espadavilla-blog-agent.vercel.app/api/inbound/resolve`
- `BLOG_RESOLVE_SECRET_ESPADAVILLA` = espadavilla's `INBOUND_RESOLVE_SECRET`
- (golfvilla pair `BLOG_RESOLVE_URL` + `INBOUND_RESOLVE_SECRET` already present)

**End-to-end test (passed):** fired draft pipeline → `tennis-and-padel-cap-cana`
draft → WhatsApp → replied `EV YES` → linkedin webhook routed to espadavilla
resolver (`inbound_resolve` success 23:16:01) → published (`publish` success
23:16:03, commit `8488df0b`).

## How the loop works now (operational reference)
1. `draft-weekly-post` cron (Thu) enqueues a job; `blog-pipeline-worker` advances
   it pick_topic → research → draft → enforce → guard → persist → notify.
2. `notify` sends Rob a WhatsApp ending in: reply `EV YES` / `EV NO` / edit.
3. Rob replies `EV YES` in the shared self-chat.
4. linkedin-agent webhook receives it, sees the `EV` tag, strips it, forwards
   `YES` only to espadavilla `POST /api/inbound/resolve`.
5. espadavilla resolver matches the pending `blog_approval_messages` row → sets
   draft `approved` → `publishApprovedDraft` renders + commits post/index/sitemap
   to `espadavilla-com main` (one atomic commit) → Vercel auto-deploys the site.
6. `drain-approved` cron (every 15 min) is the retry net for any draft left
   `approved` (now reads fresh thanks to the no-store fix).

To fire a manual test: `GET /api/cron/draft-weekly-post` then
`GET /api/cron/blog-pipeline-worker` with `Authorization: Bearer <CRON_SECRET>`.

## Open items / notes
- Diagnostic logging that was temporarily added to `drain-approved` has been
  removed; its `drain_diag` rows in `blog_agent_runs` were cleaned up.
- Bare replies (no prefix) still route via the old freshest-pending logic to
  LinkedIn/golfvilla. If you want full strictness, add an `LI` prefix requirement
  to the LinkedIn agent too — not done, not required.
- The original 20:56 publish failure (GitHub 404 on get-a-reference) was prod
  lacking a working `GITHUB_TOKEN_ESPADAVILLA` at that moment; resolved after the
  token was set + redeploy. Token confirmed good (local curl 200, live publishes).
- Staggered cron days remain (golfvilla Mon / espadavilla Thu) as a secondary
  guard, but the prefix is now the primary disambiguator.

## Working preferences (Rob)
- Run SQL directly via Supabase MCP (never hand back code blocks); project_id
  `qqjrujrrqxtfsuikakuu`.
- Rob does all git pushes himself — give the full command. PowerShell 5: use `;`
  not `&&` to chain.
- Send full file paths in chat at every handover. Keep explanations brief.
- Claude does NOT enter secrets/keys/tokens into fields (Vercel env etc.) — Rob
  does that; Claude can run SQL, edit code, deploy, and generate values locally.
