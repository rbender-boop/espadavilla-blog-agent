/**
 * POST /api/inbound/resolve — the blog agent's inbound entry point.
 *
 * Per build spec §6: the SHARED Unipile account has one webhook, owned by the
 * LinkedIn agent. When a WhatsApp reply doesn't match a pending LinkedIn
 * approval, that webhook forwards { chat_id, text } here. We resolve it against
 * blog_approval_messages and, on a "yes", run the publish executor.
 *
 * Auth: shared secret (INBOUND_RESOLVE_SECRET), constant-time, fail-closed.
 * Body: { chat_id?: string | null, text: string }.
 */

import { NextResponse } from 'next/server';
import { isAuthorizedInboundResolve } from '@/lib/auth-utils';
import { processInboundReply } from '@/lib/whatsapp/parse-reply';
import { publishApprovedDraft } from '@/lib/publish/commit-post';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

type Body = { chat_id?: string | null; text?: string };

export async function POST(req: Request) {
  if (!process.env.INBOUND_RESOLVE_SECRET) {
    return new NextResponse('Server not configured', { status: 500 });
  }
  if (!isAuthorizedInboundResolve(req)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse('Bad JSON', { status: 400 });
  }

  const chatId = body.chat_id ?? null;
  const text = (body.text ?? '').toString();
  if (!text.trim()) return NextResponse.json({ ok: true, ignored: 'empty text' });

  const { data: runRow } = await supabase
    .from('blog_agent_runs')
    .insert({ run_type: 'inbound_resolve', status: 'running', metadata: { chat_id: chatId, body_preview: text.slice(0, 200) } })
    .select('id')
    .single();
  const runId = runRow?.id ?? null;

  try {
    const result = await processInboundReply(chatId, text);

    if (result.kind === 'approved' || result.kind === 'edit_confirmed') {
      const pub = await publishApprovedDraft(result.draft_id);
      if (runId) {
        await supabase
          .from('blog_agent_runs')
          .update({
            status: pub.ok ? 'success' : 'failure',
            completed_at: new Date().toISOString(),
            metadata: { parse: result, publish: pub },
            error_message: pub.ok ? null : pub.error,
          })
          .eq('id', runId);
      }
      return NextResponse.json({ ok: true, matched: true, parse: result, publish: pub });
    }

    if (runId) {
      await supabase
        .from('blog_agent_runs')
        .update({ status: 'success', completed_at: new Date().toISOString(), metadata: { parse: result } })
        .eq('id', runId);
    }
    // matched=false tells the LinkedIn webhook this reply wasn't a blog approval
    // either (so it can fall through to its own no-match handling/logging).
    const matched = result.kind !== 'no_match';
    return NextResponse.json({ ok: true, matched, parse: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('inbound/resolve error:', message);
    if (runId) {
      await supabase
        .from('blog_agent_runs')
        .update({ status: 'failure', completed_at: new Date().toISOString(), error_message: message })
        .eq('id', runId);
    }
    return NextResponse.json({ ok: false, error: message });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'blog inbound resolver', expects: 'POST { chat_id, text } with x-inbound-secret' });
}
