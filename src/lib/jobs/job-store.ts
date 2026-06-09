/**
 * Durable job store for the blog drafting pipeline.
 *
 * A job is a checkpointed state machine row in blog_agent_jobs. The weekly cron
 * enqueues one; the pipeline worker claims it (lease lock), runs ONE step,
 * writes the checkpoint back, and releases — so work survives crashes/timeouts
 * and resumes exactly where it left off. The job row IS the per-step telemetry.
 */

import { supabase } from '../supabase';

export type JobStep =
  | 'pick_topic'
  | 'research'
  | 'draft'
  | 'enforce'
  | 'guard'
  | 'persist'
  | 'notify'
  | 'done';

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export type JobRow = {
  id: string;
  job_type: string;
  status: JobStatus;
  step: JobStep;
  topic_id: string | null;
  draft_id: string | null;
  state: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  locked_at: string | null;
};

const SELECT = 'id, job_type, status, step, topic_id, draft_id, state, attempts, max_attempts, last_error, locked_at';

/**
 * Enqueue a draft job — idempotent: if a non-terminal job of this type already
 * exists, returns it instead of creating a duplicate (so two cron fires, or a
 * manual + scheduled fire, never produce two drafts).
 */
export async function enqueueJob(
  jobType = 'draft_weekly_post',
): Promise<{ created: boolean; job_id: string | null }> {
  const { data: existing } = await supabase
    .from('blog_agent_jobs')
    .select('id')
    .eq('job_type', jobType)
    .in('status', ['queued', 'running'])
    .limit(1)
    .maybeSingle();
  if (existing) return { created: false, job_id: existing.id };

  const { data, error } = await supabase
    .from('blog_agent_jobs')
    .insert({ job_type: jobType, status: 'queued', step: 'pick_topic', started_at: new Date().toISOString() })
    .select('id')
    .single();
  if (error || !data) throw new Error(`enqueueJob failed: ${error?.message ?? 'no row'}`);
  return { created: true, job_id: data.id };
}

/**
 * Claim the oldest active job using a lease lock. A job is claimable if it is
 * queued/running AND not freshly locked (lock null or older than leaseMs — the
 * stale-takeover path that recovers jobs whose worker crashed mid-tick).
 *
 * The claim is a conditional UPDATE: only the worker that flips locked_at wins,
 * so overlapping ticks never process the same job. Returns null if no work.
 */
export async function claimNextJob(leaseMs: number, runId: string | null): Promise<JobRow | null> {
  const staleBefore = new Date(Date.now() - leaseMs).toISOString();
  const nowIso = new Date().toISOString();

  const { data: candidate } = await supabase
    .from('blog_agent_jobs')
    .select('id, locked_at')
    .in('status', ['queued', 'running'])
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!candidate) return null;

  // Conditional claim: re-assert the lock predicate so a racing tick can't also win.
  let q = supabase
    .from('blog_agent_jobs')
    .update({ status: 'running', locked_at: nowIso, run_id: runId, updated_at: nowIso })
    .eq('id', candidate.id);
  q = candidate.locked_at == null ? q.is('locked_at', null) : q.lt('locked_at', staleBefore);

  const { data: claimed } = await q.select(SELECT).maybeSingle();
  return (claimed as JobRow) ?? null;
}

type ProgressPatch = {
  step: JobStep;
  state?: Record<string, unknown>;
  topic_id?: string | null;
  draft_id?: string | null;
};

/** Advance to the next step, merge checkpoint state, reset the step retry counter. Keeps the lease held (the worker runs multiple steps per tick, then releases once). */
export async function saveProgress(job: JobRow, patch: ProgressPatch): Promise<void> {
  const nowIso = new Date().toISOString();
  const merged = { ...(job.state ?? {}), ...(patch.state ?? {}) };
  const update: Record<string, unknown> = {
    step: patch.step,
    state: merged,
    attempts: 0,
    last_error: null,
    locked_at: nowIso, // refresh the lease; the worker releases on yield/terminal
    updated_at: nowIso,
  };
  if (patch.topic_id !== undefined) update.topic_id = patch.topic_id;
  if (patch.draft_id !== undefined) update.draft_id = patch.draft_id;
  await supabase.from('blog_agent_jobs').update(update).eq('id', job.id);
}

/** A step failed but has retries left: record the error, keep the step, release the lock for a later tick. */
export async function recordStepFailure(job: JobRow, error: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabase
    .from('blog_agent_jobs')
    .update({ attempts: job.attempts + 1, last_error: error.slice(0, 2000), locked_at: null, updated_at: nowIso })
    .eq('id', job.id);
}

/** Terminal success: mark done and release the lock. */
export async function finishJob(job: JobRow, state?: Record<string, unknown>): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabase
    .from('blog_agent_jobs')
    .update({
      status: 'done',
      step: 'done',
      state: { ...(job.state ?? {}), ...(state ?? {}) },
      locked_at: null,
      completed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', job.id);
}

/**
 * Terminal failure: mark failed, release the lock. If the topic was claimed but
 * no draft was ever persisted, return it to 'queued' so it isn't stranded in
 * 'drafting' and can be retried next week (or manually).
 */
export async function failJob(job: JobRow, error: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabase
    .from('blog_agent_jobs')
    .update({ status: 'failed', last_error: error.slice(0, 2000), locked_at: null, completed_at: nowIso, updated_at: nowIso })
    .eq('id', job.id);

  if (job.topic_id && !job.draft_id) {
    await supabase
      .from('blog_topics')
      .update({ status: 'queued', updated_at: nowIso })
      .eq('id', job.topic_id)
      .eq('status', 'drafting');
  }
}

/** Release a lock without changing status (used when a tick yields on its time budget). */
export async function releaseLock(jobId: string): Promise<void> {
  await supabase.from('blog_agent_jobs').update({ locked_at: null, updated_at: new Date().toISOString() }).eq('id', jobId);
}
