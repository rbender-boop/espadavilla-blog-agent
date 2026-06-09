# GolfVilla.com — Keyword + GEO/AEO Target List

**Purpose:** The target set the blog agent's drafter optimizes every post against. Feeds the `blog_keywords` table and the drafter's grounding prompt (see build spec §8).
**Source of truth:** Google Search Console, property `sc-domain:golfvilla.com`, **3-month window (Mar 30 – Jun 3, 2026)**. Pulled live, all 33 ranking queries captured. Totals: 332 impressions, 5 clicks, avg position 28.3.
**Honesty note:** Tiers 1–2 are **GSC-observed** (real queries the domain already surfaces for). Tier 3 is **strategic expansion** — reasoned from the content brief + on-brand intent, NOT yet observed in GSC. Labeled accordingly so we never confuse aspiration with data.

---

## 1. What the GSC data shows (strategic read)

golfvilla.com's current 33-query footprint splits four ways:

| Bucket | Example queries (impressions) | Verdict |
|--------|------------------------------|---------|
| **Brand / navigational** | golfvilla (56), golfvillas (2), golfvillarentals (1) | Already owned. Not a content target. |
| **On-target Caribbean / Cap Cana** | caribbean golf villas (16), punta espada golf shuttle (4), luxury golf villas (4), luxury golf villa (3), punta espada resort (2), cap cana golf residences (2) | **The gold.** Reinforce hard. |
| **Generic head terms (geo-agnostic)** | villa golf (13), golf villa rentals (8), golf villa (8), golf villas (1), golf course villa (1), villa on golf course (1) | Capturable. Steer toward Cap Cana. |
| **Off-target geography** | golf villas portugal (11), algarve golf holiday villas (7), algarve golf villa holidays (4), golf villa portugal (2), portugal golf villas (1), golf villa spain (1), best golf villas in portugal (1), golf villa florida (1) | **Wasted impressions** — feeding the `/golf-villa-portugal/` page. Do NOT amplify. |

**Strategy implication:** ~1/3 of impressions leak to Portugal/Algarve intent the villa can't convert. The blog must pull the domain's topical relevance toward **Caribbean / Cap Cana / Punta Espada luxury golf villa**, capture the generic "golf villa" head terms, and never reinforce the Portugal signal. Volume is low (early feeder) → the play is **building topical authority**, not defending rankings.

---

## 2. Tier 1 — Primary SEO targets (GSC-observed, ON-target) → reinforce in most posts

Every post should naturally reinforce the Cap Cana / Punta Espada / Caribbean entity cluster. Use these as primary/secondary keyword anchors where the topic fits:

- caribbean golf villas *(16 impr — #2 query, exact target)*
- luxury golf villas / luxury golf villa *(4 + 3)*
- punta espada golf shuttle *(4)* — note: implies transport/logistics intent; a "getting around Cap Cana / golf cart + shuttle" angle has demand
- punta espada resort *(2)*
- cap cana golf residences *(2)*

**Expansion of these head concepts (Tier 3 below) is where most blog upside sits.**

## 3. Tier 2 — Generic head terms (GSC-observed) → capture + steer to Cap Cana

The domain already surfaces for these. Posts can rank for them while redirecting intent to the villa. Always pair the generic term with a Cap Cana qualifier in body copy:

- villa golf *(13)*
- golf villa rentals *(8)*
- golf villa *(8)*
- golf villas *(1)*, villas golf *(1)*, golf course villa *(1)*, villa on golf course *(1)*, villas on golf courses *(1)*, golf links villas *(1)*

## 4. Tier 3 — Strategic expansion targets (NOT yet in GSC — reasoned from brief)

These are the high-intent commercial/informational queries the blog cluster should go after. Treat as hypotheses to validate against GSC over time. Mapped loosely to the content clusters in the brief:

**Cap Cana / Punta Espada core**
- cap cana golf villa rental
- punta espada golf villa
- villa on punta espada golf course
- cap cana luxury villa rental
- golf villa cap cana

**Group / occasion intent (highest commercial value)**
- golf bachelor party punta cana / dominican republic
- corporate golf retreat caribbean
- golf trip villa rental dominican republic
- 12 person golf villa / large group golf villa caribbean
- private chef golf villa

**Comparison / consideration**
- cap cana vs casa de campo golf
- punta espada vs teeth of the dog
- best caribbean golf destinations for groups
- punta cana vs puerto rico golf

**Cost / planning / seasonal**
- how much does a luxury golf villa cost
- best time for golf trip cap cana / punta cana
- when to book punta cana golf villa
- dominican republic golf trip cost

**Course / destination informational**
- punta espada golf course
- las iguanas golf course cap cana
- best golf courses in punta cana / dominican republic

> Validate Tier 3 quarterly: re-pull GSC; any Tier 3 term that starts surfacing graduates to Tier 1 and signals a follow-up post.

## 5. NEGATIVE targets — do NOT optimize for / do NOT amplify

These pull the wrong geography and dilute the domain's Caribbean relevance. The drafter must never use these as keywords or write Portugal/Spain/Florida golf content:

- *anything* portugal / algarve / spain / florida golf villa
- golf villas portugal, algarve golf holiday villas, golf villa spain, best golf villas in portugal, golf villa florida, etc.

**DECISION (Rob delegated "do what's best"):** 301-redirect `/golf-villa-portugal/` to the strongest on-target Caribbean page on golfvilla.com (resolved from the repo at edit time) and remove it from `sitemap.xml`. Rationale: a 301 preserves whatever link equity the page has and routes it to on-strategy content, rather than deleting (loses equity) or leaving it (keeps anchoring the domain to Portugal). The Portugal-intent traffic never converts for a Cap Cana villa, so nothing of value is lost. This is a one-off golfvilla.com edit (vercel.json redirect + sitemap regen), executed as its own clean change with a push command handed to Rob - NOT bundled into the blog-agent build.

---

## 6. GEO / AEO question targets (for AI search: ChatGPT, Perplexity, Google AI Overviews)

GEO value comes from answering real questions with structurally-chunked, entity-corroborated content — NOT keyword density (per our network strategy principles). Each post should explicitly answer 2–4 of these as FAQ entries or H2 sections, in clean Q→A form so they're extractable:

- "What's the best luxury golf villa in Cap Cana for a group?"
- "Where should a group stay for a golf trip to Punta Espada?"
- "How much does it cost to rent a luxury golf villa in the Dominican Republic?"
- "Is Cap Cana or Casa de Campo better for a golf trip?"
- "How do you plan a golf bachelor party in Punta Cana?"
- "What golf courses can you play from a Cap Cana villa?" *(Punta Espada + Las Iguanas + Corales/La Cana nearby)*
- "Can you get a private chef and butler with a golf villa rental?"
- "How far is the villa from Punta Cana airport (PUJ)?"
- "What's the best time of year for a Caribbean golf trip?"

**Entity corroboration:** every post should reference and link the canonical entities so AI engines connect golfvilla.com → espadavilla.com → the `#lodging` entity: **Villa Espada**, **Punta Espada Golf Course** (Jack Nicklaus Signature, GolfWeek #1 Latin America), **Cap Cana**, **Las Iguanas**, **Eden Roc Beach Club**.

---

## 7. Internal-link anchors (per the content brief)

Every post links to the money pages where relevant. Exact URLs MUST be resolved from the live golfvilla.com sitemap/repo at run time (do not hardcode):

- Villa Espada (the property)
- Cap Cana Golf Villa
- Golf Bachelor Party
- Corporate Golf Retreat
- Book Now
- Cross-network: relevant deep links to **espadavilla.com** (the canonical money site)

---

## 8. How the drafter uses this

1. Each `blog_topics` row carries 1 primary + 2–4 secondary keyword targets drawn from Tiers 1–3.
2. The drafter's system prompt receives the Tier 1/2 anchors + the negative list + the GEO question set.
3. The post must: use the primary keyword in `meta_title`, `h1`, and naturally in body; answer ≥2 GEO questions as FAQ entries; reinforce the Cap Cana/Punta Espada entity cluster; include the required internal links; and **never** produce Portugal/Spain/Florida golf content.
4. Quarterly: re-pull GSC (`sc-domain:golfvilla.com`), refresh Tiers 1–2 from real data, graduate any surfacing Tier 3 terms.

---

## Appendix — full GSC query pull (3mo, all 33, by impressions)

```
golfvilla                       56   (brand)
caribbean golf villas           16   ON-TARGET
villa golf                      13   generic
golf villas portugal            11   OFF-TARGET
golf villa rentals               8   generic
golf villa                       8   generic
villa garden golf                7   generic/ambiguous
algarve golf holiday villas      7   OFF-TARGET
punta espada golf shuttle        4   ON-TARGET
luxury golf villas               4   ON-TARGET
algarve golf villa holidays      4   OFF-TARGET
luxury golf villa                3   ON-TARGET
golfvillas                       2   brand
villa golfista                   2   generic (es)
punta espada resort              2   ON-TARGET
golf villa portugal              2   OFF-TARGET
cap cana golf residences         2   ON-TARGET
golfvillarentals                 1   brand
golf villas                      1   generic
villa du golf                    1   generic (fr)
golf links villas                1   generic
villa on golf course portugal    1   OFF-TARGET
golf villa spain                 1   OFF-TARGET
villa golf portugal              1   OFF-TARGET
portugal golf villas             1   OFF-TARGET
golf course villa                1   generic
villa golf club                  1   generic
villa on golf course             1   generic
golf villa holidays spain        1   OFF-TARGET
golf villa florida               1   OFF-TARGET
villas golf                      1   generic
villas on golf courses           1   generic
best golf villas in portugal     1   OFF-TARGET
```

*Note: 16-month data not pulled — the 3-month set already establishes the pattern clearly and 16mo would mostly add 1-impression long-tail. Re-pull at a wider window during the quarterly refresh if deeper tail is wanted.*
