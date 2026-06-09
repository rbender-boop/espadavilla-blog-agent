# HANDOVER — Durable Drafting Pipeline (504 fix)

**Date:** 2026-06-08
**Author:** Claude (prior session)
**Status:** Code ~80% landed. **Does NOT typecheck yet** — 5 wiring items remain (see §6). **Do not `git push` until §7 verification passes.**

---

## 1. Why this work exists

The Monday weekly-draft CRON (`/api/cron/draft-weekly-post`, schedule `0 13 * * 1` = 09:00 ET) **fired on schedule at 13:00:07 UTC on 2026-06-08 but returned a 504 Vercel Runtime Timeout**. No draft was created and no WhatsApp approval message was sent. Confirmed via Vercel runtime logs (project `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`). The two other crons that fired the same minute (`drain-approved`, `failure-monitor`) returned 200.

**Root cause (structural, not a one-off):** a long, variable agentic job (web-search research + 1,200–1,800-word generation + a length-correction retry that ran a *second* full agentic draft) was executed synchronously inside ONE serverless invocation with `maxDuration = 300` and **no wall-clock budget guard**. The Anthropic SDK defaults (10-min timeout, 2 retries) meant nothing aborted before Vercel killed it. Code comment in `callDrafter` already noted a prior 322s incident.

## 2. Decision (agreed with Rob)

Rob runs this for **years**, so we are NOT band-aiding (raising maxDuration / aborting mid-run degrades quality by truncating work). We are decoupling the trigger from the work with a **self-owned durable, checkpointed pipeline** — no new vendor (chose this over Inngest/Trigger.dev for minimal-dependency longevity). Research is **split from writing** so the variable-length web_search work is isolated in its own bounded step.

Pipeline steps: `pick_topic → research → draft → enforce → guard → persist → notify → done`

The cron now only **enqueues**; a **polling worker** advances the job one step at a time under a soft wall-clock budget and **yields (checkpointing to the DB) before the platform timeout**. The job row is also the per-step telemetry that was missing during diagnosis.

---

## 3. CRITICAL operational gotchas

1. **The connected Supabase MCP points at the WRONG project.** It is wired to the **Fortis/Phil** project (tables: `phil_drafts`, `om_drafts`, `tenant_intel_runs`, …), NOT the dedicated golfvilla blog DB (whose tables are `blog_*`). This is confirmed by `src/lib/supabase.ts`'s own comment. **Do NOT run the migration or any blog SQL through the current MCP — it would hit the wrong database.** Either repoint the Supabase MCP to the golfvilla blog project, or apply migrations via `supabase db push` / the golfvilla project's dashboard SQL editor.
2. **Migration 0003 was written as a file but NOT applied** anywhere (because of #1). It must be applied to the golfvilla blog Postgres before the pipeline can run.
3. **Partial code is on disk and will not typecheck** until §6 is finished. Don't deploy/push mid-state.
4. Rob does all `git push` himself — provide the exact command, don't run it.

## 4. Files ALREADY written (complete)

- `supabase/migrations/0003_blog_agent_jobs.sql` — new `blog_agent_jobs` table (idempotent, additive). NOT yet applied.
- `src/lib/jobs/job-store.ts` — `enqueueJob` (idempotent), `claimNextJob` (lease lock + stale takeover), `saveProgress` (advance + keep lease), `recordStepFailure`, `finishJob`, `failJob` (returns stranded topic to `queued`), `releaseLock`. Types `JobRow`, `JobStep`, `JobStatus`.
- `src/lib/drafting/pipeline.ts` — full step machine + `runStep(job, deadline)`, `HEAVY_STEPS`, `STEP_ORDER`. Research uses web_search + `emit_research`; draft/enforce are forced-`emit_post` single calls with NO web access (grounded only on the researched-facts block + the VILLA FACTS block). `callModel` aborts via `AbortSignal.timeout` before the deadline and uses `maxRetries: 1`.
- `src/lib/jobs/run-worker.ts` — `runPipelineWorker()`: claims a job, loops steps until done/budget, yields+checkpoints, logs a `blog_agent_runs` row (deletes it on idle so empty ticks don't spam). Constants: `LEASE_MS=5min`, `SOFT_BUDGET_MS=210_000`, `MIN_HEAVY_MS=60_000`. Sends owner a WhatsApp on terminal failure.

## 5. Files EDITED (complete, behavior-preserving)

- `src/lib/drafting/generate-post.ts` — added `export` to `getAnthropic, MODEL, MAX_TITLE, MAX_DESC, MIN_WORDS, MAX_WORDS, POST_TOOL, normalizePost, lengthProblems, countWords, slugify, stripCitations, pickNextTopic`. Extracted the draft INSERT into a shared `export async function insertPendingDraft(...)` (accepts optional `draftId` for idempotency). `generatePostForTopic` / `generatePostForNextTopic` behavior is unchanged, so `run-local.ts` (`bun run draft:local`) still works.

## 6. REMAINING WORK (do these in order)

### 6.1 — Create the worker cron route
**File:** `src/app/api/cron/blog-pipeline-worker/route.ts` (directory already exists; file not yet written)
```ts
import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { runPipelineWorker } from '@/lib/jobs/run-worker';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  const summary = await runPipelineWorker();
  return NextResponse.json({ ok: summary.status !== 'failed', ...summary });
}
```

### 6.2 — Repoint the weekly cron to enqueue-only
**File:** `src/app/api/cron/draft-weekly-post/route.ts` (OVERWRITE the whole file)
```ts
/**
 * draft-weekly-post cron — Mon 13:00 UTC (0 13 * * 1).
 * ENQUEUE-ONLY: inserts a durable job and returns instantly. The actual
 * drafting is done by the blog-pipeline-worker cron, step by step, so this
 * route can never time out. Idempotent: a duplicate fire reuses the open job.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { enqueueJob } from '@/lib/jobs/job-store';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  const start = Date.now();
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'draft_weekly_post_enqueue', status: 'running' })
    .select('id').single();
  const runId = runRow?.id ?? null;
  try {
    const { created, job_id } = await enqueueJob('draft_weekly_post');
    if (runId) await supabase.from('blog_agent_runs').update({ status: 'success', completed_at: new Date().toISOString(), metadata: { duration_ms: Date.now() - start, created, job_id } }).eq('id', runId);
    return NextResponse.json({ ok: true, created, job_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) await supabase.from('blog_agent_runs').update({ status: 'failure', completed_at: new Date().toISOString(), error_message: message }).eq('id', runId);
    return NextResponse.json({ ok: false, error: message });
  }
}
```

### 6.3 — Add the worker cron to `vercel.json`
Add ONE entry to the existing `crons` array (keep `draft-weekly-post` as-is). Window covers the Monday enqueue + several resume/retry ticks, near-zero idle cost:
```json
{ "path": "/api/cron/blog-pipeline-worker", "schedule": "*/2 13-16 * * 1" }
```
Final `crons` array should be the existing 5 PLUS this one (6 total).
**Check:** the project is on Vercel Pro (it already uses `*/15` and hourly crons). Confirm the plan's cron count limit allows 6. If not, the worker window can fold into an existing cadence.

### 6.4 — Local end-to-end runner (optional but recommended for testing)
**File:** `src/lib/drafting/run-pipeline-local.ts`
```ts
import 'dotenv/config';
import { enqueueJob } from '../jobs/job-store';
import { runPipelineWorker } from '../jobs/run-worker';

async function main() {
  const { created, job_id } = await enqueueJob('draft_weekly_post');
  console.log(`${created ? 'enqueued' : 'reusing'} job ${job_id}`);
  for (let i = 0; i < 20; i++) {
    const s = await runPipelineWorker();
    console.log(JSON.stringify(s));
    if (s.idle || s.status === 'done' || s.status === 'failed') break;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
```
Add to `package.json` scripts: `"pipeline:local": "tsx src/lib/drafting/run-pipeline-local.ts"`

### 6.5 — (Optional) extend the offline smoke test
In `scripts/verify-offline.ts`, import `STEP_ORDER` from `../src/lib/drafting/pipeline` and assert it equals `['pick_topic','research','draft','enforce','guard','persist','notify','done']`. Pure check, no network. Skip if it pulls in heavy imports that break the offline (no-key) run — verify it still runs with no env.

## 7. Verification (run before pushing)

```bash
bun run typecheck        # MUST pass — fix any type errors first (see §9 watch-list)
bun run smoke            # offline guard/render checks must stay green
# Apply migration to the GOLFVILLA blog DB (NOT via the current MCP — see §3):
#   supabase db push     (or paste 0003_blog_agent_jobs.sql into the golfvilla dashboard SQL editor)
bun run pipeline:local   # optional: real end-to-end with API + DB; expect status:"done" and a WhatsApp
```

Expected `pipeline:local` happy path: enqueues a job → worker advances through all steps in (usually) one call → a `blog_post_drafts` row in `pending`/`sent_for_approval` → WhatsApp approval message arrives. Inspect `blog_agent_jobs` (step/state/attempts) and `blog_agent_runs` for the trace.

## 8. Git (Rob runs this himself)

After typecheck + smoke pass and migration applied:
```bash
git add supabase/migrations/0003_blog_agent_jobs.sql src/lib/jobs/ src/lib/drafting/pipeline.ts src/lib/drafting/generate-post.ts src/lib/drafting/run-pipeline-local.ts src/app/api/cron/blog-pipeline-worker/route.ts src/app/api/cron/draft-weekly-post/route.ts vercel.json package.json scripts/verify-offline.ts docs/HANDOVER-DURABLE-PIPELINE-2026-06-08.md
git commit -m "feat: durable checkpointed drafting pipeline (fixes weekly-draft 504 timeout)"
# then: git push   (Rob)
```
Deploying the new `vercel.json` registers the worker cron automatically.

## 9. Watch-list for typecheck (likely small fixes)

- `crypto.randomUUID()` (used in `pipeline.ts` guardStep) is a Node 18+ global — fine on Vercel Node runtime and `tsx`. No import needed; if TS complains, ensure `@types/node` lib is picked up.
- `AbortSignal.timeout(ms)` — Node 17+ global; same note.
- `tool_choice: { type: 'tool', name: 'emit_post' }` and the `web_search_20250305` tool are cast via `as unknown as Anthropic.Tool[]`. If the installed `@anthropic-ai/sdk@^0.98.0` types reject `tool_choice`, cast the whole params object or the `tool_choice` value.
- `pipeline.ts` uses `import type Anthropic from '@anthropic-ai/sdk'` for namespaced types only; the actual client comes from `getAnthropic()` (value import from `generate-post`). Don't add a value import of Anthropic there.
- Several step functions read `job.state.*` as `unknown` and cast (e.g. `as TopicRow`). If `noImplicitAny`/strict flags complain, the casts are already present — extend as needed.

## 10. Design notes (the "why", for future-you)

- **No quality degradation vs the old path.** Nothing is truncated to fit a timeout; the model gets full room. Splitting research from writing actually *tightens* grounding: the writer has no web access and may only assert facts from the researched-facts block (each carrying its source URL) plus the trusted VILLA FACTS block.
- **Idempotency:** `enqueueJob` reuses an open job; `persistStep` pre-allocates the draft UUID in `guardStep` and skips re-insert if it exists; `notifyStep` only sends while the draft is `pending` (a resend after success is a no-op because the draft is then `sent_for_approval`).
- **Crash/timeout safety:** every step checkpoints to `blog_agent_jobs`. A crashed tick's lock goes stale after `LEASE_MS` and another tick takes over. The worker yields before `SOFT_BUDGET_MS` and won't START an LLM step with < `MIN_HEAVY_MS` left.
- **Failure handling:** after `max_attempts` (3) on a step, the job is marked `failed`, the topic is returned to `queued` (if no draft persisted), and Rob gets a WhatsApp.

## 11. Key references
- Project root: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- Vercel project id `prj_0mZhYegQkk9O6z25FkCXEkA8iu0j`, team `team_5kyP9NiGKlZKAM1kiPmrCpu1`
- Existing schema: `supabase/migrations/0001_init_blog_schema.sql`
- Synchronous drafter (still used by `draft:local`): `src/lib/drafting/generate-post.ts`
- Notify path: `src/lib/whatsapp/send-draft.ts` (`sendDraftForApproval` requires draft status `pending`)
