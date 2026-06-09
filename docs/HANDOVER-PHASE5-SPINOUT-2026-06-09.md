# HANDOVER — Phase 5 spun out to its own folder/project

**Date:** 2026-06-09

## What happened this session
- Verified Phase 4 (refresh/decay loop) was committed + pushed: `main` is now at `eb16940`
  (was `3f3684b` / Phase 3). Vercel auto-deploys.
- Decided NOT to rotate `CRON_SECRET` — Rob's call, item dropped. (RLS still deferred.)
- Investigated the codebase to plan Phase 5 (espadavilla.com blog agent) and spun it out
  into a SEPARATE folder and SEPARATE Claude project — no shared state with golfvilla.

## Phase 5 = espadavilla-blog-agent (separate everything)
- **New folder:** `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- **Build plan:** `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\BUILD-PLAN.md`
  (complete spec — clone inventory, per-file specs, 12-step sequence, env checklist).
- **Separate Claude project** so memory is project-scoped and never mixes with golfvilla.
- Clone of this engine; only the content layer (`niche/keywords/keyword-clusters/links/config`)
  + infra targets change. `facts.ts` is identical (same villa).

### Locked decisions
- Separate Supabase project (new project_id, reuse migrations 0001/0003/0004/0005/0007).
- Publish target `rbender-boop/espadavilla-com` (main, private — confirmed exists), new
  repo-scoped PAT.
- GSC: reuse existing SA + domain-wide delegation; `GSC_SITE_URL=sc-domain:espadavilla.com`.
- New Vercel project; crons staggered to **Thursday** (golfvilla owns Monday).
- WhatsApp: LinkedIn webhook fans out to BOTH blog resolve endpoints; staggered days
  eliminate approval ambiguity. Requires a small change to the LinkedIn agent later.

## Golfvilla agent status: unchanged + stable
This repo was not modified beyond the Phase 4 push. All future espadavilla work happens
in the new folder/project. A noted future sibling: `rbender-boop/villasincapcana-com`
(another funnel site, possible later blog target — out of scope for now).

## Open items carried forward (golfvilla)
- RLS still disabled on `blog_*` tables (deferred security decision).
- `CRON_SECRET` intentionally NOT rotated.
