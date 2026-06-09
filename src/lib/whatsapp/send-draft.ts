/**
 * WhatsApp draft sender (blog).
 *
 * Pulls a pending blog draft, formats it for mobile reading with the SEO
 * context Rob needs to make an instant call, sends via Unipile WhatsApp, and
 * logs a blog_approval_messages row so the inbound resolver can correlate the
 * reply.
 *
 * Guard-flagged drafts (risk_score >= 1.0) are NOT auto-sent by
 * sendAllPendingDrafts — they stay 'pending' for manual review.
 */

import { supabase } from '../supabase';
import { sendWhatsAppToOwner, type SendMessageResult } from '../unipile';
import { postUrl } from '../links';

type DraftRow = {
  id: string;
  status: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  h1: string | null;
  body_markdown: string | null;
  word_count: number | null;
  internal_links: Array<{ anchor: string; url: string }> | null;
  sources: Array<{ claim: string; url: string }> | null;
  risk_score: number | null;
  block_reason: string | null;
};

export type SendDraftResult = {
  draft_id: string;
  approval_id: string;
  unipile_chat_id: string | null;
};

/** Send a single draft to Rob via WhatsApp and persist an approval row. */
export async function sendDraftForApproval(draftId: string): Promise<SendDraftResult> {
  const { data: draft, error } = await supabase
    .from('blog_post_drafts')
    .select('id, status, slug, meta_title, meta_description, h1, body_markdown, word_count, internal_links, sources, risk_score, block_reason')
    .eq('id', draftId)
    .single<DraftRow>();

  if (error || !draft) throw new Error(`Draft ${draftId} not found: ${error?.message ?? 'no row'}`);
  if (draft.status !== 'pending') throw new Error(`Draft ${draftId} is not pending (status=${draft.status})`);

  const messageText = formatDraftMessage(draft);
  const sendResult: SendMessageResult = await sendWhatsAppToOwner(messageText);
  const chatId = sendResult.chat_id ?? sendResult.id ?? null;
  const messageId = sendResult.message_id ?? null;

  const { data: approval, error: approvalErr } = await supabase
    .from('blog_approval_messages')
    .insert({
      draft_id: draft.id,
      draft_type: 'post',
      channel: 'whatsapp',
      unipile_chat_id: chatId,
      unipile_message_id: messageId,
      sent_text: messageText,
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (approvalErr || !approval) {
    throw new Error(`WhatsApp send succeeded but approval log insert failed: ${approvalErr?.message ?? 'unknown'}`);
  }

  await supabase
    .from('blog_post_drafts')
    .update({ status: 'sent_for_approval', updated_at: new Date().toISOString() })
    .eq('id', draft.id);

  return { draft_id: draft.id, approval_id: approval.id, unipile_chat_id: chatId };
}

/** Send every currently-pending, non-flagged draft. */
export async function sendAllPendingDrafts(): Promise<SendDraftResult[]> {
  const { data: pending, error } = await supabase
    .from('blog_post_drafts')
    .select('id, risk_score')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load pending drafts: ${error.message}`);
  if (!pending || pending.length === 0) return [];

  const results: SendDraftResult[] = [];
  for (const row of pending) {
    // Flagged drafts are no longer skipped — they're sent with a ⚠️ warning + the
    // block reason so Rob can review/approve/edit, instead of being stranded.
    try {
      results.push(await sendDraftForApproval(row.id));
      await new Promise((res) => setTimeout(res, 1500)); // keep WA ordering
    } catch (err) {
      console.error(`Failed to send draft ${row.id}:`, err);
    }
  }
  return results;
}

/* ============================================================
 * FORMATTING — mobile WhatsApp
 * ============================================================ */

function formatDraftMessage(draft: DraftRow): string {
  const slug = draft.slug ?? '(no slug)';
  const links = (draft.internal_links ?? []).map((l) => l.anchor).filter(Boolean);
  const sources = (draft.sources ?? []).length;

  const flagged = draft.risk_score != null && draft.risk_score >= 1.0;
  const warning = flagged
    ? [
        `⚠️ FLAGGED — REVIEW BEFORE APPROVING`,
        `Reason: ${draft.block_reason ?? 'guard flag'}`,
        `Reply "yes" only if these are acceptable, or paste a corrected version.`,
        ``,
      ].join('\n')
    : '';

  const header = [
    `📝 BLOG DRAFT FOR APPROVAL`,
    `${draft.meta_title ?? draft.h1 ?? '(untitled)'}`,
    `/blog/${slug}  •  ${draft.word_count ?? '?'} words`,
    links.length ? `Links: ${links.join(', ')}` : `Links: none`,
    sources ? `Sources cited: ${sources}` : `Sources cited: 0`,
  ].join('\n');

  const seo = [
    `SEO`,
    `  Title (${(draft.meta_title ?? '').length}/60): ${draft.meta_title ?? ''}`,
    `  Desc  (${(draft.meta_description ?? '').length}/155): ${draft.meta_description ?? ''}`,
  ].join('\n');

  const body = draft.body_markdown ?? '(no body)';

  const footer = [
    `-------------------`,
    `Reply with:`,
    `  EV YES   to publish to espadavilla.com`,
    `  EV NO    to skip`,
    `  or paste an edited version starting with "EV"`,
  ].join('\n');

  return [warning + header, '', seo, '', '-------------------', body, '', footer].join('\n');
}
