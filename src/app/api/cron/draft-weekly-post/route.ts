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
