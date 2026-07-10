import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { runPipelineWorker } from '@/lib/jobs/run-worker';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });
  const summary = await runPipelineWorker();
  const failed = summary.status === 'failed';
  // Non-2xx on a failed worker run so Vercel's cron dashboard registers it.
  return NextResponse.json({ ok: !failed, ...summary }, failed ? { status: 500 } : undefined);
}
