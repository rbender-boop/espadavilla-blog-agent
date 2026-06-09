/**
 * drain-approved cron — every 15 min (schedule "/15 * * * *" in vercel.json).
 *
 * Publishes any draft left in 'approved' (e.g. approved while a deploy was
 * mid-flight, or a publish that failed and is being retried). publishApprovedDraft
 * is idempotent, so re-runs never double-commit.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { publishAllApproved } from '@/lib/publish/commit-post';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });

  const start = Date.now();
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'drain_approved', status: 'running' })
    .select('id')
    .single();
  const runId = runRow?.id ?? null;

  let status: 'success' | 'partial' | 'failure' = 'success';
  let results: Awaited<ReturnType<typeof publishAllApproved>> = [];
  let error: string | null = null;
  try {
    results = await publishAllApproved();
    if (results.some((r) => !r.ok)) status = 'partial';
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    status = 'failure';
  }

  if (runId) {
    await supabase
      .from('blog_agent_runs')
      .update({ status, completed_at: new Date().toISOString(), items_processed: results.filter((r) => r.ok).length, error_message: error, metadata: { duration_ms: Date.now() - start, results } })
      .eq('id', runId);
  }
  return NextResponse.json({ ok: status !== 'failure', status, results, error });
}
