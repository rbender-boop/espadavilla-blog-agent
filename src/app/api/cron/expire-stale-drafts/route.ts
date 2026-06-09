/**
 * expire-stale-drafts cron — daily 9am ET (0 9 * * *).
 * Auto-skips drafts unanswered > STALE_DRAFT_HOURS (default 72h) and re-queues
 * their topics.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { expireStaleDrafts } from '@/lib/cleanup/expire-stale-drafts';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });

  const start = Date.now();
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'expire_stale_drafts', status: 'running' })
    .select('id')
    .single();

  let status: 'success' | 'failure' = 'success';
  let result: Awaited<ReturnType<typeof expireStaleDrafts>> | null = null;
  let error: string | null = null;
  try {
    result = await expireStaleDrafts();
    if (result.errors.length > 0) status = 'failure';
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    status = 'failure';
  }

  if (runRow) {
    await supabase
      .from('blog_agent_runs')
      .update({ status, completed_at: new Date().toISOString(), items_processed: result?.post_drafts ?? 0, error_message: error ?? (result?.errors.join('; ') || null), metadata: { duration_ms: Date.now() - start, ...result } })
      .eq('id', runRow.id);
  }
  return NextResponse.json({ ok: status === 'success', ...result, error });
}
