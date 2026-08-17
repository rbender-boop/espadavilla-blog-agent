# HANDOVER — Cowork Approvals for Espadavilla Blog Agent (2026-08-17)

Full record of this session's work: moved blog-post approvals off WhatsApp onto
Claude Cowork (validated Supabase RPC via the already-connected Supabase MCP),
created the Cowork scheduled task, and cleared a live publish-queue jam.

Supabase project: `qqjrujrrqxtfsuikakuu` (capital-S Supabase MCP).

## TL;DR — what changed today
1. Built 3 SECURITY DEFINER RPC functions + 1 view in Supabase (migration
   `cowork_approval_rpc`). No app/`src` code touched.
2. Created the Cowork scheduled task "Espadavilla Blog Approvals"
   (`trig_01TVrZNES4NPDyfzMwYkYRBn`), Mon & Thu 17:00 UTC — mirrors golfvilla.
3. Found the publish queue jammed (contact-info guard) and FIXED it by editing
   the offending draft's body directly in Supabase. Both stuck drafts now clean
   and awaiting the next 15-min drain to publish.
4. Confirmed cadence: this agent drafts twice a week (Mon & Thu), so twice-weekly
   approvals is correct.

## Why (context)
WhatsApp/Unipile is dead (account suspended, TOS risk) — same migration the
LinkedIn and golfvilla agents already did. Cowork now talks to Postgres directly
through validated RPCs. No custom MCP server, no OAuth dead end.

## 1) What was built in Supabase (migration `cowork_approval_rpc`)
Applied directly to project `qqjrujrrqxtfsuikakuu` via `apply_migration` (MCP).
It is LIVE now and lives in Supabase's own migration history — it is NOT part of
the git repo.

- `v_pending_approvals` (view) — every draft awaiting Rob (status in
  pending / sent_for_approval / pending_edit_confirmation), left-joined to
  `blog_topics` for cluster / primary_keyword / topic_title. Exposes
  body_markdown, edited_content, faq, sources, internal_links, risk_score,
  block_reason, meta_title/description, h1, summary, word_count.
- `approve_post(p_draft_id uuid)` → validates the draft is in the awaiting set
  (raises a clear exception otherwise), sets `status='approved'`, logs a
  `blog_approval_messages` row (`channel='cowork', resolution='approved'`).
- `edit_post(p_draft_id uuid, p_new_text text)` → same validation, rejects empty
  text, sets `edited_content` + `status='approved'` in one step.
- `reject_post(p_draft_id uuid, p_reason text default null)` → same validation,
  sets `status='skipped'`, returns the topic to the queue
  (`blog_topics.status='queued'`), logs the reason.
- All three: `plpgsql`, `security definer`, `set search_path = ''`, every table
  reference schema-qualified — immune to search-path hijacking.

### Security (deliberate deviation from the LinkedIn "grant to public" note)
Postgres grants EXECUTE/SELECT to PUBLIC by default, which would expose these to
`anon`/`authenticated` via `/rest/v1/rpc/...` — i.e. espadavilla.com's public
anon key (in every visitor's browser) could read unpublished drafts or
force-publish/sabotage. So the migration revokes EXECUTE/SELECT from
`public, anon, authenticated` and grants to `service_role` only. Verified with
`get_advisors(security)`: none of the four new objects appear in any finding.
Cowork's Supabase MCP uses elevated project credentials (not the anon key), so it
is unaffected — confirmed by the fake-id test still returning "not found" (not a
permission error).

Pre-existing advisor findings NOT introduced here (out of scope): all `blog_*`
tables have RLS disabled (app uses the service-role key, which bypasses RLS), and
`increment_visitor` is an intentionally-public SECURITY DEFINER function.

## 2) Diagnosis (verified live against the DB + repo code, not guessed)
- Table: `public.blog_post_drafts`. **No CHECK constraint on `status`**
  (`pg_get_constraintdef` = zero rows) — status vocabulary is enforced in app
  code only. **No triggers** on blog_post_drafts / blog_topics /
  blog_approval_messages / blog_agent_runs (`pg_trigger` = zero rows).
- **Awaiting-Rob set**: `pending` | `sent_for_approval` |
  `pending_edit_confirmation` (exactly what `expire-stale-drafts` treats as
  "waiting on a human"; `approved` is intentionally never expired). Cowork skips
  the WhatsApp send step, so most drafts sit in `pending`; the view covers all
  three.
- **Approved value**: `approved`. **Reject value**: `skipped`.
- **Edited-text column**: `edited_content` — `commit-post.ts` publishes it in
  preference to `body_markdown`.
- **No per-draft image column** — hero image is chosen deterministically by
  `pickPostImage(slug, cluster)` at publish time. Nothing to preview per draft.
- On reject/skip, returning the topic to `queued` is app logic
  (`parse-reply.ts` markSkipped), not a trigger — `reject_post` replicates it.

## 3) Publish path (confirmed live, unchanged)
- Approving only flips status to `approved`. The publisher
  (`publishApprovedDraft` in `src/lib/publish/commit-post.ts`) is driven by the
  **`drain-approved` cron — every 15 min** (`vercel.json`: `*/15 * * * *`) via
  `publishAllApproved()`. Verified live in `blog_agent_runs` (drain fires every
  ~15 min, all day, every day — NOT weekly).
- It renders the post, updates blog index/sitemap/llms.txt, pings IndexNow, and
  commits everything to the site repo in one atomic commit; Vercel auto-deploys.
  Idempotent (a `published` draft is never re-committed).
- `approve_post`/`edit_post` land the draft in exactly the `approved` state this
  executor already expects — no code change needed. **Approving a real id
  publishes for real within ~15 min.**
- `publishAllApproved` processes approved drafts oldest-first and **breaks on the
  first failure** — so one un-publishable draft blocks every draft behind it
  (this is what caused today's jam, see §5).
- `/api/inbound/resolve` + `/api/inbound/pending` (shared LinkedIn-webhook
  WhatsApp plumbing) left untouched — redundant for approvals now but shared
  infrastructure; do not delete as part of this change.

## 4) Cowork scheduled task (created this session)
- Name: **Espadavilla Blog Approvals**
- ID: `trig_01TVrZNES4NPDyfzMwYkYRBn`
- Schedule: `0 17 * * 1,4` — **Mon & Thu 17:00 UTC (1:00 pm ET)**, enabled.
- Notifications: phone push ON, email OFF.
- Next run: 2026-08-20 (Thu) 17:00 UTC.
- Prompt: mirrors golfvilla's task verbatim, adapted to project
  `qqjrujrrqxtfsuikakuu` and espadavilla.com. Same text is saved in
  `docs/cowork-approval-prompt.md` for pasting into an on-demand Cowork chat.

Why twice a week: this agent DRAFTS twice a week (see §6), and each firing runs a
few hours after the 13:00 UTC Mon/Thu drafting window, so each approval run has
fresh drafts waiting. Matches the golfvilla task exactly.

### How Rob approves (two ways)
1. Automatic: the scheduled task opens a fresh Cowork session Mon/Thu, pulls
   `v_pending_approvals`, and walks each draft. Rob replies approve / edit / reject;
   Cowork runs the matching RPC. Phone push when the run finishes.
2. On demand: start a Cowork chat and say "run my espadavilla blog approvals" (or
   paste `docs/cowork-approval-prompt.md`). Same flow, any time.

The three commands Cowork runs (never a raw UPDATE):
- Approve as-is:  `select approve_post('<id>');`
- Edit & approve: `select edit_post('<id>', '<new text>');`
- Reject:         `select reject_post('<id>', '<reason>');`

## 5) Live publish-queue jam — found and FIXED this session
At session start two drafts were stuck in `approved` and the drain cron could not
clear them:
- `257bdfd5-78b1-4c1c-b227-34b3a881df8e` — "cap-cana-direct-booking-villa-espadavilla".
  Every drain run (13:00 → 19:15 UTC) failed it with the **contact-info guard**:
  `rob@espadavilla.com found in visible HTML outside JSON-LD`. Its "How to Contact"
  section listed the email AND a raw phone number in visible body copy.
- `108a6f52-2960-4de4-8a42-84c67048fd63` — "things-to-do-villa-espada-non-golf-family"
  (clean, risk_score 0). Was stuck ONLY because `publishAllApproved` breaks on the
  first failure, so it never got attempted behind the poisoned draft.

Neither Cowork RPC could touch them (both already `approved`, past the awaiting
set). Fix applied — a direct data edit in Supabase (NOT code, NOT git):
```sql
update public.blog_post_drafts
set body_markdown = replace(
      replace(body_markdown, E'- **Email:** rob@espadavilla.com\n', ''),
      '- **WhatsApp:** +1 (734) 755-6357',
      '- **WhatsApp:** [message us directly on WhatsApp](https://wa.me/17347556357)'
    ), updated_at = now()
where id = '257bdfd5-78b1-4c1c-b227-34b3a881df8e' and status = 'approved';
```
Rationale: the guard (`src/lib/publish/contact-info-guard.ts`) hard-blocks
`rob@espadavilla.com` and the raw phone `7347556357` in visible copy, but ALWAYS
allows the WhatsApp CTA `https://wa.me/17347556357` and email inside JSON-LD. So
the contact section now uses the website link, the WhatsApp CTA, and the inquiry
form — no visible email/phone. Verified post-edit: email absent, no raw phone;
`108a6f52` was already clean of both. Both drafts remain `approved` and will
publish on the next drain tick (they were NOT re-approved or hand-published).

A one-off verification check (`trig_012ZAtGu6VGc6jBNqxbK7MTL`, fires 2026-08-17
19:44 UTC) was scheduled to confirm both reach `status='published'` with live
URLs; it self-disables after firing.

## 6) Drafting cadence (confirmed live)
- Deployed `vercel.json`: `draft-weekly-post` = `0 13 * * 1,4` → **Mon & Thu**.
  Each fire enqueues exactly one drafting job (idempotent). So ~2 new drafts/week.
- Live history confirms steady-state 2/week (Aug 10, Aug 3, Jul 27, Jul 20,
  Jul 13, Jul 6, Jun 29 all = 2).
- Note: the code comment in `draft-weekly-post/route.ts` says `Mon 13:00 UTC
  (0 13 * * 1)` — that comment is STALE; the deployed schedule is Mon & Thu and
  the data proves twice weekly. (Cosmetic; fix on the next code change.)
- The week of Aug 17 shows 5 drafts — **intentional: Rob drafted 3 extra by hand
  this week.** Not a misfire.
- Conclusion: twice-weekly approvals is the correct cadence; do NOT reduce the
  scheduled task to once a week.

## 7) Testing performed (no real post approved during testing)
- `select * from v_pending_approvals;` returned the live pending draft
  `2290e09c-...` ("Punta Espada Golf Shuttle", risk_score=1 with a villa-fact
  block_reason — pre-existing flag, untouched).
- `approve_post` / `edit_post` / `reject_post` each called with the nil UUID
  `00000000-0000-0000-0000-000000000000` — all raised the expected "not found".
  No row modified during testing.
- `get_advisors(security)` re-run after the migration — clean for all four new
  objects.
- The §5 jam fix was verified by re-querying the draft (email/phone gone).

## 8) Open items / TODO — Rob
1. Confirm both jammed drafts published on the next drain (the 19:44 UTC check
   reports into the Cowork chat; or run:
   `select id, status, live_url from public.blog_post_drafts
    where id in ('257bdfd5-78b1-4c1c-b227-34b3a881df8e',
                 '108a6f52-2960-4de4-8a42-84c67048fd63');`).
2. Confirm the Supabase connector in Cowork points at project
   `qqjrujrrqxtfsuikakuu` (no new connector if the shared Supabase connector is
   already wired).
3. Git: commit + push the updated docs (commands below).
4. Optional (out of scope, phased plan): retire the WhatsApp send step and
   `/api/inbound/*` routes for this agent once Cowork approvals are proven — left
   running because they touch the LinkedIn agent's shared webhook.
5. Optional cosmetic: fix the stale Mon-only comment in
   `draft-weekly-post/route.ts` (§6).

## 9) What is code vs. data vs. Cowork config (so nothing is confused later)
- **Supabase (live, in Supabase migration history, NOT git):** migration
  `cowork_approval_rpc` (the view + 3 functions) and the one-off data edit to
  draft `257bdfd5`'s body.
- **Cowork account config (NOT git):** scheduled task
  `trig_01TVrZNES4NPDyfzMwYkYRBn` and the one-off verify check
  `trig_012ZAtGu6VGc6jBNqxbK7MTL`.
- **Git repo (needs a push):** the two docs below. **No `src` code was changed**,
  so `npx tsc --noEmit` was not required.

## 10) Files
- `docs/HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md` (this file)
- `docs/cowork-approval-prompt.md` (the scheduled-task / on-demand prompt)

Full paths:
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md`
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\cowork-approval-prompt.md`

## 11) Git (run yourself)
```
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
git add docs/HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md docs/cowork-approval-prompt.md
git commit -m "docs: full Cowork approvals handover (RPC + scheduled task + queue-jam fix)"
git push
```
Note: `cowork-approval-prompt.md` was already pushed earlier today; this commit
picks up the expanded handover (and re-adds the prompt if unchanged — harmless).
The Supabase migration and the draft data-edit are live in Supabase and are not
part of this push.
