/**
 * GSC topic GENERATOR (DB layer) — Phase 3.
 *
 * Glue: pull Search Analytics rows → selectOpportunities (pure) → drop
 * near-duplicates via the Phase 2 overlap router AND anything already in the
 * topic queue → insert survivors into blog_topics (status 'queued',
 * source 'gsc-generator'). The existing weekly pipeline then drafts them.
 *
 * Conservative by design: read-only GSC scope, additive inserts only, GSC
 * topics get a high priority NUMBER (picked last) so the curated seed/strategy
 * queue still drains first. Returns a structured summary for logging.
 */

import { supabase } from '../supabase';
import { querySearchAnalytics, type GscRow } from './client';
import { selectOpportunities, type GscCandidate, type SelectOpts } from './topic-select';
import { analyzeIntentOverlap } from '../drafting/overlap';

// GSC topics sit behind the curated queue (seed 50–100, strategy 110–210).
const GSC_PRIORITY_BASE = 300;
const GSC_SOURCE = 'gsc-generator';

export type GenerateSummary = {
  fetched: number;
  candidates: number;
  inserted: number;
  insertedTitles: string[];
  skipped: Array<{ query: string; reason: string }>;
};

function norm(s: string | null | undefined): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Selector thresholds from env (tune from Vercel without a code redeploy as the
 * property matures). Any unset var falls back to the principled page-2 defaults
 * in selectOpportunities. Explicit opts passed to generateTopicsFromGsc still win.
 */
function envSelectOpts(): SelectOpts {
  const num = (v: string | undefined) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
  const opts: SelectOpts = {};
  const minPos = num(process.env.GSC_MIN_POSITION);
  const maxPos = num(process.env.GSC_MAX_POSITION);
  const minImpr = num(process.env.GSC_MIN_IMPRESSIONS);
  const maxCtr = num(process.env.GSC_MAX_CTR);
  const limit = num(process.env.GSC_TOPIC_LIMIT);
  if (minPos !== undefined) opts.minPosition = minPos;
  if (maxPos !== undefined) opts.maxPosition = maxPos;
  if (minImpr !== undefined) opts.minImpressions = minImpr;
  if (maxCtr !== undefined) opts.maxCtr = maxCtr;
  if (limit !== undefined) opts.limit = limit;
  return opts;
}

/** Existing topics' normalized titles + primary keywords (any non-retired status). */
async function loadExistingKeys(): Promise<{ titles: Set<string>; primaries: Set<string> }> {
  const titles = new Set<string>();
  const primaries = new Set<string>();
  const { data } = await supabase
    .from('blog_topics')
    .select('title, primary_keyword, status')
    .in('status', ['queued', 'drafting', 'published']);
  for (const row of data ?? []) {
    if (row.title) titles.add(norm(row.title));
    if (row.primary_keyword) primaries.add(norm(row.primary_keyword));
  }
  return { titles, primaries };
}

export type GenerateOpts = SelectOpts & {
  siteUrl?: string;
  startDate?: string;
  endDate?: string;
  rowLimit?: number;
  dryRun?: boolean;        // select + dedupe but do not insert
  rows?: GscRow[];         // inject rows (tests / replay); skips the API call
};

export async function generateTopicsFromGsc(opts: GenerateOpts = {}): Promise<GenerateSummary> {
  const rows = opts.rows ?? (await querySearchAnalytics({
    ...(opts.siteUrl !== undefined ? { siteUrl: opts.siteUrl } : {}),
    ...(opts.startDate !== undefined ? { startDate: opts.startDate } : {}),
    ...(opts.endDate !== undefined ? { endDate: opts.endDate } : {}),
    ...(opts.rowLimit !== undefined ? { rowLimit: opts.rowLimit } : {}),
  }));

  const candidates = selectOpportunities(rows, { ...envSelectOpts(), ...opts });
  const existing = await loadExistingKeys();

  const skipped: Array<{ query: string; reason: string }> = [];
  const toInsert: Array<{ candidate: GscCandidate; pillar: string | null }> = [];
  const batchPrimaries = new Set<string>();

  for (const c of candidates) {
    const primaryKey = norm(c.primary_keyword);
    // 1. already queued/published, or a dup within this same batch?
    if (existing.primaries.has(primaryKey) || existing.titles.has(norm(c.title))) {
      skipped.push({ query: c.query, reason: 'already in topic queue' });
      continue;
    }
    if (batchPrimaries.has(primaryKey)) {
      skipped.push({ query: c.query, reason: 'duplicate within this batch' });
      continue;
    }
    // 2. near-duplicate of a PUBLISHED post (same job + angle)? Phase 2 router.
    const overlap = await analyzeIntentOverlap({
      title: c.title,
      cluster: c.cluster,
      primary_keyword: c.primary_keyword,
    });
    if (overlap.level === 'high') {
      skipped.push({ query: c.query, reason: `near-duplicate of published "${overlap.matched?.title ?? '?'}"` });
      continue;
    }
    batchPrimaries.add(primaryKey);
    toInsert.push({ candidate: c, pillar: overlap.pillarHint });
  }

  if (opts.dryRun || toInsert.length === 0) {
    return {
      fetched: rows.length,
      candidates: candidates.length,
      inserted: 0,
      insertedTitles: toInsert.map(({ candidate }) => candidate.title), // would-insert (dry run)
      skipped,
    };
  }

  const insertRows = toInsert.map(({ candidate, pillar }, i) => ({
    title: candidate.title,
    cluster: candidate.cluster,
    status: 'queued',
    priority: GSC_PRIORITY_BASE + i,
    primary_keyword: candidate.primary_keyword,
    secondary_keywords: candidate.secondary_keywords,
    geo_questions: [] as string[],
    target_internal_links: pillar ? [pillar] : [],
    source: GSC_SOURCE,
    notes: candidate.reason,
  }));

  const { data: inserted, error } = await supabase
    .from('blog_topics')
    .insert(insertRows)
    .select('title');
  if (error) throw new Error(`blog_topics insert failed: ${error.message}`);

  return {
    fetched: rows.length,
    candidates: candidates.length,
    inserted: inserted?.length ?? 0,
    insertedTitles: (inserted ?? []).map((r) => r.title),
    skipped,
  };
}
