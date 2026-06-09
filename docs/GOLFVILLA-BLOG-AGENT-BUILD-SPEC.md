# GolfVilla.com Blog Agent — Build Spec

**Status:** Ready to build. Hand this file to a fresh Claude Code session as the source of truth.
**Author context:** Modeled on the existing, working LinkedIn Agent at
`C:\Users\rbend\Desktop\Claude Projects\LinkendIN Agent`. Reuse its proven patterns; do not reuse the LinkedIn-specific machinery (connections, DMs, feed engagement, pitch-ratio policy).
**Owner:** Rob Bender. **Goal:** A near-zero-effort weekly SEO blog that publishes itself to golfvilla.com after a single WhatsApp "yes."

---

## 1. One-paragraph summary

An autonomous agent drafts one SEO blog post per week for **golfvilla.com**, in Rob's brand voice, grounded in verified villa facts plus current web-searched golf/travel news. It sends the full draft (post body + all SEO metadata) to Rob over **WhatsApp**. Rob replies `yes` / `no` / or pastes an edit. On approval, the agent renders the final HTML post, updates the blog index and sitemap, and **commits all of it to `main` via the GitHub API in a single atomic commit**. Vercel auto-deploys golfvilla.com. The agent then WhatsApps back the live URL. Rob does nothing after "yes."

---

## 2. Pipeline (end to end)

```
[Topic Queue + Web Search]            (weekly: pick next cluster topic, search for timely hooks/facts)
            │
            ▼
[AI Drafter — Claude Sonnet 4.5]      (voice + grounding contract; outputs full post + SEO bundle as JSON)
            │
            ▼
[Supabase: blog_post_drafts]          (status = 'pending')
            │
            ▼
[WhatsApp digest → Rob]               (via Unipile sendWhatsAppToOwner — REUSE from LinkedIn agent)
            │
            ▼
[Rob replies: yes / no / edit]        (Unipile inbound webhook → parse-reply — REUSE pattern)
            │
            ├── no   → status='skipped'
            ├── edit → status='pending_edit_confirmation' → re-send → yes → approved
            └── yes  → status='approved'
                          │
                          ▼
                  [PUBLISH EXECUTOR]  ★ the novel part — see §7
                    1. render final HTML post from repo template
                    2. update blog index/listing page
                    3. regenerate sitemap.xml
                    4. GitHub API: ONE commit of all 3 files to `main`
                          │
                          ▼
                  [Vercel auto-deploys golfvilla.com]
                          │
                          ▼
                  [WhatsApp → Rob: "✅ Published: <live URL>"]
```

---

## 3. Stack

| Component        | Choice                                                        |
|------------------|---------------------------------------------------------------|
| Language/runtime | TypeScript, Next.js 14 (App Router) — match LinkedIn agent    |
| Hosting / cron   | Vercel Cron                                                   |
| Database         | Supabase — see §5 decision (shared project, `blog_*` prefix)   |
| AI drafting      | Anthropic Claude `claude-sonnet-4-5-20250929` (no version drift) |
| Timely facts     | Anthropic **web_search tool** at draft time (replaces RSS)    |
| Approval channel | WhatsApp via **Unipile** — see §6 decision (shared vs separate account) |
| Publish target   | **GitHub API** commit to `rbender-boop/golfvilla-com` `main` → Vercel auto-deploy |

> Note: golfvilla.com is a **static HTML** site (extensionless URLs, `cleanUrls:true`, `trailingSlash:false`). Posts are committed as HTML files, not markdown. The agent must read an existing blog post + the blog index from the repo to learn the exact template before generating anything.

---

## 4. Reuse map — what to copy from the LinkedIn agent vs. build new vs. drop

**COPY (lift the pattern, lightly adapt):**
- Approval state machine: `pending → sent_for_approval → pending_edit_confirmation → approved → published/skipped/failed`.
- `src/lib/whatsapp/send-draft.ts` (WhatsApp formatting + approval-message logging).
- `src/lib/whatsapp/parse-reply.ts` Flow A (post-approval: yes/no/edit, edit-then-confirm, edit-as-learning-event).
- `src/app/api/webhooks/unipile/route.ts` (inbound webhook + WhatsApp self-chat gate).
- `src/lib/unipile.ts` (`sendWhatsAppToOwner`, the Unipile client).
- The **grounding contract** from `src/lib/drafting/generate-posts.ts` — the hard anti-fabrication clause is the single most valuable thing to carry over.
- The edit→learning loop: `src/lib/voice/refine-from-edits.ts` + `linkedin_voice_memories` pattern → becomes `blog_voice_memories`.
- Numbered handover discipline, additive-only migrations, the `CLAUDE.md` destructive-op confirmation rules.
- Loud-failure / fail-open-against-missing-migration conventions.

**BUILD NEW:**
- **Publish executor** (`src/lib/publish/commit-post.ts`) — GitHub-API commit instead of Unipile post. This is the core new component. See §7.
- **HTML renderer** (`src/lib/publish/render-post.ts`) — turn the approved draft JSON into a golfvilla.com-template HTML file with full SEO bundle.
- **Sitemap regenerator** (`src/lib/publish/update-sitemap.ts`) — port golfvilla's existing sitemap-generation logic (it is regenerated by script, never hand-edited).
- **Blog-index updater** (`src/lib/publish/update-index.ts`) — insert the new post card into the listing page.
- **Topic queue** (`blog_topics` table, seeded from §9) — replaces RSS-driven article scoring.
- **Golf voice + niche profile** (`src/lib/niche.ts`, `src/lib/voice.ts`) — golf-travel brand voice, NOT the broker persona.

**DROP entirely (LinkedIn-relationship machinery, irrelevant to a blog):**
- Connections targeting, daily-connections cron, connection digests.
- Feed engagement, scan/score/reply, own-post monitoring.
- Inbound DM classification.
- Pitch-ratio / recruiting policy, the Governor autonomy layer, complexity-check.
- Unipile-to-LinkedIn posting, post-metrics pull (no LinkedIn API surface here).
- LinkedIn account-safety pacing/circuit-breaker is **not needed** — committing to your own repo has no ToS/anomaly risk. (A simple "max 1 publish per run + don't double-commit the same draft" guard is enough.)

---

## 5. Supabase schema

**DECISION 1 (Rob to confirm):** Reuse the existing `fortisgpt` project (ref `ayupzgvoqgkvhtdikuvx`) with a `blog_*` table prefix, **or** spin up a dedicated Supabase project for the blog agent.
- *Recommendation:* reuse `fortisgpt` with `blog_` prefix. One less project to operate; the table prefix keeps it fully isolated from `linkedin_*`. All migrations purely additive.

**RESOLVED:** Dedicated Supabase project for the blog agent — kept fully isolated from the LinkedIn agent's `fortisgpt`. Create it in Phase 1; all `blog_*` tables live there; migrations purely additive.

Tables (all additive `CREATE TABLE IF NOT EXISTS`):

```
blog_topics
  id uuid pk
  title text                      -- working title / cluster topic
  cluster text                    -- 'evergreen' | 'tournament' | 'tourism' | 'luxury_trend' | 'comparison' | 'seasonal' | 'planning'
  status text                     -- 'queued' | 'drafting' | 'published' | 'retired'
  priority int                    -- lower = sooner
  target_internal_links text[]    -- which money pages this post should link to
  primary_keyword text             -- from KEYWORD-GEO-TARGETS.md
  secondary_keywords text[]        -- 2-4 supporting targets
  geo_questions text[]             -- AEO questions this post should answer
  notes text
  created_at, updated_at timestamptz

blog_post_drafts
  id uuid pk
  topic_id uuid fk -> blog_topics
  status text                     -- 'pending' | 'sent_for_approval' | 'pending_edit_confirmation' | 'approved' | 'published' | 'skipped' | 'failed'
  -- SEO bundle (from the brief):
  meta_title text                 -- <= 60 chars (enforced)
  meta_description text            -- <= 155 chars (enforced)
  slug text                        -- extensionless URL segment, e.g. 'cap-cana-vs-casa-de-campo'
  h1 text
  body_html text                   -- the rendered article body (H2s, paragraphs, FAQ)
  body_markdown text               -- pre-render source (for re-rendering on edit)
  faq jsonb                        -- [{q, a}, ...]
  social_captions jsonb            -- 5 captions
  hashtags text[]
  word_count int
  internal_links jsonb             -- [{anchor, url}, ...] actually used
  sources jsonb                    -- web_search citations used for timely facts
  edited_content text              -- Rob's pasted edit, if any
  risk_score numeric               -- fabrication-guard flag (1.0 = flagged)
  block_reason text
  committed_path text              -- repo path of the published file
  live_url text
  published_at timestamptz
  created_at, updated_at timestamptz

blog_approval_messages              -- copy linkedin_approval_messages shape
  id, draft_id, channel, unipile_chat_id, unipile_message_id,
  sent_text, sent_at, response_text, response_received_at, resolution, resolved_at

blog_voice_memories                 -- copy linkedin_voice_memories shape (edit-derived learnings)
  id, scope ('post'), memory_text, weight, created_at

blog_agent_runs                     -- copy linkedin_agent_runs shape (observability)
  id, run_type, status, items_created, items_processed, error_message, metadata, started_at, completed_at
```

**Migrations live at** `supabase/migrations/` and are applied via the Supabase MCP. Per Rob's standing rule: run all SQL directly through the Supabase MCP, never hand back as a code block. Per `CLAUDE.md`: additive SQL runs without confirmation; anything destructive requires explicit "go."

---

## 6. WhatsApp approval — the shared-Unipile decision

**DECISION 2 (Rob to confirm):** Both agents send approvals to the same WhatsApp number. Unipile points one account's inbound webhook at **one** URL, so two separate Vercel apps sharing one Unipile account will contend for inbound replies.

Options:
- **(A) Separate Unipile account/number for the blog agent.** Cleanest isolation, zero routing logic, ~$60/mo extra. The blog agent is then a self-contained clone of the WhatsApp loop.
- **(B) Shared Unipile account + one merged router.** Cheaper, but the inbound webhook must check *both* `linkedin_approval_messages` and `blog_approval_messages` for the most-recent unresolved row and dispatch accordingly. Couples the two codebases at the webhook.
- **(C) Shared account, blog approvals tagged with a token prefix** (e.g. reply `yes blog` / `no blog`) so a single router disambiguates. Adds one word for Rob to type — minor, but cuts slightly against "as little work as possible."

*Recommendation:* **(A)** if the extra Unipile seat is acceptable — it keeps the blog agent a clean, independent build with no risk of cross-wiring an approval into the wrong agent. Fall back to **(B)** if you want to consolidate cost; in that case the router lives in whichever app owns the webhook and both apps share a tiny `approval-router` module.

**RESOLVED — inbound design:** One Unipile account, one WhatsApp number, NO extra cost (Unipile supports multiple connected accounts + multiple webhook URLs on a single subscription; webhooks carry `account_id`/`provider` for routing). Because both agents' replies land in the SAME WhatsApp chat, inbound needs ONE brain so a bare `yes` is never misattributed. Design: the existing LinkedIn agent webhook stays the single inbound entry point; when a reply does NOT match a pending LinkedIn approval, it forwards `{chat_id, text}` to a small authenticated endpoint on the blog app (`POST /api/inbound/resolve`) which checks `blog_approval_messages` and runs the publish path. Each app keeps its own Supabase project + credentials; the only coupling is one forward call + a small additive change to the LinkedIn webhook (no behavior change to the existing LinkedIn flow). No second number, no extra typing for Rob.

WhatsApp message format (port `formatDraftMessage`): lead with title + slug + word count + which money pages it links, then the meta title/description, then the body, then `Reply: yes / no / paste an edit`. Keep lines short for mobile.

---

## 7. ★ Publish executor — the part Rob asked about

File: `src/lib/publish/commit-post.ts`. Triggered when a draft hits `status='approved'` (from the webhook on a `yes`, exactly like the LinkedIn executor fires on approval).

Steps:

1. **Load** the approved draft. Pick `edited_content` if present, else the generated body. Guard: refuse if already `published` (no double-commit).
2. **Render** the final HTML (`render-post.ts`):
   - Read an existing golfvilla.com blog post from the repo as the **template** (do NOT invent markup — match the live site's `<head>`, nav, footer, CSS/GTM tags exactly).
   - Inject: `meta_title`, `meta_description`, canonical (`https://www.golfvilla.com/<slug>`, extensionless, no trailing slash), `og:*` + `twitter:*`, **`BlogPosting` JSON-LD** (`mainEntityOfPage` = the post URL; `publisher`/`author` per site convention), and an **`FAQPage` JSON-LD** block built from `faq` (exactly one FAQPage, matching the clean pattern noted in espadavilla — never duplicate).
   - GTM container for golfvilla.com is **GTM-N59QFL4G**; GA4 is **G-609WG48V7Q**. Use whatever the template already contains — read, don't hardcode from memory.
   - Body: H1, H2 sections, FAQ section, and the **internal links** to the money pages. The brief requires links to Villa Espada / Cap Cana Golf Villa / Golf Bachelor Party / Corporate Golf Retreat / Book Now pages **where relevant**. The exact URLs MUST be resolved from the live golfvilla.com sitemap/repo at run time — do not guess them.
3. **Update blog index** (`update-index.ts`): insert the new post card/link into the listing page, matching existing card markup.
4. **Regenerate sitemap.xml** (`update-sitemap.ts`): port golfvilla's existing sitemap generator (it's script-regenerated, 74 clean URLs, no trailing slashes). Add the new post URL. Never hand-edit the sitemap.
5. **Commit — one atomic commit to `main`** via GitHub API (`github` MCP `push_files`, or Octokit) containing: the new post file, the updated index, the regenerated sitemap. Repo: `rbender-boop/golfvilla-com`. Commit message: `blog: publish "<title>" (<slug>)`.
6. **Vercel auto-deploys** off the `main` push (already wired). No deploy call needed.
7. **Record**: set draft `status='published'`, `committed_path`, `live_url`, `published_at`; mark the topic `published`; log a `blog_agent_runs` row.
8. **Notify**: WhatsApp Rob `✅ Published: https://www.golfvilla.com/<slug>` (note it may take ~1 min for Vercel to finish building).

### Credential (DECISION 3 — Rob to provision)
The agent needs a GitHub token with **write access scoped to ONLY `rbender-boop/golfvilla-com`** — a fine-grained PAT or a GitHub App installed on that one repo. Do **not** use a classic token with account-wide scope; a bug must not be able to touch the villa money sites. Store as `GITHUB_TOKEN_GOLFVILLA` env var in Vercel.

### Standing-rule note
This is a deliberate, scoped exception to "Rob pushes; Claude doesn't." That rule governs **me** pushing during interactive chat sessions. A deployed agent committing under its own repo-scoped token, only after Rob's explicit per-post WhatsApp approval, is the intended design here. The agent never force-pushes, never touches other repos, never commits without an approval gate.

---

## 8. Drafting layer — voice + grounding + output contract

File: `src/lib/drafting/generate-post.ts`. Single Claude call (with retry-on-malformed-JSON, exactly like the LinkedIn drafter), **web_search tool enabled** so timely facts are current and citeable.

**Voice (`niche.ts` / `voice.ts`):** Per the blog brief — confident, specific, premium, practical. Audience: affluent golf travelers, bachelor-party planners, corporate-retreat planners, luxury family groups. NOT a generic travel blog. Position golfvilla.com as a golf-travel newsletter, not a tournament-recap site. Editorial rule baked into the system prompt: *"Here's what this golf/travel news means for people planning luxury private golf trips."*

**Grounding contract (HARD — port and adapt from the LinkedIn drafter):**
- Villa facts (rates, bedroom config, staff, amenities, location, courses) may ONLY come from `C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\CANONICAL-FACTS.md` (villa facts source of truth — same property across all feeders). Never guess property facts. (Rob has corrected stale figures before — verify against canonical source.)
- Timely/external facts (tournament dates, tourism stats, weather, sargassum) MUST come from a `web_search` result and be stored in `sources`. No fact asserted from model memory.
- A `checkFacts`-style backstop flags drafts that assert specific villa figures not in CANONICAL-FACTS (sets `risk_score=1.0`, `block_reason`, stays `pending` for manual review).
- VacationRental schema is ineligible; use `BlogPosting` + `FAQPage`. (Carry over from villa schema discipline.)

**Keyword + GEO/AEO targeting (HARD):** The drafter receives the target set from `KEYWORD-GEO-TARGETS.md` (built from live golfvilla.com GSC data + the content brief). Rules:
- Each post uses its assigned **primary keyword** in `meta_title`, `h1`, and naturally in body, plus 2-4 secondaries (Tiers 1-3 in the target file).
- Every post **reinforces the Cap Cana / Punta Espada / Caribbean entity cluster** and answers >=2 of the GEO question set as FAQ entries.
- The **negative list is absolute**: never produce Portugal / Algarve / Spain / Florida golf content, and never use those as keywords - the domain leaks ~1/3 of its impressions to that off-target geography and the blog must not amplify it.
- Quarterly: re-pull GSC (`sc-domain:golfvilla.com`), refresh Tiers 1-2 from real data, graduate surfacing Tier 3 terms. `blog_topics.primary_keyword` / `secondary_keywords` columns carry the per-topic assignment.

**Output contract — return ONE JSON object (no prose, no fences), matching the brief's required deliverables:**
```
{
  meta_title,            // <= 60 chars
  meta_description,      // <= 155 chars
  slug,                  // kebab-case, extensionless
  h1,
  body_markdown,         // 1,200–1,800 words: hook, H2 sections, generous white space
  faq: [{q, a}, ...],    // 4–8 Q&A
  social_captions: [5 strings],
  hashtags: [..],
  internal_links: [{anchor, url}, ...],   // money-page links used (URLs resolved from sitemap)
  sources: [{claim, url}, ...],           // web_search citations for timely facts
  rationale
}
```
Enforce `meta_title`/`meta_description` length and `word_count` server-side; if out of bounds, one corrective retry before saving as `pending` with a note.

---

## 9. Topic queue — seed content (from the brief)

Seed `blog_topics` with the brief's "best next 10," tagged by cluster. Agent picks the lowest-`priority` `queued` topic each week, drafts it, marks `published` on success. Recurring section tags let the queue self-replenish (a maintenance step can append fresh tournament/tourism topics monthly).

Starter 10 (priority order):
1. Corales Puntacana Championship 2026: Why Golf Travelers Should Watch Punta Cana — *tournament*
2. Dominican Republic Tourism Is Surging — What It Means for Luxury Villa Rentals — *tourism*
3. Cap Cana vs. Casa de Campo: Which Is Better for a Private Golf Trip? — *comparison*
4. The New Luxury Group Trip: Why Private Villas Are Replacing Resort Blocks — *luxury_trend*
5. How Early Should You Book a Punta Cana Golf Villa? — *seasonal*
6. Punta Espada Golf Trip Guide: What Groups Should Know Before Booking — *evergreen*
7. Best Caribbean Golf Destinations for a 12-Person Group — *comparison*
8. Golf Bachelor Parties Are Getting More Luxurious — Here's Why — *luxury_trend*
9. Corporate Golf Retreats: Why Executives Are Choosing Villas Over Hotels — *planning*
10. Winter Golf Travel 2027: Why Cap Cana Should Be on the Short List — *seasonal*

Recurring section clusters to keep cycling: This Week in Golf Travel · Cap Cana Watch · Golf Trip Playbook · Villa vs. Resort · Destination Face-Off.

> All tournament dates / tourism % in the brief are **unverified** — the drafter must re-confirm each via web_search at draft time and cite it. Do not publish a date from memory or from this file.

---

## 10. Cron schedule (`vercel.json`)

Weekly cadence (the brief specifies weekly). Make cadence a config value so it can move to 2×/week later without code changes.

```
draft-weekly-post   →  "0 13 * * 1"     (Mon ~9am ET: pick topic, draft, WhatsApp to Rob)
drain-approved      →  "*/15 * * * *"   (publish any draft left in 'approved' — e.g. approved offline)
expire-stale-drafts →  "0 9 * * *"      (auto-skip drafts unanswered > 72h, configurable)
failure-monitor     →  "0 * * * *"      (alert Rob on any failed run)
```
All cron routes gated by `isAuthorizedCron` (copy `src/lib/auth-utils.ts`).

---

## 11. Env vars (`.env.example`)

```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UNIPILE_API_KEY=
UNIPILE_DSN=
UNIPILE_WHATSAPP_ACCOUNT_ID=        # separate from LinkedIn agent if DECISION 2 = (A)
OWNER_WHATSAPP=                      # Rob's number
GITHUB_TOKEN_GOLFVILLA=             # fine-grained PAT, write scope, golfvilla-com ONLY
GOLFVILLA_REPO=rbender-boop/golfvilla-com
CRON_SECRET=
```

---

## 12. Safety rules (carry over `CLAUDE.md`)

- Additive Supabase only without confirmation; destructive SQL/git/fs requires explicit "go."
- Agent commits ONLY to `golfvilla-com`, ONLY to `main`, ONLY after a `yes`. Never force-push. Never touch villa money-site repos.
- One publish per run; idempotent (a draft already `published` is never re-committed).
- Fail-open against missing migrations so a partial deploy can't break the draft→approve loop.
- All factual claims grounded (CANONICAL-FACTS for villa facts, web_search for timely facts). Fabrication guard flags violations for manual review.

---

## 13. Phased build plan (for the Claude Code session)

**Phase 0 — Scaffold**
Next.js 14 project, Supabase client, Unipile client, `auth-utils`, `CLAUDE.md`, `.env.example`. Confirm DECISION 1/2/3 with Rob before wiring credentials.

**Phase 1 — Data + topics**
Migrations for all `blog_*` tables (via Supabase MCP). Seed `blog_topics` (§9). Read CANONICAL-FACTS.md into a loadable module.

**Phase 2 — Drafter**
`generate-post.ts` with golf voice + grounding contract + web_search + JSON output contract + length enforcement + fabrication guard. Local runner (`npm run draft:local`) to eyeball output before any WhatsApp wiring.

**Phase 3 — Approval loop**
Port `send-draft`, `parse-reply` (Flow A only), the Unipile webhook + self-chat gate. Test the yes/no/edit cycle end to end against a real draft.

**Phase 4 — Publish executor** ★
`render-post` (read repo template), `update-index`, `update-sitemap` (port golfvilla generator), `commit-post` (GitHub API one-shot commit). Test against a throwaway slug, confirm Vercel deploy + live URL, then confirm the WhatsApp success ping.

**Phase 5 — Crons + monitoring**
Wire `vercel.json`, `drain-approved`, `expire-stale-drafts`, `failure-monitor`. Smoke test.

**Phase 6 — Edit-learning loop (optional, after it's running)**
Port `refine-from-edits` → `blog_voice_memories`, injected into the drafter system prompt so Rob's edits teach the voice over time.

Each phase closes with a numbered handover MD in `docs/`, full file paths in chat, and a push command for Rob to run (interactive-session pushes stay Rob's job; only the *deployed agent* auto-commits).

---

## 14. Open decisions to confirm before/early in build

1. **Supabase:** RESOLVED — dedicated Supabase project for the blog agent.
2. **WhatsApp/Unipile:** RESOLVED — shared Unipile account (no extra cost); inbound resolved via a forwarding router (see Section 6).
3. **GitHub credential:** provision a fine-grained PAT scoped to `golfvilla-com` only.
4. **Publish target:** RESOLVED — straight to `main` (the WhatsApp yes is the gate).
5. **Cadence:** weekly to start (per brief); confirm.

---

## 15. Key source files to read first (in the LinkedIn agent) when building

- `src/lib/drafting/generate-posts.ts` — grounding contract + JSON output + retry pattern.
- `src/lib/whatsapp/send-draft.ts` and `src/lib/whatsapp/parse-reply.ts` — approval loop.
- `src/app/api/webhooks/unipile/route.ts` — inbound webhook + self-chat gate.
- `src/lib/executor/post-to-linkedin.ts` — the "fire on approval" shape to mirror in `commit-post.ts`.
- `src/lib/unipile.ts` — `sendWhatsAppToOwner`.
- `CLAUDE.md` — safety rules to replicate.

And in the golfvilla repo (`...\Funnel Websites\golfvilla-com`):
- an existing `/blog/...` post (the HTML template to match),
- the blog index/listing page,
- `sitemap.xml` + whatever script generates it,
- CANONICAL-FACTS.md (villa facts source of truth).

And in ...\Blog AI Agent Writer\:
- KEYWORD-GEO-TARGETS.md (keyword + GEO/AEO target tiers, built from live GSC data).
