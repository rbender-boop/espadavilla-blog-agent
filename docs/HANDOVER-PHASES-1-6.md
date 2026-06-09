# golfvilla-blog-agent — HANDOVER (Phases 1–6, full build)

**Status:** ✅ Built end-to-end. Typecheck clean, `next build` green (9 routes), offline
verification harness passes 26/26. Data layer is **live** on a dedicated Supabase project.
**Date:** 2026-06-07

This is the autonomous weekly SEO blog agent for golfvilla.com: drafts a post in brand
voice (grounded in CANONICAL-FACTS + live web_search), WhatsApps it to Rob, and on "yes"
commits the rendered post + blog index + sitemap to `rbender-boop/golfvilla-com` main in one
atomic commit. Vercel auto-deploys.

---

## What's live already (provisioned this session)

- **Dedicated Supabase project** `golfvilla-blog-agent` — ref **`genidekhqwsxvsboyrih`**,
  org Fortis Capital Solutions Group, region us-east-2. URL: `https://genidekhqwsxvsboyrih.supabase.co`.
- Migrations applied: `0001_init_blog_schema` (5 `blog_*` tables) + `0002_seed_blog_topics`.
- **10 topics seeded** (priority order). Next up: *"Corales Puntacana Championship 2026…"* (priority 10).
- Migration SQL also lives in `supabase/migrations/` as the portable source of truth.

---

## Phase-by-phase

### Phase 1 — Data + topics
- `supabase/migrations/0001_init_blog_schema.sql`, `0002_seed_blog_topics.sql` (additive, idempotent).
- `src/lib/facts.ts` — CANONICAL-FACTS as a typed module + `buildFactsPromptBlock()` + `checkVillaFacts()`
  fabrication guard. **Note:** canonical facts (10 baths, 10,000+ sq ft, $2,500/$4,500/$6,500) differ from
  the live site's older figures — canonical wins, per the grounding rule.
- `src/lib/keywords.ts` — Tier 1/2 anchors, GEO questions, entity cluster, **absolute negative list**
  (Portugal/Algarve/Spain/Florida) + `checkNegativeList()` guard.
- `src/lib/niche.ts` — golfvilla.com publication voice (not the broker persona, not a generic travel blog).

### Phase 2 — Drafter
- `src/lib/drafting/generate-post.ts` — single Claude call (`claude-sonnet-4-5-20250929`), **web_search
  enabled**, JSON output contract, retry-on-malformed-JSON, meta-title/description length enforcement
  (one corrective retry + hard-trim), 1,200–1,800-word check, and both guards. Flagged drafts get
  `risk_score=1.0` + `block_reason` and stay `pending` (never auto-sent).
- `src/lib/links.ts` — money-page URL resolver (real golfvilla URLs; publish layer re-resolves from the live sitemap).
- `src/lib/voice-memory.ts` — read side feeds learned memories into the drafter prompt.
- Local runner: `bun run draft:local [topic_id]` — prints the full post + SEO bundle, sends nothing.

### Phase 3 — Approval loop
- `src/lib/whatsapp/send-draft.ts` — mobile-formatted draft + `blog_approval_messages` log. Skips flagged drafts.
- `src/lib/whatsapp/parse-reply.ts` — Flow A (yes / no / edit→confirm→yes). On skip, topic returns to the queue.
- `src/app/api/inbound/resolve/route.ts` — the blog agent's inbound entry point (auth: `INBOUND_RESOLVE_SECRET`).
  The LinkedIn webhook forwards unmatched replies here (see "Cross-repo" below). On "yes" → runs the publisher.
- Local runner: `bun run send:drafts`.

### Phase 4 — Publish executor ★
- `src/lib/publish/render-post.ts` — golfvilla template (GTM-N59QFL4G, nav, footer, /css/main.css, /js/main.js
  — mirrored verbatim from the live `/golf-villa-facts/` page), full SEO meta + canonical (`/blog/<slug>`,
  extensionless, no trailing slash) + **BlogPosting JSON-LD + exactly one FAQPage** + safe markdown→HTML body.
- `src/lib/publish/update-sitemap.ts` — **surgical idempotent insert** before `</urlset>`. *Deliberately does NOT
  run the repo's `generate_sitemap.py`* — that script is stale and would delete ~60 live `/from/*` URLs.
- `src/lib/publish/update-index.ts` — creates `/blog/` listing page if absent; idempotent newest-first card insert.
- `src/lib/publish/github.ts` — Octokit; ONE atomic commit (blobs→tree→commit→fast-forward), never force-push,
  `GOLFVILLA_REPO` only.
- `src/lib/publish/commit-post.ts` — orchestrator `publishApprovedDraft()`: idempotent (never double-commits),
  records `committed_path`/`live_url`/`published_at`, marks topic published, logs the run, WhatsApps the live URL.

### Phase 5 — Crons + monitoring (`vercel.json`)
- `draft-weekly-post` — `0 13 * * 1` (Mon ~9am ET): draft next topic, send for approval.
- `drain-approved` — every 15 min: publish anything stuck in `approved` (idempotent).
- `expire-stale-drafts` — `0 9 * * *`: auto-skip drafts unanswered > 72h (`STALE_DRAFT_HOURS`), re-queue topic.
- `failure-monitor` — `0 * * * *`: WhatsApp digest of failed runs.
- All cron routes gated by `isAuthorizedCron` (Bearer `CRON_SECRET`).

### Phase 6 — Edit-learning loop
- `src/lib/voice/refine-from-edits.ts` + `voice-refinement` cron (`0 15 * * 0`): analyses Rob's edits, writes
  concrete patterns to `blog_voice_memories`, which the drafter injects next run.

### Cross-repo (LinkedIn agent — additive, fail-open)
- `LinkedIn Agent/src/lib/blog-forward.ts` + a small patch to `…/webhooks/unipile/route.ts`: on the **no-match**
  path only, forwards `{chat_id, text}` to the blog resolver. Unset envs = no-op. LinkedIn agent typechecks clean.

---

## ⚠️ What Rob must wire (no secrets were hardcoded)

**golfvilla-blog-agent (Vercel project — create from this repo):**
| Env | Where to get it |
|-----|-----------------|
| `SUPABASE_URL` | `https://genidekhqwsxvsboyrih.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → project `golfvilla-blog-agent` → Settings → API → service_role |
| `ANTHROPIC_API_KEY` | same key as the LinkedIn agent |
| `UNIPILE_API_KEY`, `UNIPILE_DSN`, `UNIPILE_WHATSAPP_ACCOUNT_ID`, `UNIPILE_WHATSAPP_OWNER_NUMBER` | copy from LinkedIn agent env |
| `GITHUB_TOKEN_GOLFVILLA` | **fine-grained PAT, write scope, `rbender-boop/golfvilla-com` ONLY** — provision this |
| `GOLFVILLA_REPO` | `rbender-boop/golfvilla-com` |
| `CRON_SECRET` | any random string |
| `INBOUND_RESOLVE_SECRET` | any random string — **must match** the LinkedIn agent value |

**LinkedIn agent (existing Vercel project) — add two envs + redeploy:**
- `INBOUND_RESOLVE_SECRET` = (same random string as above)
- `BLOG_RESOLVE_URL` = `https://<blog-agent-domain>/api/inbound/resolve`

> The fine-grained GitHub PAT is the only真 blocker for live publishing (Phase 4). Everything else is copy-paste.

---

## How to run / test
```
cp .env.example .env.local      # fill in
bun install
bun run verify:offline          # 26/26 deterministic checks (no secrets needed)
bun run draft:local             # needs ANTHROPIC_API_KEY + SUPABASE_* — drafts next topic, prints it
bun run send:drafts             # needs UNIPILE_* — sends pending drafts to WhatsApp
bun run dev                     # http://localhost:3000 → /api/health
```

## Push commands (Rob runs — interactive pushes stay yours)
```
# 1) blog agent
cd "C:/Users/rbend/Desktop/Claude Projects/golfvilla-blog-agent"
git add -A && git commit -m "Phases 1-6: data, drafter, approval loop, publisher, crons, edit-learning" && git push origin main

# 2) LinkedIn agent (additive forwarding patch only)
cd "C:/Users/rbender/Desktop/Claude Projects/LinkendIN Agent"   # note path
git add -A && git commit -m "blog: forward unmatched WhatsApp replies to golfvilla blog resolver (additive, fail-open)" && git push origin main
```
Then: import the blog repo into Vercel, set the env vars above, redeploy the LinkedIn agent, and point the
golfvilla-com Vercel project's auto-deploy at `main` (already wired). First live run is Monday's
`draft-weekly-post`, or trigger it manually with the `CRON_SECRET` Bearer.

## One intentional spec deviation (flagged for awareness)
The spec said "regenerate sitemap.xml via golfvilla's generator." The repo's `generate_sitemap.py` is **stale**
(emits ~10 URLs vs the ~70 the live file hand-maintains, including all `/from/*` pages). Regenerating would have
**deleted ~60 live URLs**. The publisher instead does a surgical, idempotent insert that preserves everything —
verified against the real `sitemap.xml` in `verify:offline`.
