/**
 * Keyword CLUSTERS + soft-avoid list — espadavilla.com intent taxonomy
 * (built from sc-domain:espadavilla.com GSC data + the live site, 2026-06-09).
 *
 * ADDITIVE to keywords.ts. keywords.ts holds the GSC-observed brand/entity
 * anchors + guest-intent GEO questions. This file holds the broader *intent*
 * taxonomy so the drafter knows which cluster a topic belongs to and which
 * adjacent terms it can reinforce, plus a SOFT-avoid list that only *steers*
 * the writer (it never hard-flags a draft).
 *
 * espadavilla is bottom-of-funnel: stay/experience/planning intent first,
 * comparisons last. The generic "best Caribbean golf" category is golfvilla.com's
 * lane and is SOFT-avoided here to prevent cannibalizing the sister site.
 */

export type KeywordCluster = {
  slug: string;        // matches blog_topics.cluster where possible
  label: string;
  intent: 'commercial' | 'category' | 'informational';
  terms: readonly string[];
};

export const KEYWORD_CLUSTERS: readonly KeywordCluster[] = [
  {
    slug: 'stay',
    label: 'Staying at Villa Espada',
    intent: 'commercial',
    terms: ['villa espada', "what's included cap cana villa", 'private villa cap cana', 'cap cana villa with chef', 'punta espada golf villa rental', 'where to stay punta espada'],
  },
  {
    slug: 'group_occasion',
    label: 'Group & Occasion',
    intent: 'commercial',
    terms: ['large group villa cap cana', '8 bedroom villa cap cana', 'villa espada wedding', 'cap cana elopement', 'corporate retreat cap cana', 'golf bachelor party cap cana', 'cap cana honeymoon villa'],
  },
  {
    slug: 'golf',
    label: 'Golf at Punta Espada',
    intent: 'informational',
    terms: ['punta espada green fees', 'punta espada tee times', 'punta espada golf course review', 'las iguanas golf course cap cana', 'cap cana golf', 'punta espada golf shuttle'],
  },
  {
    slug: 'experience',
    label: 'Cap Cana Experience',
    intent: 'informational',
    terms: ['juanillo beach', 'eden roc cap cana', 'cap cana marina', 'scape park', 'cap cana water sports', 'equestrian and polo cap cana', 'tennis and padel cap cana'],
  },
  {
    slug: 'dining',
    label: 'Dining & Chef',
    intent: 'informational',
    terms: ['private chef villa', 'cap cana restaurants', 'la palapa cap cana', 'punta espada restaurant eden roc', 'villa dining cap cana'],
  },
  {
    slug: 'logistics',
    label: 'Planning Your Trip',
    intent: 'informational',
    terms: ['getting to cap cana', 'punta cana airport to cap cana', 'how far is cap cana from punta cana', 'dominican republic entry requirements', 'packing list cap cana', 'cap cana weather by month'],
  },
  {
    slug: 'comparison',
    label: 'Comparison',
    intent: 'informational',
    terms: ['cap cana vs casa de campo', 'cap cana vs punta cana', 'cap cana vs bavaro', 'private villa vs all inclusive resort', 'villa espada vs airbnb', 'dominican republic villa vs hotel'],
  },
] as const;

/**
 * SOFT-avoid terms — golfvilla.com's category territory or low booking-intent.
 * Unlike a hard guard, these only STEER the writer away from building a post
 * primarily around them; checkSoftAvoid never flags/holds a draft. An incidental
 * mention (e.g. "Punta Espada also ranks among the Caribbean's best") is fine.
 */
export const SOFT_AVOID_TERMS = [
  'best caribbean golf resorts',
  'best caribbean golf courses',
  'best golf in the caribbean',
  'caribbean golf villas',
  'golf villa rental',
  'luxury golf villa',
  'punta espada membership cost',
  'cap cana real estate',
  'villas for sale',
] as const;

/** Look up the cluster for a blog_topics.cluster slug (or null if unknown). */
export function clusterBySlug(slug: string | null | undefined): KeywordCluster | null {
  if (!slug) return null;
  return KEYWORD_CLUSTERS.find((c) => c.slug === slug) ?? null;
}

/**
 * Compact, drafter-ready taxonomy block. Lists the intent clusters so the writer
 * can reinforce on-cluster adjacent terms and knows what NOT to drift into.
 * Kept short on purpose — the per-topic primary/secondary keywords in
 * buildKeywordPromptBlock remain the main targeting signal.
 */
export function buildClusterTaxonomyBlock(activeClusterSlug?: string | null): string {
  const active = clusterBySlug(activeClusterSlug);
  const lines = KEYWORD_CLUSTERS.map((c) => {
    const mark = active && c.slug === active.slug ? ' (THIS POST\u2019S CLUSTER)' : '';
    return `- ${c.label} [${c.intent}]${mark}: ${c.terms.slice(0, 4).join(', ')}`;
  });
  return [
    '# KEYWORD CLUSTER MAP (intent taxonomy — reinforce on-cluster terms, do not cannibalize other clusters)',
    ...lines,
    '',
    `SOFT AVOID — do NOT build a post primarily around these (golfvilla.com's category lane / low booking intent): ${SOFT_AVOID_TERMS.join(', ')}. An incidental mention is fine; just don\u2019t target them.`,
  ].join('\n');
}

/**
 * Soft-avoid checker — returns matched terms found in the TARGETING surface
 * (title/slug/h1/keywords). Advisory only: callers should log/note, NOT flag.
 */
export function checkSoftAvoid(parts: { meta_title?: string; slug?: string; h1?: string; keywords?: string[] }): { matched: string[] } {
  const hay = [parts.meta_title, parts.slug, parts.h1, ...(parts.keywords ?? [])]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();
  const matched = SOFT_AVOID_TERMS.filter((t) => hay.includes(t));
  return { matched };
}
