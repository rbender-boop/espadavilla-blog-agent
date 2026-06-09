/**
 * Decay detector — PURE, no DB/network. Phase 4.
 *
 * Given Search Analytics rows from two 28-day windows (current and prior) and
 * the list of published blog posts, returns which posts show decay signals that
 * warrant a content refresh.
 *
 * Three signals (evaluated in priority order; a post emits at most one):
 *   impressions_decay — impressions fell significantly vs the prior window
 *   position_decay    — average position worsened significantly
 *   low_traction      — post is old enough but never gained meaningful impressions
 *
 * Conservative: posts younger than minAgeDays are always skipped, and the prior
 * window must have enough impressions before impressions/position decay fires.
 */

import type { GscRow } from './client';

export type PublishedPostRef = {
  draftId: string;
  slug: string;
  title: string;
  publishedAt: string; // ISO date string
  liveUrl: string;
};

export type DecayMetrics = {
  impressions: number;
  clicks: number;
  position: number; // average; 0 = no data
};

export type DecaySignal = 'impressions_decay' | 'position_decay' | 'low_traction';

export type DecayCandidate = {
  draftId: string;
  slug: string;
  title: string;
  publishedAt: string;
  liveUrl: string;
  currentMetrics: DecayMetrics;
  priorMetrics: DecayMetrics | null;
  signal: DecaySignal;
  reason: string;
};

export type DetectOpts = {
  imprDecayThreshold?: number;  // impressions must fall below this fraction of prior (default 0.5)
  posDecayThreshold?: number;   // position worsens by at least this many spots (default 10)
  minEstablishedImpr?: number;  // prior window needs at least this many impressions to judge decay (default 5)
  lowTractionImpr?: number;     // max impressions in BOTH windows to classify as low-traction (default 10)
  minAgeDays?: number;          // skip posts younger than this (default 90)
  limit?: number;               // max candidates returned (default 5)
};

const DEFAULTS: Required<DetectOpts> = {
  imprDecayThreshold: 0.5,
  posDecayThreshold: 10,
  minEstablishedImpr: 5,
  lowTractionImpr: 10,
  minAgeDays: 90,
  limit: 5,
};

/** Normalise a URL or path to a comparable path string (no origin, no trailing slash). */
export function normUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/\/$/, '');
  } catch {
    return url.replace(/\/$/, '');
  }
}

/** Build a page → metrics map from page-dimension GSC rows (r.query = page URL). */
function buildMetricsMap(rows: GscRow[]): Map<string, DecayMetrics> {
  const map = new Map<string, DecayMetrics>();
  for (const r of rows) {
    const key = normUrl(r.query);
    map.set(key, { impressions: r.impressions, clicks: r.clicks, position: r.position });
  }
  return map;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

export function detectDecay(
  currentRows: GscRow[],    // page-dimension, last 28d
  priorRows: GscRow[],      // page-dimension, days 29-56
  posts: PublishedPostRef[],
  opts: DetectOpts = {},
): DecayCandidate[] {
  const cfg: Required<DetectOpts> = {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined)),
  };

  const current = buildMetricsMap(currentRows);
  const prior   = buildMetricsMap(priorRows);
  const candidates: DecayCandidate[] = [];

  for (const post of posts) {
    if (daysSince(post.publishedAt) < cfg.minAgeDays) continue; // too new

    const path = normUrl(post.liveUrl);
    const curr = current.get(path) ?? { impressions: 0, clicks: 0, position: 0 };
    const prev = prior.get(path) ?? null;

    // Signal 1: impressions decay — prior period had traction, current collapsed.
    if (prev && prev.impressions >= cfg.minEstablishedImpr) {
      if (curr.impressions < prev.impressions * cfg.imprDecayThreshold) {
        const pct = Math.round((1 - curr.impressions / prev.impressions) * 100);
        candidates.push({
          draftId: post.draftId,
          slug: post.slug,
          title: post.title,
          publishedAt: post.publishedAt,
          liveUrl: post.liveUrl,
          currentMetrics: curr,
          priorMetrics: prev,
          signal: 'impressions_decay',
          reason: `Impressions dropped ${prev.impressions}→${curr.impressions} (${pct}% decline) over last 28d vs prior 28d`,
        });
        continue;
      }
    }

    // Signal 2: position decay — both windows have data but ranking slipped.
    if (
      prev &&
      prev.impressions >= cfg.minEstablishedImpr &&
      curr.impressions >= cfg.minEstablishedImpr &&
      curr.position > 0 &&
      prev.position > 0 &&
      curr.position - prev.position >= cfg.posDecayThreshold
    ) {
      candidates.push({
        draftId: post.draftId,
        slug: post.slug,
        title: post.title,
        publishedAt: post.publishedAt,
        liveUrl: post.liveUrl,
        currentMetrics: curr,
        priorMetrics: prev,
        signal: 'position_decay',
        reason: `Average position worsened ${prev.position.toFixed(1)}→${curr.position.toFixed(1)} (−${(curr.position - prev.position).toFixed(1)} spots)`,
      });
      continue;
    }

    // Signal 3: low traction — old post, thin impressions in both windows.
    const bothThin =
      curr.impressions <= cfg.lowTractionImpr &&
      (!prev || prev.impressions <= cfg.lowTractionImpr);
    if (bothThin) {
      candidates.push({
        draftId: post.draftId,
        slug: post.slug,
        title: post.title,
        publishedAt: post.publishedAt,
        liveUrl: post.liveUrl,
        currentMetrics: curr,
        priorMetrics: prev,
        signal: 'low_traction',
        reason: `Only ${curr.impressions} impressions in last 28d after ${daysSince(post.publishedAt)} days live`,
      });
    }
  }

  // Sort: impressions_decay first, then position_decay, then low_traction.
  const order: Record<DecaySignal, number> = { impressions_decay: 0, position_decay: 1, low_traction: 2 };
  candidates.sort((a, b) => order[a.signal] - order[b.signal]);

  return candidates.slice(0, cfg.limit);
}
