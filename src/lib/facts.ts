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
    notAllInclusive: 'NOT all-inclusive: full staff is included in the nightly rate, but food and groceries are billed at cost plus a 15% service charge, with no restaurant markup.',
    pools: 'Two swimming pools — a ground-level regular pool and an infinity pool on the second-level (rooftop) terrace — plus a 16-person hot tub/jacuzzi. (The rooftop/terrace pool is an infinity pool.)',
    beaches: 'Private access to Eden Roc Beach Club and Juanillo Beach (~8 min by golf cart).',
    airport: '~20-minute private transfer from Punta Cana International Airport (PUJ).',
    policy: 'Check-in 3:00 PM / check-out 11:00 AM. Dogs are welcome. Payment by credit card or USD wire.',
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
      'Punta Espada: Jack Nicklaus Signature, par 72, opened 2006. Ranked #1 in the Caribbean and Mexico by GolfWeek for eight consecutive years; Golf Digest world top 100. Hosted the PGA Champions Tour Cap Cana Championship 2008–2010 (Fred Couples won the 2010 finale). Signature hole: No. 13, a ~250-yard par-3 over the Caribbean Sea.',
    lasIguanas:
      'Las Iguanas: second Nicklaus Signature course at Cap Cana. Front nine open now; the back nine (including the oceanside holes 12-14) is still under construction, with the full 18 completing by the end of 2026 and the official opening in spring 2027. Designed as 18 holes with 3 oceanside holes and 10 inland lakes; ~3 min by golf cart. NEVER state it opened as a full 18 in November 2025, that it is "now open" / "brand-new," or that the oceanside holes are currently playable.',
    summary: 'Two Jack Nicklaus Signature courses inside Cap Cana: Punta Espada (open) and Las Iguanas (front nine open now; full 18 by the end of 2026). "36 holes" is accurate only once Las Iguanas completes; phrase as "two Nicklaus courses," never "36 holes available now."',
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
    `HARD RULE — OCCUPANCY CEILING: ${f.villa.name} sleeps a MAXIMUM of ${f.villa.maxGuests} guests in EITHER bedroom tier. Never state or imply a number greater than ${f.villa.maxGuests} for guests, group size, party size, catering headcount, or golf-cart capacity — e.g. do NOT write "for 24 people" or "capacity for 24 across four carts". Example group sizes must be ≤ ${f.villa.maxGuests}; when in doubt, phrase as "up to ${f.villa.maxGuests} guests".`,
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
  // Occupancy CLAIMS vs group-size EXAMPLES are different things and are checked separately.
  //
  // (a) MAX-CAPACITY claims — "up to / sleeps / accommodates / hosts N guests" assert the
  //     ceiling, so they must equal the canonical 22 (a figure BELOW 22 is as wrong as one
  //     above — the 22-guest max applies to BOTH bedroom tiers). 16 is allowed ONLY as the
  //     base-rate pricing threshold in explicit upcharge context (guests 17–22 add $100/pp/night).
  const UPCHARGE_CTX = /upcharge|per[\s-]?person|per[\s-]?head|above 16|base (?:nightly )?rate|covers up to 16|17\s*[–-]\s*22/;
  for (const m of t.matchAll(/(?:up to|sleeps|accommodates|hosts|sleeping)\s+(\d{1,3})\s+(?:guests|people|players)/g)) {
    const n = Number(m[1]);
    if (n === CANONICAL_FACTS.villa.maxGuests) continue;
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 60), idx + m[0].length + 60);
    if (n === 16 && UPCHARGE_CTX.test(ctx)) continue; // legit base-rate threshold, not a max-capacity claim
    violations.push(`claims occupancy ${n} (canonical: up to ${CANONICAL_FACTS.villa.maxGuests}, applies to both bedroom tiers)`);
  }
  // (b) GROUP-SIZE / catering / cart-capacity examples — "for N guests/people/players": a group
  //     of N is legitimate as long as it does not exceed the max (you can host a party of ≤22).
  //     Flag ONLY when N EXCEEDS the max — i.e. the copy implies hosting more than the villa
  //     allows. This is what previously false-flagged correct copy such as "food and beverage
  //     for 20 people" and "capacity for 24 people across four carts" (the 24 IS a real overclaim;
  //     the 20 is not). Anything ≤22 in a "for N" context is a valid example, not a fact violation.
  for (const m of t.matchAll(/for\s+(\d{1,3})\s+(?:guests|people|players)/g)) {
    const n = Number(m[1]);
    if (n > CANONICAL_FACTS.villa.maxGuests) {
      violations.push(`implies hosting ${n} (exceeds max occupancy of ${CANONICAL_FACTS.villa.maxGuests})`);
    }
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

  // Food-billing canonical check (added 2026-08-22):
  // Canonical: "at cost plus a 15% service charge, with no restaurant markup"
  // These banned phrases indicate the old wrong wording crept back in.
  const BAD_FOOD_PHRASES = [
    'at cost with no markup',
    'at cost with zero markup',
    'at cost, no markup',
    'at cost (no markup)',
    'no markup, no mystery charges',
    'all meals at cost, no markup',
    'purchased at cost with no markup',
  ];
  for (const phrase of BAD_FOOD_PHRASES) {
    if (t.includes(phrase)) {
      violations.push(`banned food-billing phrase "${phrase}" — use "at cost plus a 15% service charge, with no restaurant markup" instead`);
    }
  }
  // Also catch bare "food billed at cost" or "billed at cost" (food context) without the 15%
  if (/(?:food|groceries|f&b|meals|beverage)[\w\s,]+billed at cost(?! plus a 15)/.test(t)) {
    violations.push('food billed at cost without 15% service charge — use canonical phrasing');
  }

  // Golf-fact canonical checks (added 2026-08-26): Las Iguanas is a phased opening —
  // front nine open now, full 18 (incl. oceanside holes 12–14) by end of 2026, official
  // opening spring 2027. Punta Espada's GolfWeek #1 must be bound to "eight consecutive years".
  const BAD_GOLF_PHRASES = [
    '36 holes of nicklaus golf available',
    '36 holes available without leaving',
    '36 holes of golf without leaving',
    '36 holes of nicklaus golf without leaving',
  ];
  for (const phrase of BAD_GOLF_PHRASES) {
    if (t.includes(phrase)) {
      violations.push(`banned golf phrase "${phrase}" — Las Iguanas is phased (front nine open; full 18 by end 2026); use "two Nicklaus courses"`);
    }
  }
  // Las Iguanas open-status overstatement (co-occurrence within ~200 chars of "las iguanas")
  const liIdx = t.indexOf('las iguanas');
  if (liIdx !== -1) {
    for (const b of ['now open', 'opened in november 2025', 'opened november 2025', 'fully open', 'brand-new', 'brand new', 'grand opening']) {
      const bi = t.indexOf(b);
      if (bi !== -1 && Math.abs(bi - liIdx) < 200) {
        violations.push(`Las Iguanas overstatement "${b}" — front nine open now; full 18 by end 2026, official opening spring 2027`);
        break;
      }
    }
  }
  // Punta Espada GolfWeek #1 must be time-bound
  if (/(?:#1|number[\s-]?one)[^.<\n]{0,45}(?:caribbean|mexico)/.test(t) && !/(consecutive years|straight years|years running|for eight years|eight consecutive)/.test(t)) {
    violations.push('GolfWeek #1 Caribbean/Mexico claim not bound to "for eight consecutive years"');
  }
  // "36 holes of Nicklaus golf" stated as currently available (phased: front nine only)
  for (const m of t.matchAll(/36[\s-]?holes?\s+of\s+(?:jack\s+)?nicklaus[^.]{0,90}/g)) {
    if (!/once|by (?:the )?end|completes?|complet(?:e|ing)|two nicklaus courses/.test(m[0])) {
      violations.push('claims "36 holes of Nicklaus golf" as currently available — Las Iguanas is phased; use "two Nicklaus courses"');
      break;
    }
  }

  if (violations.length === 0) return { flagged: false, reason: null };
  return { flagged: true, reason: `Villa-fact contradiction vs CANONICAL-FACTS.md — ${violations.slice(0, 5).join('; ')}` };
}
