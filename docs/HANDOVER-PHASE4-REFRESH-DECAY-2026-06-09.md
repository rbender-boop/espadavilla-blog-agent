# HANDOVER — Phase 4 (Refresh/Decay Loop) COMPLETE

**Date:** 2026-06-09
**Session scope:** Built Phase 4 end-to-end: GSC page-level decay detection (pure), refresh
topic queuing (DB layer), pipeline refresh-context injection (pick → research → draft →
persist), committed-path supersession in the publisher, cron wiring, local script, smoke
tests. Typecheck clean. Smoke 53/53 (9 new Phase 4 checks, all pass).

---

## 0. TL;DR
- **Decay detector is pure and proven.** `detectDecay()` correctly identifies impressions
  collapse, position degradation, and low-traction posts; skips posts < 90 days old;
  respects limit; sorts by severity (impressions_decay → position_decay → low_traction).
- **Full refresh flow wired.** Mon 11:00 UTC cron detects decay → inserts `[Refresh]`
  `blog_topics` rows (priority 250) → existing pipeline drafts them with the original
  post body as context and a forced slug → WhatsApp approval → publisher supersedes the
  old draft and overwrites the same file in the repo.
- **Today it's a no-op.** golfvilla.com posts need 90+ days of GSC history before any
  decay signal fires. That's correct and expected — the curated seed queue still feeds
  the drafter in the meantime.

---

## 1. Files added

### `supabase/migrations/0007_blog_topics_refresh.sql`
Applied to DB this session. Adds:
- `blog_topics.refreshes_draft_id uuid FK → blog_post_drafts(id)` — links a refresh
  topic to the original published draft it targets.
- `blog_post_drafts.gsc_impressions_28d int`, `gsc_clicks_28d int`,
  `gsc_position_28d numeric`, `gsc_checked_at timestamptz` — GSC performance snapshot
  updated each time the post-refresh cron runs. Lets you see decay trajectory in the DB
  without hitting the GSC API again.
- Index on `blog_topics(refreshes_draft_id)` for fast queue lookups.

### `src/lib/gsc/decay-detector.ts`
PURE — no DB, no network. Exports:
- `detectDecay(currentRows, priorRows, posts, opts)` — main function. Compares two 28-day
  page-dimension GSC windows against a list of `PublishedPostRef`. Returns `DecayCandidate[]`
  sorted by severity, capped at `opts.limit` (default 5).
- `normUrl(url)` — strips origin + trailing slash to a bare path for GSC row matching.
- Types: `PublishedPostRef`, `DecayMetrics`, `DecaySignal`, `DecayCandidate`, `DetectOpts`.

**Three signals (evaluated in order; a post emits at most one):**
1. `impressions_decay` — current impressions < prior × `imprDecayThreshold` (default 0.5),
   provided the prior window had ≥ `minEstablishedImpr` (default 5) impressions.
2. `position_decay` — position worsened by ≥ `posDecayThreshold` (default 10) spots,
   with both windows having ≥ `minEstablishedImpr` impressions.
3. `low_traction` — both windows have ≤ `lowTractionImpr` (default 10) impressions and
   the post is ≥ `minAgeDays` (default 90) old.

Posts younger than `minAgeDays` are skipped entirely before any signal check.

### `src/lib/gsc/refresh-generator.ts`
DB glue. `generateRefreshTopics(opts?)`:
1. Loads all `blog_post_drafts` with `status='published'` and a `/blog/` live URL.
2. Fetches GSC page-dimension data for current 28d (`days 1-28`) and prior 28d (`days
   29-56`) in parallel, using `dimensions: ['page']` and `rowLimit: 500`.
3. Calls `detectDecay` (pure).
4. **Snapshots** `gsc_impressions_28d / gsc_clicks_28d / gsc_position_28d / gsc_checked_at`
   onto EVERY published draft (not just decaying ones). Gives a living performance record
   in the DB.
5. Skips any decayed post that already has a refresh in `status='queued'|'drafting'` to
   avoid duplicates.
6. Loads original topic metadata (cluster, keywords, geo_questions) to seed the refresh
   topic properly.
7. Inserts `blog_topics` rows: `title='[Refresh] {original title}'`, `source='refresh-generator'`,
   `priority=250`, `refreshes_draft_id=<original draft id>`, `notes` contains the slug,
   publish date, decay reason, and a hard instruction to keep the same slug.

Supports `dryRun: true` (select + snapshot but no inserts). All threshold overrides
readable from env — see §5.

### `src/app/api/cron/post-refresh/route.ts`
GET cron route. `isAuthorizedCron` gated. `maxDuration=60`. Inserts a `blog_agent_runs`
row (`run_type='post_refresh'`) at start; updates it with summary + `status='success'|'failure'`
on completion.

### `scripts/refresh-check.ts`
Local dry-run. Run with `npm run refresh:check` (default: dry-run, prints what would be
inserted). Pass `--write` to insert refresh topics. Requires `.env.local`.

---

## 2. Files edited

### `src/lib/drafting/generate-post.ts`
- `TopicRow` type: added `refreshes_draft_id: string | null`.
- `pickNextTopic`: added `refreshes_draft_id` to the Supabase `select()` string.

### `src/lib/drafting/pipeline.ts`
Four changes:

**`pickTopicStep`** — if `topic.refreshes_draft_id` is set, fetches the original draft
(`id, slug, h1, body_markdown, published_at`) and stores two extra keys in job state:
- `refreshContext: { originalDraftId, slug, h1, body_markdown, published_at }` — passed
  forward to research and draft steps.
- `forceSlug: string` — the original post's slug, enforced at persist time regardless of
  what the drafter generates.

**`researchStep`** — passes `refreshContext` (from job state) to `buildResearchUserPrompt`.
When present, the prompt says "Research what has CHANGED since this post was published on
{date}" and instructs Claude to focus on updated rankings, new tournament results, changed
tourism stats, etc.

**`generateDraft` / `buildDraftUserPrompt`** — passes `refreshContext` to the draft prompt.
When present:
- Opening line changes to "Rewrite and update this post to make it current, accurate, and
  competitive."
- `[Refresh]` prefix stripped from the working title.
- REFRESH INSTRUCTIONS block added (HARD): keep exact slug, preserve what's still accurate,
  update what's stale, improve depth.
- Original `body_markdown` appended (truncated to 4000 chars) as a reference block.

**`persistStep`** — if `state.forceSlug` is set, overrides `post.slug` before calling
`insertPendingDraft`. This is the enforcement layer that ensures the refresh draft always
gets the original slug regardless of what the drafter produced.

### `src/lib/publish/commit-post.ts`
Added a pre-commit supersession block inside the `try {}`. Before rendering or committing:
1. Fetches the topic row to get `refreshes_draft_id`.
2. If set, issues:
   ```sql
   UPDATE blog_post_drafts
   SET status='superseded', committed_path=null
   WHERE id=<original_draft_id> AND status='published'
   ```
   This clears the `committed_path` unique index so the refresh draft can claim the same
   repo path without a constraint violation. The `AND status='published'` guard prevents
   double-supersession if the cron somehow runs twice.
3. Publish proceeds normally — GitHub's `createOrUpdateFile` overwrites the existing HTML
   file atomically.

### `vercel.json`
Added `{ "/api/cron/post-refresh", "0 11 * * 1" }` as the first entry. Full Monday
sequence is now:
```
11:00  post-refresh          detect decay → queue refresh topics
12:00  gsc-topics            detect GSC opportunities → queue new topics
13:00  draft-weekly-post     enqueue pipeline job
13:00–16:00  blog-pipeline-worker (every 2 min)  run pipeline steps
```

### `package.json`
Added `"refresh:check": "tsx scripts/refresh-check.ts"`.

### `scripts/verify-offline.ts`
Added import of `detectDecay`, `normUrl`, `PublishedPostRef` from `decay-detector`. Added
9 new assertions (§8 in the file):
- `normUrl` strips origin + trailing slash correctly
- Too-new post (< 90d) is always skipped
- Impressions collapse (70% drop) → `impressions_decay`
- Stable post is NOT flagged
- Old low-traction post → `low_traction`
- All reason strings are non-empty
- Sorting: impressions_decay comes before low_traction
- `limit` parameter is respected
- Position worsening ≥ 10 spots → `position_decay`

---

## 3. Verification done this session
- `npm run typecheck` → clean (0 errors)
- `npm run smoke` → ALL 53 CHECKS PASSED (44 prior + 9 new Phase 4)

---

## 4. Key design decisions (for future context)

**Why `superseded` not just a silent update?**
The `committed_path` unique index is the DB-layer idempotency guard that prevents a bug
from double-publishing the same slug. We need it. For a refresh, the new draft legitimately
claims the same path. The cleanest solution: introduce `superseded` as a terminal status
(additive string, no schema constraint), clear `committed_path` on the old draft, and let
the new draft take ownership. This preserves the guard while making the lifecycle explicit.

**Why `forceSlug` in job state rather than enforcing in the topic itself?**
The drafter freely generates a slug via the `emit_post` tool — we can't stop it from
outputting a different slug. Overriding at `persistStep` is the last safe moment before
the slug is written to the DB. The topic `notes` field also has a hard instruction, which
handles well-behaved models; `forceSlug` is the enforcement layer for when the model
ignores the note.

**Why priority 250 for refreshes?**
Curated seed: 50–100. Strategy doc: 110–210. Refresh: 250. GSC auto-gen: 300+. This
means: seed queue drains first (highest quality, hand-curated), then strategy topics,
then refresh jobs (important — a decaying post hurts SEO while it sits), then new
GSC-discovered topics. The ordering will feel natural as the site matures.

**Why truncate original body to 4000 chars in the draft prompt?**
The full body of a 1,500-word post is ~10–12k chars, which eats significant context window
on top of the facts block, keywords, internal links, and system prompt. 4000 chars (roughly
the first 600 words) gives the model enough to understand the structure, tone, and existing
angles without crowding out the new research brief. A truncation note is appended so the
model knows the reference is partial.

**Why two 28-day windows rather than a longer baseline?**
GSC's Search Analytics API only reliably returns ~3 months of data for high-volume queries,
and the page-dimension rows can be sparse for a young site. Two adjacent 28-day windows
give a clean apples-to-apples comparison with no seasonal distortion (both windows are
recent) and enough resolution to detect a meaningful drop. The `minEstablishedImpr`
threshold (default 5) prevents noise from posts with near-zero traffic in both windows
from triggering false decay signals.

---

## 5. Env vars — decay thresholds (all OPTIONAL; unset = principled defaults)
Set in Vercel (Production) to tune without a code redeploy:

| Var | Default | Meaning |
|-----|---------|---------|
| `REFRESH_IMPR_DECAY_THRESHOLD` | `0.5` | Current impressions must drop below this fraction of prior to trigger (0.5 = 50% drop) |
| `REFRESH_POS_DECAY_THRESHOLD` | `10` | Position must worsen by at least this many spots |
| `REFRESH_MIN_IMPRESSIONS` | `5` | Prior window must have at least this many impressions before decay is judged |
| `REFRESH_MIN_AGE_DAYS` | `90` | Posts younger than this are always skipped |
| `REFRESH_LIMIT` | `5` | Max refresh topics to queue per run |

To test on a young site locally, loosen everything:
```
REFRESH_MIN_AGE_DAYS=1 REFRESH_MIN_IMPRESSIONS=1 REFRESH_IMPR_DECAY_THRESHOLD=0.99 npm run refresh:check
```

---

## 6. Local testing commands
```bash
# Dry-run: see what would be detected/queued (no writes)
npm run refresh:check

# Check with a real post's slug to verify GSC connectivity
npx tsx scripts/gsc-check.ts    # confirms page-dimension data is accessible

# Dry-run with loosened thresholds (useful while site is young)
REFRESH_MIN_AGE_DAYS=1 REFRESH_MIN_IMPRESSIONS=1 npm run refresh:check

# Write mode: actually insert refresh topics
npm run refresh:check -- --write
```

---

## 7. Standing open items (carried forward)
- **Rotate `CRON_SECRET`** — still `MY-SECRET-CRON-KEY-2026`. Now gates 3 routes
  (`draft-weekly-post`, `gsc-topics`, `post-refresh`). High priority to fix before the
  next deploy if possible.
- **RLS** — still disabled on all `blog_*` tables (pending security decision).
- **Phase 5 candidate** — clone entire pipeline for `espadavilla.com` (GSC_SITE_URL=
  `sc-domain:espadavilla.com`, its own `blog_topics` seed, separate Vercel project).
  The SA already owns that property — confirmed in the Phase 3 gsc-check listing.

---

## 8. Git push command
```bash
cd "C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent"
git add -A && git commit -m "Phase 4: refresh/decay loop — GSC decay detection, refresh topic queuing, pipeline refresh context" && git push origin main
```

---

## 9. Key IDs / paths
- Local: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- GitHub: `github.com/rbender-boop/golfvilla-blog-agent`, branch `main`
- Supabase (golfvilla): project id `genidekhqwsxvsboyrih` — always pass `project_id` explicitly.
- Vercel: project `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`,
  prod domain `golfvilla-blog-agent.vercel.app`.
- Runtime: `npx tsx` for scripts. Model: `claude-sonnet-4-5-20250929`.
- Verify: `npm run typecheck` (clean) + `npm run smoke` (53/53).
