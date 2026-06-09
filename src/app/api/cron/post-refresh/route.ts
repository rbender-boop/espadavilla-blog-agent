/**
 * GET /api/cron/post-refresh — Phase 4 decay/refresh cron.
 * Schedule: "0 11 * * 1" (Mon 11:00 UTC — before gsc-topics at 12:00 and
 * draft at 13:00 so refresh topics can be picked up the same day).
 */
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';
import { generateRefreshTopics } from '@/lib/gsc/refresh-generator';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: run } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'post_refresh', status: 'running' })
    .select('id')
    .single();
  const runId = run?.id ?? null;

  try {
    const summary = await generateRefreshTopics();
    if (runId) {
      await supabase
        .from('blog_agent_runs')
        .update({
          status:          'success',
          items_created:   summary.inserted,
          items_processed: summary.postsChecked,
          completed_at:    new Date().toISOString(),
          metadata:        summary,
        })
        .eq('id', runId);
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase
        .from('blog_agent_runs')
        .update({ status: 'failure', error_message: msg, completed_at: new Date().toISOString() })
        .eq('id', runId);
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
