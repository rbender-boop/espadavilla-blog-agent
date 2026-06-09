/**
 * voice-refinement cron — weekly Sunday (0 15 * * 0).
 * Learns from Rob's edits and writes blog_voice_memories the drafter then uses.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthorizedCron } from '@/lib/auth-utils';
import { refineVoiceFromEdits } from '@/lib/voice/refine-from-edits';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new NextResponse('Unauthorized', { status: 401 });

  const start = Date.now();
  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'voice_refinement', status: 'running' })
    .select('id')
    .single();

  try {
    const result = await refineVoiceFromEdits();
    if (runRow) {
      await supabase
        .from('blog_agent_runs')
        .update({ status: 'success', completed_at: new Date().toISOString(), items_created: result.memories_added, metadata: { duration_ms: Date.now() - start, ...result } })
        .eq('id', runRow.id);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runRow) {
      await supabase
        .from('blog_agent_runs')
        .update({ status: 'failure', completed_at: new Date().toISOString(), error_message: message })
        .eq('id', runRow.id);
    }
    return NextResponse.json({ ok: false, error: message });
  }
}
