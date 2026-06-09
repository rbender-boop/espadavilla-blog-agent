/**
 * Pipeline worker — drains the blog_agent_jobs queue.
 *
 * Claims one job, then advances it step-by-step under a SOFT wall-clock budget.
 * Because each step is checkpointed, the worker can safely YIELD when the budget
 * is nearly spent (or when too little time remains to start an LLM step) and the
 * next tick resumes from the exact same step — so no invocation ever runs to the
 * platform's hard timeout. This is the structural fix for the 504s.
 */

import { supabase } from '../supabase';
import { sendWhatsAppToOwner } from '../unipile';
import { runStep, HEAVY_STEPS } from '../drafting/pipeline';
import {
  claimNextJob,
  saveProgress,
  recordStepFailure,
  finishJob,
  failJob,
  releaseLock,
  type JobRow,
} from './job-store';

const LEASE_MS = 5 * 60 * 1000;      // a lock older than this is treated as stale (crashed tick)
const SOFT_BUDGET_MS = 210_000;      // yield by here; route maxDuration is 300s
const MIN_HEAVY_MS = 60_000;         // don't start an LLM step with less than this remaining

export type WorkerSummary = {
  idle: boolean;
  job_id: string | null;
  steps_run: string[];
  final_step: string | null;
  status: 'idle' | 'yielded' | 'done' | 'failed';
  error: string | null;
};

export async function runPipelineWorker(): Promise<WorkerSummary> {
  const start = Date.now();
  const deadline = start + SOFT_BUDGET_MS;

  // Open a run row first so we can link it onto the claimed job.
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'blog_pipeline_worker', status: 'running' })
    .select('id')
    .single();
  const runId = runRow?.id ?? null;

  let job = await claimNextJob(LEASE_MS, runId);
  if (!job) {
    // No work — discard the run row so idle ticks don't spam blog_agent_runs.
    if (runId) await supabase.from('blog_agent_runs').delete().eq('id', runId);
    return { idle: true, job_id: null, steps_run: [], final_step: null, status: 'idle', error: null };
  }

  const stepsRun: string[] = [];
  let status: WorkerSummary['status'] = 'yielded';
  let error: string | null = null;
  let terminal = false;

  try {
    while (true) {
      if (Date.now() >= deadline) break;                                   // budget spent → yield
      if (HEAVY_STEPS.has(job.step) && deadline - Date.now() < MIN_HEAVY_MS) break; // not enough time for an LLM step → yield

      const current = job.step;
      let res;
      try {
        res = await runStep(job, deadline);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        if (job.attempts + 1 >= job.max_attempts) {
          await failJob(job, error);
          await notifyOwnerOfFailure(job, error);
          status = 'failed';
          terminal = true;
        } else {
          await recordStepFailure(job, error); // keep step, release lock, retry on a later tick
          status = 'yielded';
        }
        break;
      }

      stepsRun.push(current);
      if (res.kind === 'done') {
        await finishJob(job, res.state);
        status = 'done';
        terminal = true;
        break;
      }
      await saveProgress(job, {
        step: res.next,
        ...(res.state !== undefined ? { state: res.state } : {}),
        ...(res.topic_id !== undefined ? { topic_id: res.topic_id } : {}),
        ...(res.draft_id !== undefined ? { draft_id: res.draft_id } : {}),
      });
      job = applyPatch(job, res);
    }
  } finally {
    if (!terminal) await releaseLock(job.id); // yielded — clear the lease so the next tick resumes
    await finishRun(runId, start, job, status, error, stepsRun);
  }

  return { idle: false, job_id: job.id, steps_run: stepsRun, final_step: job.step, status, error };
}

/* ---- helpers ---- */

function applyPatch(
  job: JobRow,
  res: Extract<Awaited<ReturnType<typeof runStep>>, { kind: 'advance' }>,
): JobRow {
  return {
    ...job,
    step: res.next,
    state: { ...(job.state ?? {}), ...(res.state ?? {}) },
    topic_id: res.topic_id ?? job.topic_id,
    draft_id: res.draft_id ?? job.draft_id,
    attempts: 0,
    last_error: null,
  };
}

async function finishRun(
  runId: string | null,
  start: number,
  job: JobRow,
  status: WorkerSummary['status'],
  error: string | null,
  stepsRun: string[],
): Promise<void> {
  if (!runId) return;
  const runStatus = status === 'failed' ? 'failure' : status === 'done' ? 'success' : 'partial';
  await supabase
    .from('blog_agent_runs')
    .update({
      status: runStatus,
      completed_at: new Date().toISOString(),
      error_message: error,
      items_processed: stepsRun.length,
      metadata: { duration_ms: Date.now() - start, job_id: job.id, steps_run: stepsRun, final_step: job.step, worker_status: status },
    })
    .eq('id', runId);
}

async function notifyOwnerOfFailure(job: JobRow, error: string): Promise<void> {
  try {
    await sendWhatsAppToOwner(
      [`⚠️ Blog pipeline failed`, `Job ${job.id} gave up at step "${job.step}" after ${job.max_attempts} attempts.`, `Error: ${error}`].join('\n'),
    );
  } catch (err) {
    console.error('[worker] failure-notify failed:', err);
  }
}
