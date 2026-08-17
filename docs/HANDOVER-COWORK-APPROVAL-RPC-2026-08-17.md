# HANDOVER — Cowork Approval RPC (espadavilla, 2026-08-17)

## Why
Same move as the LinkedIn and golfvilla agents: WhatsApp/Unipile is dead
(account suspended, TOS risk). Blog-post approvals now run through Claude Cowork
calling validated Supabase RPC functions directly via the already-connected
Supabase MCP — no custom MCP server, no OAuth dead end, no app code touched.

## What was built (Supabase project qqjrujrrqxtfsuikakuu only — ONE migration)
- `cowork_approval_rpc` — `v_pending_approvals` view + three SECURITY DEFINER
  functions: `approve_post(id)`, `edit_post(id, new_text)`,
  `reject_post(id, reason default null)`. Security lockdown (revoke from
  public/anon/authenticated, grant to service_role only) is included in the same
  migration — done right the first time, so no separate lockdown migration was
  needed (golfvilla split it into two; here it's one clean file).
- **No application code changed.** Nothing in `src/` was touched, so
  `npx tsc --noEmit` was not required for this change.

## Diagnosis (verified live against the DB + this repo's code, not guessed)
- Table: `public.blog_post_drafts`. **No DB CHECK constraint on `status`**
  (`pg_get_constraintdef` returned zero rows) — the status vocabulary is enforced
  entirely in app code (`parse-reply.ts`, `send-draft.ts`,
  `expire-stale-drafts.ts`, `commit-post.ts`). Statuses in use:
  pending, sent_for_approval, pending_edit_confirmation, approved, published,
  skipped, failed, expired.
- **Awaiting-Rob set**: `pending` | `sent_for_approval` |
  `pending_edit_confirmation` — exactly the set `expire-stale-drafts` treats as
  "waiting on a human" (auto-expires after STALE_DRAFT_HOURS). `approved` is
  intentionally NOT expired. Since Cowork skips the WhatsApp send step, most
  drafts sit in `pending`; the view covers all three so nothing is missed.
- **Approved value**: `approved`. **Reject value**: `skipped`.
- **Edited-text column**: `edited_content` (text, nullable). `commit-post.ts`
  publishes `edited_content` in preference to `body_markdown`
  (`bodyMarkdown = draft.edited_content?.trim() ? draft.edited_content : draft.body_markdown`).
- **No image/asset column** on `blog_post_drafts` — no infographic to preview
  (unlike the LinkedIn agent). The hero image is chosen deterministically by
  `pickPostImage(slug, cluster)` at publish time (`src/lib/publish/blog-images.ts`).
- **No DB triggers** on `blog_post_drafts`, `blog_topics`,
  `blog_approval_messages`, or `blog_agent_runs` (`pg_trigger` = zero rows). The
  one side-effect that matters — on reject/skip, the draft's topic returns to
  `blog_topics.status='queued'` — is app logic (`parse-reply.ts`'s `markSkipped`),
  not a trigger. `reject_post` replicates it explicitly in SQL.

## Publish path (confirmed live, unchanged)
- **Approving only flips status to `approved`.** The publish executor
  (`publishApprovedDraft` in `src/lib/publish/commit-post.ts`) is invoked by the
  **`drain-approved` cron, every 15 min** (`vercel.json`: `*/15 * * * *`) via
  `publishAllApproved()`. Confirmed running live in `blog_agent_runs` (drain runs
  every 15 min through 19:01 UTC today).
- The executor renders the post, updates blog index/sitemap/llms.txt, pings
  IndexNow, and commits everything to the site repo in one atomic commit — Vercel
  auto-deploys off that push. It is idempotent (a `published` draft is never
  re-committed). **No code changes were needed** — `approve_post`/`edit_post`
  land the draft in exactly the `approved` state this executor already expects.
- Approving via Cowork **will publish for real** within ~15 min once you run
  `approve_post` on a real id. Not a dry run.
- `/api/inbound/resolve` + `/api/inbound/pending` (the shared LinkedIn-webhook
  WhatsApp plumbing) are left untouched — redundant for approvals now, but they're
  shared infrastructure, not blog-only. Do not delete as part of this change.

## ⚠️ Live finding — the publish queue is currently JAMMED (action needed)
Two drafts are stuck in `approved` and the drain cron cannot clear them:
- `257bdfd5-78b1-4c1c-b227-34b3a881df8e` — "cap-cana-direct-booking-villa-espadavilla".
  Every drain run (16:45 → 19:01 UTC today) fails it with the **contact-info guard**:
  `rob@espadavilla.com found in visible HTML outside JSON-LD` — the email is in
  visible body copy, which the guard blocks (email may only live in JSON-LD schema).
- `108a6f52-2960-4de4-8a42-84c67048fd63` — "things-to-do-villa-espada-non-golf-family"
  (clean, risk_score 0). It is **stuck behind** the poisoned draft because
  `publishAllApproved` breaks on the first failure — so it never gets attempted.

Neither Cowork RPC can touch these two: `edit_post`/`reject_post` only act on the
awaiting set (pending / sent_for_approval / pending_edit_confirmation), and both
are already `approved`. To unjam, the body of `257bdfd5` needs the email replaced
with a `/contact` link (then it publishes), or it needs to be skipped/reset.
**I did not modify either draft — flagging for your call.** Say the word and I'll
fix `257bdfd5`'s body (swap the email for a /contact link) or move it out of the
queue so `108a6f52` can publish.

## What was built — details
- `v_pending_approvals`: drafts in the awaiting-Rob set, left-joined to
  `blog_topics` for cluster/keywords/topic_title context. Includes
  body_markdown, edited_content, faq, sources, internal_links, risk_score,
  block_reason, meta_title/description, h1, summary, word_count — enough for
  Cowork to render the same review Rob used to get over WhatsApp.
- `approve_post(p_draft_id uuid)` — validates status is in the awaiting set
  (raises a clear exception otherwise), sets `status='approved'`, logs a
  `blog_approval_messages` row (`channel='cowork', resolution='approved'`).
- `edit_post(p_draft_id uuid, p_new_text text)` — same validation, rejects empty
  text, sets `edited_content` + `status='approved'` in one step (the WhatsApp
  double-confirm collapses to one step — Rob already typed the text into Cowork).
- `reject_post(p_draft_id uuid, p_reason text default null)` — same validation,
  sets `status='skipped'`, requeues the topic (`blog_topics.status='queued'`),
  logs the reason to `blog_approval_messages.response_text`.
- All three: `plpgsql`, `security definer`, `set search_path = ''` with every
  table reference schema-qualified (`public.blog_post_drafts`, etc.) — immune to
  search-path hijacking.

## Security — deliberate deviation from the "grant to public" build note
Postgres grants EXECUTE/SELECT to `PUBLIC` by default on new functions/views,
which would make these callable by `anon`/`authenticated` via `/rest/v1/rpc/...`
— i.e. espadavilla.com's public anon key (in every visitor's browser) could read
unpublished drafts and force-publish/sabotage the pipeline. So the migration
revokes EXECUTE/SELECT from `public, anon, authenticated` and grants to
`service_role` only. Verified with `get_advisors` (security): none of the four
new objects appear in any finding. Cowork's Supabase MCP uses elevated project
credentials, not the anon key, so it is unaffected — confirmed by the fake-id
test still returning the expected "not found" error, not a permission error.

Pre-existing advisor findings (NOT introduced here, out of scope): all `blog_*`
tables have RLS disabled (the app talks to them with the service-role key, which
bypasses RLS), and `increment_visitor` is an intentionally-public SECURITY
DEFINER function. Unchanged by this work.

## Testing performed (no real data touched)
- `select * from v_pending_approvals;` — returned the one live draft in `pending`
  (id `2290e09c-a2a5-4175-a478-67ec0a212c43`, "Punta Espada Golf Shuttle",
  flagged risk_score=1 with a villa-fact-contradiction block_reason — a
  pre-existing flag, untouched by this work).
- `approve_post` / `edit_post` / `reject_post` each called with the nil UUID
  `00000000-0000-0000-0000-000000000000` — all three raised the expected
  `draft ... not found` exception. No row was modified during testing.
- `get_advisors(security)` re-run after the migration — clean for all four new
  objects.

## TODO — Rob
1. Git: the two doc files below are untracked. Commit + push when ready
   (commands at the bottom).
2. Confirm the Supabase connector in Cowork is pointed at project
   `qqjrujrrqxtfsuikakuu` (no new connector needed if the espadavilla/golfvilla
   Supabase connector is already wired up — same MCP, different project id).
3. Create the Cowork scheduled task using the prompt in
   `docs/cowork-approval-prompt.md`.
4. Decide how to unjam the two stuck `approved` drafts (see the JAMMED section
   above) — that queue won't drain until `257bdfd5` is fixed or removed.
5. Optional cleanup (out of scope, same phased plan as LinkedIn/golfvilla): once
   Cowork approvals are proven, the WhatsApp send step and `/api/inbound/*` routes
   can be retired for this agent — left running for now since they touch the
   LinkedIn agent's shared webhook.

## Files
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md` (this file)
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\cowork-approval-prompt.md`

## Git (run yourself)
```
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
git add docs/HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md docs/cowork-approval-prompt.md
git commit -m "docs: Cowork approval RPC handover + scheduled-task prompt (espadavilla)"
git push
```
Note: the migration `cowork_approval_rpc` was applied directly to Supabase
project `qqjrujrrqxtfsuikakuu` via MCP — it is live now and is not part of this
git push. Supabase keeps it in its own migration history.
