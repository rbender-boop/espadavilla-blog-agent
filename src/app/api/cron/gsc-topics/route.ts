/**
 * gsc-topics cron — Mon 12:00 UTC (0 12 * * 1), one hour BEFORE draft-weekly-post.
 *
 * Pulls Search Console page-2 opportunities, filters to on-target intent, drops
 * near-duplicates (Phase 2 overlap router) + anything already queued, and
 * inserts survivors into blog_topics so the weekly draft cron has fresh,
 * demand-driven topics to pick from. Light + idempotent: safe to re-fire.
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { generateTopicsFromGsc } from '@/lib/gsc/topic-generator';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  const start = Date.now();
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'gsc_topics', status: 'running' })
    .select('id').single();
  const runId = runRow?.id ?? null;

  try {
    const summary = await generateTopicsFromGsc();
    if (runId) {
      await supabase.from('blog_agent_runs').update({
        status: 'success',
        completed_at: new Date().toISOString(),
        metadata: { duration_ms: Date.now() - start, ...summary },
      }).eq('id', runId);
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await supabase.from('blog_agent_runs').update({
        status: 'failure',
        completed_at: new Date().toISOString(),
        error_message: message,
      }).eq('id', runId);
    }
    return NextResponse.json({ ok: false, error: message });
  }
}
