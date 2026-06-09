/**
 * Intent-overlap ROUTER (pure, no DB) — Phase 2.
 *
 * Scores a candidate topic against already-PUBLISHED posts and decides how the
 * new post should relate to what already exists. The guiding principle: keyword
 * and entity overlap is GOOD (it builds topical authority + GEO entity signal)
 * and is never penalized. Only a post that does the SAME JOB as an existing one
 * (same primary intent AND a near-identical angle) is a problem.
 *
 *   'none'    → nothing close; just link to the cluster pillar.
 *   'cluster' → same cluster / shared head term, DIFFERENT angle → proceed, link
 *               the pillar + a sibling, and inject "differentiate the angle,
 *               repeat the entity" guidance. (The common, desirable case.)
 *   'high'    → same primary intent AND high title-angle similarity → still draft
 *               it, but raise the existing guard flag so the approval message
 *               suggests refreshing the existing post instead. Never strands.
 *
 * Angle similarity deliberately STRIPS the ubiquitous entity vocabulary (Cap
 * Cana, Punta Espada, golf, villa, luxury, caribbean…) before comparing, so two
 * posts that merely share the entity cluster do NOT look like duplicates — only
 * ones that share the distinctive "job" words (resort, bachelor, green fees,
 * 8-bedroom, casa de campo…) do.
 */

import { MONEY_PAGES, postUrl } from '../links';
import { clusterBySlug } from '../keyword-clusters';

export type OverlapLevel = 'none' | 'cluster' | 'high';

export type PublishedPost = { slug: string; title: string; cluster: string | null; primary_keyword: string | null };
export type CandidateTopic = { title: string; cluster: string | null; primary_keyword: string | null };

export type OverlapResult = {
  level: OverlapLevel;
  matched: { slug: string; title: string } | null;
  siblingLinks: Array<{ anchor: string; url: string }>;
  pillarHint: string | null;
  guidance: string[];
};

/** ESPADAVILLA cluster slug (keyword-clusters.ts taxonomy) → MONEY_PAGES hint
 *  that acts as the pillar/hub page for the cluster. Every value here MUST be a
 *  real key of MONEY_PAGES (links.ts) or the pillar link is silently dropped. */
const PILLAR_BY_CLUSTER: Record<string, string> = {
  stay:           'villa',                        // Staying at Villa Espada → /villa
  group_occasion: 'villa',                        // Group & Occasion → /villa
  golf:           'golf',                         // Golf at Punta Espada → /golf
  experience:     'experiences',                  // Cap Cana Experience → /experiences
  dining:         'amenities',                    // Dining & Chef → /amenities
  logistics:      'faq',                          // Planning Your Trip → /faq
  comparison:     'cap-cana-vs-casa-de-campo',    // Comparison → /compare/...
};

export function pillarForCluster(slug: string | null | undefined): string {
  if (!slug) return 'villa';
  return PILLAR_BY_CLUSTER[slug] ?? 'villa';
}

/* ----------------------------------------------------------------
 * Tokenization for ANGLE similarity
 * ---------------------------------------------------------------- */

// Ubiquitous entity / category vocabulary — these SHOULD repeat across posts, so
// they are stripped before measuring how similar two posts' angles are.
const ENTITY_STOP = new Set([
  'cap', 'cana', 'punta', 'espada', 'golf', 'villa', 'villas', 'caribbean',
  'luxury', 'dominican', 'republic', 'las', 'iguanas', 'eden', 'roc', 'juanillo',
  'cana,', 'cap-cana',
]);

// Generic English function/filler words.
const FUNC_STOP = new Set([
  'the', 'a', 'an', 'for', 'and', 'or', 'vs', 'to', 'of', 'your', 'you', 'what',
  'should', 'know', 'why', 'is', 'are', 'in', 'on', 'with', 'how', 'this', 'that',
  'which', 'best', 'guide', 'before', 'getting', 'more', 'heres', 'here', 's',
  'whats', 'it', 'means', 'be', 'into', 'about', 'than', 'over', 'who',
]);

function norm(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Distinctive ("job") tokens of a title — entity + function words removed, lightly singularized. */
function distinctiveTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const raw of norm(title).split(' ')) {
    if (!raw || raw.length < 2) continue;
    if (ENTITY_STOP.has(raw) || FUNC_STOP.has(raw)) continue;
    out.add(singularize(raw));
  }
  return out;
}

// Light singularization so blocks/block, groups/group, resorts/resort collapse.
function singularize(tok: string): string {
  if (tok.length > 3 && tok.endsWith('s') && !tok.endsWith('ss')) return tok.slice(0, -1);
  return tok;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** A primary keyword that has a published post counts as a "shared head term". */
function normPrimary(s: string | null | undefined): string {
  return norm(s);
}

// Same primary intent AND this much distinctive-token overlap ⇒ same job ⇒ 'high'.
const HIGH_ANGLE_SIM = 0.4;
const MAX_SIBLINGS = 2;

/* ----------------------------------------------------------------
 * The router
 * ---------------------------------------------------------------- */

export function scoreOverlap(candidate: CandidateTopic, published: PublishedPost[]): OverlapResult {
  const candPrimary = normPrimary(candidate.primary_keyword);
  const candTokens = distinctiveTokens(candidate.title);

  // 'high': a published post shares the primary intent AND a near-identical angle.
  let matched: { slug: string; title: string } | null = null;
  for (const p of published) {
    if (!candPrimary || normPrimary(p.primary_keyword) !== candPrimary) continue;
    if (jaccard(candTokens, distinctiveTokens(p.title)) >= HIGH_ANGLE_SIM) {
      matched = { slug: p.slug, title: p.title };
      break;
    }
  }

  // Siblings to link UP to: same-cluster published posts (fallback: shared head term).
  const sameCluster = published.filter(
    (p) => p.cluster && candidate.cluster && p.cluster === candidate.cluster,
  );
  const sharedPrimaryPosts = candPrimary
    ? published.filter((p) => normPrimary(p.primary_keyword) === candPrimary)
    : [];
  const sibPool = sameCluster.length ? sameCluster : sharedPrimaryPosts;
  const siblingLinks = sibPool
    .slice(0, MAX_SIBLINGS)
    .map((p) => ({ anchor: p.title, url: postUrl(p.slug) }));

  const pillarHint = pillarForCluster(candidate.cluster);
  const level: OverlapLevel = matched
    ? 'high'
    : sameCluster.length > 0 || sharedPrimaryPosts.length > 0
      ? 'cluster'
      : 'none';

  return { level, matched, siblingLinks, pillarHint, guidance: buildGuidance(candidate, level, matched, siblingLinks, pillarHint) };
}

function buildGuidance(
  candidate: CandidateTopic,
  level: OverlapLevel,
  matched: { slug: string; title: string } | null,
  siblings: Array<{ anchor: string; url: string }>,
  pillarHint: string | null,
): string[] {
  const clusterLabel = clusterBySlug(candidate.cluster)?.label ?? candidate.cluster ?? 'general';
  const pillarUrl = pillarHint ? MONEY_PAGES[pillarHint]?.url ?? null : null;
  const lines: string[] = [];

  lines.push(
    `This post belongs to the "${clusterLabel}" content cluster.` +
      (pillarUrl ? ` Link UP to its pillar page (${pillarUrl}) with natural anchor text.` : ''),
  );
  lines.push(
    'Repeating shared entity terms (Cap Cana, Punta Espada, luxury golf villas, etc.) across posts is INTENDED — it builds topical authority and AI-engine entity signal. Differentiate the ANGLE, never the vocabulary.',
  );

  if (siblings.length) {
    const sibList = siblings.map((s) => `"${s.anchor}" (${s.url})`).join('; ');
    lines.push(
      `Already-published posts in this cluster: ${sibList}. Link to at least one where it fits, and take a DISTINCT angle here — differentiate by group type, group size, season, logistics, budget, or comparison as the topic allows. Do not restate a sibling's thesis.`,
    );
  }

  if (level === 'high' && matched) {
    lines.push(
      `\u26a0\ufe0f INTENT OVERLAP: this topic's core job closely matches the PUBLISHED post "${matched.title}" (${postUrl(matched.slug)}). Commit to a clearly different angle, or treat this as a REFRESH of that post. If you cannot meaningfully differentiate, say so plainly in "rationale".`,
    );
  }

  return lines;
}
