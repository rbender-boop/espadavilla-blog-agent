/**
 * Villa facts — the SINGLE SOURCE OF TRUTH for golfvilla.com blog grounding.
 *
 * Mirrors CANONICAL-FACTS.md (Villa Espada) verbatim. Per the project grounding
 * rule, villa facts (rates, config, staff, amenities, location, courses) may ONLY
 * come from here — never the model's memory and never the live site (which has
 * drifted in the past; canonical wins).
 *
 * Source of truth: CANONICAL-FACTS.md (GOLFVILLA-WEBSITE project root), mirrored
 * verbatim into this file. When CANONICAL-FACTS.md changes, update this file to
 * match and nothing else.
 * Reconciled 2026-08-16 (per HANDOVER-139, Rob-confirmed): bathrooms = 9 full +
 *   2 half (11 total, not 9.5); pools = two swimming pools (ground-level regular +
 *   rooftop INFINITY on the 2nd-level terrace) + 16-person hot tub — "infinity pool"
 *   IS correct for the rooftop, not a third pool; rates note now carries the explicit
 *   8BR tier ($3,000/$4,500/$8,500) and the 17–22 guest $100/pp/night upcharge;
 *   contact via wa.me/17347556357 (raw number kept out of high-harvest targets).
 */

export const CANONICAL_FACTS = {
  villa: {
    name: 'Villa Espada',
    aka: ['Villa Espada Cap Cana'],
    // Offered as EITHER a 6-bedroom OR 8-bedroom rental (guest's choice, two pricing tiers).
    // NEVER assert "8 bedrooms" as the only configuration. Always note both options unless
    // the content is explicitly and only about one named tier.
    bedroomOptions: [6, 8] as const,
    bathroomsFull: 9,
    bathroomsHalf: 2,
    bathroomsTotal: 11,
    // 22 is the max in EITHER bedroom configuration — Murphy/pull-out beds supply the extra
    // sleeping capacity regardless of tier. NEVER pair a guest-max below 22 with the
    // 6-bedroom tier (e.g. do not say "16 guests").
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
      'two complimentary 6-person golf carts (2 additional 6-person carts available to rent at $75/day per cart, up to 4 total)',
      'the Punta Espada member-guest discounted rate — a reduced green fee exclusive to Villa Espada renters via the villa\'s private arrangement with the course (saves ~$200 per golfer per round vs published guest green fees; Punta Espada ONLY)',
      'access to Las Iguanas, played at regular rates',
    ],
    notAllInclusive: 'NOT all-inclusive: full staff is included in the nightly rate, but food and groceries are billed at cost with no markup.',
    pools: 'Two swimming pools — a ground-level regular pool and an infinity pool on the second-level (rooftop) terrace — plus a 16-person hot tub/jacuzzi. (The rooftop/terrace pool is an infinity pool.)',
    beaches: 'Private access to Eden Roc Beach Club and Juanillo Beach (~8 min by golf cart).',
    airport: '~20-minute private transfer from Punta Cana International Airport (PUJ).',
    policy: 'Check-in 3:00 PM / check-out 11:00 AM. No pets. Payment by credit card or USD wire.',
    booking: 'Direct only at espadavilla.com (no third-party commission). All inquiries via the contact form at https://www.espadavilla.com/contact.',
  },
  rates: {
    low: { usd: 2500, label: 'low', minNights: 4 },
    peak: { usd: 4000, label: 'peak', minNights: 5 },
    holiday: { usd: 7500, usdMax: 8500, label: 'holiday', minNights: 7 },
    note: 'Every nightly rate includes full staff, two golf carts, and the Punta Espada member-guest discounted rate (exclusive to Villa Espada renters via the villa\'s private arrangement; ~$200/golfer/round savings; Punta Espada only, Las Iguanas at regular rates). Holiday/festive rates run $7,500–$8,500 by group size (8-bedroom tier: $3,000 low / $4,500 peak / $8,500 holiday). No 18% DR government tax on the villa rental — not applicable. Base nightly rate covers up to 16 guests; guests 17–22 add $100 per person, per night. F&B billed separately at cost + 15% service.',
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
    villaEspada: 'the private rental villa, offered as EITHER a 6-bedroom OR 8-bedroom configuration (guest\'s choice), sleeping up to 22 guests in either configuration (NOT a hotel or resort)',
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
    `Config: offered as EITHER a ${f.villa.bedroomOptions[0]}-bedroom OR ${f.villa.bedroomOptions[1]}-bedroom rental (guest's choice) — NEVER state "${f.villa.bedroomOptions[1]} bedrooms" as the only option. ${f.villa.bathroomsFull} full + ${f.villa.bathroomsHalf} half bathrooms (${f.villa.bathroomsTotal} total), up to ${f.villa.maxGuests} guests in EITHER configuration (never a lower guest-max for the ${f.villa.bedroomOptions[0]}-bedroom tier), ${f.villa.sqftMin.toLocaleString()}+ sq ft.`,
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
  // Both bedroom tiers are legitimate (6 or 8) — never a bare "8 bedrooms" claim without
  // the 6-bedroom option also being acknowledged somewhere nearby is checked separately below.
  bedrooms: new Set<number>(CANONICAL_FACTS.villa.bedroomOptions),
  // Canonical is "9 full + 2 half baths (11 total)". Accept 11 (total) and the
  // common shorthand rounding to 9.5 (full + half-as-0.5), but NOT bare 9 or 10.
  bathrooms: new Set<number>([CANONICAL_FACTS.villa.bathroomsTotal]),  // 11 only — 9.5 dropped (owner correction 2026-08-16)
  guests: new Set<number>([CANONICAL_FACTS.villa.maxGuests]),
  // Nightly rate figures that may legitimately appear next to "night/nightly"
  // (holiday is a $7,500–$8,500 range by group size).
  rates: new Set<number>([
    CANONICAL_FACTS.rates.low.usd,        // 2500 (6BR low)
    CANONICAL_FACTS.rates.peak.usd,       // 4000 (6BR peak)
    CANONICAL_FACTS.rates.holiday.usd,    // 7500 (6BR holiday)
    CANONICAL_FACTS.rates.holiday.usdMax, // 8500 (8BR holiday)
    3000, // 8BR low
    4500, // 8BR peak
  ]),
};

export function checkVillaFacts(text: string): FactCheckVerdict {
  const violations: string[] = [];
  const t = text.toLowerCase();

  // Bedrooms: "<n> bedroom(s)" / "<n>-bedroom"
  for (const m of t.matchAll(/(\d{1,2})[\s-]?bedroom/g)) {
    const n = Number(m[1]);
    if (!ALLOWED.bedrooms.has(n)) violations.push(`claims ${n} bedrooms (canonical: ${CANONICAL_FACTS.villa.bedroomOptions.join(' or ')})`);
  }
  // Bathrooms: "<n> bathroom(s)" / "<n> bath(s)" / "<n>.5 bath"
  for (const m of t.matchAll(/(\d{1,2}(?:\.5)?)[\s-]?bath(?:room)?/g)) {
    const n = Number(m[1]);
    if (!ALLOWED.bathrooms.has(n)) violations.push(`claims ${n} bathrooms (canonical: 9 full + 2 half, 11 total)`);
  }
  // Occupancy: "up to <n> guests" / "sleeps <n>" / "<n> guests"
  // 16 is the base-rate pricing threshold (guests 17–22 add $100/pp/night) — legit ONLY
  // in explicit upcharge/base-rate context; a bare "sleeps 16" max-capacity claim is still wrong.
  const UPCHARGE_CTX = /upcharge|per[\s-]?person|per[\s-]?head|above 16|base (?:nightly )?rate|covers up to 16|17\s*[–-]\s*22/;
  for (const m of t.matchAll(/(?:up to|sleeps|accommodates|for)\s+(\d{1,3})\s+(?:guests|people|players)/g)) {
    const n = Number(m[1]);
    if (n === CANONICAL_FACTS.villa.maxGuests) continue;
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 60), idx + m[0].length + 60);
    if (n === 16 && UPCHARGE_CTX.test(ctx)) continue; // legit base-rate threshold, not a max-capacity claim
    // Flag ANY other max-occupancy figure that isn't the canonical 22 — figures BELOW 22
    // are as wrong as higher ones; the 22-guest max applies to BOTH bedroom tiers.
    violations.push(`claims occupancy ${n} (canonical: up to ${CANONICAL_FACTS.villa.maxGuests}, applies to both bedroom tiers)`);
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
