/**
 * expire-stale-drafts.ts — auto-skip drafts left unanswered too long.
 *
 * Marks blog_post_drafts in a "waiting for Rob" status older than staleHours as
 * 'expired', and returns their topics to the queue so the slot isn't lost.
 * 'approved' is intentionally NOT expired (that's a publish/queue concern, not
 * a stale-draft one).
 */

import { supabase } from '../supabase';
import { STALE_DRAFT_HOURS } from '../config';

export type ExpireResult = { post_drafts: number; topics_requeued: number; errors: string[] };

export async function expireStaleDrafts(staleHours: number = STALE_DRAFT_HOURS): Promise<ExpireResult> {
  const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();
  const result: ExpireResult = { post_drafts: 0, topics_requeued: 0, errors: [] };

  try {
    const { data, error } = await supabase
      .from('blog_post_drafts')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .in('status', ['pending', 'sent_for_approval', 'pending_edit_confirmation'])
      .lt('created_at', cutoff)
      .select('id, topic_id');
    if (error) {
      result.errors.push(`post_drafts: ${error.message}`);
      return result;
    }
    result.post_drafts = data?.length ?? 0;

    // Re-queue topics whose draft just expired (so they get re-drafted later).
    const topicIds = (data ?? []).map((r) => r.topic_id).filter((id): id is string => typeof id === 'string');
    if (topicIds.length > 0) {
      const { data: requeued, error: tErr } = await supabase
        .from('blog_topics')
        .update({ status: 'queued', updated_at: new Date().toISOString() })
        .in('id', topicIds)
        .eq('status', 'drafting')
        .select('id');
      if (tErr) result.errors.push(`topics: ${tErr.message}`);
      else result.topics_requeued = requeued?.length ?? 0;
    }
  } catch (e) {
    result.errors.push(`post_drafts: ${e instanceof Error ? e.message : String(e)}`);
  }

  return result;
}
