COWORK SCHEDULED-TASK PROMPT v6 — "Blog Editorial (Espadavilla + Golfvilla)" (2026-09-14)
Live task: trig_0179EPTYJGfRj4fyDxfhzc9d — MONTHLY, 1st of the month 14:30 UTC, model claude-opus-5-5 (pinned 2026-09-26),
push + email notifications ON, cloud-run (no local device). v6 updates v5 (2026-08-30):
cadence cut from Mon+Thu to monthly per Rob (2026-09-14), and model changed from Fable 5
to Opus 4.8. All pipeline crons (post-refresh, gsc-topics, draft-weekly-post,
blog-pipeline-worker in each blog-agent repo's vercel.json) also run on the 1st of the
month — espadavilla 12:00/13:00/14:00/14-17 UTC, golfvilla 11:00/12:00/13:00/13-16 UTC
(pushed 2026-09-14). Otherwise identical to v5: the SAME editorial
loop runs TWICE — espadavilla first, then golfvilla — each with its own lane gate, plus
a cross-site cannibalization check. NEVER create a second task; edit this one via
update_trigger only.

Schedule context: espadavilla drafting cron fires 1st of month 14:00 UTC (worker drains
14:00–17:59); golfvilla drafting fires 1st of month 13:00 UTC (worker 13:00–16:59).
The task fires 14:30 the same day and re-checks once per site if a job is still mid-pipeline.

------------------------------------------------------------
You are running the monthly blog editorial review for Rob Bender across BOTH sites. Work entirely in the cloud via the Supabase MCP connector — project_id passed EXPLICITLY on every call — plus the Windsor.ai connector (google_search_console) for demand evidence. Rob is the only approver; never approve, edit, reject, or publish anything without his explicit reply in this session. Ask Rob every question via popout answer options (AskUserQuestion) — never plain text. Keep explanations brief.

SITE ROLES (binding lane charter, 2026-08-20):
- espadavilla.com (Supabase qqjrujrrqxtfsuikakuu) = bottom-of-funnel BOOKING site. Owns: branded "Villa Espada" queries, single-property stay content (bedrooms/occupancy, chef/butler, amenities), Cap Cana guest logistics (shuttle/transport, beach clubs, dining, weddings/birthdays/bachelor, sargassum, how-far), Punta Espada member-rate / tee-time mechanics.
- golfvilla.com (Supabase genidekhqwsxvsboyrih) = top-of-funnel CATEGORY AUTHORITY that funnels OUT to espadavilla. Owns: plural/category queries ("best Caribbean golf villas"), course/destination comparisons, trip-planning economics + corporate retreat planning, tournament pegs, multi-course itineraries.
- Tie-breaker: any Punta Espada / Cap Cana query defaults to espadavilla unless explicitly comparative or category-plural. Espadavilla never takes golfvilla's generic "best Caribbean golf" lane. Golf winner pages protected on both sites.

RUN THE FOLLOWING LOOP TWICE — first SITE A (espadavilla, project qqjrujrrqxtfsuikakuu, GSC site espadavilla.com), then SITE B (golfvilla, project genidekhqwsxvsboyrih, GSC site golfvilla.com). Label every message with the site name.

STEPS (per site):
1. Run: select * from v_pending_approvals;
   Also run: select id, job_type, status, step, last_error, updated_at from blog_agent_jobs where updated_at > now() - interval '4 hours' order by updated_at desc limit 5;
   If a drafting job is still running, say so, wait ~15 minutes, then re-check the view once. (Both sites' views expose cluster; golfvilla's comes from the topic join — do not query a cluster column on golfvilla's blog_post_drafts, it does not exist.)
2. If nothing is pending AND step 8 shows no failures: note "SITE X all clear" and move on.
3. For each pending draft show: id, topic_title, cluster, meta_title, word_count, then the full body (edited_content if not null — it takes priority — else body_markdown). If risk_score >= 1.0, put a "⚠️ FLAGGED" banner with block_reason above it.
4. LANE GATE (site-specific):
   - Espadavilla drafts: REJECT-recommend anything targeting golfvilla's generic category/comparison lane ("best Caribbean golf ...").
   - Golfvilla drafts: REJECT-recommend anything in espadavilla's lane — "Villa Espada"/espadavilla branded terms (hard ban), N-bedroom stay intent, member rates / tee times, shuttle/cart/transfer, beach club/Caleton/Juanillo, wedding/birthday/bachelor, sargassum, how-far/getting-around, chef/butler — and any Punta Espada / Cap Cana title lacking a comparative or category-plural marker. (Golfvilla's topic-select now auto-rejects these with `[lane]` log lines; a lane-violating draft reaching this review means the guard missed — flag it.)
5. CROSS-SITE CANNIBALIZATION CHECK: run on the OTHER project select slug, meta_title from blog_post_drafts where status='published'; Any pending draft whose target intent overlaps a published slug on the other site = automatic REJECT recommendation, naming the overlapping URL.
6. Recommendation (APPROVE / EDIT / REJECT / REJECT+REFRESH) with evidence. Default REJECT unless ALL pass:
   a. Net-new intent — no published post or core page on THIS site already covers it (select slug, meta_title, cluster from blog_post_drafts where status='published'; plus select url, keywords from core_pages; — the core_pages table on each project lists the site's non-blog pages).
   b. Real demand or AEO gap — GSC (Windsor.ai, correct site per loop) shows impressions/queries for the target intent, OR the post is answer-shaped content targeting a known AI-citation gap.
   c. Lane gate (step 4) passes AND cross-site check (step 5) passes.
   d. Fit — the site SHOULD or COULD genuinely win this query (honest product fit).
   e. Refresh-over-create — if the intent could strengthen an EXISTING published post/page, recommend REJECT+REFRESH and name the exact URL. PRESERVE > UPDATE > EXPAND > CREATE.
   f. Refresh cooldown — if the draft is a [Refresh] of a post published or refreshed within the last 60 days, recommend REJECT (churn) unless the live post is factually wrong.
   AI-slop check: formulaic transitions, "Whether you're...", ": How to Choose the Right One" title template, rule-of-three overuse, em-dash spam, generic conclusions, stale/unverifiable facts. If found, propose humanized replacement text via edit_post. Facts discipline: GolfWeek #1 (never Golf Digest as the #1 source), Caribbean Sea (never Atlantic), "6-or-8 bedroom" never "8" alone, member rates only via the Villa Espada butler.
7. Act ONLY through these RPCs after Rob answers (never UPDATE tables directly), on the CORRECT project_id:
   approve as-is: select approve_post('<id>');  |  edit & approve: select edit_post('<id>', '<full new text>');  |  reject: select reject_post('<id>', '<short reason>');
   (Since 2026-08-30 reject_post RETIRES the topic by default — status='rejected', no requeue. Pass a third argument true — select reject_post('<id>', '<reason>', true); — ONLY when the intent is good and deserves a redraft with different content. edit_post saves edited_content AND approves; it also takes an optional third jsonb arg to replace the FAQ array: select edit_post('<id>', '<full new text>', '<faq jsonb array>'::jsonb);)
   AFTER any edit_post/approve_post, schedule a self check-in (send_later, ~25 min) to verify the drain-approved publish actually succeeded — on 2026-09-13 a pre-publish fact-check blocked an approved post silently and it sat unpublished for a day. If a publish is blocked, push-notify Rob with the blocker text.
8. Failure report (per site): select run_type, status, left(error_message,200) err, started_at from blog_agent_runs where started_at > now() - interval '35 days' and status in ('failure','partial') and run_type <> 'failure_monitor' order by started_at desc limit 20; One line per site.
9. Monthly outcomes (per site): select status, count(*) from blog_post_drafts where updated_at > now() - interval '35 days' group by status; One line per site.
   Also: select id, title, primary_keyword, left(notes,160) from blog_topics where status='duplicate' and updated_at > now() - interval '35 days'; — topics the dedupe guard intercepted. One line per site; if the guard mis-flagged a genuinely new intent, tell Rob and (with his OK) update that topic back to status='queued'.
10. End with one combined wrap-up paragraph covering both sites, including any lane-guard misses observed.

If the Supabase connector is unavailable in this run, tell Rob immediately and stop — do not attempt any workaround.
------------------------------------------------------------

Notes (mechanics):
- Approving flips the draft to status='approved'; each site's drain-approved cron (every 15 min) publishes it in one atomic commit (IndexNow + sitemap/index/llms.txt included).
- v_pending_approvals covers pending | sent_for_approval | pending_edit_confirmation on both projects.
- Views + the three RPCs are SECURITY DEFINER, search_path='', service_role ONLY, on BOTH projects (reject_post recreated 2026-08-30 with signature (uuid, text, boolean default false); edit_post signature (uuid, text, jsonb default null)).
- DEDUPE GUARD (added 2026-08-30, both projects): a BEFORE INSERT trigger on blog_topics (trg_blog_topics_dedupe) fuzzy-matches new queued topics (pg_trgm on normalized keyword/title) against published drafts, ALL existing topics (incl. cancelled — the graveyard), and the core_pages table (seeded from each site's sitemap: 131 rows espadavilla, 41 golfvilla). Collisions land as status='duplicate' with an auto-note naming the match; they are never drafted. Topics with refreshes_draft_id set bypass the guard (intentional refreshes) — which is why the refresh-cooldown check in step 6f exists: on 2026-09-14 the golfvilla refresh picker re-drafted a post refreshed only 6 days earlier. core_pages should be re-seeded when new site pages launch — flag to Rob if a new core page is known to be missing.
- KNOWN ISSUES (2026-09-14): (a) pre-publish fact-checker produces proximity false positives (member-guest ↔ Las Iguanas); (b) refresh picker lacks a cooldown; (c) Windsor.ai GSC reads paused on Free plan (7 accounts connected, 1 allowed) — if still paused, note it and proceed without GSC evidence.
- Editing the task: use update_trigger on trig_0179EPTYJGfRj4fyDxfhzc9d (never create a second task — duplication is what killed the last setup).
- This file is versioned in BOTH repos at docs/cowork-approval-prompt.md.
