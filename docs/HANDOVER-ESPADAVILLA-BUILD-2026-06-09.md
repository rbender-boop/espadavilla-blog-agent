# HANDOVER — espadavilla-blog-agent build (2026-06-09)

Session that executed BUILD-PLAN §5 steps 1–9 (everything except deploy). The agent
is a verbatim clone of golfvilla-blog-agent with only the content layer + infra
targets changed. Engine logic (pipeline, jobs, gsc, publish, whatsapp, decay) reused.

## Status: BUILD COMPLETE except deploy
- typecheck: clean. `npm run smoke`: ALL CHECKS PASSED.
- Supabase schema live + seeded. Content layer rewritten + verified.
- NOT yet: GitHub PAT, Vercel project, LinkedIn-agent fan-out, first e2e test.

## Key IDs
- Agent folder: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- Supabase: project_id `qqjrujrrqxtfsuikakuu`, https://qqjrujrrqxtfsuikakuu.supabase.co
- Publish repo: `rbender-boop/espadavilla-com` (main, private) — blog posts at `blog/<slug>.html`
- GSC property: `sc-domain:espadavilla.com` (reused SA, verified working)

## Done this session
1. Clone (robocopy, excl node_modules/.next/.git/.vercel/.env.local) + `git init` + `bun install`.
2. Migrations 0001/0003/0004/0005/0007 applied via Supabase MCP (explicit project_id).
3. Seed migration `0002_seed_espadavilla_topics.sql` — 8 net-new experience/destination topics, all status=queued, source='seed-espadavilla-2026-06-09'.
4. Content rewrites (ALL export signatures preserved so the engine compiles unchanged):
   - `src/lib/niche.ts` — property/host voice (Villa Espada), pillars, /contact CTA.
   - `src/lib/keywords.ts` — GSC-grounded TIER1/TIER2 + guest GEO questions; NEGATIVE_TERMS=[] and checkNegativeList is a NO-OP (hard geo guard dropped per Rob).
   - `src/lib/keyword-clusters.ts` — guest/experience clusters (stay, group_occasion, golf, experience, dining, logistics, comparison); SOFT_AVOID = golfvilla's generic-golf lane.
   - `src/lib/links.ts` — SITE_ORIGIN=www.espadavilla.com; INWARD money pages; primary CTA /contact; postRepoPath = `blog/<slug>.html` (FLAT, not /index.html); postUrl extensionless.
   - `src/lib/config.ts` — APP_BASE_URL default → espadavilla.
5. `src/lib/gsc/topic-select.ts` — NECESSARY content adaptation (was golfvilla-coupled): ENTITY_SIGNAL repointed to Villa Espada/Cap Cana entities (dropped generic 'caribbean'/'golf villa'), added isSoftAvoid() drop, proposeTitle switch → espadavilla cluster slugs, DEFAULT_CLUSTER → 'stay'. Selection ALGORITHM unchanged. This prevents the selector minting cannibalizing generic-golf topics.
6. Repoints: `src/lib/publish/github.ts` (GITHUB_TOKEN_ESPADAVILLA + ESPADAVILLA_REPO, default rbender-boop/espadavilla-com), `package.json` name, `CLAUDE.md`, `.env.example`, `.env.local` keys, `vercel.json` crons → Thursday (golfvilla owns Monday).
7. `scripts/verify-offline.ts` — updated negative-guard + GSC test fixtures to espadavilla expectations (no-op guard, soft-avoid drop, 'stay' cluster).

## .env.local state (gitignored)
- FILLED: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GSC_SERVICE_ACCOUNT_JSON (reused from golfvilla), GSC_IMPERSONATED_SUBJECT, GSC_SITE_URL=sc-domain:espadavilla.com, ESPADAVILLA_REPO, APP_BASE_URL (placeholder), DASHBOARD_ALLOWED_EMAIL.
- EMPTY (Rob to fill for runtime/Vercel): ANTHROPIC_API_KEY, UNIPILE_* (live only in Vercel), INBOUND_RESOLVE_SECRET, GITHUB_TOKEN_ESPADAVILLA, CRON_SECRET, DASHBOARD_PASSWORD.

## Resolved from the live espadavilla-com repo (do not re-derive)
- vercel.json: cleanUrls=true, trailingSlash=false, canonical host www.espadavilla.com.
- Money pages (live): /villa /rates /contact /amenities /experiences(+/<slug>) /golf /golf-courses/<slug> /gallery /faq /property-facts /compare/<slug> /occasions/<slug>. NO /book or /availability — /rates + /contact are conversion pages.
- ~60 blog posts already exist; seed + auto-topics must stay net-new.

## GSC picture (90d, espadavilla is young/low-traffic)
- Page-1 real intent: `villa espada` (brand), `casa de campo vs cap cana`, `punta espada` (entity).
- SOFT-AVOID the big `best caribbean golf resorts/courses/destinations` cluster (pos 40–90; golfvilla.com's lane).

## Remaining (deploy — needs Rob)
1. New fine-grained GitHub PAT, WRITE, scoped to rbender-boop/espadavilla-com ONLY → Vercel env + .env.local GITHUB_TOKEN_ESPADAVILLA.
2. New Vercel project + all env secrets (§7 of BUILD-PLAN). Record project_id + domain in BUILD-PLAN §10; set APP_BASE_URL.
3. LinkedIn agent: add espadavilla's /api/inbound/resolve as a 2nd forward target (fan-out), same INBOUND_RESOLVE_SECRET.
4. First e2e test with loosened thresholds (mirror golfvilla verification).

## Agent-repo git
Fresh `git init` only; NO remote set yet. If Rob wants version control for the agent
itself, create a private `rbender-boop/espadavilla-blog-agent` and add it as origin.
(This is SEPARATE from the publish target espadavilla-com.)
