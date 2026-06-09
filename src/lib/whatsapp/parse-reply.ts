/**
 * Reply parser for inbound WhatsApp replies from Rob (blog).
 *
 * Single flow (Flow A — post approval), since the blog agent only sends post
 * drafts. Mirrors the LinkedIn agent's post-approval state machine:
 *   sent_for_approval --yes--> approved
 *                      --no---> skipped
 *                      --edit-> pending_edit_confirmation (re-sent for confirm)
 *   pending_edit_confirmation --yes--> approved (publishes edited_content)
 *
 * Dispatch: most-recent unresolved blog_approval_messages row wins. Chat-
 * specific match first, then a 48h cross-chat fallback (the forwarded reply
 * from the LinkedIn webhook may not carry the same chat_id we sent on).
 *
 * The caller (POST /api/inbound/resolve) runs the publish executor when this
 * returns 'approved' or 'edit_confirmed'.
 */

import { supabase } from '../supabase';
import { sendWhatsAppToOwner } from '../unipile';

const APPROVE_RE = /^(?:yes|y|approve|approved|ok|okay|publish|post|send it|go|ship it|✅|✓|👍)\.?$/i;
const SKIP_RE = /^(?:no|n|skip|skipped|nope|kill|drop|cancel|❌|✗|x|👎)\.?$/i;

export type ParseResult =
  | { kind: 'approved'; draft_id: string; will_publish: true }
  | { kind: 'skipped'; draft_id: string }
  | { kind: 'edit_received'; draft_id: string; awaiting_confirmation: true }
  | { kind: 'edit_confirmed'; draft_id: string; will_publish: true }
  | { kind: 'no_match'; reason: string }
  | { kind: 'ignored'; reason: string };

type PendingRow = { approval_id: string; draft_id: string; sent_at: string };

export async function processInboundReply(chatId: string | null, replyText: string): Promise<ParseResult> {
  const raw = (replyText ?? '').trim();
  if (!raw) return { kind: 'ignored', reason: 'empty body' };

  // Defense-in-depth: the LinkedIn router normally strips the "EV" project tag
  // before forwarding, but tolerate it here too so a directly-delivered
  // "EV YES" still parses. Espadavilla only ever owns EV-tagged replies.
  const trimmed = raw.replace(/^ev\b[\s:,.\-]*/i, '').trim();
  if (!trimmed) return { kind: 'ignored', reason: 'empty after EV prefix' };

  const pending = await findMostRecentPending(chatId);
  if (!pending) return { kind: 'no_match', reason: `no unresolved blog approval row${chatId ? ` for chat_id ${chatId}` : ''}` };

  return handlePostApprovalReply(pending.approval_id, pending.draft_id, trimmed);
}

async function findMostRecentPending(chatId: string | null): Promise<PendingRow | null> {
  if (chatId) {
    const matched = await queryPending({ chatId });
    if (matched) return matched;
  }
  const fallbackCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  return queryPending({ since: fallbackCutoff });
}

async function queryPending(opts: { chatId?: string; since?: string }): Promise<PendingRow | null> {
  let q = supabase
    .from('blog_approval_messages')
    .select('id, draft_id, sent_at')
    .is('resolution', null);
  if (opts.chatId) q = q.eq('unipile_chat_id', opts.chatId);
  if (opts.since) q = q.gte('sent_at', opts.since);

  const { data } = await q.order('sent_at', { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return { approval_id: data.id, draft_id: data.draft_id, sent_at: data.sent_at };
}

/* ============================================================
 * FLOW A — POST APPROVAL
 * ============================================================ */

async function handlePostApprovalReply(approvalId: string, draftId: string, trimmed: string): Promise<ParseResult> {
  const { data: draft, error } = await supabase
    .from('blog_post_drafts')
    .select('id, status')
    .eq('id', draftId)
    .single();
  if (error || !draft) return { kind: 'no_match', reason: `draft ${draftId} not found` };

  const isApprove = APPROVE_RE.test(trimmed);
  const isSkip = SKIP_RE.test(trimmed);

  if (draft.status === 'sent_for_approval') {
    if (isApprove) { await markApproved(draft.id, approvalId, trimmed); return { kind: 'approved', draft_id: draft.id, will_publish: true }; }
    if (isSkip) { await markSkipped(draft.id, approvalId, trimmed); return { kind: 'skipped', draft_id: draft.id }; }
    await saveEdit(draft.id, approvalId, trimmed);
    await sendEditConfirmation(draft.id, trimmed);
    return { kind: 'edit_received', draft_id: draft.id, awaiting_confirmation: true };
  }

  if (draft.status === 'pending_edit_confirmation') {
    if (isApprove) { await markApproved(draft.id, approvalId, trimmed); return { kind: 'edit_confirmed', draft_id: draft.id, will_publish: true }; }
    if (isSkip) { await markSkipped(draft.id, approvalId, trimmed); return { kind: 'skipped', draft_id: draft.id }; }
    await saveEdit(draft.id, approvalId, trimmed);
    await sendEditConfirmation(draft.id, trimmed);
    return { kind: 'edit_received', draft_id: draft.id, awaiting_confirmation: true };
  }

  return { kind: 'ignored', reason: `draft ${draft.id} is in non-actionable status '${draft.status}'` };
}

/* ============================================================
 * STATUS TRANSITIONS
 * ============================================================ */

async function markApproved(draftId: string, approvalId: string, replyText: string) {
  const now = new Date().toISOString();
  await supabase.from('blog_post_drafts').update({ status: 'approved', updated_at: now }).eq('id', draftId);
  await supabase.from('blog_approval_messages').update({ response_text: replyText, response_received_at: now, resolution: 'approved', resolved_at: now }).eq('id', approvalId);
}

async function markSkipped(draftId: string, approvalId: string, replyText: string) {
  const now = new Date().toISOString();
  await supabase.from('blog_post_drafts').update({ status: 'skipped', updated_at: now }).eq('id', draftId);
  await supabase.from('blog_topics').update({ status: 'queued', updated_at: now }).eq('id', (await topicIdFor(draftId)) ?? '');
  await supabase.from('blog_approval_messages').update({ response_text: replyText, response_received_at: now, resolution: 'skipped', resolved_at: now }).eq('id', approvalId);
}

/** On skip, return the topic to the queue so the slot isn't lost. */
async function topicIdFor(draftId: string): Promise<string | null> {
  const { data } = await supabase.from('blog_post_drafts').select('topic_id').eq('id', draftId).maybeSingle();
  return data?.topic_id ?? null;
}

async function saveEdit(draftId: string, approvalId: string, editedText: string) {
  const now = new Date().toISOString();
  await supabase.from('blog_post_drafts').update({ status: 'pending_edit_confirmation', edited_content: editedText, updated_at: now }).eq('id', draftId);
  await supabase.from('blog_approval_messages').update({ response_text: editedText, response_received_at: now, resolution: 'edited', resolved_at: now }).eq('id', approvalId);
}

async function sendEditConfirmation(draftId: string, editedText: string): Promise<void> {
  const message = [
    `EDIT RECEIVED — confirm to publish`,
    `-------------------`,
    editedText.slice(0, 1500),
    `-------------------`,
    `Reply with:`,
    `  EV YES   to publish this version`,
    `  EV NO    to skip`,
    `  or paste another edit starting with "EV"`,
  ].join('\n');
  const sendResult = await sendWhatsAppToOwner(message);
  const chatId = sendResult.chat_id ?? sendResult.id ?? null;
  await supabase.from('blog_approval_messages').insert({
    draft_id: draftId,
    draft_type: 'post',
    channel: 'whatsapp',
    unipile_chat_id: chatId,
    unipile_message_id: sendResult.message_id ?? null,
    sent_text: message,
    sent_at: new Date().toISOString(),
  });
}
