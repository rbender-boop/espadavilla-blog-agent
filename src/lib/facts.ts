/**
 * Villa facts — the SINGLE SOURCE OF TRUTH for espadavilla.com blog grounding.
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
    // CAPACITY (OWNER-CONFIRMED 2026-08-29, supersedes the retired "22 in either configuration" rule):
    // the 6-bedroom configuration sleeps UP TO 16 guests; the full 8-bedroom estate sleeps UP TO 22.
    // Never claim 22 for the 6-bedroom tier. Unqualified "up to 22" is acceptable ONLY for the
    // property / 8-bedroom maximum. The 17-22 guest upcharge ($100/pp/night) exists only in the 8-bedroom estate.
    maxGuests: 22,
    maxGuestsByTier: { 6: 16, 8: 22 } as const,
    sqftMin: 15000, // "15,000+ sq ft"
    location: 'Fairway 5, Punta Espada Golf Course, Cap Cana, Dominican Republic',
    address: 'Cayuco, Cap Cana, Punta Cana, La Altagracia, Dominican Republic',
    coordinates: { lat: 18.46165473258522, lng: -68.41100413285815 },
    distinction: 'Only private rental estate in Cap Cana with a direct fairway address.',
    distances: 'Punta Espada clubhouse is about 3 minutes by golf cart from the villa (never "steps away", "90 seconds", or "2 minutes"); the Las Iguanas clubhouse is about 2 minutes by golf cart.',
    included: [
      'private executive chef',
      'butler (also the dedicated villa manager)',
      'two maids (daily housekeeping)',
      'private transportation + airport transfers',
      'two complimentary 6-person golf carts (2 additional 6-person carts available to rent at $75/day per cart, up to 4 total)',
      'the Punta Espada member-guest discounted rate — a reduced green fee exclusive to Villa Espada renters, arranged through the villa\'s butler via the villa\'s private arrangement with the course (saves ~$200 per golfer per round vs published guest green fees; Punta Espada ONLY — always state that it is arranged through the villa\'s butler)',
      'access to Las Iguanas, played at regular rates',
    ],
    notAllInclusive: 'NOT all-inclusive: full staff is included in the nightly rate, but food and groceries are billed at cost plus a 15% service charge, with no restaurant markup.',
    pools: 'Two swimming pools — a ground-level regular pool and an infinity pool on the second-level (rooftop) terrace — plus a 16-person hot tub/jacuzzi. (The rooftop/terrace pool is an infinity pool.)',
    beaches: 'Complimentary access to the Eden Roc Beach Club (not available Christmas, New Year, and Easter; other dates subject to availability) — ALWAYS keep the blackout caveat attached; never state unqualified/unlimited access. Food, beverages, and gratuities at the club are paid directly. Juanillo Beach is ~8 min by golf cart. El Dorado Water Park is nearby with tickets purchased separately (never "included").',
    amenities: [
      'private in-house spa, FREE for all guests to use, with two massage beds and indoor + outdoor showers',
      'a TWO-PERSON INFRARED sauna (never "steam sauna" or "four-person")',
      'two certified in-house masseuses, available daily, $60 per hour, per person — booked through the villa as an add-on (NEVER "included"); a fraction of the $300 or more per hour typical at resort spas',
      'large smart TVs in every bedroom and every living space',
      'whole-house and outdoor Sonos sound system',
      'private putting green on the villa property; indoor game room (board and card games only); outdoor games area with outdoor ping pong, outdoor full-size pool table, cornhole, giant chess, giant Connect Four, and lawn darts; kids\' pool games and a pool basketball hoop; two hammocks',
    ],
    airport: '~20-minute private transfer from Punta Cana International Airport (PUJ).',
    policy: 'Check-in 3:00 PM / check-out 11:00 AM. Dogs are welcome. Payment by credit card or USD wire.',
    booking: 'Direct only at espadavilla.com (no third-party commission). All inquiries via the contact form at https://www.espadavilla.com/contact.',
  },
  rates: {
    low: { usd: 2500, label: 'low', minNights: 4 },
    peak: { usd: 4000, label: 'peak', minNights: 5 },
    holiday: { usd: 7500, usdMax: 8500, label: 'holiday', minNights: 7 },
    note: 'Every nightly rate includes full staff, two golf carts, and the Punta Espada member-guest discounted rate (exclusive to Villa Espada renters, arranged through the villa\'s butler via the villa\'s private arrangement; ~$200/golfer/round savings; Punta Espada only, Las Iguanas at regular rates). Holiday/festive rates run $7,500–$8,500 by group size (8-bedroom tier: $3,000 low / $4,500 peak / $8,500 holiday). No 18% DR government tax on the villa rental — not applicable. Base nightly rate covers up to 16 guests; guests 17–22 add $100 per person, per night. F&B billed separately at cost + 15% service.',
  },
  golf: {
    puntaEspada:
      'Punta Espada: Jack Nicklaus Signature, par 72, opened 2006. Ranked #1 in the Caribbean and Mexico by GolfWeek for eight consecutive years; #57 on Golf Digest\'s World\'s 100 Greatest 2026-27 (always cite publication + edition; never a bare present-tense #1; never mix GolfWeek/Golf Digest lists). Hosted the PGA Champions Tour Cap Cana Championship 2008–2010 (Fred Couples won the 2010 finale). Signature hole: No. 13, a ~250-yard par-3 over the Caribbean Sea.',
    lasIguanas:
      'Las Iguanas: second Nicklaus Signature course at Cap Cana. Front nine open now; the back nine (including the oceanside holes 12-14) is still under construction, with the full 18 completing by the end of 2026 and the official opening in spring 2027. Designed as 18 holes with 3 oceanside holes and 10 inland lakes; ~2 min by golf cart to its clubhouse. NEVER state it opened as a full 18 in November 2025, that it is "now open" / "brand-new," or that the oceanside holes are currently playable.',
    summary: 'Two Jack Nicklaus Signature courses inside Cap Cana: Punta Espada (open) and Las Iguanas (front nine open now; full 18 by the end of 2026). "36 holes" is accurate only once Las Iguanas completes; phrase as "two Nicklaus courses," never "36 holes available now."',
    nearby:
      'Nearby: Corales (Tom Fazio, PGA Tour Corales Puntacana Championship), La Cana (P.B. Dye, 27 holes), Teeth of the Dog (Pete Dye, Casa de Campo, ~1 hr west).',
  },
  entities: {
    villaEspada: 'the private rental villa, offered as EITHER a 6-bedroom OR 8-bedroom configuration (guest\'s choice), sleeping up to 16 guests as a 6-bedroom and up to 22 guests as the full 8-bedroom estate (NOT a hotel or resort)',
    puntaEspada: 'the Jack Nicklaus Signature course the villa sits on (Fairway 5)',
    lasIguanas: "Cap Cana's second Jack Nicklaus Signature course, ~2 min by golf cart to its clubhouse",
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
    `Config: offered as EITHER a ${f.villa.bedroomOptions[0]}-bedroom OR ${f.villa.bedroomOptions[1]}-bedroom rental (guest's choice) — NEVER state "${f.villa.bedroomOptions[1]} bedrooms" as the only option. ${f.villa.bathroomsFull} full + ${f.villa.bathroomsHalf} half bathrooms (${f.villa.bathroomsTotal} total), up to ${f.villa.maxGuestsByTier[6]} guests as a 6-bedroom and up to ${f.villa.maxGuestsByTier[8]} as the full 8-bedroom estate (never claim 22 for the 6-bedroom tier; unqualified "up to 22" only for the property/8-bedroom maximum), ${f.villa.sqftMin.toLocaleString()}+ sq ft.`,
    `Location: ${f.villa.location}. ${f.villa.distinction}`,
    `Distances: ${f.villa.distances}`,
    `Included every stay: ${f.villa.included.join('; ')}.`,
    `Important: ${f.villa.notAllInclusive}`,
    `Pools: ${f.villa.pools}`,
    `Amenities: ${f.villa.amenities.join('; ')}.`,
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
    `HARD RULE — OCCUPANCY CEILING: ${f.villa.name} sleeps a MAXIMUM of ${f.villa.maxGuests} guests (full 8-bedroom estate); the 6-bedroom configuration sleeps a maximum of ${f.villa.maxGuestsByTier[6]}. Never write "22 in either configuration", "both configurations sleep 22", or any phrasing that gives the 6-bedroom tier 22. Never state or imply a number greater than ${f.villa.maxGuests} for guests, group size, party size, catering headcount, or golf-cart capacity — e.g. do NOT write "for 24 people" or "capacity for 24 across four carts". Example group sizes must be ≤ ${f.villa.maxGuests}; when in doubt, phrase as "up to ${f.villa.maxGuests} guests".`,
    'HARD RULE: You may state a villa fact (bedrooms, baths, guests, sq ft, rates, staff, amenities, coordinates, courses) ONLY if it appears above. Never invent or "round" a villa figure. Timely/external facts (tournament dates, tourism stats, weather, sargassum, rankings as of a date) MUST come from a web_search result and be cited in `sources` — never asserted from memory.',
    '',
    '# FAQ / META / SUMMARY BINDING (HARD — added 2026-09-03)',
    '- The `faq` array (every q AND every a), `meta_title`, `meta_description`, `summary`, and `h1` are bound to the VILLA FACTS and GOLF FACTS above EXACTLY like body_markdown. The same guard scans each of these fields separately and names the field it fails in.',
    '- CANONICAL-ONLY: if a villa or golf fact is not in the blocks above, a FAQ answer OMITS it rather than filling the gap from general knowledge.',
    '- GolfWeek: every #1 claim reads "#1 in the Caribbean and Mexico by GolfWeek for eight consecutive years" — the binding in the SAME sentence as the claim. Never an unbound "#1", never "top-10 world-ranked" or any "top-N in the world" phrasing, never Golf Digest or Golf Magazine as the #1 source. Golf Digest appears only as "#57 on Golf Digest\'s World\'s 100 Greatest 2026-27".',
    '- Member-guest rate: always described as arranged through the villa\'s butler (the body and the FAQ must each say so at least once when they mention it); Punta Espada ONLY; Las Iguanas is played at regular rates; never "reserved for Cap Cana property owners".',
    '- Rates: only $2,500 low / $4,000 peak / $7,500–$8,500 holiday (8-bedroom tier $3,000 / $4,500 / $8,500) plus the $100 per person, per night upcharge for guests 17–22. Never a composite or blended "nightly rate" such as $4,400 or $4,600.',
    '- Bedrooms: "6-or-8 bedroom" (or "6 or 8 bedrooms") — never "8-bedroom" alone in a FAQ answer, title, or description without the 6-bedroom option in the same field. 6-bedroom sleeps up to 16; full 8-bedroom estate up to 22 — never "22 guests in either configuration".',
    '- Water: the Caribbean Sea — never the Atlantic. Punta Espada has 8 ocean holes (never 9).',
    '- Food: "at cost plus a 15% service charge, with no restaurant markup" — this exact phrase, in FAQ answers too.',
    '',
    '# PRESS & COVERAGE RULES (HARD)',
    '- Villa Espada distributes its OWN press releases via GlobeNewswire; news sites (AP, Yahoo Finance, Benzinga, Business Insider Markets, Apple News, local TV station sites) REPUBLISH them as wire copy. That is not editorial coverage.',
    '- Never write announcement-style posts ("Villa Espada announces...", "in the news", "press release"). Never say Villa Espada was "featured in", "covered by", or "as seen in" any outlet. Never cite audience/reach figures (e.g. 788M, 834 outlets).',
    '- If coverage is genuinely relevant, link ONCE to https://www.espadavilla.com/press and move on. Never link to GlobeNewswire or any republished copy.',
    '- Wire copy is never a source for villa facts. Villa facts come ONLY from the VILLA FACTS block above, even if hundreds of news pages say otherwise.',
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

/** One text surface each; array values (the FAQ) are checked item-by-item. */
export type FactFieldInput = Record<string, string | string[] | null | undefined>;

/** Back-compat whole-text verdict (no field tags). Prefer checkVillaFactsByField. */
export function checkVillaFacts(text: string): FactCheckVerdict {
  const violations = collectViolations(String(text ?? ''));
  if (violations.length === 0) return { flagged: false, reason: null };
  return { flagged: true, reason: `Villa-fact contradiction vs CANONICAL-FACTS.md — ${violations.slice(0, 5).join('; ')}` };
}

/**
 * Field-aware verdict (added 2026-09-03 after golfvilla draft 8e81fb32 shipped a
 * FAQ answer with an unbound GolfWeek claim and member-rate answers missing the
 * butler binding). Each field is scanned INDEPENDENTLY so a binding satisfied in
 * the body ("eight consecutive years") can never excuse an unbound claim in a
 * FAQ answer or meta field, and every violation names the field it was found in
 * — e.g. "[faq[2]] GolfWeek #1 ... not bound". Array values (the FAQ) are checked
 * per item (tagged faq[i]); the two FIELD-LEVEL bindings (8-bedroom-alone, the
 * member-rate → butler binding) run once on the joined array so a FAQ set can
 * satisfy them anywhere within it (Rob, 2026-09-03). The butler binding is
 * enforced on body_markdown and faq only.
 */
export function checkVillaFactsByField(fields: FactFieldInput): FactCheckVerdict {
  const violations: string[] = [];
  for (const [name, value] of Object.entries(fields)) {
    if (value == null) continue;
    // Butler binding applies to body_markdown and the FAQ only (Rob, 2026-09-03);
    // meta_title/meta_description/summary/h1 are too short to carry the clause.
    const fieldOpts = { skipButler: !(name === 'body_markdown' || name === 'faq') };
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        for (const v of collectViolations(String(item ?? ''), { skipFieldLevel: true })) violations.push(`[${name}[${i}]] ${v}`);
      });
      for (const v of collectFieldLevelViolations(value.map((x) => String(x ?? '')).join('\n').toLowerCase(), fieldOpts)) violations.push(`[${name}] ${v}`);
    } else {
      for (const v of collectViolations(String(value), fieldOpts)) violations.push(`[${name}] ${v}`);
    }
  }
  if (violations.length === 0) return { flagged: false, reason: null };
  return { flagged: true, reason: `Villa-fact contradiction vs CANONICAL-FACTS.md — ${violations.slice(0, 8).join('; ')}` };
}

// Any phrasing of the Punta Espada member-guest discounted rate (all legacy variants included).
const MEMBER_RATE_RE = /member[\s-]?(?:guest[\s-]?)?(?:discounted[\s-]?)?(?:rates?|green fees?|pricing|discount)|member[\s-]guest\b/;
const MEMBER_RATE_RE_G = new RegExp(MEMBER_RATE_RE.source, 'g');
const RANK_ONE = /(?:#\s?1(?!\d)|no\.\s?1(?!\d)|number[\s-]?one|top[\s-]?ranked)/;

/**
 * FIELD-LEVEL bindings — satisfied once anywhere in the field (body, joined FAQ,
 * summary, meta_description). Kept separate so the per-item FAQ pass does not
 * flag an answer that legitimately names only the 8-bedroom tier while a
 * sibling answer supplies the 6-bedroom option.
 */
function collectFieldLevelViolations(t: string, opts: { skipButler?: boolean } = {}): string[] {
  const out: string[] = [];
  if (/(?:8|eight)[\s-]?bedroom/.test(t) && !/(?:6|six)[\s-]?bedroom|(?:6|six)[\s-]{0,3}or[\s-]{0,3}(?:8|eight)|6\/8/.test(t)) {
    out.push('"8-bedroom" stated without the 6-bedroom option in the same field (canonical: 6-or-8 bedroom, guest\'s choice)');
  }
  if (!opts.skipButler && MEMBER_RATE_RE.test(t) && !/butler/.test(t)) {
    out.push('member-guest rate mentioned without "arranged through the villa\'s butler" anywhere in the same field');
  }
  return out;
}

function collectViolations(text: string, opts: { skipFieldLevel?: boolean; skipButler?: boolean } = {}): string[] {
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
  // (a) MAX-CAPACITY claims — "up to / sleeps / accommodates / hosts N guests" (OWNER-CONFIRMED 2026-08-29):
  //     22 is the property / 8-bedroom maximum; 16 is the 6-bedroom maximum. 22 stated for the 6-bedroom
  //     tier is WRONG; 16 is legit in 6-bedroom context or as the base-rate upcharge threshold; anything
  //     else is a fabricated capacity.
  const UPCHARGE_CTX = /upcharge|per[\s-]?person|per[\s-]?head|above 16|base (?:nightly )?rate|covers up to 16|17\s*[–-]\s*22/;
  const SIX_BR_CTX = /(?:6|six)[\s-]?bedroom/;
  const EIGHT_BR_CTX = /(?:8|eight)[\s-]?bedroom|full estate|8-bedroom estate/;
  for (const m of t.matchAll(/(?:up to|sleeps|accommodates|hosts|sleeping)\s+(\d{1,3})\s+(?:guests|people|players)/g)) {
    const n = Number(m[1]);
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 110), idx + m[0].length + 110);
    if (n === CANONICAL_FACTS.villa.maxGuests) {
      if (SIX_BR_CTX.test(ctx) && !EIGHT_BR_CTX.test(ctx)) violations.push('claims 22 guests for the 6-bedroom tier (canonical: 6-bedroom sleeps up to 16; 22 is the full 8-bedroom estate)');
      continue;
    }
    if (n === CANONICAL_FACTS.villa.maxGuestsByTier[6] && (SIX_BR_CTX.test(ctx) || UPCHARGE_CTX.test(ctx))) continue;
    violations.push(`claims occupancy ${n} (canonical: up to 16 as a 6-bedroom, up to ${CANONICAL_FACTS.villa.maxGuests} as the full 8-bedroom estate)`);
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
  // Punta Espada GolfWeek #1 must be time-bound — CLAIM-LOCAL (2026-09-03). Each
  // #1-Caribbean/Mexico claim must carry the binding within its own sentence
  // window (~160 chars either side). The old whole-text test let one correct
  // "eight consecutive years" in the body excuse an unbound "#1" in a FAQ answer.
  const GW_BIND = /consecutive years|straight years|years running|for eight years|eight consecutive|long ranked/;
  const GW_CLAIM = new RegExp(`${RANK_ONE.source}[^.<\\n]{0,60}(?:caribbean|mexico)|(?:caribbean|mexico)['’]?s?[^.<\\n]{0,40}${RANK_ONE.source}`, 'g');
  for (const m of t.matchAll(GW_CLAIM)) {
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 160), idx + m[0].length + 160);
    // Only a COURSE-ranking claim is in scope ("Punta Cana is the #1 destination in the
    // Caribbean" is not a GolfWeek claim) — audit 2026-09-03.
    if (!/punta espada|nicklaus|course|golf/.test(ctx)) continue;
    if (!GW_BIND.test(ctx)) {
      violations.push('GolfWeek #1 Caribbean/Mexico claim not bound to "for eight consecutive years" in the same sentence');
      break;
    }
  }
  // World-ranking overclaims for Punta Espada: canonical is #57 on Golf Digest's
  // World's 100 Greatest 2026-27. "top-10 world-ranked" (the 8e81fb32 FAQ) and the
  // stale "#35 in the world" are wrong. Context-bound to Punta Espada so a true
  // "top-50 in the world" for Teeth of the Dog (#50) is not flagged.
  for (const m of t.matchAll(/top[\s-]?(?:10|ten|25|twenty[\s-]?five)[\s-]*(?:world[\s-]?ranked|(?:golf[\s-])?courses?[\s-]in[\s-]the[\s-]world|in[\s-]the[\s-]world|worldwide|globally)|world['’]?s?\s+top[\s-]?(?:10|ten|25)\b|#\s?35 in the world|35th in the world|ranked 35th/g)) {
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 200), idx + m[0].length + 200);
    if (/punta espada/.test(ctx) && !/teeth of the dog|cabot|point hardy|corales/.test(ctx)) {
      violations.push(`world-ranking overclaim "${m[0]}" for Punta Espada — canonical is #57 on Golf Digest's World's 100 Greatest 2026-27`);
      break;
    }
  }
  // Golf Digest / Golf Magazine must never be cited as the #1 (Caribbean/Mexico) source.
  // Explicit attribution only — "Golf Digest's #1" or "#1 ... by/according to Golf Digest"
  // with no GolfWeek in between. ("#35 in the world by Golf Digest and #1 ... by GolfWeek"
  // is correct and must pass — dry-run 2026-09-03.)
  {
    const fwd = new RegExp(`golf (?:digest|magazine)['’]?s?\\s+(?:${RANK_ONE.source}|ranked[\\s-]?(?:#\\s?1|first))`);
    const rev = new RegExp(`${RANK_ONE.source}[^.<\\n]{0,50}\\b(?:by|according to|per|from)\\s+golf (?:digest|magazine)`, 'g');
    let hit = fwd.test(t);
    if (!hit) for (const m of t.matchAll(rev)) { if (!/golfweek|golf week/.test(m[0])) { hit = true; break; } }
    if (hit) violations.push('Golf Digest/Golf Magazine cited as the #1 source — the #1 Caribbean/Mexico ranking is GolfWeek (eight consecutive years); Golf Digest is #57 World\'s 100 Greatest 2026-27');
  }
  // Member-guest rate is Punta Espada ONLY — never claimed at Las Iguanas. Same-sentence
  // test: the member-rate phrase joined to Las Iguanas ("at Punta Espada and Las Iguanas",
  // "on both courses", "Las Iguanas member rates"). The canonical included-list structure
  // "member-guest discounted rate ... and access to Las Iguanas" is NOT a claim and passes.
  for (const m of t.matchAll(MEMBER_RATE_RE_G)) {
    const idx = m.index ?? 0;
    const sStart = Math.max(t.lastIndexOf('.', idx), t.lastIndexOf('\n', idx)) + 1;
    const sEndDot = t.indexOf('.', idx + m[0].length); const sEndNl = t.indexOf('\n', idx + m[0].length);
    const sEnd = Math.min(sEndDot === -1 ? t.length : sEndDot, sEndNl === -1 ? t.length : sEndNl);
    const sentence = t.slice(sStart, sEnd);
    if (!/las iguanas|both (?:nicklaus )?courses|both courses/.test(sentence)) continue;
    if (/regular rate|punta espada only|not (?:at|to|for) las iguanas|does not (?:apply|extend)|access to las iguanas|las iguanas access|las iguanas (?:is|at) (?:played at )?(?:regular|standard|published)/.test(sentence)) continue;
    const joined =
      /member[^.]{0,60}(?:punta espada )?(?:and|&|\+|as well as) las iguanas/.test(sentence) ||
      /las iguanas[^.]{0,40}member/.test(sentence) ||
      /member[^.]{0,60}both (?:nicklaus )?courses|both (?:nicklaus )?courses[^.]{0,40}member/.test(sentence);
    if (joined) {
      violations.push('member-guest rate claimed at Las Iguanas — Punta Espada ONLY; Las Iguanas is played at regular rates');
      break;
    }
  }
  for (const phrase of ['reserved for cap cana property owners', 'cap cana property owners only', 'only to cap cana homeowners', 'homeowner rate', 'owners-only rate', 'property-owner rate']) {
    if (t.includes(phrase)) { violations.push(`member-guest rate framed as "${phrase}" — it is the member-guest rate extended through the villa's private arrangement, exclusive to renters, arranged through the butler`); break; }
  }
  // Water body: the Caribbean Sea, never the Atlantic (for Punta Espada / the villa / the ocean holes).
  // "Atlantic hurricane season / storm / basin" is meteorology, not a water-body claim — exempt.
  for (const m of t.matchAll(/atlantic(?! (?:standard )?time)(?! hurricane)(?! storm)(?! basin)(?! tropical)/g)) {
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 150), idx + m[0].length + 150);
    if (/punta espada|ocean holes?|hole 13|13th hole|no\. 13|signature hole|villa espada/.test(ctx)) {
      violations.push('"Atlantic" used for Punta Espada / the villa\'s water — it is the Caribbean Sea');
      break;
    }
  }
  // Ocean-hole count: Punta Espada has 8 (never 9). Context-bound to Punta Espada so
  // Corales / Las Iguanas / Teeth counts are untouched.
  const WORDNUM: Record<string, number> = { three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  for (const m of t.matchAll(/\b(\d{1,2}|three|four|five|six|seven|eight|nine|ten)\s+(?:ocean(?:front|side)?|seaside|sea)\s+holes/g)) {
    const w = m[1] ?? '';
    const n = WORDNUM[w] ?? Number(w);
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 200), idx + m[0].length + 200);
    if (!/punta espada/.test(ctx) || /corales|las iguanas|teeth of the dog|casa de campo|la cana/.test(ctx)) continue;
    if (n !== 8) { violations.push(`claims ${n} ocean holes at Punta Espada (canonical: 8 ocean holes on the Caribbean Sea)`); break; }
  }
  // "36 holes of Nicklaus golf" stated as currently available (phased: front nine only)
  for (const m of t.matchAll(/36[\s-]?holes?\s+of\s+(?:jack\s+)?nicklaus[^.]{0,90}/g)) {
    if (!/once|by (?:the )?end|completes?|complet(?:e|ing)|two nicklaus courses/.test(m[0])) {
      violations.push('claims "36 holes of Nicklaus golf" as currently available — Las Iguanas is phased; use "two Nicklaus courses"');
      break;
    }
  }

  // Capacity phrasing retired 2026-08-29 (6-bedroom = 16, 8-bedroom = 22; never "either").
  for (const phrase of ['in either configuration', 'in either bedroom configuration', 'both configurations sleep', 'both tiers sleep', '22 guests in either', 'either tier sleeps']) {
    if (t.includes(phrase)) { violations.push(`retired capacity phrase "${phrase}" — 6-bedroom sleeps up to 16, full 8-bedroom estate up to 22`); break; }
  }
  // Variant of the retired phrasing (seen in the 8e81fb32 FAQ): "22 guests in either a 6-bedroom or 8-bedroom configuration".
  if (/(?:22|twenty[\s-]?two)\s+(?:guests?|people)\s+(?:in|across|with|under)\s+either\b/.test(t)) {
    violations.push('"22 guests in either ..." — 22 is the full 8-bedroom estate only; the 6-bedroom configuration sleeps up to 16');
  }
  // Beach club must carry the blackout caveat when framed as complimentary/included.
  for (const m of t.matchAll(/(?:complimentary|included|free|private)\s+(?:access\s+to\s+)?(?:the\s+)?(?:eden roc\s+)?beach club/g)) {
    const idx = m.index ?? 0;
    const ctx = t.slice(Math.max(0, idx - 200), idx + m[0].length + 300);
    if (!/christmas|blackout|subject to availability/.test(ctx)) { violations.push('beach club access stated without the blackout-date caveat (not available Christmas, New Year, and Easter; other dates subject to availability)'); break; }
  }
  // Press & coverage (added 2026-09-02): wire syndication is not editorial coverage; no reach figures.
  for (const phrase of ['as featured in', 'as seen in', 'featured in the associated press', 'covered by the associated press', 'covered by yahoo', 'featured in yahoo', 'covered by benzinga', '788 million', '788m', '834 outlets', '834 placements', '834 news', 'globenewswire.com']) {
    if (t.includes(phrase)) { violations.push(`banned press/coverage phrase "${phrase}" — link once to https://www.espadavilla.com/press instead`); break; }
  }
  if (/villa espada announces|press release/.test(t) && /^#|\n#/.test(t)) {
    if (/(?:^|\n)#{1,3}[^\n]*(?:announces|press release|in the news)/i.test(t)) violations.push('announcement-style heading — blog posts must not be press releases');
  }

  if (!opts.skipFieldLevel) violations.push(...collectFieldLevelViolations(t, opts));
  return violations;
}
