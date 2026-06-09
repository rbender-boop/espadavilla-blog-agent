/**
 * failure-monitor cron — hourly (0 * * * *). Alerts Rob on any failed run.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { runFailureMonitor } from '@/lib/monitoring/failure-monitor';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });

  // NOTE: we do NOT log a blog_agent_runs row for the monitor itself on success,
  // to avoid noise; on failure we log so the next hour surfaces it.
  try {
    const result = await runFailureMonitor();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from('blog_agent_runs').insert({
      run_type: 'failure_monitor',
      status: 'failure',
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false, error: message });
  }
}
