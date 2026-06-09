# HANDOVER — espadavilla-blog-agent (2026-06-09, post-deploy)

Continuation doc for a FRESH chat session. Build steps 1–10 are DONE and the agent
is LIVE in production. Only steps 11 (LinkedIn fan-out) + 12 (first e2e test) remain.
Clone of golfvilla-blog-agent; engine reused verbatim, only the content layer + infra
targets differ.

## STATUS: LIVE IN PRODUCTION (steps 1–10 complete)
- https://espadavilla-blog-agent.vercel.app/api/health → 200, ALL env checks true.
- Schema + 8 seed topics in Supabase. Content layer rewritten, typecheck clean, smoke ALL PASS.
- Thursday crons scheduled. Publishes to rbender-boop/espadavilla-com main after a WhatsApp "yes".

## KEY IDS / PATHS
- Agent folder: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- Source engine (reference): `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- LinkedIn agent (inbound brain, step 11 edits go here): `C:\Users\rbend\Desktop\Claude Projects\LinkendIN Agent`
- Supabase: project_id `qqjrujrrqxtfsuikakuu` (https://qqjrujrrqxtfsuikakuu.supabase.co). Migrations 0001/0002(seed)/0003/0004/0005/0007 applied. Run SQL via Supabase MCP, ALWAYS pass this project_id.
- Vercel: project_id `prj_LlQslaqdJQOgCzYfryGbG8XNkXT1`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1` (scope slug `robert-benders-projects`), domain espadavilla-blog-agent.vercel.app. All env vars set in Production. CLI authenticated (VERCEL_TOKEN in env); `vercel --prod --yes --scope robert-benders-projects` redeploys.
- Publish repo: `rbender-boop/espadavilla-com` (main, private). Blog posts = `blog/<slug>.html`, served `/blog/<slug>`.
- GSC property: `sc-domain:espadavilla.com` (reused SA, verified).
- Resolve endpoints (live): POST https://espadavilla-blog-agent.vercel.app/api/inbound/resolve ; GET .../api/inbound/pending (both auth via `x-inbound-secret` header).

## WHAT WAS DONE THIS BUILD
- Clone + git init (NO remote) + bun install.
- Migrations applied via MCP. Seed = `supabase/migrations/0002_seed_espadavilla_topics.sql`, 8 net-new topics, source='seed-espadavilla-2026-06-09', all status=queued.
- Content rewrites (export signatures preserved): niche.ts, keywords.ts, keyword-clusters.ts, links.ts, config.ts.
- keywords.ts: NEGATIVE_TERMS=[]; checkNegativeList is a NO-OP (hard geo guard dropped per Rob).
- keyword-clusters.ts: clusters = stay, group_occasion, golf, experience, dining, logistics, comparison. SOFT_AVOID = golfvilla's generic-golf lane.
- links.ts: SITE_ORIGIN=www.espadavilla.com; INWARD money pages; PRIMARY CTA = /contact; postRepoPath=`blog/<slug>.html` (FLAT).
- gsc/topic-select.ts: NECESSARY content adaptation — ENTITY_SIGNAL repointed to Villa Espada/Cap Cana (dropped generic 'caribbean'/'golf villa'), added isSoftAvoid() drop, proposeTitle → espadavilla cluster slugs, DEFAULT_CLUSTER='stay'. ALGORITHM unchanged.
- Repoints: github.ts (GITHUB_TOKEN_ESPADAVILLA + ESPADAVILLA_REPO), health/route.ts (env names + service label), layout.tsx + page.tsx (dashboard titles), package.json, CLAUDE.md, .env.example, vercel.json crons → Thursday.
- verify-offline.ts: GSC + negative-guard test fixtures updated to espadavilla.
- Vercel project created + all env vars set + deployed (twice; 2nd deploy fixed health route).

## .env.local (gitignored, local) — current contents
- FILLED: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GSC_SERVICE_ACCOUNT_JSON, GSC_IMPERSONATED_SUBJECT, GSC_SITE_URL, ESPADAVILLA_REPO, APP_BASE_URL, DASHBOARD_ALLOWED_EMAIL, DASHBOARD_PASSWORD (=7xPg4XQe0RnK69jtzqIa), CRON_SECRET, INBOUND_RESOLVE_SECRET, ANTHROPIC_API_KEY, UNIPILE_API_KEY, UNIPILE_DSN, UNIPILE_WHATSAPP_ACCOUNT_ID, UNIPILE_WHATSAPP_OWNER_NUMBER.
- EMPTY locally (but SET in Vercel): GITHUB_TOKEN_ESPADAVILLA (Rob added it straight to Vercel). Add to .env.local only if local publish-path testing is needed.
- Vercel Production has ALL of the above (verified: `vercel env ls production --scope robert-benders-projects`).

## REMAINING — STEP 11: LinkedIn agent fan-out
The LinkedIn agent is the SINGLE inbound webhook for the shared WhatsApp account. Its
`src/lib/blog-forward.ts` currently forwards no-match replies to ONE target via
`BLOG_RESOLVE_URL` + `INBOUND_RESOLVE_SECRET` (header `x-inbound-secret`), and
`getBlogPendingSentAt()` peeks ONE blog's /pending for the freshest-approval-wins router.
TO DO:
- Edit blog-forward.ts to support a SECOND target (espadavilla). Both forwardToBlogResolver()
  and getBlogPendingSentAt() must handle two blogs.
- SECRET MECHANICS (important): espadavilla's INBOUND_RESOLVE_SECRET is a FRESH 36-char value
  (in espadavilla Vercel + .env.local). golfvilla's original secret is masked/unrecoverable.
  So use a PER-TARGET secret: the LinkedIn agent sends golfvilla's existing secret to the
  golfvilla URL and espadavilla's secret to the espadavilla URL. Rob sets a new var in the
  LinkedIn agent's Vercel (e.g. BLOG_RESOLVE_URL_ESPADAVILLA + BLOG_RESOLVE_SECRET_ESPADAVILLA)
  = espadavilla's INBOUND_RESOLVE_SECRET (copy from espadavilla .env.local).
- espadavilla target URL: https://espadavilla-blog-agent.vercel.app/api/inbound/resolve
- Then redeploy the LinkedIn agent. Staggered cron days (Mon vs Thu) keep the freshest-approval
  router unambiguous, but it should still peek both blogs.
- NOTE: editing a separate LIVE production agent — confirm with Rob before changing it.

## REMAINING — STEP 12: first end-to-end test
- Trigger the pipeline by calling the cron route with the CRON_SECRET as Bearer:
  POST https://espadavilla-blog-agent.vercel.app/api/cron/draft-weekly-post
  header: `Authorization: Bearer <CRON_SECRET>` (CRON_SECRET is in .env.local / Vercel).
  Then the worker advances: blog-pipeline-worker route. Watch blog_agent_jobs + blog_post_drafts.
- This SENDS A REAL WHATSAPP to Rob and (on "yes") publishes to espadavilla-com. The
  approve→publish half only closes once step 11 is wired. Consider loosened thresholds first
  (mirror how golfvilla was verified — see golfvilla docs/HANDOVER-PHASE*).
- Confirm with Rob before firing (real message + possible real commit).

## WORKING PREFERENCES (Rob)
- Run SQL directly via Supabase MCP (never hand back code blocks); always pass project_id qqjrujrrqxtfsuikakuu.
- Rob does git pushes himself — give the full command. Agent repo has NO git remote yet.
- Send full file paths in chat at every handover. Keep explanations brief.
- Claude will NOT enter secrets/API keys/tokens/passwords into fields (Vercel env etc.) even with permission — Rob does that; Claude can deploy, run SQL, edit code, generate values into local files.
