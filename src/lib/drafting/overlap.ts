/**
 * Intent-overlap analysis — the thin DB layer over the pure router in
 * overlap-score.ts. Fetches PUBLISHED posts (joined to their topic for cluster +
 * primary keyword) and scores the candidate against them.
 *
 * Advisory by design: any DB error degrades gracefully to scoring against an
 * empty set (level 'none' + pillar link only) so overlap analysis can never
 * block or crash the drafting pipeline.
 */

import { supabase } from '../supabase';
import { scoreOverlap, type CandidateTopic, type OverlapResult, type PublishedPost } from './overlap-score';

export async function analyzeIntentOverlap(candidate: CandidateTopic): Promise<OverlapResult> {
  try {
    const { data: pubs } = await supabase
      .from('blog_post_drafts')
      .select('slug, topic_id')
      .eq('status', 'published');

    const rows = (pubs ?? []).filter((p): p is { slug: string; topic_id: string } => !!p?.slug && !!p?.topic_id);
    const ids = [...new Set(rows.map((p) => p.topic_id))];

    const topicsById = new Map<string, { title: string; cluster: string | null; primary_keyword: string | null }>();
    if (ids.length) {
      const { data: topics } = await supabase
        .from('blog_topics')
        .select('id, title, cluster, primary_keyword')
        .in('id', ids);
      for (const t of topics ?? []) {
        topicsById.set(t.id, { title: t.title, cluster: t.cluster ?? null, primary_keyword: t.primary_keyword ?? null });
      }
    }

    const published: PublishedPost[] = rows.map((p) => {
      const t = topicsById.get(p.topic_id);
      return { slug: p.slug, title: t?.title ?? p.slug, cluster: t?.cluster ?? null, primary_keyword: t?.primary_keyword ?? null };
    });

    return scoreOverlap(candidate, published);
  } catch (err) {
    console.warn('[overlap] analysis failed (advisory; treating as none):', err instanceof Error ? err.message : String(err));
    return scoreOverlap(candidate, []);
  }
}
