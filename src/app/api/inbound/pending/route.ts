/**
 * GET /api/inbound/pending — "peek" for the freshest-approval-wins router.
 *
 * The LinkedIn agent's webhook (the single shared-WhatsApp inbound) calls this
 * before deciding whether a reply belongs to it or to the blog agent. Returns
 * the send time of the most-recent UNRESOLVED blog approval so the webhook can
 * compare it against its own pending approval and route to whichever is newer.
 *
 * Read-only. Auth: shared INBOUND_RESOLVE_SECRET (constant-time), fail-closed.
 */

import { NextResponse } from 'next/server';
import { isAuthorizedInboundResolve } from '@/lib/auth-utils';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!process.env.INBOUND_RESOLVE_SECRET) {
    return new NextResponse('Server not configured', { status: 500 });
  }
  if (!isAuthorizedInboundResolve(req)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data } = await supabase
    .from('blog_approval_messages')
    .select('sent_at')
    .is('resolution', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ pending: !!data, sent_at: data?.sent_at ?? null });
}
