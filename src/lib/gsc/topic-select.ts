/**
 * GSC opportunity SELECTOR (pure, no DB / no network) — Phase 3.
 *
 * Turns raw Search Analytics rows into ranked, on-target topic CANDIDATES:
 *   1. Drop SOFT-avoid / off-target queries. espadavilla has NO hard geo guard
 *      (isNegativeGeo is a no-op), but it must NOT mint generic "best Caribbean
 *      golf" topics — that is golfvilla.com's lane (see keyword-clusters
 *      SOFT_AVOID_TERMS). Off-target queries (no cluster + no Villa Espada / Cap
 *      Cana entity signal) are dropped too.
 *   2. Keep "page-2 opportunities": ranking just off page 1 (avg position in a
 *      configurable band) with enough impressions to be worth chasing, and a
 *      below-expected CTR — queries we surface for but don't win the click on.
 *   3. Map each surviving query to an intent CLUSTER (keyword-clusters taxonomy).
 *      A query with no cluster AND no on-target entity signal is dropped.
 *   4. Emit a CandidateTopic (title + primary/secondary keywords + cluster) for
 *      the DB layer to dedupe (overlap router) and insert.
 *
 * Kept pure so verify-offline can assert the filtering/mapping without secrets.
 */

import { NEGATIVE_TERMS } from '../keywords';
import { KEYWORD_CLUSTERS, SOFT_AVOID_TERMS, type KeywordCluster } from '../keyword-clusters';
import type { GscRow } from './client';

// On-target entity tokens — espadavilla's OWN entities. A query with no cluster
// match still counts as on-target if it carries one of these. Deliberately
// EXCLUDES generic 'caribbean' / 'golf villa' (golfvilla.com's category lane) so
// the selector never mints cannibalizing generic-golf topics.
const ENTITY_SIGNAL = [
  'villa espada', 'cap cana', 'punta espada', 'las iguanas',
  'eden roc', 'juanillo', 'cap cana villa',
];

export type SelectOpts = {
  minPosition?: number;     // default 5  (just off page 1)
  maxPosition?: number;     // default 20 (page 2-ish; deeper = too far to chase)
  minImpressions?: number;  // default 30 over the window
  maxCtr?: number;          // default 0.10 — only "leaving clicks on the table"
  limit?: number;           // default 12 candidates
};

export type GscCandidate = {
  query: string;
  cluster: string;
  primary_keyword: string;
  secondary_keywords: string[];
  title: string;
  metrics: { impressions: number; position: number; ctr: number; clicks: number };
  reason: string;
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/* ============================================================
 * TOPIC FINGERPRINTING (cannibalization guard)
 * ============================================================
 * `norm()` alone is exact-string matching, so "punta espada", "punta espada
 * golf", "punta espada golf club" and "punta espada golf course" read as four
 * distinct queries and each mints its own topic — which is exactly how
 * espadavilla.com ended up with four queued Punta Espada topics all chasing one
 * intent, and three live pages splitting the ranking signal for
 * "punta espada golf course" (positions 45, 46, 67 — none winning).
 *
 * The fingerprint collapses a query to its intent: drop stopwords, singularize,
 * sort tokens. Word order and plurality stop mattering.
 */

const FP_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'at', 'to', 'for',
  'with', 'from', 'by', 'is', 'are', 'my', 'your', 'our',
]);

/**
 * Generic head/modifier nouns that do NOT change search intent when appended to
 * an already-specific phrase. "punta espada" vs "punta espada golf course" is
 * one intent; "punta espada" vs "punta espada tee times" is two (tee times is
 * a distinct job). Keep this list tight — every addition merges more topics.
 */
const GENERIC_MODIFIERS = new Set([
  'golf', 'course', 'club', 'villa', 'rental', 'resort', 'holiday', 'vacation',
]);

/** Crude but CONSISTENT singularization — fingerprints only need determinism.
 * Order matters: the -es cases must be tested before the bare -s case, and
 * "sses" must be checked before "ses" so "glasses"→"glass" but "courses"→"course". */
function singular(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (/(sses|ches|shes|xes|zes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/**
 * Synonym canonicalization (2026-08-20) — the fingerprint was purely lexical,
 * so "shuttle" / "transfer" / "transportation" minted three topics for ONE
 * intent (the exact miss that queued 4 near-identical golf-transport topics).
 * Each token is mapped to a canonical form AFTER singularization. Keep groups
 * tight and unambiguous — every entry merges more topics.
 */
const TOKEN_SYNONYMS: Record<string, string> = {
  // ground-transport intent
  shuttle: 'transport',
  transfer: 'transport',
  transportation: 'transport',
  // lodging-cost intent
  price: 'cost',
  pricing: 'cost',
  rate: 'cost',
  fee: 'cost',
};

/** Order-, plurality-, and synonym-insensitive intent key for a query or title. */
export function topicFingerprint(s: string): string {
  return fingerprintTokens(s).join(' ');
}

function fingerprintTokens(s: string): string[] {
  return norm(s)
    .split(' ')
    .filter((w) => w && !FP_STOPWORDS.has(w))
    .map(singular)
    .map((w) => TOKEN_SYNONYMS[w] ?? w)
    .sort();
}

/**
 * True if `query` is the same intent as `other` — either an exact fingerprint
 * match, or a subset whose only extra tokens are GENERIC_MODIFIERS.
 */
export function isRedundantIntent(query: string, other: string): boolean {
  const a = fingerprintTokens(query);
  const b = fingerprintTokens(other);
  if (a.join(' ') === b.join(' ')) return true;
  const [small, large] = a.length <= b.length ? [a, b] : [b, a];
  if (small.length === 0) return false;
  const largeSet = new Set(large);
  if (!small.every((t) => largeSet.has(t))) return false; // not a subset
  const smallSet = new Set(small);
  const extra = large.filter((t) => !smallSet.has(t));
  return extra.length > 0 && extra.every((t) => GENERIC_MODIFIERS.has(t));
}


/** Hard geo guard — NO-OP for espadavilla (NEGATIVE_TERMS is empty). Kept for
 *  engine + test compatibility; the "stay on Cap Cana" steer is soft (below). */
export function isNegativeGeo(query: string): boolean {
  const q = norm(query);
  return NEGATIVE_TERMS.some((t) => q.includes(t));
}

/** Soft-avoid: golfvilla.com's category lane / low booking-intent. Dropped from
 *  selection so the agent never builds generic "best Caribbean golf" topics. */
export function isSoftAvoid(query: string): boolean {
  const q = norm(query);
  return SOFT_AVOID_TERMS.some((t) => q.includes(norm(t)));
}

/**
 * Best-matching cluster for a query, or null. Scores by how many of a cluster's
 * seed terms share words with the query (substring or token overlap); the
 * highest-scoring cluster wins. Returns null when nothing meaningfully overlaps.
 */
export function clusterForQuery(query: string): KeywordCluster | null {
  const q = norm(query);
  const qTokens = new Set(q.split(' ').filter((w) => w.length > 2));
  let best: KeywordCluster | null = null;
  let bestScore = 0;
  for (const cluster of KEYWORD_CLUSTERS) {
    let score = 0;
    for (const term of cluster.terms) {
      const t = norm(term);
      if (q.includes(t) || t.includes(q)) {
        score += 10; // strong: a full seed-phrase match must dominate token noise
        continue;
      }
      const shared = t.split(' ').filter((w) => w.length > 2 && qTokens.has(w)).length;
      if (shared >= 2) score += shared; // weak: multi-word token overlap
    }
    if (score > bestScore) {
      bestScore = score;
      best = cluster;
    }
  }
  return bestScore > 0 ? best : null;
}

/** On-target if it maps to a cluster OR carries an espadavilla entity signal. */
export function isOnTarget(query: string): boolean {
  if (clusterForQuery(query)) return true;
  const q = norm(query);
  return ENTITY_SIGNAL.some((sig) => q.includes(sig));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Deterministic working title from a query + cluster. This is the topic BRIEF —
 * the drafter still writes the final meta_title/h1. Angle is steered by intent
 * so two queries in different clusters don't produce look-alike titles.
 */
export function proposeTitle(query: string, cluster: KeywordCluster | null): string {
  const q = titleCase(query.trim());
  switch (cluster?.slug) {
    case 'comparison':
      return `${q}: An Honest Comparison for Your Cap Cana Stay`;
    case 'logistics':
      return `${q}: What to Know Before You Arrive`;
    case 'stay':
      return `${q}: Staying at Villa Espada`;
    case 'group_occasion':
      return `${q}: The Villa Espada Playbook`;
    case 'golf':
      return `${q}: Playing From Villa Espada`;
    case 'experience':
      return `${q}: What to Do From Villa Espada`;
    case 'dining':
      return `${q}: Dining at Villa Espada and Cap Cana`;
    default:
      return `${q}: What to Know`;
  }
}

function pickSecondary(query: string, cluster: KeywordCluster | null, n = 3): string[] {
  if (!cluster) return [];
  const q = norm(query);
  return cluster.terms.filter((t) => norm(t) !== q).slice(0, n);
}

/** Catch-all cluster for on-target queries that didn't match a specific one. */
const DEFAULT_CLUSTER = KEYWORD_CLUSTERS.find((c) => c.slug === 'stay') ?? KEYWORD_CLUSTERS[0]!;

/**
 * Select ranked, on-target candidates from raw GSC rows. Pure: same input →
 * same output. Caller dedupes against existing topics (overlap router) + inserts.
 */
export function selectOpportunities(rows: GscRow[], opts: SelectOpts = {}): GscCandidate[] {
  const minPosition = opts.minPosition ?? 5;
  const maxPosition = opts.maxPosition ?? 20;
  const minImpressions = opts.minImpressions ?? 30;
  const maxCtr = opts.maxCtr ?? 0.1;
  const limit = opts.limit ?? 12;

  const seen = new Set<string>();
  const acceptedQueries: string[] = [];
  const out: GscCandidate[] = [];

  const ranked = [...rows].sort((a, b) => b.impressions - a.impressions || a.position - b.position);

  for (const r of ranked) {
    const q = norm(r.query);
    if (!q || seen.has(q)) continue;
    if (isNegativeGeo(r.query)) continue;
    if (isSoftAvoid(r.query)) continue;          // golfvilla's lane / low intent — never mint
    if (r.impressions < minImpressions) continue;
    if (r.position < minPosition || r.position > maxPosition) continue;
    if (r.ctr > maxCtr) continue;
    if (!isOnTarget(r.query)) continue;
    // Cannibalization guard: rows are sorted by impressions desc, so the first
    // variant of an intent to arrive is the strongest one — keep it and drop
    // the weaker morphological/word-order/generic-modifier variants.
    if (acceptedQueries.some((prev) => isRedundantIntent(r.query, prev))) continue;

    const cluster = clusterForQuery(r.query) ?? DEFAULT_CLUSTER;
    seen.add(q);
    acceptedQueries.push(r.query);
    out.push({
      query: r.query,
      cluster: cluster.slug,
      primary_keyword: r.query,
      secondary_keywords: pickSecondary(r.query, cluster),
      title: proposeTitle(r.query, cluster),
      metrics: { impressions: r.impressions, position: r.position, ctr: r.ctr, clicks: r.clicks },
      reason: `pos ${r.position.toFixed(1)}, ${r.impressions} impr, ${(r.ctr * 100).toFixed(1)}% CTR → page-2 opportunity in "${cluster.label}"`,
    });
    if (out.length >= limit) break;
  }

  return out;
}
