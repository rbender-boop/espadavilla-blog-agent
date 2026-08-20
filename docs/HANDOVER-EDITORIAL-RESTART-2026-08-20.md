# HANDOVER — Approval restart: "Espadavilla Blog Editorial" (2026-08-20)

Prepared by Claude (Cowork). Full plan doc lived in the session workspace;
this is the authoritative record of what changed.

## Rob's locked decisions
- One scheduled task, fresh start (old duplicates deleted by Rob).
- Drafting: Thursdays ONLY, 10:00am ET (14:00 UTC).
- Approval task: Thursdays ONLY, 10:30am ET (14:30 UTC).
- Publish rule: a post ships ONLY if it truly benefits SEO/AEO — never to mint a URL.
- Standing interaction rule: always question Rob via popout options (AskUserQuestion).

## Done LIVE this session (no push needed)
1. Cowork scheduled task created: "Espadavilla Blog Editorial"
   (`trig_0179EPTYJGfRj4fyDxfhzc9d`), cron `30 14 * * 4` UTC, push+email ON,
   cloud-run. Prompt = docs/cowork-approval-prompt.md (v2: SEO/AEO value gate,
   AI-slop check, weekly failure report). Manual test fire launched 10:56 UTC.
   NEVER create a second task — edit this one via update_trigger.
2. Supabase queue cleanup (project qqjrujrrqxtfsuikakuu):
   cancelled 3 redundant transport topics (f4ce475f, 0f8c47ad, 3184d0fa) —
   intent already covered by 2 published transport posts.
3. Stale-draft mystery resolved: draft 2290e09c PUBLISHED Aug 19 23:00 UTC with
   an edit that removed the past course-closure text; fee copy now reads
   "peak-season public green fees run $495" (no stale date). Refresh candidate,
   not an emergency.

## Code changes in THIS repo (Rob to push — see commands below)
- `vercel.json` — drafting moved to Thu-only 10am ET: post-refresh `0 12 * * 4`,
  gsc-topics `0 13 * * 4`, draft-weekly-post `0 14 * * 4`, worker
  `*/2 14-17 * * 4`. **failure-monitor cron REMOVED** (it 401'd into dead
  WhatsApp hourly since Aug 17, self-perpetuating; failures now surface in the
  weekly editorial task's report). drain-approved / expire-stale-drafts /
  voice-refinement unchanged. NOTE: Vercel cron is fixed UTC — after DST ends
  (Nov) these fire 9:00/9:30am ET.
- `src/lib/unipile.ts` — sendWhatsAppToOwner short-circuited (kill switch
  mirroring golfvilla's 8/17 one; original impl kept in comment).
- `src/lib/drafting/pipeline.ts` — notifyStep no longer calls
  sendDraftForApproval; drafts rest at status='pending' for the Cowork view.
  Removed dead imports + safelyNotify.
- `src/lib/jobs/run-worker.ts` — notifyOwnerOfFailure now console-only.
- `src/lib/gsc/topic-select.ts` — TOKEN_SYNONYMS canonicalization in the
  fingerprint (shuttle/transfer/transportation→transport; price/rate/fee→cost)
  so synonym topics dedup (the A2 fix).
- `docs/cowork-approval-prompt.md` — v2 (matches the live task verbatim).

## Verification
- `node .\node_modules\typescript\bin\tsc --noEmit` → exit 0 (clean).
- `npm run smoke` → exit 0; ONE pre-existing ✗ "render: H2 from ##" —
  unrelated to today's edits (none touch rendering) and present with an
  also-pre-existing uncommitted `src/lib/facts.ts` change (occupancy-guard
  refinement from an earlier session). BOTH need Rob's review before push.
- Humanizer confirmed running in prod: Aug 13 + Aug 17 pipeline jobs carry
  humanize state. HUMANIZE_DRAFTS not set to false.
- Golfvilla repo: kill switch already committed AND pushed (main==origin/main);
  no changes made there. Its facts.ts also has a small uncommitted change.

## Open items (not done, Rob's call)
- RLS disabled on all 7 blog_* tables (Supabase critical advisory) — anon key
  can read/modify them incl. unpublished drafts. Fix = enable RLS (service-role
  bypasses policies, so the pipeline keeps working) AFTER confirming no site
  page reads blog_* with the anon key.
- Queue still holds generic-DR-golf topics ("Best Golf Dominican Republic",
  "How Many Golf Courses...", etc.) = golfvilla's lane, plus a duplicate
  equestrian pair and a suspect "Punta Espada National Park" title. The weekly
  editorial task will recommend cancels with evidence.
- Uncommitted facts.ts changes (both repos) + the H2 smoke ✗ — review & decide.
- AEO probe re-run ~Sept 16 (post-profile diff) per HANDOVER-2026-08-19.

## Push commands (PowerShell, one per line) — Rob approved including facts.ts in both repos
cd 'C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent'
git add vercel.json src/lib/unipile.ts src/lib/drafting/pipeline.ts src/lib/jobs/run-worker.ts src/lib/gsc/topic-select.ts src/lib/facts.ts docs/cowork-approval-prompt.md docs/HANDOVER-EDITORIAL-RESTART-2026-08-20.md
git commit -m "feat: Thu-only cadence, retire WhatsApp alerting (kill switch), semantic topic dedup, occupancy-guard fix, Cowork editorial task v2"
git pull --rebase origin main
git push origin main

cd 'C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent'
git add src/lib/facts.ts
git commit -m "fix(facts): occupancy guard — separate max-capacity claims from group-size examples (flag only >22)"
git pull --rebase origin main
git push origin main
