/**
 * translate-published cron — every 10 min (vercel.json).
 *
 * Translates published English posts into es / fr / de / pt (Rob, 2026-11-11).
 * Two (draft, lang) pairs per run so one run stays well inside maxDuration.
 * Passing translations go to 'approved'; the translation publisher ships them.
 * Kill switch: TRANSLATE_POSTS=false.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { translatePending } from '@/lib/i18n/translate';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const PER_RUN = Number(process.env.TRANSLATE_PER_RUN ?? 2);

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  if (process.env.TRANSLATE_POSTS === 'false') return NextResponse.json({ ok: true, skipped: 'TRANSLATE_POSTS=false' });

  const start = Date.now();
  let results: Awaited<ReturnType<typeof translatePending>> = [];
  let error: string | null = null;
  try {
    results = await translatePending(PER_RUN);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Only log runs that did something, so idle runs don't flood blog_agent_runs.
  if (results.length || error) {
    const bad = results.filter((r) => r.status !== 'approved');
    await supabase.from('blog_agent_runs').insert({
      run_type: 'translate',
      status: error ? 'failure' : bad.length ? 'partial' : 'success',
      items_processed: results.filter((r) => r.status === 'approved').length,
      error_message: error ?? (bad.length ? bad.map((r) => `${r.lang}:${r.status} ${r.note ?? ''}`).join(' | ').slice(0, 500) : null),
      metadata: { duration_ms: Date.now() - start, results },
      completed_at: new Date().toISOString(),
    });
  }
  return NextResponse.json({ ok: !error, results, error }, error ? { status: 500 } : undefined);
}
