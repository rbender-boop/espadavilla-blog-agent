# espadavilla-blog-agent — BUILD PLAN (Phase 5)

**Created:** 2026-06-09
**Author of plan:** carried over from the golfvilla-blog-agent investigation session.
**Status:** not yet started. This folder contains ONLY this plan. Execute the steps below.

---

## 0. What this is
An autonomous weekly SEO blog agent for **espadavilla.com** — a clone of the proven
`golfvilla-blog-agent` engine, repointed at espadavilla's own site, repo, Supabase
project, GSC property, and Vercel project. The engine (pipeline, job queue, GSC client,
decay/refresh loop, WhatsApp approval, publisher) is reused verbatim. Only the
site-specific content layer and the infra targets change.

**Source agent to clone from:**
`C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`

---

## 1. The goal difference (READ THIS FIRST — it drives every content choice)
golfvilla.com and espadavilla.com are the SAME villa (Villa Espada) but different sites
with different funnel positions:

- **golfvilla.com** = top-of-funnel CATEGORY-AUTHORITY play. Captures generic "golf villa"
  search intent, steers it to Cap Cana / Punta Espada, and funnels OUT to espadavilla.com
  as the money page. Has a HARD negative-geography guard (Portugal/Algarve/Spain/Florida).

- **espadavilla.com** = the property's OWN booking site. Bottom-of-funnel. Its blog is the
  destination/experience authority for people already circling Villa Espada and Cap Cana:
  trip planning, what-to-do, on-property experience, guest logistics, Cap Cana lifestyle.
  Money pages point INWARD to espadavilla.com itself (not out to another domain). The
  negative-geography guard is irrelevant here and should be dropped or replaced with a
  different steering rule (keep content on Villa Espada / Cap Cana, don't drift to generic).

---

## 2. Locked decisions (confirmed by Rob 2026-06-09)
1. **Separate folder:** this one (`espadavilla-blog-agent`), full clone. Golfvilla agent stays untouched.
2. **Separate Claude project:** work on this agent in its own Claude project (project-scoped memory; no cross-contamination with golfvilla).
3. **Separate Supabase project:** brand-new dedicated project. Reuse migrations 0001/0003/0004/0005/0007; write fresh espadavilla seed topics (replaces 0002/0006).
4. **Publish target:** `rbender-boop/espadavilla-com`, branch `main` (private repo, confirmed exists). New fine-grained GitHub PAT scoped to ONLY this repo.
5. **GSC:** reuse the EXISTING service account + domain-wide delegation (it already owns the espadavilla property). Just set `GSC_SITE_URL=sc-domain:espadavilla.com`. No new SA.
6. **Vercel:** new separate project. Crons staggered OFF Monday (golfvilla owns Monday) — use Thursday for the weekly run.
7. **WhatsApp routing:** fan-out + staggered days (see §6).

---

## 3. Clone vs. rewrite inventory

### Reuse verbatim (the engine — do NOT touch logic)
- `src/lib/gsc/*` — client, decay-detector, refresh-generator, topic-generator, topic-select
- `src/lib/drafting/pipeline.ts`, `generate-post.ts`, `overlap.ts`, `overlap-score.ts`, run-local helpers
- `src/lib/jobs/*` — job-store, run-worker
- `src/lib/publish/*` — github.ts, commit-post.ts, render-post.ts, site-chrome.ts, update-index.ts, update-sitemap.ts
- `src/lib/whatsapp/*`, `src/lib/unipile.ts`
- `src/lib/monitoring/*`, `src/lib/cleanup/*`
- `src/lib/voice/*`, `src/lib/voice-memory.ts`
- `src/lib/auth-utils.ts`, `src/lib/supabase.ts`
- ALL of `src/app/api/*` (cron routes, inbound, health) and `src/app/{layout,page}.tsx`
- Migrations `0001`, `0003`, `0004`, `0005`, `0007`
- `scripts/*` (gsc-check, gsc-diagnose, refresh-check, verify-offline, etc.)
- `package.json`, `tsconfig.json`, `next.config.mjs`, `.gitignore`

### Rewrite per-site (the content layer — these are the ONLY logic files that change)
- `src/lib/niche.ts` — voice + positioning (see §4.1)
- `src/lib/keywords.ts` — keyword/GEO targets + negative guard (see §4.2)
- `src/lib/keyword-clusters.ts` — intent taxonomy (see §4.3)
- `src/lib/links.ts` — site origin + money pages (see §4.4)
- `src/lib/config.ts` — `APP_BASE_URL` default → espadavilla Vercel domain

### Carries over UNCHANGED (same villa)
- `src/lib/facts.ts` — Villa Espada CANONICAL_FACTS is identical; same source of truth.

### Replace
- Migration `0002`/`0006` seed topics → new `0002_seed_espadavilla_topics.sql` with
  experience/destination topics (NOT category-funnel topics).
- `CLAUDE.md` — repoint repo name, domain, Supabase note; keep all safety rules.
- `.env.example` — repoint comments + defaults.

---

## 4. Site-specific file specs

### 4.1 `src/lib/niche.ts`
Replace the golfvilla "category authority" publication voice with espadavilla's
PROPERTY voice. This is the villa speaking as host, not a publication steering a category.
- `publication`: "Villa Espada" / espadavilla.com
- `tagline`: property-led (e.g. "Cap Cana's only direct-fairway estate" — pull exact from facts.ts distinction)
- `audience`: same affluent golf/group travelers, but framed as PROSPECTIVE GUESTS, not a readership
- `editorial_angle`: experience + trip-planning authority for guests considering/booked at Villa Espada. "Here's how to plan and make the most of your Cap Cana stay." NOT a golf-travel newsletter.
- `pillars`: Staying at Villa Espada · Cap Cana Experience · Planning Your Trip · Golf at Punta Espada · Dining & Chef · Group & Occasion guides
- Keep all the VOICE_PROFILE craft rules (no hype words, white space, reader-benefit H2s).
- DROP the golfvilla rule "steer generic golf-villa intent toward Cap Cana" — espadavilla
  is already the destination; replace with "keep every post anchored to the real Villa
  Espada experience and Cap Cana; never generic."

### 4.2 `src/lib/keywords.ts`
Rebuild from espadavilla's OWN GSC data — do NOT reuse golfvilla anchors.
- FIRST STEP: run `scripts/gsc-check.ts` against `sc-domain:espadavilla.com` to pull the
  real top queries/impressions, then build TIER1_ANCHORS + TIER2_HEAD_TERMS from THAT.
- ENTITY_CLUSTER carries over (Villa Espada, Punta Espada, Cap Cana, Las Iguanas, Eden Roc).
- GEO_QUESTIONS: reframe to guest-intent ("What's included at Villa Espada?", "How many
  does Villa Espada sleep?", "What golf can I play from Villa Espada?", "How far is Villa
  Espada from PUJ?", "Is Villa Espada all-inclusive?") — booking-stage questions.
- NEGATIVE_TERMS: the Portugal/Algarve/Spain/Florida guard is golfvilla-specific. For
  espadavilla, EITHER drop the hard guard OR repurpose `checkNegativeList` as a "stay
  on-property/on-Cap-Cana" steer. Decision needed at build time; default = drop the hard
  geo guard, keep the function as a no-op or light advisory so the pipeline still compiles.
- IMPORTANT: pipeline.ts imports `checkNegativeList` and `buildKeywordPromptBlock` — keep
  those EXPORT SIGNATURES identical so the engine compiles unchanged.

### 4.3 `src/lib/keyword-clusters.ts`
Rebuild clusters around guest/experience intent rather than category-commercial intent.
Keep `clusterBySlug`, `buildClusterTaxonomyBlock`, `checkSoftAvoid` signatures identical.
Suggested clusters: stay/booking · experience · golf-planning · dining · group-occasion ·
cap-cana-logistics. Soft-avoid: generic "golf villa" category terms (those belong to
golfvilla.com — avoid cannibalizing the sister site).

### 4.4 `src/lib/links.ts`
- `SITE_ORIGIN = 'https://www.espadavilla.com'`
- Money pages point INWARD to espadavilla.com pages (book/availability, the property
  pages, contact). Pull the real stable URLs from the espadavilla-com repo before
  hardcoding — never guess (same rule as golfvilla).
- Keep `resolveMoneyLinks`, `postUrl`, `postRepoPath` signatures identical.
- Decide blog URL structure to match espadavilla-com's hosting (check its vercel.json /
  cleanUrls + trailingSlash before setting postRepoPath).

---

## 5. Build sequence (execute in the NEW Claude project)
1. **Clone source.** Copy the golfvilla agent into this folder EXCLUDING `node_modules`,
   `.next`, `.git`, `.vercel`, `.env.local`. (Copy source, configs, scripts, migrations, docs-as-reference.)
2. **Fresh git.** `git init`, set remote later. Add a `.gitignore` (copy from source).
3. **Install.** `bun install` (engine uses Bun; pass `--env-file=.env.local` for scripts).
4. **New Supabase project.** Create it in the Supabase dashboard. Run migrations
   0001/0003/0004/0005/0007 via Supabase MCP — **always pass the NEW project_id explicitly**
   (the MCP defaults to the wrong project if omitted). Then apply the new seed migration.
5. **Rewrite the 5 content files** per §4. `facts.ts` unchanged.
6. **New seed topics** migration (experience/destination angle).
7. **Repoint config:** `CLAUDE.md`, `.env.example`, `config.ts` default URL,
   `github.ts` default repo (`GOLFVILLA_REPO` → rename concept to espadavilla; env var
   `ESPADAVILLA_REPO=rbender-boop/espadavilla-com`, or keep the generic name and just set env).
8. **GSC pull** for espadavilla → finalize keywords.ts (§4.2).
9. **Typecheck + smoke:** `npm run typecheck` and `npm run smoke` must pass before deploy.
10. **Vercel project:** new project, set all env vars (§7), staggered crons (§6).
11. **LinkedIn agent change** (§6) — add espadavilla resolve URL to its forward list.
12. **First end-to-end test** with loosened thresholds, exactly as golfvilla was verified.

---

## 6. WhatsApp routing + cron staggering
**Routing:** the LinkedIn agent's Unipile webhook is the single inbound brain. Add
espadavilla's `/api/inbound/resolve` as a SECOND forward target (fan-out). Each blog agent
matches the reply against its OWN `blog_approval_messages` by chat_id + most-recent
unresolved; non-owner returns "no match." One-line-ish change in the LinkedIn agent; zero
change to the blog resolver logic.

**Staggering (eliminates the only ambiguity case):** golfvilla owns Monday. espadavilla
runs Thursday. Set `vercel.json` crons to Thursday so the two agents never have overlapping
pending approvals in the shared WhatsApp thread:
```
post-refresh          0 11 * * 4
gsc-topics            0 12 * * 4
draft-weekly-post     0 13 * * 4
blog-pipeline-worker  */2 13-16 * * 4
drain-approved        */15 * * * *   (unchanged)
expire-stale-drafts   0 9 * * *      (unchanged)
failure-monitor       0 * * * *      (unchanged)
voice-refinement      0 15 * * 0     (unchanged)
```

---

## 7. Env vars (new values; Rob pastes secrets himself)
- `ANTHROPIC_API_KEY` — can reuse
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — NEW project
- `UNIPILE_API_KEY` / `UNIPILE_DSN` / `UNIPILE_WHATSAPP_ACCOUNT_ID` / `UNIPILE_WHATSAPP_OWNER_NUMBER` — same shared WhatsApp
- `INBOUND_RESOLVE_SECRET` — set same value in the LinkedIn agent's forward call
- `GITHUB_TOKEN_*` — NEW fine-grained PAT scoped to rbender-boop/espadavilla-com ONLY
- `ESPADAVILLA_REPO=rbender-boop/espadavilla-com`
- `GSC_SERVICE_ACCOUNT_JSON` (base64) — reuse golfvilla's SA key
- `GSC_IMPERSONATED_SUBJECT=rbender@fortisnetlease.com` — reuse
- `GSC_SITE_URL=sc-domain:espadavilla.com` — NEW
- `CRON_SECRET` — any string (Rob's call; he is not rotating golfvilla's)
- `APP_BASE_URL` — new espadavilla Vercel domain
- `DASHBOARD_ALLOWED_EMAIL=rbender@fortisnetlease.com`, `DASHBOARD_PASSWORD`

Reminder: all Vercel secrets are write-only (`vercel env pull` returns them empty).
`.env.local` is gitignored and must be populated by hand. Bun needs `--env-file=.env.local`.

---

## 8. Things needing Rob during the build
- Create the new Supabase project → hand over its project_id + URL + service role key.
- Provision the new GitHub fine-grained PAT (write, scoped to espadavilla-com only).
- Create the new Vercel project + paste all env secrets.
- Confirm the negative-geography guard decision for keywords.ts (default: drop hard guard).
- Approve the espadavilla money-page URL list (pulled from the espadavilla-com repo).
- Provide/confirm the espadavilla blog URL path convention (check espadavilla-com hosting config).

## 9. Safety rules (carry over from golfvilla CLAUDE.md — unchanged)
- Run all SQL directly via Supabase MCP — never hand back as a code block. Always pass the
  NEW project_id explicitly.
- Additive SQL runs without asking; DESTRUCTIVE ops need explicit "go" with blast radius shown.
- The deployed agent commits ONLY to espadavilla-com, ONLY to main, ONLY after a WhatsApp
  "yes", under a token scoped to that one repo. Never force-push. Never touch other repos.
- Rob does interactive git pushes himself — write code, hand him the full push command.
- Villa facts ONLY from facts.ts. Timely facts ONLY from a cited web_search result.
- Model pin: claude-sonnet-4-5-20250929 across all surfaces.

## 10. Key IDs / paths
- This agent: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- Source agent: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- Publish repo: `rbender-boop/espadavilla-com` (main, private)
- GSC property: `sc-domain:espadavilla.com`
- GSC SA: `search-console-agent@golfvilla-search-console.iam.gserviceaccount.com` (reused, domain-wide delegation)
- Supabase: NEW project — project_id `qqjrujrrqxtfsuikakuu`, URL https://qqjrujrrqxtfsuikakuu.supabase.co (name "esapadavillablogagent", us-east-1). Migrations 0001/0003/0004/0005/0007 APPLIED 2026-06-09.
- Vercel: project_id `prj_LlQslaqdJQOgCzYfryGbG8XNkXT1`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1` (robert-benders-projects), name "espadavilla-blog-agent", domain espadavilla-blog-agent.vercel.app. DEPLOYED to production 2026-06-09; all env vars set; health 200 with all checks true; Thursday crons live.

## 11. Resolved at build time (2026-06-09 — read from the live site + GSC, do not re-derive)
**URL convention (from espadavilla-com/vercel.json):** `cleanUrls:true`, `trailingSlash:false`,
canonical host `https://www.espadavilla.com`. Blog posts are stored in the repo as
`blog/<slug>.html` and served at `/blog/<slug>` (NO .html, no trailing slash).
→ links.ts: `SITE_ORIGIN='https://www.espadavilla.com'`; `postUrl = SITE_ORIGIN + '/blog/' + slug`;
  `postRepoPath = 'blog/' + slug + '.html'`.

**Money pages (INWARD link targets, all live + served extensionless):**
`/villa` (property hero), `/rates` (rates+booking), `/contact` (inquiry/conversion),
`/amenities`, `/experiences` (+ `/experiences/<slug>`), `/golf` (+ `/golf-courses/<slug>`),
`/gallery`, `/faq`, `/property-facts`, `/compare/<slug>`, `/occasions/<slug>`.
NOTE: there is NO `/book` or `/availability` page — `/rates` + `/contact` are the conversion pages.

**negative-geo guard decision:** DROP hard guard; keep `checkNegativeList` as a light no-op/advisory.

**GSC picture (90d):** young/low-traffic. Page-1 real intent = `villa espada` (brand),
`casa de campo vs cap cana` (comparison), `punta espada` (golf entity). SOFT-AVOID the big
`best caribbean golf resorts/courses/destinations` cluster (espadavilla ranks pos 40-90 there;
it's golfvilla.com's category territory — don't cannibalize). ~60 blog posts already exist;
seed topics must be NET-NEW (e.g. existing: cap-cana-guide, getting-to-cap-cana, juanillo-beach-guide,
eden-roc-cap-cana-guide, what-is-included-cap-cana-villa, private-chef-villa, corporate-retreat-cap-cana).
- Runtime: Bun; `npx tsx` for scripts. Verify: `npm run typecheck` + `npm run smoke`.

---
*End of build plan. The new Claude project should execute §5 in order.*
