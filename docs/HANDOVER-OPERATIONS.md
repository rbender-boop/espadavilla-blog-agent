# GolfVilla Blog Agent — Operations Handover

**Last updated:** 2026-06-07 (the day it went live)
**Status:** ✅ LIVE and operational. First post published. Weekly cron armed.
**Purpose:** Single reference for operating, debugging, and extending the autonomous weekly SEO blog agent for golfvilla.com. Read this first in any future session.

---

## 0. TL;DR — current state

- The agent drafts one SEO blog post/week for **golfvilla.com**, sends it to Rob on WhatsApp, and on **"yes"** commits the rendered post + blog index + sitemap to `rbender-boop/golfvilla-com` `main` in one atomic commit. Vercel auto-deploys.
- **First post is LIVE:** https://www.golfvilla.com/blog/corales-puntacana-championship-2026-caribbean-golf-villas (published 2026-06-07, golfvilla-com commit `b28a05d1`).
- **Next auto-draft:** Monday **2026-06-08, 9:00 AM ET** → topic *"Dominican Republic Tourism Is Surging…"* (priority 20). Then every Monday 9 AM ET.
- Both apps deployed & green on Vercel. Inbound WhatsApp routing between the two agents is fixed (see §6, the 2026-06-07 incident).
- **Nothing is required of Rob** except replying to the weekly WhatsApp draft (`yes` / `no` / paste edit).

---

## 1. Infrastructure inventory

| Thing | Value |
|---|---|
| **Blog repo (this project)** | `rbender-boop/golfvilla-blog-agent` (the AGENT). Local: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent` |
| **Money-site repo** | `rbender-boop/golfvilla-com` (where posts are published). Local: `…\GOLFVILLA-WEBSITE\Funnel Websites\golfvilla-com` |
| **LinkedIn agent repo** | `rbender-boop/linkedin-agent` (shares the WhatsApp inbound webhook). Local: `…\Claude Projects\LinkendIN Agent` |
| **Blog Vercel project** | `golfvilla-blog-agent` · `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j` · domain `golfvilla-blog-agent.vercel.app` |
| **LinkedIn Vercel project** | `linkedin-agent` · `prj_MxwwiCArQbII2fRdkyYIA9MGPnHG` · domain `linkedin-agent-drab.vercel.app` |
| **golfvilla-com Vercel project** | `golfvilla-com` · `prj_05lETg4V0kg5uWy0Qv43lBfh77Bc` (auto-deploys on push to main) |
| **Vercel team** | `robert-benders-projects` · `team_5kyP9NiGKlZKAM1kiPmrCpu1` |
| **Blog Supabase project (DEDICATED)** | `golfvilla-blog-agent` · ref **`genidekhqwsxvsboyrih`** · `https://genidekhqwsxvsboyrih.supabase.co` · org Fortis (`hfbadbnkjiirgtnxitwh`), us-east-2, ~$10/mo |
| **LinkedIn Supabase project** | `fortisgpt` · ref `ayupzgvoqgkvhtdikuvx` (separate; NOT used by the blog agent except the cross-agent webhook reads its `linkedin_approval_messages`) |
| **AI model (pinned)** | `claude-sonnet-4-5-20250929` everywhere (no version drift — locked decision). Drafting uses the Anthropic **web_search** server tool + a forced `emit_post` tool. |
| **WhatsApp** | SHARED Unipile account/number with the LinkedIn agent (no extra cost). |

---

## 2. Environment variables (set in Vercel — values live there, not in git)

**Blog project (`golfvilla-blog-agent`) — all 11 set & verified via `/api/health`:**
`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `UNIPILE_API_KEY`, `UNIPILE_DSN`, `UNIPILE_WHATSAPP_ACCOUNT_ID`, `UNIPILE_WHATSAPP_OWNER_NUMBER`, `INBOUND_RESOLVE_SECRET`, `GITHUB_TOKEN_GOLFVILLA` (fine-grained PAT, write scope, `golfvilla-com` ONLY), `GOLFVILLA_REPO=rbender-boop/golfvilla-com`, `CRON_SECRET`. Optional: `STALE_DRAFT_HOURS` (default 72), `APP_BASE_URL`.

**LinkedIn project — two added for the shared-inbound bridge:**
`INBOUND_RESOLVE_SECRET` (MUST equal the blog's value) and `BLOG_RESOLVE_URL=https://golfvilla-blog-agent.vercel.app/api/inbound/resolve`.

> ⚠️ `INBOUND_RESOLVE_SECRET` must be identical on both projects. Reusable helper to (re)push blog env from the LinkedIn agent's `.env.local`: `scripts/set-vercel-env.sh` (needs `BLOG_SR_KEY` env = blog service-role key).

---

## 3. The pipeline (end to end)

```
[draft-weekly-post cron, Mon 9am ET]
   → pick lowest-priority queued blog_topics row
   → generate-post.ts: Claude (sonnet-4-5) + web_search, forced emit_post tool
   → grounding guards: checkVillaFacts (CANONICAL-FACTS) + checkNegativeList (no Portugal/Spain/FL)
   → save blog_post_drafts (status='pending'); flagged drafts (risk_score=1) held, NOT sent
   → send-draft.ts: WhatsApp the draft to Rob; log blog_approval_messages (status='sent_for_approval')
        │
   Rob replies in WhatsApp self-chat → Unipile → LinkedIn agent webhook (single inbound)
        │  freshest-approval-wins router (see §6) routes to whichever agent's
        │  pending approval is newest → forwards to POST /api/inbound/resolve
        ▼
   parse-reply.ts (Flow A): yes → approved | no → skipped (topic re-queued) | text → edit→confirm
        │ on approved/edit_confirmed:
        ▼
   commit-post.ts (publishApprovedDraft): render-post.ts (golfvilla template + BlogPosting +
     one FAQPage JSON-LD) → update-index.ts (/blog/ listing) → update-sitemap.ts (idempotent
     insert, NEVER regenerate) → github.ts ONE atomic commit to golfvilla-com main
        ▼
   Vercel auto-deploys golfvilla.com → WhatsApp "✅ Published: <url>"
```

---

## 4. Crons (`vercel.json`, all gated by `CRON_SECRET` bearer)

| Cron | Schedule | Purpose |
|---|---|---|
| `draft-weekly-post` | `0 13 * * 1` (Mon 9am ET) | draft next topic + WhatsApp it |
| `drain-approved` | `*/15 * * * *` | publish anything left in `approved` (idempotent) |
| `expire-stale-drafts` | `0 9 * * *` | auto-skip drafts unanswered > 72h, re-queue topic |
| `failure-monitor` | `0 * * * *` | WhatsApp digest of failed runs |
| `voice-refinement` | `0 15 * * 0` (Sun) | learn from Rob's edits → `blog_voice_memories` |

Vercel sends scheduled crons their `Authorization: Bearer <CRON_SECRET>` automatically.

---

## 5. Data model (Supabase `genidekhqwsxvsboyrih`, all `blog_*`)

- `blog_topics` — the content queue (status: queued|drafting|published|retired; priority asc = sooner). Seeded with 10 topics; 1 published (Corales), 9 queued.
- `blog_post_drafts` — drafts + SEO bundle + status machine (pending → sent_for_approval → pending_edit_confirmation → approved → published / skipped / failed / expired). `risk_score=1.0` + `block_reason` = guard-flagged.
- `blog_approval_messages` — WhatsApp approval log (unresolved = `resolution IS NULL`).
- `blog_voice_memories` — edit-derived voice learnings, injected into the drafter.
- `blog_agent_runs` — observability (run_type, status, error_message, metadata).
Migrations: `supabase/migrations/0001_init_blog_schema.sql`, `0002_seed_blog_topics.sql` (additive, idempotent; applied via Supabase MCP).

---

## 6. ⚠️ The 2026-06-07 shared-WhatsApp incident (READ THIS)

**Symptom:** Rob approved the first post with "yes" but it didn't publish; he got no notice.

**Root cause:** Both the LinkedIn agent and the blog agent send approval requests into the SAME WhatsApp self-chat, and the LinkedIn agent owns the single inbound webhook. Two failures compounded:
1. The blog agent's *outbound* "📝 BLOG DRAFT FOR APPROVAL" message was seen by the LinkedIn webhook as *inbound* and (not recognizing the blog template) recorded as an **edit to a stale pending LinkedIn draft** (`96f40b0e`).
2. Rob's "yes" then matched that LinkedIn draft (greedy "most-recent unresolved" match) and tried to post to LinkedIn — **blocked only by LinkedIn's 1-post/day pacing** (so nothing wrong actually posted). The blog never saw the "yes".

**Fixes shipped (all live):**
- **Marker fix** (LinkedIn `route.ts looksLikeOwnWhatsAppOutbound`): the LinkedIn webhook now recognizes blog-agent outbound templates (`📝 BLOG DRAFT FOR APPROVAL`, `EDIT RECEIVED — confirm to publish`, `✅ Published:`, `❌ Publish FAILED`, `⚠️ Blog draft held for review`) and ignores them.
- **Freshest-approval-wins router** (Option C): on each reply the LinkedIn webhook peeks BOTH queues — its own newest unresolved approval vs. the blog's (`GET /api/inbound/pending` on the blog) — and routes the reply to **whichever was sent most recently**, falling back to LinkedIn + no-match-forward. All cross-calls fail-open and are time-bounded (6–8s). This makes the collision structurally impossible.
- **Manual recovery done:** the corrupted LinkedIn draft `96f40b0e` was repaired (bad edit cleared, real "1,900+ dollar stores" content intact, status back to `sent_for_approval`); the Corales post was published by routing the approval directly to the blog resolver.

**Residual note:** the simultaneous-both-pending race was fixed by code and each component verified, but the live both-pending path hasn't been exercised by real traffic yet — watch the first natural weekly cycle.

---

## 7. Operational runbook

**Check health (env presence, no secrets):** `GET https://golfvilla-blog-agent.vercel.app/api/health`

**See current state (Supabase MCP, project `genidekhqwsxvsboyrih`):**
```sql
select status, slug, live_url, risk_score, block_reason, created_at from blog_post_drafts order by created_at desc limit 5;
select status, count(*) from blog_topics group by status;
select run_type, status, error_message, started_at from blog_agent_runs order by started_at desc limit 10;
```

**Manually fire a draft** (when you don't want to wait for Monday). The cron is `CRON_SECRET`-gated and that secret can't be read back reliably (see gotchas), so set a known one, redeploy to bind, then call:
```bash
cd "…/golfvilla-blog-agent"
SECRET=$(openssl rand -hex 24)
vercel env rm CRON_SECRET production --yes --scope robert-benders-projects >/dev/null 2>&1 || true
printf '%s' "$SECRET" | vercel env add CRON_SECRET production --scope robert-benders-projects >/dev/null 2>&1
vercel redeploy golfvilla-blog-agent.vercel.app --scope robert-benders-projects   # binds the secret
curl -s -m 285 -H "Authorization: Bearer $SECRET" https://golfvilla-blog-agent.vercel.app/api/cron/draft-weekly-post
```
Expect `{"ok":true,"drafted":true,"sent":true,...}` (~150s). `flagged:true` = a grounding guard tripped → held for manual review.

**Publish an approved draft directly** (bypass WhatsApp, e.g. if the round-trip misbehaves). Uses `INBOUND_RESOLVE_SECRET` (in Vercel env, both projects):
```bash
curl -s -X POST https://golfvilla-blog-agent.vercel.app/api/inbound/resolve \
  -H "content-type: application/json" -H "x-inbound-secret: <INBOUND_RESOLVE_SECRET>" \
  -d '{"chat_id":null,"text":"yes"}'
```

**Debug a failed run:** Supabase `blog_agent_runs` (status/error_message) + Vercel runtime logs (`get_runtime_logs` MCP, or dashboard). The drafter logs `stop_reason` on trouble.

**Local dev:** `cp .env.example .env.local` (fill in) → `bun install` → `bun run verify:offline` (26 deterministic checks, no secrets) → `bun run draft:local` (drafts next topic, prints it, sends nothing) → `bun run send:drafts`.

---

## 8. Gotchas / non-obvious facts (save yourself the rediscovery)

- **`vercel env pull` misreads values on this Windows/Git-Bash setup** — it writes every value as `=""` even when they're correctly set on Vercel. Do NOT use it to "verify" a secret is empty; it lies. Verify via `/api/health` (presence) or by behavior. This cost a long debugging detour on 2026-06-07.
- **`CRON_SECRET`** could not be read back via pull; it WAS set fine (the cron authenticated). To fire manually, set a known value + redeploy (see runbook). Vercel auto-sends it for scheduled crons.
- **Drafter timing:** the full grounded draft runs ~150s. The route is `maxDuration=300`. Kept fast via `max_tokens=8000`, `web_search max_uses=4`, and **handling `pause_turn`** (the web_search agentic loop continues instead of restarting — restarting blew the 300s budget and was the cause of an early "malformed JSON / timeout" failure).
- **Output is via forced `emit_post` tool-use, not text JSON** — guarantees valid JSON for the 1,500-word body (a literal-newline JSON-parse failure was the first drafter bug).
- **Sitemap is append-only** — `update-sitemap.ts` inserts before `</urlset>`; it deliberately does NOT run the repo's stale `generate_sitemap.py` (which would delete ~60 live `/from/*` URLs).
- **CANONICAL-FACTS.md is the ONLY source for villa facts** and diverges from the live site (10 baths / 10,000+ sqft / $2,500–$4,500–$6,500 nightly). Canonical wins. The fabrication guard flags contradictions.
- **Git push is Rob's job** for interactive sessions; the deployed agent's auto-commit to golfvilla-com (post-approval) is the only exception.
- LF→CRLF git warnings on Windows are harmless.

---

## 9. Key files

**Blog agent (`src/lib`):** `drafting/generate-post.ts` (drafter + emit_post + web_search loop), `facts.ts` (CANONICAL-FACTS + guard), `keywords.ts` (targets + negative-list guard), `niche.ts` (voice), `whatsapp/{send-draft,parse-reply}.ts`, `publish/{render-post,update-index,update-sitemap,github,commit-post}.ts`, `links.ts`, `voice-memory.ts`, `voice/refine-from-edits.ts`, `config.ts`. Routes: `app/api/cron/*`, `app/api/inbound/{resolve,pending}/route.ts`, `app/api/health/route.ts`. Verifier: `scripts/verify-offline.ts`.

**LinkedIn agent (cross-agent bridge only):** `src/lib/blog-forward.ts` (`forwardToBlogResolver`, `getBlogPendingSentAt`) + `src/app/api/webhooks/unipile/route.ts` (`handleWhatsAppReply` freshest-wins router, `looksLikeOwnWhatsAppOutbound` markers). Everything else in that repo is the existing LinkedIn agent — leave it alone.

**Build spec & sources:** `docs/GOLFVILLA-BLOG-AGENT-BUILD-SPEC.md`, `docs/KEYWORD-GEO-TARGETS.md`, and (outside this repo) `…/GOLFVILLA-WEBSITE/CANONICAL-FACTS.md`. Prior handovers: `docs/HANDOVER-PHASE-0.md`, `docs/HANDOVER-PHASES-1-6.md`.

---

## 10. Backlog / things to watch

- Watch the first natural Monday cycle (2026-06-08) end to end — especially the WhatsApp "yes" routing now that freshest-wins is live.
- Topic queue self-replenishment: 9 seeded topics left; add a monthly maintenance step to append fresh tournament/tourism topics (recurring clusters: This Week in Golf Travel · Cap Cana Watch · Golf Trip Playbook · Villa vs. Resort · Destination Face-Off).
- Quarterly: re-pull GSC (`sc-domain:golfvilla.com`), refresh keyword Tiers 1–2, graduate any surfacing Tier-3 terms (see `docs/KEYWORD-GEO-TARGETS.md`).
- Optional: a small dashboard for the blog (none built; WhatsApp is the only surface).
- The repaired LinkedIn draft `96f40b0e` ("dollar stores" post) is sitting in `sent_for_approval` — decide whether to post or skip it in the LinkedIn agent.
- `docs/GOLFVILLA-BLOG-AGENT-BUILD-SPEC.md` lives at the path the project CLAUDE.md references as `docs/…`; an absolute copy is also under `…/GOLFVILLA-WEBSITE/Blog AI Agent Writer/`.
