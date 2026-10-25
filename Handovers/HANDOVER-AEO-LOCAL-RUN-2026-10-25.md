# HANDOVER — AEO probe runnable from a scheduled task (2026-10-25)

## Findings
- Session tools: Desktop Commander only (no device_bash). Shell = Windows PowerShell on ROB2026LAPTOP (Windows 10.0.26200).
- Repo checks: node v24.13.1, npx 11.10.0, node_modules present, api.dataforseo.com reachable, Supabase qqjrujrrqxtfsuikakuu reachable, service-key read of aeo_snapshots PASS (396 rows).
- Credentials: scripts/aeo-probe.ts reads DATAFORSEO_LOGIN/PASSWORD from process env (dotenv loads .env.local then .env); Supabase URL + service key come from .env.local (gitignored).
- The Desktop Commander process does NOT inherit Windows user env vars. Fix = inject per command with [Environment]::GetEnvironmentVariable('X','User'). No .env file created.
- Desktop Commander allowedDirectories is empty (= unrestricted), so no folder needs adding there.

## Change made
- scripts/aeo-probe.ts line 90: ChatGPT pin gpt-4o -> gpt-5 (Rob's pick). DataForSEO no longer lists gpt-4o; every gpt-4o call failed with "Invalid Field: 'model_name'". This is a MODEL BREAK for ChatGPT vs scan 20261011_192858.

## Tests
- 12-call test, gpt-4o: 12/12 errors, $0.
- 12-call test, gpt-5 (--engines=chatgpt --fixed-samples=0 --strategic-samples=1 --no-db): 12 samples, 0 errors, $0.4853, ~5 min. No DB rows written. Raw: aeo_raw_20261025_144740.jsonl (gitignored).
- Runtime matters: 12 gpt-5 calls took ~5 min, longer than Desktop Commander's ~4-min tool-call limit. The task must launch the probe and poll it.
- Claude/Gemini/Perplexity pins are still on DataForSEO's model list but were not called in this test.

## Proposed new step 1 for "Espadavilla AEO Review" (trig_015YKba3tnjz87xqAMtYhLru)
See the chat message of 2026-10-25 (same text). Apply via update_trigger from a chat that has the scheduled-task tools; also set requires_local_device=true. No update_trigger tool existed in this session.
Also stale in docs/aeo-review-prompt.md step 3: the "KNOWN BUG Gemini redirect" note — fixed and backfilled 2026-10-11.

## PR pickup sweep (trig_01Qrs3Md5N2mVeFwqM8STgr3) — local readiness
- Reads/writes: C:\Users\rbend\Desktop\Claude Projects\PR News Release Agent - Espada Villa\HANDOVER.md (exists, writable).
- Runs: py -X utf8 "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\add_press_pickup.py" ... (py = Python 3.14.3; --help runs fine).
- That script edits files under C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE (press.html, llms-full.txt, release /press pages). That folder is the espadavilla-com git repo (origin rbender-boop/espadavilla-com), working tree clean today.
- Folders it needs: those three. Desktop Commander already reaches all of them (no allowlist). The only missing piece is the computer attachment on the task (requires_local_device=true).
- Not tested end to end (would edit the live-site repo). Optional safe test: add --dry-run to one add_press_pickup.py call.

## Git (Rob)
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
git add scripts/aeo-probe.ts "Handovers/HANDOVER-AEO-LOCAL-RUN-2026-10-25.md"
git commit -m "aeo-probe: pin ChatGPT to gpt-5 (DataForSEO retired gpt-4o)"
git pull --rebase --autostash
git push
(--autostash because the repo has unrelated unstaged changes: docs/*.md, _scan.py deleted, Handovers/aeo-tools/*.)

## UPDATE (later 2026-10-25) — full probe run + fixes, all pushed by Claude
- Pushed 3d8f145 (gpt-5 pin, prompt step 1, this handover) and 6341cce (insert retry + aeo-backfill.ts + prompt step 1c).
- Full probe scan 20261025_152201: 192 calls, 0 API errors, $6.18, ~62 min.
- Bug found: Supabase insert batch 3 failed ("TypeError: fetch failed") and was dropped silently; log still said "Persisted 192". DB had 142 rows (missing 44 gemini + 6 perplexity). Backfilled the 50 rows from aeo_raw_20261025_152201.jsonl with new scripts/aeo-backfill.ts. DB now 192 rows, verified by SQL.
- aeo-probe.ts now retries each batch 3x, prints "Persisted X/192", exits non-zero and names the backfill command on loss.

## Unbranded KPIs, Oct 11 -> Oct 25 (error is null)
| Engine | Mentioned | Cited |
|---|---|---|
| ChatGPT (gpt-4o -> gpt-5, MODEL BREAK) | 7/44 -> 19/44 | 7 -> 13 |
| Claude sonnet-5-5 | 14/30 -> 22/44 | 12 -> 18 |
| Gemini 3.8-flash | 24/44 -> 28/44 | 24 -> 32 |
| Perplexity sonar-reasoning-pro | 29/44 -> 25/44 | 36 -> 35 |
| Total | 74/162 (46%) -> 94/176 (53%) | 79 -> 98 |
Branded: 16/16 mentioned both scans. ChatGPT jump is mostly the model change, not a site change.

## Still open
- Interpretive review (clusters, SOV, branded accuracy, should-win misses) on scan 20261025_152201 not yet written.
- update_trigger for both tasks (requires_local_device=true + new step 1) needs a chat with scheduled-task tools.
