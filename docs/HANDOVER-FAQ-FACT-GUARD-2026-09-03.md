# HANDOVER - FAQ / META Canonical-Fact Guard + Pre-Publish Gate (2026-09-03)

Applies to BOTH agent repos (identical code changes):
- C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\
- C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent\

## Why
golfvilla draft 8e81fb32 shipped 2026-09-03 with a FAQ answer saying "top-10 world-ranked"
and member-rate answers missing the butler binding. Root causes found in code (not the
assumed "FAQ not scanned"):
1. Both guards DID concatenate h1+body+faq, but the GolfWeek binding test was whole-text: one
   correct "eight consecutive years" in the body excused an unbound "#1" in a FAQ answer.
2. "top-10 world-ranked", Golf Digest-as-#1, Atlantic, ocean-hole count, "8-bedroom alone",
   and the butler binding had NO checks at all.
3. meta_title / meta_description / summary were never fact-scanned.
4. Violations carried no field tag.
5. Nothing re-checked the text that actually ships after a post-approval edit_post
   (8e81fb32 was flagged at draft time, risk_score=1.0, and was approved+published anyway).
6. facts.ts never told the drafter the member-guest rate is arranged through the butler.

## What changed (both repos)
src\lib\facts.ts
- included[] member-guest line + rates.note: "arranged through the villa's butler".
- buildFactsPromptBlock(): new "# FAQ / META / SUMMARY BINDING (HARD)" block - FAQ (q+a),
  meta_title, meta_description, summary, h1 bound like body; canonical-only (omit if absent);
  GolfWeek same-sentence binding; butler; rates; 6-or-8; Caribbean Sea / 8 ocean holes; food.
- Guard refactor: checkVillaFacts(text) kept (back-compat). NEW checkVillaFactsByField(fields)
  scans each field independently; FAQ passed as string[] -> per-item "[faq[i]]" tags; the two
  field-level bindings (8-bedroom-alone, member-rate->butler) run once on the joined FAQ.
  Butler binding enforced on body_markdown and faq ONLY (Rob 2026-09-03).
- New checks: claim-local GolfWeek binding (+-160 chars, both word orders); "top-10/top-25
  world-ranked" + stale "#35 in the world" (Punta Espada context only); Golf Digest/Magazine as
  #1 source (explicit attribution only); member rate claimed at Las Iguanas (same sentence,
  joined); "property owners" framing; Atlantic (exempt hurricane/storm/basin/time); ocean holes
  != 8 (Punta Espada context); "8-bedroom" without 6-bedroom in same field; "22 guests in
  either ..." variant.

src\lib\drafting\generate-post.ts
- export postFactFields(post) -> { meta_title, meta_description, h1, summary, body_markdown,
  faq: string[] }. Sync drafter now calls checkVillaFactsByField(postFactFields(post)).
src\lib\drafting\pipeline.ts
- guardStep uses checkVillaFactsByField(postFactFields(post)).
src\lib\publish\commit-post.ts
- NEW step 1c PRE-PUBLISH FACT GATE after the contact-info guard: runs the field guard on
  {meta_title, meta_description, h1, summary, body = edited_content ?? body_markdown, faq}.
  On violation: NO publish; row -> status='pending', risk_score=1.0,
  block_reason='[pre-publish] ...'; blog_agent_runs row status='partial'
  metadata.gate='pre-publish-facts'; WhatsApp "Publish HELD" notice. Reappears in
  v_pending_approvals under the FLAGGED banner. (Rob decision 2026-09-03.)
scripts\verify-offline.ts
- 18 new guard(field) cases (unbound FAQ GolfWeek, top-10, Golf Digest, butler, Las Iguanas,
  Atlantic, 9 ocean holes, 8-alone in meta_title, "six- or eight-bedroom" passes, sibling FAQ
  item, retired-capacity variant, $4,400, field tag). One legacy case updated to 6-or-8.
docs\cowork-approval-prompt.md (v5, byte-identical in both repos, SHA256 249AA248...9E20B)
- Step 7: edit_post('<id>', '<text>', '<faq json>'::jsonb) form + p_new_faq jsonb note.
- Mechanics: edit_post signature (uuid, text, jsonb default null); PRE-PUBLISH FACT GATE note.
No DB changes. No site-repo changes. scripts\_faq-guard-dryrun.ts was temp and is deleted.

## Verification (both repos)
- npm run typecheck -> exit 0
- npm run verify:offline -> ALL CHECKS PASSED (incl. 22 guard cases)
- Dry-run of the new guard against every published post (18 golfvilla / 23 espadavilla):
  4 false-positive patterns found and fixed (Atlantic hurricane season; "#35 by Golf Digest
  and #1 by GolfWeek"; "member-guest rate ... and access to Las Iguanas"; "six- or
  eight-bedroom"; butler required in meta/summary/h1). Remaining hits were spot-checked
  against source text and are all TRUE violations. False positives after tuning: 0.

## Retroactive audit of PUBLISHED posts (dry-run 2026-09-03) - NO DB WRITES MADE
Flagged: golfvilla 18 of 18; espadavilla 21 of 23 (clean: c06fad14 tennis-and-padel,
fd5328bc getting-around had only pre-existing hits; beaea760, 2aed71e5 clean after tuning).
Violation classes and where they appear (field tags per post are in the guard output):
- Unbound "#1 in the Caribbean" (no "eight consecutive years"): ~30 posts, body + FAQ + summary
  + meta_description (82601fbb, 0f7ed17c). Posts predate the 2026-08-26 binding rule.
- Stale "#35 in the world": e3766611 faq[4], d3b7f235, 04f8ef74, fb61018d, 28c99e1e,
  d0874279 (body + faq[0]), 5cb1f856.
- Retired capacity "in either configuration" / "22 guests in either": a61878b7, 8e81fb32
  (body + faq[0]), 0f7ed17c (body + faq[2]), 257bdfd5, 2290e09c (body + faq[1]), 5cb1f856 faq[1].
- Composite nightly rate $4,400: 5cb1f856 body.
- Member-guest rate with no butler anywhere in FAQ: b311fa23, 257bdfd5 (espadavilla).
- Pre-existing-rule hits (banned food phrases, "36 holes of Nicklaus golf", beach-club
  blackout caveat, 6BR=22): most posts on both sites.

## Why the retroactive fix was NOT executed this session
1. edit_post raises unless the row is pending / sent_for_approval / pending_edit_confirmation.
   Published rows cannot be edited through the RPC (verified from pg_get_functiondef).
2. The 2026-08-22 food-phrase purge was applied to 18 committed blog HTML files in the site
   repo, NOT to blog_post_drafts.body_markdown. Re-rendering any of those posts from the DB
   would REGRESS the live HTML. The DB is not yet at parity with the live HTML.
Viable paths (Rob decision):
A. Phase-4 refresh topics (refreshes_draft_id) per post -> new draft -> the new pre-publish
   gate guarantees the replacement is clean -> supersedes the original. Safe, slow (39 posts).
B. One guarded script: pull each published row, apply canonical substitutions to
   body_markdown/faq/summary/meta_description, DIFF the re-render against the live HTML in
   rbender-boop/<site> to prove DB >= HTML, then UPDATE + rerender-published. Fast, needs the
   diff step first. espadavilla has scripts\rerender-published.ts; golfvilla does not.
Recommendation: B, as its own session, starting with the diff (read-only).

## Behavior change to expect after deploy
- Drafts mentioning the member-guest rate in body or FAQ without "butler" will be flagged
  (risk_score=1.0) - still reviewable/approvable, just banner-flagged.
- An approved post whose shipping text fails the guard is HELD (back to pending, flagged),
  not published, and not retried every 15 min. Fix via edit_post (p_new_faq / p_new_text)
  then approve again.
- KILL SWITCH (audit 2026-09-03): Vercel env PREPUBLISH_FACT_GATE=false makes the gate
  warn-only (publishes, records block_reason, WhatsApp warning). Not set by default. Use for
  a deliberate override or a suspected false positive, then unset.
- CAUTION: a HELD post is a normal pending row. expire-stale-drafts will expire it after
  STALE_DRAFT_HOURS (src\lib\config.ts) and requeue its topic if nobody acts. Fix or reject
  a held post within that window.
- GolfWeek check is scoped to course-ranking claims (ctx must contain punta espada / nicklaus /
  course / golf), so "Punta Cana is the #1 destination in the Caribbean" is not flagged.
- Existing published posts are untouched until the retroactive session.

## Push (Rob runs; PowerShell; one per line; pull --rebase first - blog agents push concurrently)
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
git pull --rebase
git add src/lib/facts.ts src/lib/drafting/generate-post.ts src/lib/drafting/pipeline.ts src/lib/publish/commit-post.ts scripts/verify-offline.ts docs/cowork-approval-prompt.md docs/HANDOVER-FAQ-FACT-GUARD-2026-09-03.md
git commit -m "guard: field-aware canonical-fact check (FAQ+meta+summary), butler binding, GolfWeek claim-local; pre-publish fact gate in commit-post; docs p_new_faq"
git push
cd "C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent"
git pull --rebase
git add src/lib/facts.ts src/lib/drafting/generate-post.ts src/lib/drafting/pipeline.ts src/lib/publish/commit-post.ts scripts/verify-offline.ts docs/cowork-approval-prompt.md docs/HANDOVER-FAQ-FACT-GUARD-2026-09-03.md
git commit -m "guard: field-aware canonical-fact check (FAQ+meta+summary), butler binding, GolfWeek claim-local; pre-publish fact gate in commit-post; docs p_new_faq"
git push
Note: espadavilla working tree also shows a pre-existing " D _scan.py" (deleted, tracked).
Not part of this change; not staged above.

## Next
1. Retroactive session (path B above): read-only DB-vs-live-HTML diff first.
2. Watch the first drafting runs after deploy (Thu 14:00 UTC espadavilla / Mon+Thu 13:00 UTC
   golfvilla) for block_reason field tags and the first pre-publish HOLD, if any.
3. The v5 Cowork task prompt (trig_0179EPTYJGfRj4fyDxfhzc9d) should be updated via
   update_trigger with the new step-7 edit_post form; docs are the source.
