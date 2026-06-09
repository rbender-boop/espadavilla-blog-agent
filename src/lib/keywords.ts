/**
 * Keyword + GEO/AEO targets for espadavilla.com — built from live GSC data
 * (property sc-domain:espadavilla.com, 90-day window, pulled 2026-06-09).
 *
 * espadavilla is the property's OWN booking site (bottom-of-funnel). The drafter
 * optimizes every post against this set: reinforce the Villa Espada / Punta
 * Espada / Cap Cana entity cluster, capture GUEST-intent head terms (anchored to
 * Cap Cana, never generic), and answer >=2 GEO questions as FAQ. There is NO hard
 * negative-geography guard here (that is golfvilla.com's concern) — the steering
 * rule is "stay on Villa Espada / Cap Cana," enforced softly via keyword-clusters.
 */

import { buildClusterTaxonomyBlock } from './keyword-clusters';

// Tier 1 — GSC-observed, ON-target brand/entity terms → reinforce in most posts.
export const TIER1_ANCHORS = [
  'villa espada',
  'punta espada',
  'casa de campo vs cap cana',
  'eden roc cap cana',
  'juanillo beach',
  'cap cana travel guide',
] as const;

// Tier 2 — guest-intent head terms (GSC-observed) → capture, always anchored to
// Cap Cana / Villa Espada (NOT generic "caribbean golf" — that is golfvilla's lane).
export const TIER2_HEAD_TERMS = [
  'cap cana villa',
  'cap cana villa with chef',
  'large group villa cap cana',
  'private villa cap cana',
  'punta espada golf villa rental',
  'cap cana wedding villa',
] as const;

// GEO/AEO question set — booking-stage / guest intent. Each post answers >=2 as
// clean Q→A FAQ entries (extractable for AI search).
export const GEO_QUESTIONS = [
  "What's included at Villa Espada?",
  'How many guests does Villa Espada sleep?',
  'What golf can I play from Villa Espada?',
  'How far is Villa Espada from Punta Cana airport (PUJ)?',
  'Is Villa Espada all-inclusive?',
  'Does Villa Espada come with a private chef and staff?',
  'What is there to do in Cap Cana beyond golf?',
  'Is Cap Cana or Casa de Campo better for a group stay?',
  'How do you get from PUJ to Cap Cana?',
] as const;

// Canonical entities every post should reference/link so AI engines connect the
// content → espadavilla.com → the #lodging entity (Villa Espada).
export const ENTITY_CLUSTER = [
  'Villa Espada',
  'Punta Espada Golf Course',
  'Cap Cana',
  'Las Iguanas',
  'Eden Roc Beach Club',
] as const;

// NEGATIVE list — INTENTIONALLY EMPTY for espadavilla. The hard
// Portugal/Algarve/Spain/Florida geo guard is golfvilla.com-specific. Here the
// "stay on Villa Espada / Cap Cana" steer is a SOFT advisory (see keyword-clusters
// SOFT_AVOID_TERMS), so checkNegativeList below is a no-op that never holds a draft.
export const NEGATIVE_TERMS = [] as const;

export type TopicKeywords = {
  primary_keyword: string | null;
  secondary_keywords: string[];
  geo_questions: string[];
  cluster?: string | null;
};

/** Drafter-ready keyword/GEO block for a specific topic. */
export function buildKeywordPromptBlock(topic: TopicKeywords): string {
  const primary = topic.primary_keyword ?? '(none assigned — choose an on-target Villa Espada / Cap Cana primary)';
  const secondary = topic.secondary_keywords.length ? topic.secondary_keywords.join(', ') : '(none — pick 2–4 from the anchors/head terms)';
  const geo = (topic.geo_questions.length ? topic.geo_questions : GEO_QUESTIONS.slice(0, 2)).map((q) => `  - ${q}`).join('\n');

  return [
    '# KEYWORD + GEO TARGETING (HARD)',
    `Primary keyword (use in meta_title, h1, and naturally in body): ${primary}`,
    `Secondary keywords (2–4, weave in naturally): ${secondary}`,
    `Reinforce the entity cluster every post: ${ENTITY_CLUSTER.join(', ')}.`,
    `Tier-1 on-target anchors to lean on where they fit: ${TIER1_ANCHORS.join(', ')}.`,
    `Guest-intent head terms to capture (ALWAYS anchored to Cap Cana / Villa Espada, never generic): ${TIER2_HEAD_TERMS.join(', ')}.`,
    '',
    'Answer at least TWO of these GEO questions as clean Q→A FAQ entries (extractable for AI search):',
    geo,
    '',
    'STEERING RULE: keep every post specific to the real Villa Espada experience and Cap Cana (the property, its staff, Punta Espada / Las Iguanas, Eden Roc, Juanillo). Do NOT drift into generic "best Caribbean golf" category content — that is golfvilla.com\u2019s lane and competing for it cannibalizes the sister site. Money links point INWARD to espadavilla.com.',
    '',
    buildClusterTaxonomyBlock(topic.cluster),
  ].join('\n');
}

/**
 * Negative-list guard — NO-OP for espadavilla (kept for engine compatibility:
 * pipeline.ts and verify-offline.ts import this). espadavilla has no hard
 * geo guard; "stay on Cap Cana" steering is advisory only (keyword-clusters
 * SOFT_AVOID_TERMS + checkSoftAvoid). This never flags or holds a draft.
 */
export function checkNegativeList(_parts: {
  meta_title?: string;
  slug?: string;
  h1?: string;
  body?: string;
  keywords?: string[];
}): { flagged: boolean; reason: string | null } {
  return { flagged: false, reason: null };
}
