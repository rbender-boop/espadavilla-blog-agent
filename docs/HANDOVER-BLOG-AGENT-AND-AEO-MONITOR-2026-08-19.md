# HANDOVER — Blog Agent Open Items + AEO Monitor Baseline (2026-08-19)

**Prepared by:** Claude (Cowork) — read/audit + probe build. **No live-site changes made this session.**
**Scope:** espadavilla-blog-agent + new AEO measurement tooling. Continue in a fresh chat using this doc as the authoritative record.

---

## ⚠️ TOP CONSTRAINT (read first)

Rob's hard requirement this session: **do not do anything that could harm current search/AEO visibility.**

- **The blog agent CANNOT publish autonomously.** Every publish is gated behind manual approval (`approve_post` RPC); the `drain-approved` cron only ships drafts already marked `approved`. Nothing reaches the live site without Rob's explicit approval. So the blog side carries no runaway risk — the only way it hurts visibility is if a thin/stale draft is approved.
- **Consolidation / merging / 301-redirecting live pages is OFF THE TABLE** (see Decision Log). Golf pages are confirmed #1 winners.
- **Standing rule: measure, don't cut.** The AEO probe (below) exists precisely so any future change can be verified as helping, not harming.

---

## TRACK A — Blog agent: open items

Supabase (espadavilla) project_id: `qqjrujrrqxtfsuikakuu`. Golfvilla: `genidekhqwsxvsboyrih`.

### A1. Stale-facts pending draft — DECISION NEEDED, do not approve as-is
- Draft `2290e09c` / topic "Punta Espada Golf Shuttle: Playing From Villa Espada" (topic status `drafting`, was `pending`), risk_score 0, no block reason.
- **Problem:** body cites green fees **"$495 as of April 2026"** and warns of a course closure **"July 1–21, 2026"** — a closure now in the PAST. Approving it publishes a factually-wrong page; stale facts are exactly what AEO engines de-cite you for. This is the single blog item that could actively cost visibility.
- **Left off:** undecided. Options: (a) refresh the two facts before publishing, or (b) skip the topic. **Do NOT approve unchanged.**

### A2. Generator repetition — real, but QUEUE-SIDE ONLY (zero live-page risk)
- Four near-identical golf-transport topics in the pipeline right now:
  - `punta espada golf shuttle` (drafting), `punta espada golf transportation` (queued), `golf course cap cana transfer` (queued), `golf course cap cana shuttle` (queued).
- Root cause: existing dedup (`topicFingerprint()` / `isRedundantIntent()`) is **lexical** — it catches "golf villa" vs "golf villas" but MISSES synonyms (shuttle/transfer/transportation = same intent, different tokens).
- **Fix (all queue-side, touches no live page):** cancel the 3 redundant queued topics in Supabase + tighten dedup to catch semantic synonyms (e.g. a synonym map or an LLM-as-judge intent check gating new topics).
- **Left off:** diagnosed, not yet actioned. Even if these published, they're additive and don't threaten the golf winners — this is about stopping thin repetition, not damage control.

### A3. Failure-monitor is broken (alerting, NOT visibility — safe to fix)
- `failure_monitor` fires hourly and tries to alert via **WhatsApp/Unipile, which is disconnected (401 `errors/disconnected_account`)**. Firing hourly into the void since Aug 17; 60+ failed alert rows, none delivered.
- **Two compounding bugs:** (1) the 12h cooldown keys off `error_notified_at`, which only gets set on a *successful* send — since sends always 401, the marker never sticks, so it re-alerts hourly instead of every 12h; (2) it appears to scan its own prior failure rows, so it self-perpetuates (since Aug 18 the ONLY failures in the table are its own).
- Also contaminates **golfvilla**: the dead Unipile call is still wired into `blog_pipeline_worker`, marking drafting runs `failure`/`partial` even when drafting succeeded.
- Context: approvals migrated to Cowork RPC (HANDOVER-COWORK-APPROVAL-RPC-2026-08-17) but **alerting never migrated off WhatsApp.**
- **Proposed fix (internal only, no live-page impact):** (a) set `error_notified_at` even when the send fails so the cooldown actually suppresses; (b) exclude `run_type='failure_monitor'` from the failure scan to kill the self-loop; (c) strip the dead Unipile send from golfvilla's `blog_pipeline_worker`. Bigger picture: reconnect Unipile OR decouple alerting to the Cowork/Supabase path.
- **Left off:** proposed, not greenlit/implemented.

### A4. Refresh discipline (standing horizon item)
- Fact-sensitive pages (green fees, seasonal, closures) rot fast — see A1 as the live example. Refresh machinery exists (`0007_blog_topics_refresh`, `rerender-published.ts`, `refreshes_draft_id` on `blog_topics`) but appears rarely/never exercised. Worth confirming last-refresh coverage and making refresh a first-class scheduled job rather than always minting net-new.

### Current published inventory (context)
21 published posts. Clusters: golf (4 + winners), logistics (5), experience (3, healthy/distinct), stay (2), comparison (1), group_occasion (2), plus **4 intentional AEO posts from HANDOVER-148** published Aug 17 (`punta-espada-golf-villa-luxury-group` Q10, `cap-cana-casa-de-campo-golf-base` Q14, `cap-cana-direct-booking-villa-espadavilla` Q18, `things-to-do-villa-espada-non-golf-family`). **These 4 are NOT prune candidates** — they are deliberate, live, and confirmed published (the H-148 worry that Q18 "stuck at approved" is resolved: it shipped).

---

## TRACK B — AEO Monitor (new build this session)

### Why
The AEO-BENCHMARK-RECONCILIATION.md (2026-08-17) concluded on-site is ~90% done and the real lever is **off-site third-party authority (the ChatGPT gap)** — but its deliverable-07 ChatGPT re-run was **blocked** (logged-out CAPTCHA, logged-in contaminated by history). DataForSEO removes that blocker: it runs queries server-side in clean sessions, so it's the unblocked, repeatable benchmark re-run.

### What was built
- **`aeo_probe.py`** — currently at `C:\Users\rbend\Desktop\Claude Projects\aeo_probe.py` (loose, NOT yet in a repo). Validated (`py_compile` OK).
- Calls DataForSEO **LLM Responses** API: `POST /v3/ai_optimization/{chat_gpt|claude|gemini|perplexity}/llm_responses/live`. HTTP Basic auth. `web_search:true` → the `items[].sections[].annotations[]` array carries the citations (`{title,url}`).
- Reads `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` from env (never hard-coded).
- Records per answer: **CITED** (espadavilla.com in annotation URLs) and **MENTIONED** (brand named in text), plus competitor share-of-voice. Writes raw JSONL + prints summary. No DB writes.
- Per-engine quirks learned: **Gemini rejects `web_search_country_iso_code`** (only ChatGPT/Perplexity accept geo — script now gates geo per-engine via a `geo` flag). Models: chatgpt `gpt-4o` (pinned); auto-discovered — claude `claude-sonnet-5`, gemini `gemini-3.6-flash`, perplexity `sonar-reasoning-pro`.
- **Coverage gap:** DataForSEO covers ChatGPT/Claude/Gemini/Perplexity + Google AI Overviews — **NOT Grok or DeepSeek** (the original benchmark had Grok 73 / DeepSeek 75). Those two columns can't be reproduced; acceptable since they scored fine and ChatGPT is the gap.

### BASELINE RESULTS — pre-profile, 2026-08-19 (LOCK THIS)
Prompts = 8 seeded buyer questions (NOT yet the verbatim benchmark Qs). ChatGPT/Gemini at 3 samples, Claude/Perplexity at 1.

| Engine | Model | Cited | Mentioned | Read |
|---|---|---|---|---|
| Perplexity | sonar-reasoning-pro | 8/8 | 4/8 | **Dominant** — you own it |
| Claude | claude-sonnet-5 | 3/8 | 2/8 | Solid |
| ChatGPT | gpt-4o | 1/24 | 4/24 | **The gap** (matches benchmark 39/100) |
| Gemini | gemini-3.6-flash | 0/24 | 8/24 | **Knows you, never cites you** |

- **Share-of-voice (ChatGPT+Gemini samples): Eden Roc named 26 vs your 12** — Eden Roc is the entity to unseat on the two weak engines. (Overall lead is carried by Perplexity dominance.)
- **Cost:** ~$1.78 total across ~80 calls (~$0.03/call). Monthly ceiling proven trivial.
- Raw outputs: `aeo_raw_20260819_*.jsonl` in the Claude Projects root.

### Two-gap diagnosis (different problems, different fixes)
- **ChatGPT = awareness / off-site authority.** It barely knows you. Fix = third-party editorial presence (Rental Escapes, Isle Blue, Haute Retreats, golf pubs) per the reconciliation report's deliverable-05. Cannot be fixed on-site.
- **Gemini = on-page citability.** It already knows you (12 mentions) but never sources espadavilla.com. Fix = make your pages the citable canonical answer (structured data, answer-shape) + Eden-Roc-adjacent framing, since Gemini anchors Cap Cana luxury on Eden Roc.

### The new profile (unverified — confirm next session)
Rob created a profile "yesterday" (≈Aug 18) he "was told he needed for Gemini/ChatGPT"; previously only had a Google Business Profile. **Engines index on a lag**, so tonight's numbers are the **pre-profile baseline** — they do NOT yet reflect it. Caveat: a Google-type profile plausibly moves **Gemini** (Google-grounded), unlikely to move **ChatGPT** (not Google-based). **Action:** confirm exactly what the profile is/where, then **re-run the same 3-sample probe ~Sept 16** and diff to measure impact.

### AEO monitor — next-session build list
1. **Port `aeo_probe.py` → TypeScript** inside `espadavilla-blog-agent` (repo is TS; don't leave a lone `.py`). Reuse existing DataForSEO/env plumbing. Decision made: blog-agent repo, NOT the static-site repo, NOT a new standalone repo.
2. **Persist runs → Supabase** (new table e.g. `aeo_snapshots`) so single snapshots become month-over-month trend.
3. **Monthly Cowork scheduled task** that reads the latest run, diffs vs prior month, and surfaces ChatGPT/Gemini movement + recommendations for Rob's approval — mirror the "Espadavilla Blog Approvals" task pattern. Keep heavy sampling in the deterministic job; Cowork does interpretation.
4. **Swap seeded prompts → verbatim benchmark questions** (Q1/Q2/Q6/Q8/Q9/Q10/Q13/Q14/Q17/Q18) so it's a true re-score of the 39. **Rob to provide exact wording.**
5. Bump samples to **3–5** for rate stability.
6. Set competitor list + search geo in config (currently seeded: Casa de Campo, Eden Roc, Sanctuary Cap Cana, Exceptional Villas, Marriott H&V; geo US).

---

## SECURITY NOTE (action required)
The DataForSEO API password (login `rbender@fortisnetlease.com`) was **exposed multiple times in chat** (plaintext screenshot + Base64 token + typed into a command). A mid-session 401-then-success pattern suggests Rob **rotated** it. **Confirm the exposed password is dead and only the current one lives in env / GH secrets — never in chat.** Standing rule holds: Rob handles all secrets and all git pushes; Claude never enters credentials into any system.

---

## DECISION LOG / GUARDRAILS (locked)
- **No live-page consolidation, merges, or 301s.** Floated early, then KILLED — benchmark shows golf **#1 on 4/4** (protected winners) and the probe shows you **lead share-of-voice / dominate Perplexity**. Measure, don't cut.
- **Golf winner pages are protected** — do not touch pages/terminology driving Q11/Q12/Q15/Q19/Q20.
- Blog agent **publishes only on manual approval** — no autonomous publishing.
- Canonical precedence: `facts.ts` > live site > brief. **6-or-8 bedroom** (never "8" alone).
- Fabricated reviews stay removed until genuine reviews exist.
- Do NOT force a Q13 win over Casa de Campo (golf is physically there).

---

## KEY REFERENCES
- Probe: `C:\Users\rbend\Desktop\Claude Projects\aeo_probe.py` (+ `aeo_raw_20260819_*.jsonl`)
- This handover: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\HANDOVER-BLOG-AGENT-AND-AEO-MONITOR-2026-08-19.md`
- Reconciliation: `AEO-BENCHMARK-RECONCILIATION.md` (2026-08-17)
- Approval RPC: `docs/HANDOVER-COWORK-APPROVAL-RPC-2026-08-17.md`
- Supabase: espadavilla `qqjrujrrqxtfsuikakuu`, golfvilla `genidekhqwsxvsboyrih`
- Repos: `rbender-boop/espadavilla-blog-agent`, `golfvilla-blog-agent`, `espadavilla-com`, `golfvilla-com`

## SUGGESTED FIRST MOVES (next chat)
1. Decide A1 (refresh vs skip the stale shuttle draft) — highest visibility relevance.
2. Cancel the 3 redundant queued golf-transport topics (A2) — safe, queue-side.
3. Greenlight the failure-monitor fix (A3) — safe, internal.
4. Then AEO build step 1 (TS port) when ready.
