/**
 * Villa facts — the SINGLE SOURCE OF TRUTH for golfvilla.com blog grounding.
 *
 * Mirrors CANONICAL-FACTS.md (Villa Espada) verbatim. Per the project grounding
 * rule, villa facts (rates, config, staff, amenities, location, courses) may ONLY
 * come from here — never the model's memory and never the live site (which has
 * drifted in the past; canonical wins).
 *
 * Source of truth: espadavilla.com/property-facts (reconciled 2026-06-09).
 * When that page changes, update this file to match and nothing else.
 * Reconciled 2026-06-09 (per Rob, matched to espadavilla.com/property-facts):
 *   bathrooms 9.5; peak $4,000; holiday $7,500–$8,500; coordinates + staff/included
 *   updated; pools = infinity + rooftop; contact now via wa.me/17347556357 (raw
 *   number removed from all high-harvest targets 2026-06-10, per privacy sweep).
 */

export const CANONICAL_FACTS = {
  villa: {
    name: 'Villa Espada',
    aka: ['Villa Espada Cap Cana'],
    bedrooms: 8,
    bathrooms: 9.5,
    maxGuests: 22,
    sqftMin: 15000, // "15,000+ sq ft"
    location: 'Fairway 5, Punta Espada Golf Course, Cap Cana, Dominican Republic',
    address: 'Cayuco, Cap Cana, Punta Cana, La Altagracia, Dominican Republic',
    coordinates: { lat: 18.46165473258522, lng: -68.41100413285815 },
    distinction: 'Only private rental estate in Cap Cana with a direct fairway address.',
    included: [
      'private executive chef',
      'butler (also the dedicated villa manager)',
      'two maids (daily housekeeping)',
      'private transportation + airport transfers',
      'two 6-person golf carts',
      'club member guest-rate golf at Punta Espada and Las Iguanas',
    ],
    notAllInclusive: 'NOT all-inclusive: full staff is included in the nightly rate, but food and groceries are billed at cost with no markup.',
    pools: 'Infinity pool, rooftop pool, and a 16-person hot tub.',
    beaches: 'Private access to Eden Roc Beach Club and Juanillo Beach (~8 min by golf cart).',
    airport: '~20-minute private transfer from Punta Cana International Airport (PUJ).',
    policy: 'Check-in 3:00 PM / check-out 11:00 AM. No pets. Payment by credit card or USD wire.',
    booking: 'Direct only at espadavilla.com (no third-party commission). Contact rob@espadavilla.com or WhatsApp Rob at https://wa.me/17347556357.',
  },
  rates: {
    low: { usd: 2500, label: 'low', minNights: 3 },
    peak: { usd: 4000, label: 'peak', minNights: 5 },
    holiday: { usd: 7500, usdMax: 8500, label: 'holiday', minNights: 7 },
    note: 'Every nightly rate includes full staff, two golf carts, and club member guest-rate golf. Holiday/festive rates run $7,500–$8,500 by group size. Subject to 18% DR tax + service.',
  },
  golf: {
    puntaEspada:
      'Punta Espada: Jack Nicklaus Signature, par 72, opened 2006. Ranked #1 in the Caribbean and Mexico by GolfWeek; Golf Digest world top 100. Hosted the PGA Champions Tour Cap Cana Championship 2008–2010 (Fred Couples won the 2010 finale). Signature hole: No. 13, a ~250-yard par-3 over the Caribbean Sea.',
    lasIguanas:
      'Las Iguanas: second Nicklaus Signature course at Cap Cana; 18 holes, 3 oceanside holes, 10 inland lakes. ~3 min by golf cart.',
    summary: '36 holes of Nicklaus golf available without leaving Cap Cana.',
    nearby:
      'Nearby: Corales (Tom Fazio, PGA Tour Corales Puntacana Championship), La Cana (P.B. Dye, 27 holes), Teeth of the Dog (Pete Dye, Casa de Campo, ~1 hr west).',
  },
  entities: {
    villaEspada: 'the 8-bedroom private rental villa (NOT a hotel or resort)',
    puntaEspada: 'the Jack Nicklaus Signature course the villa sits on (Fairway 5)',
    lasIguanas: "Cap Cana's second Jack Nicklaus Signature course, ~3 min by golf cart",
    capCana: 'the ~30,000-acre gated luxury resort community containing both courses',
    puntaCana: 'the broader region and the airport (PUJ); Cap Cana is an enclave within it',
  },
  season: 'Peak/dry golf season Dec–Apr aligns with northern US/Canada winter — the core "escape winter" window.',
} as const;

/**
 * Compact, drafter-ready grounding block. Dropped verbatim into the system
 * prompt so every villa fact the model can use is in front of it — and the
 * contract forbids any villa fact NOT in this block.
 */
export function buildFactsPromptBlock(): string {
  const f = CANONICAL_FACTS;
  return [
    '# VILLA FACTS — CANONICAL SOURCE OF TRUTH (the ONLY allowed source for villa facts)',
    `Property: ${f.villa.name} (${f.villa.aka.join(', ')}).`,
    `Config: ${f.villa.bedrooms} en-suite bedrooms, ${f.villa.bathrooms} bathrooms, up to ${f.villa.maxGuests} guests, ${f.villa.sqftMin.toLocaleString()}+ sq ft.`,
    `Location: ${f.villa.location}. ${f.villa.distinction}`,
    `Included every stay: ${f.villa.included.join('; ')}.`,
    `Important: ${f.villa.notAllInclusive}`,
    `Pools: ${f.villa.pools}`,
    `Beaches: ${f.villa.beaches}`,
    `Airport: ${f.villa.airport}`,
    `Policy: ${f.villa.policy}`,
    `Rates (USD/night): low from $${f.rates.low.usd.toLocaleString()} (min ${f.rates.low.minNights} nights); peak from $${f.rates.peak.usd.toLocaleString()} (min ${f.rates.peak.minNights}); holiday $${f.rates.holiday.usd.toLocaleString()}–$${f.rates.holiday.usdMax.toLocaleString()} (min ${f.rates.holiday.minNights}). ${f.rates.note}`,
    `Booking: ${f.villa.booking}`,
    '',
    '# GOLF FACTS (canonical)',
    `- ${f.golf.puntaEspada}`,
    `- ${f.golf.lasIguanas}`,
    `- ${f.golf.summary}`,
    `- ${f.golf.nearby}`,
    '',
    '# ENTITY DEFINITIONS (keep distinct — do not blur)',
    ...Object.entries(f.entities).map(([k, v]) => `- ${k}: ${v}`),
    '',
    `Season: ${f.season}`,
    '',
    'HARD RULE: You may state a villa fact (bedrooms, baths, guests, sq ft, rates, staff, amenities, coordinates, courses) ONLY if it appears above. Never invent or "round" a villa figure. Timely/external facts (tournament dates, tourism stats, weather, sargassum, rankings as of a date) MUST come from a web_search result and be cited in `sources` — never asserted from memory.',
  ].join('\n');
}

/* ============================================================
 * FABRICATION GUARD
 * ============================================================
 * Heuristic backstop: flags a draft that asserts a SPECIFIC villa-spec figure
 * contradicting CANONICAL_FACTS. Conservative by design — it only fires on
 * clear villa-spec contradictions (bedrooms / bathrooms / occupancy / sq ft /
 * nightly rate) so tournament prize money, tourism %, distances, etc. don't
 * trip it. A flagged draft gets risk_score=1.0 + block_reason and stays
 * 'pending' for manual review (never auto-sent).
 */

export type FactCheckVerdict = { flagged: boolean; reason: string | null };

const ALLOWED = {
  bedrooms: new Set<number>([CANONICAL_FACTS.villa.bedrooms]),
  // Canonical is "9.5 bathrooms"; accept 9.5 and the common rounding to 9.
  bathrooms: new Set<number>([CANONICAL_FACTS.villa.bathrooms, 9]),
  guests: new Set<number>([CANONICAL_FACTS.villa.maxGuests]),
  // Nightly rate figures that may legitimately appear next to "night/nightly"
  // (holiday is a $7,500–$8,500 range by group size).
  rates: new Set<number>([
    CANONICAL_FACTS.rates.low.usd,
    CANONICAL_FACTS.rates.peak.usd,
    CANONICAL_FACTS.rates.holiday.usd,
    CANONICAL_FACTS.rates.holiday.usdMax,
  ]),
};

export function checkVillaFacts(text: string): FactCheckVerdict {
  const violations: string[] = [];
  const t = text.toLowerCase();

  // Bedrooms: "<n> bedroom(s)" / "<n>-bedroom"
  for (const m of t.matchAll(/(\d{1,2})[\s-]?bedroom/g)) {
    const n = Number(m[1]);
    if (!ALLOWED.bedrooms.has(n)) violations.push(`claims ${n} bedrooms (canonical: ${CANONICAL_FACTS.villa.bedrooms})`);
  }
  // Bathrooms: "<n> bathroom(s)" / "<n> bath(s)" / "<n>.5 bath"
  for (const m of t.matchAll(/(\d{1,2}(?:\.5)?)[\s-]?bath(?:room)?/g)) {
    const n = Number(m[1]);
    if (!ALLOWED.bathrooms.has(n)) violations.push(`claims ${n} bathrooms (canonical: 9.5)`);
  }
  // Occupancy: "up to <n> guests" / "sleeps <n>" / "<n> guests"
  for (const m of t.matchAll(/(?:up to|sleeps|accommodates|for)\s+(\d{1,3})\s+(?:guests|people|players)/g)) {
    const n = Number(m[1]);
    // Only flag if it's clearly a max-occupancy claim above the canonical max.
    if (n > CANONICAL_FACTS.villa.maxGuests) violations.push(`claims occupancy ${n} (canonical max: ${CANONICAL_FACTS.villa.maxGuests})`);
  }
  // Square footage: "<n,nnn> sq ft" / "square feet" / "square-foot"
  for (const m of t.matchAll(/([\d,]{3,7})\+?\s*(?:sq\.?\s?ft|square[\s-]?f(?:ee|oo)t)/g)) {
    const n = Number((m[1] ?? '').replace(/,/g, ''));
    // Canonical is "15,000+". Flag only if a DIFFERENT specific value is asserted.
    if (Number.isFinite(n) && n !== CANONICAL_FACTS.villa.sqftMin) {
      violations.push(`claims ${n.toLocaleString()} sq ft (canonical: ${CANONICAL_FACTS.villa.sqftMin.toLocaleString()}+)`);
    }
  }
  // Nightly rate: a "$X,XXX" within ~20 chars of "night"/"nightly".
  // The guard polices Villa Espada's OWN rate only — NOT market-comparison prices
  // (resort/hotel/room/suite figures), which are legitimate in comparison posts.
  const COMPARISON_CTX = /resort|hotel|motel|\broom\b|\brooms\b|suite|airbnb|vrbo|\bcondo|comparable|competitor|elsewhere|per\s+room/;
  for (const m of t.matchAll(/\$\s?([\d,]{3,6})\s*(?:\/|per\s+)?\s*(?:a\s+)?nigh?t|night(?:ly)?\s*(?:rate)?\s*(?:from|of|is|:)?\s*\$\s?([\d,]{3,6})/g)) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(n) || n < 500 || ALLOWED.rates.has(n)) continue;
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 60), idx + m[0].length + 60);
    if (COMPARISON_CTX.test(ctx)) continue; // competitor/market price, not a villa-rate claim
    violations.push(`claims nightly rate $${n.toLocaleString()} (canonical: $${CANONICAL_FACTS.rates.low.usd.toLocaleString()} low / $${CANONICAL_FACTS.rates.peak.usd.toLocaleString()} peak / $${CANONICAL_FACTS.rates.holiday.usd.toLocaleString()}–$${CANONICAL_FACTS.rates.holiday.usdMax.toLocaleString()} holiday)`);
  }

  if (violations.length === 0) return { flagged: false, reason: null };
  return { flagged: true, reason: `Villa-fact contradiction vs CANONICAL-FACTS.md — ${violations.slice(0, 5).join('; ')}` };
}
