# HANDOVER — AEO Monitor build (2026-08-20)

Charter: `EspadaVilla_SEO_AEO_Autonomous_Content_Agent_Master_Instructions.md`
(repo root) adopted as CHARTER NOT SPEC — read its 2026-08-20 corrections
header before building anything from it.

## Built + LIVE this session
1. **Supabase `aeo_snapshots`** (project qqjrujrrqxtfsuikakuu, migration
   `create_aeo_snapshots`): one row per engine×prompt×sample. Charter fields:
   prompt_type, branded, topic_cluster, fit_classification, mentioned, cited,
   citations, competitors_mentioned/cited, response_text (full answer, for
   interpretive analysis). RLS ON from birth, no policies (service-role only).
2. **`scripts/aeo-probe.ts`** (+ `npm run aeo:probe`) — TS port of the loose
   aeo_probe.py. Fixed 12 benchmarks (3 samples) + strategic 12 (1 sample),
   4 engines (chatgpt pinned gpt-4o, others auto-discover), geo=US on
   chatgpt/perplexity only. Writes Supabase + local JSONL backup. Flags:
   --dry, --engines=, --fixed-samples=, --strategic-samples=, --no-db,
   --list-models, --no-web-search. Full run ≈192 calls ≈ $6.
   Creds: DATAFORSEO_LOGIN/PASSWORD Windows USER env vars (setx, verified,
   balance $49.22). Supabase creds from .env.local.
   NOTE for long-lived shells (incl. Desktop Commander): inject user env vars
   with $env:X=[Environment]::GetEnvironmentVariable('X','User') before npx.
3. **Monthly Cowork task "Espadavilla AEO Review"**
   (`trig_015YKba3tnjz87xqAMtYhLru`), 16th monthly 15:00 UTC (11am EDT),
   push+email, requires_local_device=TRUE (runs the probe via Desktop
   Commander; desktop app must be open; approve device binding on first run).
   First fire: **Sept 16** = the planned post-profile re-measurement.
   Task: fresh scan if stale → per-cluster branded/unbranded KPIs → diff vs
   prior scan + locked 8/19 baseline → interpretive competitor-gap pass
   (ESPADA_HAS_BUT_NOT_COMMUNICATED priority) → max 3 recommendations,
   refresh-over-create, zero execution.

## Smoke test (LIVE, 2026-08-20, scan_id 20260820_120229)
chatgpt/gpt-4o, fixed 12 × 1 sample: 0 errors, $0.19, 12 rows persisted.
Unbranded: cited 2/11, mentioned 2/11 (staffed_villas + large_groups both
CITED — vs 1/24 cited in the 8/19 baseline; possible early profile effect,
small sample). Share-of-voice: Eden Roc 5, Villa Espada 3, Sanctuary 3.
tsc --noEmit clean (exit 0).

## Locked baseline for comparisons (2026-08-19, pre-profile)
ChatGPT cited 1/24 (gap) · Gemini cited 0/24, mentioned 8/24 (knows-you-never-
cites-you) · Claude 3/8 · Perplexity 8/8 (dominant). Eden Roc 26 vs Espada 12
mentions across ChatGPT+Gemini samples.

## Files changed (Rob to push)
- NEW  scripts/aeo-probe.ts
- MOD  package.json (aeo:probe script)
- NEW  docs/HANDOVER-AEO-MONITOR-2026-08-20.md
- MOD  EspadaVilla_SEO_AEO_Autonomous_Content_Agent_Master_Instructions.md (corrections header)
- MOD  docs/cowork-approval-prompt.md (v3: fit gate + REJECT+REFRESH)

## Push commands (PowerShell, one per line)
cd 'C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent'
git add scripts/aeo-probe.ts package.json .gitignore docs/HANDOVER-AEO-MONITOR-2026-08-20.md EspadaVilla_SEO_AEO_Autonomous_Content_Agent_Master_Instructions.md docs/cowork-approval-prompt.md
git commit -m "feat(aeo): DataForSEO probe TS port + aeo_snapshots persistence + charter adoption (corrected) + editorial prompt v3"
git pull --rebase origin main
git push origin main
(aeo_raw_*.jsonl is now gitignored — raw scans stay local.)

## Still open
- Refresh-discipline monthly check (fold into a task later).
- Pre-existing smoke ✗ "render: H2 from ##" (unrelated, uninvestigated).
- DST note: all crons fixed UTC; times shift 1hr earlier local in Nov.
