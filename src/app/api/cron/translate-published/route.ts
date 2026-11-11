/**
 * translate-published cron — every 5 min (vercel.json).
 *
 * 1. Translates ONE (post, language) pair of a published English post into
 *    es / fr / de / pt (Rob, 2026-11-11: auto-publish, no per-translation review).
 * 2. Publishes ONE post whose translations are settled (one atomic commit:
 *    translated pages, hreflang on the English page, /<lang>/blog indexes,
 *    sitemap).
 * Kill switches: TRANSLATE_POSTS=false (both steps), PUBLISH_TRANSLATIONS=false (step 2).
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { translatePending } from '@/lib/i18n/translate';
import { publishReadyTranslations } from '@/lib/i18n/publish-translations';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const PER_RUN = Number(process.env.TRANSLATE_PER_RUN ?? 1);

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  if (process.env.TRANSLATE_POSTS === 'false') return NextResponse.json({ ok: true, skipped: 'TRANSLATE_POSTS=false' });

  const start = Date.now();
  let translated: Awaited<ReturnType<typeof translatePending>> = [];
  let published: Awaited<ReturnType<typeof publishReadyTranslations>> = [];
  const errors: string[] = [];
  try { translated = await translatePending(PER_RUN); } catch (err) { errors.push(`translate: ${err instanceof Error ? err.message : String(err)}`); }
  if (process.env.PUBLISH_TRANSLATIONS !== 'false') {
    try { published = await publishReadyTranslations(1); } catch (err) { errors.push(`publish: ${err instanceof Error ? err.message : String(err)}`); }
  }

  // Only log runs that did something, so idle runs don't flood blog_agent_runs.
  if (translated.length || errors.length) {
    const bad = translated.filter((r) => r.status !== 'approved');
    await supabase.from('blog_agent_runs').insert({
      run_type: 'translate',
      status: errors.length ? 'failure' : bad.length ? 'partial' : 'success',
      items_processed: translated.filter((r) => r.status === 'approved').length,
      error_message: [...errors, ...bad.map((r) => `${r.lang}:${r.status} ${r.note ?? ''}`)].join(' | ').slice(0, 500) || null,
      metadata: { duration_ms: Date.now() - start, translated, published },
      completed_at: new Date().toISOString(),
    });
  }
  const ok = !errors.length;
  return NextResponse.json({ ok, translated, published, errors }, ok ? undefined : { status: 500 });
}
