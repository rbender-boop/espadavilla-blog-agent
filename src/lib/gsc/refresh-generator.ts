/**
 * Refresh generator (DB layer) — Phase 4.
 *
 * Queries GSC for per-page performance over two 28-day windows, cross-references
 * with published blog posts, detects decay via decay-detector (pure), snapshots
 * the latest metrics onto each published draft, and inserts new blog_topics rows
 * with source='refresh-generator' for decaying posts. The weekly pipeline then
 * drafts them like any other queued topic (with extra refresh context injected
 * by the pipeline steps when refreshes_draft_id is set).
 *
 * Conservative: posts < REFRESH_MIN_AGE_DAYS old are skipped; posts that already
 * have a refresh in the queue are skipped; at most REFRESH_LIMIT inserts per run.
 *
 * Env (all optional, tune from Vercel without redeploy):
 *   REFRESH_IMPR_DECAY_THRESHOLD  float  fraction at which impressions drop signals decay (default 0.5)
 *   REFRESH_POS_DECAY_THRESHOLD   number spots of position worsening to trigger (default 10)
 *   REFRESH_MIN_IMPRESSIONS       number prior-window floor before decay judged (default 5)
 *   REFRESH_MIN_AGE_DAYS          number days since publish before eligible (default 90)
 *   REFRESH_LIMIT                 number max refresh topics to queue per run (default 5)
 */

import { supabase } from '../supabase';
import { querySearchAnalytics } from './client';
import { detectDecay, type DetectOpts, type DecayCandidate } from './decay-detector';

const REFRESH_SOURCE   = 'refresh-generator';
const REFRESH_PRIORITY = 250; // behind strategy (110-210), ahead of GSC auto-gen (300+)

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function envDetectOpts(): DetectOpts {
  const num = (v: string | undefined) =>
    v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);
  const opts: DetectOpts = {};
  const impr   = num(process.env.REFRESH_IMPR_DECAY_THRESHOLD);
  const pos    = num(process.env.REFRESH_POS_DECAY_THRESHOLD);
  const minEst = num(process.env.REFRESH_MIN_IMPRESSIONS);
  const minAge = num(process.env.REFRESH_MIN_AGE_DAYS);
  const limit  = num(process.env.REFRESH_LIMIT);
  if (impr   !== undefined) opts.imprDecayThreshold  = impr;
  if (pos    !== undefined) opts.posDecayThreshold   = pos;
  if (minEst !== undefined) opts.minEstablishedImpr  = minEst;
  if (minAge !== undefined) opts.minAgeDays          = minAge;
  if (limit  !== undefined) opts.limit               = limit;
  return opts;
}

export type RefreshSummary = {
  postsChecked:   number;
  decayDetected:  number;
  alreadyQueued:  number;
  inserted:       number;
  insertedSlugs:  string[];
  metricsUpdated: number;
  skipped:        Array<{ slug: string; reason: string }>;
};

export type RefreshOpts = DetectOpts & {
  siteUrl?: string;
  dryRun?:  boolean;
};

export async function generateRefreshTopics(opts: RefreshOpts = {}): Promise<RefreshSummary> {
  // 1. Load all published drafts with a live /blog/ URL.
  const { data: drafts, error: draftsErr } = await supabase
    .from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, live_url, published_at')
    .eq('status', 'published')
    .not('live_url', 'is', null)
    .like('live_url', '%/blog/%');
  if (draftsErr) throw new Error(`Failed to load published drafts: ${draftsErr.message}`);

  const posts = (drafts ?? [])
    .filter((d) => d.slug && d.meta_title && d.live_url && d.published_at)
    .map((d) => ({
      draftId:     d.id        as string,
      slug:        d.slug      as string,
      title:       d.meta_title as string,
      publishedAt: d.published_at as string,
      liveUrl:     d.live_url  as string,
    }));

  if (posts.length === 0) {
    return { postsChecked: 0, decayDetected: 0, alreadyQueued: 0, inserted: 0, insertedSlugs: [], metricsUpdated: 0, skipped: [] };
  }

  // 2. Fetch GSC page-level data for two 28-day windows.
  const baseOpts = {
    ...(opts.siteUrl ? { siteUrl: opts.siteUrl } : {}),
    dimensions: ['page'] as string[],
    rowLimit: 500,
  };
  const [currentRows, priorRows] = await Promise.all([
    querySearchAnalytics({ ...baseOpts, startDate: isoDaysAgo(28), endDate: isoDaysAgo(1) }),
    querySearchAnalytics({ ...baseOpts, startDate: isoDaysAgo(56), endDate: isoDaysAgo(29) }),
  ]);

  // 3. Detect decay (pure).
  const detectOpts: DetectOpts = { ...envDetectOpts() };
  if (opts.imprDecayThreshold !== undefined)  detectOpts.imprDecayThreshold  = opts.imprDecayThreshold;
  if (opts.posDecayThreshold  !== undefined)  detectOpts.posDecayThreshold   = opts.posDecayThreshold;
  if (opts.minEstablishedImpr !== undefined)  detectOpts.minEstablishedImpr  = opts.minEstablishedImpr;
  if (opts.lowTractionImpr    !== undefined)  detectOpts.lowTractionImpr     = opts.lowTractionImpr;
  if (opts.minAgeDays         !== undefined)  detectOpts.minAgeDays          = opts.minAgeDays;
  if (opts.limit              !== undefined)  detectOpts.limit               = opts.limit;
  const decayed = detectDecay(currentRows, priorRows, posts, detectOpts);

  // 4. Snapshot GSC metrics on every published draft (even non-decaying ones).
  //    Build current metrics map: path → row.
  const currMap = new Map<string, { impressions: number; clicks: number; position: number }>();
  for (const r of currentRows) {
    let path = r.query;
    try { path = new URL(r.query).pathname.replace(/\/$/, ''); } catch { /* use as-is */ }
    currMap.set(path, { impressions: r.impressions, clicks: r.clicks, position: r.position });
  }

  if (!opts.dryRun) {
    for (const post of posts) {
      let urlPath = post.liveUrl;
      try { urlPath = new URL(post.liveUrl).pathname.replace(/\/$/, ''); } catch { /* use as-is */ }
      const m = currMap.get(urlPath);
      await supabase
        .from('blog_post_drafts')
        .update({
          gsc_impressions_28d: m?.impressions ?? 0,
          gsc_clicks_28d:      m?.clicks      ?? 0,
          gsc_position_28d:    m?.position    ?? null,
          gsc_checked_at:      new Date().toISOString(),
        })
        .eq('id', post.draftId);
    }
  }

  // 5. Skip any that already have a refresh topic in the queue.
  const { data: existingRefreshes } = await supabase
    .from('blog_topics')
    .select('refreshes_draft_id')
    .eq('source', REFRESH_SOURCE)
    .in('status', ['queued', 'drafting'])
    .not('refreshes_draft_id', 'is', null);
  const alreadyQueued = new Set(
    (existingRefreshes ?? []).map((r) => r.refreshes_draft_id as string),
  );

  const skipped: Array<{ slug: string; reason: string }> = [];
  const toInsert: DecayCandidate[] = [];
  for (const c of decayed) {
    if (alreadyQueued.has(c.draftId)) {
      skipped.push({ slug: c.slug, reason: 'refresh already queued' });
    } else {
      toInsert.push(c);
    }
  }

  if (opts.dryRun || toInsert.length === 0) {
    return {
      postsChecked:   posts.length,
      decayDetected:  decayed.length,
      alreadyQueued:  skipped.filter((s) => s.reason === 'refresh already queued').length,
      inserted:       0,
      insertedSlugs:  toInsert.map((c) => c.slug),   // would-insert in dry-run
      metricsUpdated: opts.dryRun ? 0 : posts.length,
      skipped,
    };
  }

  // 6. Load original topic metadata (keywords, cluster) to seed the refresh topic.
  const draftIds    = toInsert.map((c) => c.draftId);
  const { data: origDrafts } = await supabase
    .from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, published_at')
    .in('id', draftIds);
  const origTopicIds = (origDrafts ?? []).map((d) => d.topic_id).filter(Boolean) as string[];
  const { data: origTopics } = await supabase
    .from('blog_topics')
    .select('id, cluster, primary_keyword, secondary_keywords, geo_questions, target_internal_links')
    .in('id', origTopicIds);
  const topicsById       = new Map((origTopics ?? []).map((t) => [t.id as string, t]));
  const topicIdByDraftId = new Map((origDrafts  ?? []).map((d) => [d.id as string, d.topic_id as string | null]));

  // 7. Insert refresh topics.
  const insertRows = toInsert.map((c, i) => {
    const topicId = topicIdByDraftId.get(c.draftId);
    const orig    = topicId ? topicsById.get(topicId) : null;
    return {
      title: `[Refresh] ${c.title}`,
      cluster:                orig?.cluster                ?? null,
      status:                 'queued',
      priority:               REFRESH_PRIORITY + i,
      primary_keyword:        orig?.primary_keyword       ?? null,
      secondary_keywords:     (orig?.secondary_keywords   ?? []) as string[],
      geo_questions:          (orig?.geo_questions        ?? []) as string[],
      target_internal_links:  (orig?.target_internal_links ?? []) as string[],
      source:                 REFRESH_SOURCE,
      refreshes_draft_id:     c.draftId,
      notes: [
        `Content refresh of post published ${c.publishedAt.slice(0, 10)} (slug: ${c.slug}).`,
        `Decay signal: ${c.reason}.`,
        `IMPORTANT: keep the exact same slug as the original: ${c.slug}.`,
      ].join(' '),
    };
  });

  const { data: inserted, error: insErr } = await supabase
    .from('blog_topics')
    .insert(insertRows)
    .select('title');
  if (insErr) throw new Error(`Refresh topic insert failed: ${insErr.message}`);

  return {
    postsChecked:   posts.length,
    decayDetected:  decayed.length,
    alreadyQueued:  skipped.filter((s) => s.reason === 'refresh already queued').length,
    inserted:       inserted?.length ?? 0,
    insertedSlugs:  toInsert.map((c) => c.slug),
    metricsUpdated: posts.length,
    skipped,
  };
}
