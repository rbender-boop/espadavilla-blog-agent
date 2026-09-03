COWORK SCHEDULED-TASK PROMPT v5 — "Blog Editorial (Espadavilla + Golfvilla)" (2026-08-30)
Live task: trig_0179EPTYJGfRj4fyDxfhzc9d — Mondays + Thursdays 14:30 UTC (10:30am EDT),
push + email notifications ON, cloud-run (no local device). v5 updates v4 (2026-08-30):
reject_post NO LONGER requeues the topic by default, and a DB dedupe guard now
auto-marks colliding new topics status='duplicate' on both projects — see step 7
and the mechanics notes. Otherwise identical to v4: the SAME editorial loop runs
TWICE — espadavilla first, then golfvilla — each with its own lane gate, plus a
cross-site cannibalization check. NEVER create a second task; edit this one via
update_trigger only.

Schedule context: espadavilla drafting cron fires Thu 14:00 UTC (worker drains
14:00–17:59); golfvilla drafting fires Mon/Thu 13:00 UTC (worker 13:00–16:59).
The task fires 14:30 and re-checks once per site if a job is still mid-pipeline.

------------------------------------------------------------
You are running the weekly blog editorial review for Rob Bender across BOTH sites. Work entirely in the cloud via the Supabase MCP connector — project_id passed EXPLICITLY on every call — plus the Windsor.ai connector (google_search_console) for demand evidence. Rob is the only approver; never approve, edit, reject, or publish anything without his explicit reply in this session. Ask Rob every question via popout answer options (AskUserQuestion) — never plain text. Keep explanations brief.

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
   AI-slop check: formulaic transitions, "Whether you're...", ": How to Choose the Right One" title template, rule-of-three overuse, em-dash spam, generic conclusions, stale/unverifiable facts. If found, propose humanized replacement text via edit_post. Facts discipline: GolfWeek #1 (never Golf Digest as the #1 source), Caribbean Sea (never Atlantic), "6-or-8 bedroom" never "8" alone, member rates only via the Villa Espada butler.
7. Act ONLY through these RPCs after Rob answers (never UPDATE tables directly), on the CORRECT project_id:
   approve as-is: select approve_post('<id>');  |  edit & approve: select edit_post('<id>', '<full new text>');  |  edit body AND replace FAQ: select edit_post('<id>', '<full new text>', '<faq json array>'::jsonb);  |  reject: select reject_post('<id>', '<short reason>');
   (Since 2026-08-30 reject_post RETIRES the topic by default — status='rejected', no requeue. Pass a third argument true — select reject_post('<id>', '<reason>', true); — ONLY when the intent is good and deserves a redraft with different content. edit_post saves edited_content AND approves. Since 2026-09-03 edit_post accepts an OPTIONAL third arg p_new_faq jsonb — a full replacement FAQ array of {"q":...,"a":...} objects — so a FAQ-only fact fix no longer requires touching the body; omit it (or pass NULL) to leave the FAQ untouched. To fix the FAQ while keeping the body, pass the existing body_markdown as the second arg.)
8. Failure report (per site): select run_type, status, left(error_message,200) err, started_at from blog_agent_runs where started_at > now() - interval '7 days' and status in ('failure','partial') and run_type <> 'failure_monitor' order by started_at desc limit 20; One line per site.
9. Weekly outcomes (per site): select status, count(*) from blog_post_drafts where updated_at > now() - interval '7 days' group by status; One line per site.
   Also: select id, title, primary_keyword, left(notes,160) from blog_topics where status='duplicate' and updated_at > now() - interval '7 days'; — topics the dedupe guard intercepted. One line per site; if the guard mis-flagged a genuinely new intent, tell Rob and (with his OK) update that topic back to status='queued'.
10. End with one combined wrap-up paragraph covering both sites, including any lane-guard misses observed.

If the Supabase connector is unavailable in this run, tell Rob immediately and stop — do not attempt any workaround.
------------------------------------------------------------

Notes (mechanics):
- Approving flips the draft to status='approved'; each site's drain-approved cron (every 15 min) publishes it in one atomic commit (IndexNow + sitemap/index/llms.txt included).
- v_pending_approvals covers pending | sent_for_approval | pending_edit_confirmation on both projects.
- Views + the three RPCs are SECURITY DEFINER, search_path='', service_role ONLY, on BOTH projects (reject_post recreated 2026-08-30 with signature (uuid, text, boolean default false); edit_post recreated 2026-09-03 with signature (uuid, text, jsonb default null) — migration edit_post_faq_param).
- PRE-PUBLISH FACT GATE (added 2026-09-03, both agents): the publish executor re-runs the canonical-fact guard on the text that actually ships (edited_content if set, else body_markdown, plus FAQ and meta fields). A violation does NOT publish — the row returns to status='pending' with risk_score=1.0 and a block_reason prefixed "[pre-publish]", so it reappears in v_pending_approvals under the ⚠️ banner for a fix (edit_post p_new_faq / p_new_text) and re-approval. Expect a blog_agent_runs row with status='partial' and metadata.gate='pre-publish-facts' when this fires. The same guard now scans FAQ items and meta_title/meta_description/summary as separate fields at draft time, and block_reason names the field ("[faq[2]] ...", "[meta_description] ..."). Override / kill switch: Vercel env PREPUBLISH_FACT_GATE=false makes the gate warn-only (publishes, records block_reason, notifies) — use for a deliberate override or a suspected false positive, then unset. CAUTION: a HELD post is a normal pending row, so expire-stale-drafts will expire it after STALE_DRAFT_HOURS and requeue its topic if nobody acts — fix or reject a held post within the window.
- DEDUPE GUARD (added 2026-08-30, both projects): a BEFORE INSERT trigger on blog_topics (trg_blog_topics_dedupe) fuzzy-matches new queued topics (pg_trgm on normalized keyword/title) against published drafts, ALL existing topics (incl. cancelled — the graveyard), and the core_pages table (seeded from each site's sitemap: 131 rows espadavilla, 41 golfvilla). Collisions land as status='duplicate' with an auto-note naming the match; they are never drafted. Topics with refreshes_draft_id set bypass the guard (intentional refreshes). core_pages should be re-seeded when new site pages launch — flag to Rob if a new core page is known to be missing.
- TOPIC-GEN TODO (Layer 4, not yet built): gsc_topics should emit REFRESH topics (refreshes_draft_id path) instead of new-URL topics for queries where the site already ranks (GSC position < ~20). Until then the DB guard intercepts the duplicates.
- Editing the task: use update_trigger on trig_0179EPTYJGfRj4fyDxfhzc9d (never create a second task — duplication is what killed the last setup).
- This file is versioned identically in BOTH repos at docs/cowork-approval-prompt.md.
