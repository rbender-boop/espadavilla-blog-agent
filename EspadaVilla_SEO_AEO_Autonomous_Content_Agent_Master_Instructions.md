# EspadaVilla.com Autonomous SEO/AEO Content Agent
## Complete Claude Code Build Specification + Existing-Winner Protection Guardrails

> ## ⚠️ ADOPTION STATUS (Rob-decided 2026-08-20): CHARTER, NOT BUILD SPEC
> This document is adopted as the **strategy charter** for the espadavilla AEO
> program. It is NOT to be implemented literally as software. Sections 50–54
> (autonomous platform: crawler, classifiers, rollback engine, autonomous site
> edits) are explicitly NOT being built — the loop runs as: weekly Cowork
> "Espadavilla Blog Editorial" task + monthly AEO probe/report sessions, with
> Rob as the human gate on every publish and every live-site change.
>
> **CORRECTIONS — this doc is wrong on four points; the rules below override it:**
> 1. **Bedrooms:** canonical is **"6-or-8 bedroom" — NEVER "8 bedrooms" alone**
>    (facts.ts is the single source of truth; this doc says "8 bedrooms" throughout).
> 2. **Schema (§37):** **VacationRental is INELIGIBLE — never use it.** Blog posts:
>    BlogPosting + exactly ONE FAQPage. Villa: LodgingBusiness/Resort.
> 3. **LLM engines (§5C):** DataForSEO does NOT cover Grok or DeepSeek. The
>    testable set is **ChatGPT / Claude / Gemini / Perplexity** (+ AI Overviews).
> 4. **Autonomy (§51):** There are NO "safe autonomous changes" to live site
>    pages. EVERY live-site change requires Rob's explicit go. The only automated
>    publish path is the blog pipeline, gated on Rob's per-draft approval RPC.
>
> Also: prompts in golfvilla.com's generic-Caribbean-golf lane may be MEASURED
> but must never generate espadavilla content tasks (sister-site cannibalization).
>
> **What IS adopted:** PRESERVE > UPDATE > EXPAND > CREATE; branded vs unbranded
> split with unprompted-recommendation-rate as primary KPI; SHOULD/COULD/
> SHOULD_NOT_WIN fit classification; per-cluster scoring; ESPADA_HAS_BUT_NOT_
> COMMUNICATED gap analysis; the 12 fixed benchmark prompts (§6); regression-risk-
> beats-opportunity-score; answer-first style (§26); E-E-A-T sourcing (§28).
> These are folded into the aeo_snapshots schema, the probe prompt set, and the
> weekly editorial task prompt. See docs/HANDOVER-EDITORIAL-RESTART-2026-08-20.md.

## Purpose

Build an automated SEO + AEO content intelligence and publishing agent for **EspadaVilla.com**.

This is **not** primarily a blog-writing bot.

Its job is to continuously determine:

1. What topics Villa Espada already owns.
2. What topics Villa Espada should reasonably own but does not.
3. Which competitors are being recommended instead.
4. What travelers are actually searching for.
5. What content on EspadaVilla.com should be improved.
6. When a genuinely new page should be created.
7. Whether previous SEO/AEO work actually improved visibility.
8. Which opportunities are most likely to generate qualified inquiries and direct bookings.
9. Which pages, topics, rankings, LLM recommendations, and citations must be protected from regression.

The system should operate as a closed-loop optimization engine:

> **Search demand → LLM visibility → competitor visibility → site performance → content gap → update/create → publish → re-test → measure impact → protect wins**

The goal is **not maximum content volume**.

The goal is:

> **Make EspadaVilla.com the strongest authoritative web entity for Villa Espada, Punta Espada golf villa accommodations, luxury large-group travel in Cap Cana, and adjacent travel categories for which Villa Espada is genuinely one of the best answers — without harming the SEO/AEO authority already achieved.**

---

# 1. NON-NEGOTIABLE PRIME DIRECTIVE: PROTECT EXISTING WINS

EspadaVilla.com already has meaningful organic and LLM visibility for strategically valuable topics, especially **Punta Espada, golf-group, golf-villa, member-guest golf-rate, and other golf-related queries**.

Existing high-performing URLs are **presumptively protected**.

The burden of proof is on the agent to demonstrate that modifying a winning page is more likely to improve performance than harm:

- Organic rankings
- Search impressions
- Search clicks
- CTR
- Direct-booking inquiries
- LLM mentions
- LLM recommendations
- LLM citation frequency
- Backlinks
- Internal-link equity
- Topical authority
- Entity understanding
- Conversion performance

When uncertain:

> **PRESERVE THE EXISTING PAGE.**

Solve the new content gap through another page, supporting content, internal linking, schema, FAQs, or a carefully scoped additive enhancement.

Do not rewrite a strong page simply because another related query is weaker.

---

# 2. PROPERTY AND BRAND CONTEXT

## Villa Espada

Villa Espada is a luxury private villa in Cap Cana, Dominican Republic.

Important characteristics include:

- Located directly on the Punta Espada golf course.
- Punta Espada / Fairway 5 positioning is central to the property's identity.
- 8 bedrooms.
- Designed for large groups.
- Suitable for golf groups.
- Suitable for families and multigenerational groups.
- Suitable for celebrations and group trips.
- Fully staffed luxury-villa experience.
- Private pools and substantial indoor/outdoor social areas.
- Luxury positioning.
- Direct booking available through EspadaVilla.com.
- Cap Cana should be emphasized rather than positioning the property generically as a lower-cost "Punta Cana villa."

## Golf Competitive Advantage

Villa Espada has an unusually strong golf proposition.

Villa Espada guests can receive access to **Punta Espada member-guest golf rates** through the owner.

This can represent savings of approximately **up to $200 per golfer per round compared with applicable published non-member pricing**, depending on season/rates.

This advantage is verified and may be used confidently where relevant.

Villa Espada guests may also receive assistance obtaining tee times at:

- Punta Espada Golf Club
- Casa de Campo golf courses

The owner has access that can help Villa Espada guests secure Casa de Campo golf reservations.

This materially strengthens Villa Espada's position for a **multi-course Dominican Republic luxury golf vacation**.

Do not claim that Villa Espada is located at Casa de Campo.

---

# 3. PRIMARY BUSINESS OBJECTIVE

The ultimate KPI is **qualified direct booking demand**, not pageviews.

SEO/AEO decisions should prioritize travelers with high purchase intent, particularly:

- Wealthy golf groups
- Groups of approximately 8–20 travelers
- Large families
- Multigenerational families
- Groups traveling for milestone birthdays
- Bachelor/guy golf trips where Villa Espada is an appropriate fit
- Groups considering Eden Roc or another Cap Cana luxury resort
- Groups choosing between private villas and hotels/resorts
- Travelers specifically interested in Punta Espada
- Travelers planning premium Dominican Republic golf vacations
- Travelers searching for fully staffed luxury villas
- Travelers comparing Cap Cana with Casa de Campo

When ranking opportunities, commercial relevance matters more than raw search volume.

For example:

> A query with 50 searches/month from travelers looking for “where should 12 golfers stay near Punta Espada” may be significantly more valuable than a generic travel keyword receiving thousands of searches.

---

# 4. DO NOT TURN THIS INTO A CONTENT FARM

This requirement is critical.

The agent must **prefer strengthening existing authoritative pages over continually creating new articles**.

Before creating any new page, determine whether the topic:

1. Already exists substantially on EspadaVilla.com.
2. Belongs naturally inside an existing page.
3. Can strengthen an existing topic cluster.
4. Would create keyword/topic cannibalization.
5. Is genuinely distinct enough to deserve its own URL.

Default preference:

> **PRESERVE > UPDATE > EXPAND > CONSOLIDATE > CREATE**

New pages should be created only when there is a clear standalone search intent or information need.

Do not create repetitive pages such as:

- best Cap Cana golf villa
- luxury Cap Cana golf villa
- Punta Espada golf villa
- best Punta Espada villa
- golf villa in Cap Cana
- villa near Punta Espada

if these intents can be satisfied by one strong authoritative page.

Avoid:

- Thin pages
- Doorway pages
- Templated city/location pages
- Near-duplicate articles
- Keyword stuffing
- Unnecessary exact-match pages
- AI-generated filler
- Creating content merely because a keyword exists
- Rewriting successful content to satisfy a loosely related query

---

# 5. THREE PRIMARY DATA SOURCES

The agent should combine three major intelligence sources.

## A. DataForSEO

Use DataForSEO to understand **actual search-market behavior**.

Where supported by the API/data available, collect:

- Search volume
- Keyword variations
- Keyword difficulty / competition
- CPC
- Search intent
- SERP composition
- Current EspadaVilla.com ranking
- Competitor ranking URLs
- Related searches
- People Also Ask questions
- Long-tail questions
- Trending terms
- Search volume changes
- SERP features
- Domain competitors
- Ranking movements
- Keyword gaps

DataForSEO should help answer:

> What are real travelers actually searching for?

Do not blindly optimize for the highest-volume keywords.

Weight commercial relevance heavily.

## B. Windsor.ai

Use Windsor.ai to aggregate first-party performance data where available, particularly from:

- Google Search Console
- Google Analytics
- Google Ads
- Other relevant connected marketing platforms

Analyze:

- Search impressions
- Search clicks
- CTR
- Average ranking position
- Landing page traffic
- Organic entrances
- Engagement
- Conversion events
- Contact-form submissions
- Booking inquiries
- Paid-search behavior
- High-converting search themes
- Pages gaining or losing traffic

Use this data to answer:

> What content is already producing real business results?

A page with modest traffic but strong inquiry generation should receive greater strategic weight than a high-traffic informational page with no commercial value.

## C. LLM Visibility Monitoring

Measure how Villa Espada appears in major LLM recommendation environments.

At minimum, structure support for:

- ChatGPT
- Gemini
- Grok
- DeepSeek

Add other relevant platforms if reliable access becomes available.

The core question is:

> **When a traveler describes a trip for which Villa Espada should objectively be a strong option, does the LLM independently recommend Villa Espada?**

---

# 6. LLM QUERY ARCHITECTURE

Do **not** rely exclusively on a static set of prompts.

Use three layers.

## Layer 1 — Fixed Benchmark Questions

Maintain approximately **8–12 permanent benchmark prompts**.

These should remain unchanged over time so we can measure longitudinal improvement.

Recommended starting baseline:

1. Best luxury villa rentals in Cap Cana with a private chef
2. Where to stay in Cap Cana for a large group golf trip
3. 8-bedroom villa rental in Cap Cana, Dominican Republic
4. Is there a villa you can rent right on the Punta Espada golf course?
5. Private villa in Cap Cana for a very large group with full staff
6. Best Cap Cana villa for a milestone birthday or bachelor party
7. Cap Cana vs Casa de Campo for a luxury golf vacation
8. What is Villa Espada in Cap Cana?
9. Best places to stay near Punta Espada golf course
10. Where should a group of 12 golfers stay in the Dominican Republic?
11. What is the best fully staffed 8-bedroom villa in Cap Cana?
12. What is the best luxury villa in Cap Cana for a group of 16 people?

These form the historical control group.

Do not automatically change their wording.

---

# 7. BRANDED VS UNBRANDED QUESTIONS

This distinction is critical.

## Branded Questions

Examples:

- What is Villa Espada?
- Is Villa Espada worth it?
- Villa Espada vs Sambarela
- Villa Espada reviews

These test:

- Entity recognition
- Factual accuracy
- Reputation
- Brand understanding
- Citation sources

They **do not** adequately measure organic AI discovery.

## Unbranded Questions

Examples:

- Where should 12 golfers stay in the Dominican Republic?
- Best staffed villa in Cap Cana for 16 people
- Where should a wealthy group stay if Punta Espada is the main reason for the trip?
- Best private villa alternative to Eden Roc for a group
- Best Caribbean golf villa for a group

These are significantly more important for AEO.

Primary KPI:

> **UNPROMPTED VILLA ESPADA RECOMMENDATION RATE**

Measure branded and unbranded visibility separately.

Never combine them into one misleading score.

---

# 8. LAYER 2 — STRATEGIC PERMANENT QUESTIONS

Maintain approximately **10–15 additional strategic prompts**.

These may evolve slowly as business priorities change.

Focus on categories such as:

### Luxury

- Best luxury villa in Cap Cana for a large group
- Most luxurious private villa in Cap Cana for multiple couples
- Fully staffed luxury villa in Cap Cana

### Golf

- Best place to stay for a Punta Espada golf trip
- Best golf villa in Cap Cana
- Best Dominican Republic golf villa for 12 golfers
- Where should a wealthy golf group stay near Punta Espada?
- Best luxury golf villa in the Caribbean
- Where can a group stay and get preferred Punta Espada golf access?

### Large Groups

- Where can 16 adults stay together in Cap Cana?
- Best private villa for four families traveling together
- Luxury Caribbean villa for 12–16 adults

### Villa vs Resort

- Eden Roc Cap Cana vs private villa for a large group
- Should a group stay at Eden Roc or rent a villa?
- Private villa vs luxury hotel in Cap Cana for 12 people

### Dominican Golf

- Cap Cana vs Casa de Campo for golfers
- Best Dominican Republic golf vacation for a group
- Punta Espada vs Teeth of the Dog for a golf trip

### Direct Booking

- Is it better to book a Cap Cana villa directly or through Airbnb?
- Best way to book a private Cap Cana villa
- Cap Cana private villa direct booking

---

# 9. LAYER 3 — DYNAMIC DISCOVERY QUESTIONS

Generate approximately **20–30 new prompts every scan cycle**.

These should NOT be random paraphrases.

Generate them based on actual intelligence from:

- DataForSEO keyword changes
- Google Search Console queries
- People Also Ask questions
- Competitor ranking gains
- Paid-search conversion themes
- New Google Ads search terms
- Existing pages receiving impressions but poor CTR
- New travel trends
- LLM competitor recommendations
- Recent site search behavior where available

The objective is:

> Discover new ways real travelers are expressing intents for which Villa Espada should reasonably compete.

---

# 10. COMPETITOR/GAP QUESTIONS

Generate approximately **10 competitor-oriented or gap-oriented prompts** per cycle.

Examples:

- Best villas in Cap Cana
- Best alternatives to Eden Roc Cap Cana for groups
- Villa Espada vs Sambarela
- Villa Espada vs Caleton villa
- Best private villa near Punta Espada
- Best staffed villas in Cap Cana
- Where should a large group stay in Cap Cana?
- Best Cap Cana villa websites
- Best golf accommodations near Punta Espada
- Best luxury group accommodations in Cap Cana

If an LLM repeatedly recommends another property above Villa Espada:

1. Identify the competitor.
2. Identify why the model appears to prefer it.
3. Determine what sources the model is relying upon where visible.
4. Determine whether that advantage is legitimate.
5. Determine whether EspadaVilla.com lacks equivalent evidence/content.
6. Recommend a corrective action only if Villa Espada genuinely deserves inclusion.

Do not manufacture claims merely to outperform competitors.

---

# 11. DO NOT OPTIMIZE FOR CATEGORIES ESPADA SHOULD NOT WIN

The agent must recognize product truth.

Example:

> "Best oceanfront luxury villa in the Dominican Republic"

Villa Espada is not literally an oceanfront villa.

If Villa Espada is not recommended, this should **NOT** automatically generate a content task.

Classify every lost prompt as:

### A. SHOULD WIN
Villa Espada is objectively an excellent fit.

→ High-priority optimization opportunity.

### B. COULD WIN
Villa Espada is a legitimate candidate, but not necessarily the obvious winner.

→ Medium-priority opportunity.

### C. SHOULD NOT WIN
The property does not actually satisfy the user's request.

→ Ignore for optimization purposes.

This classification is mandatory.

---

# 12. LLM RESPONSE CAPTURE

For each tested query, capture structured data.

Suggested schema:

```json
{
  "scan_date": "",
  "model": "",
  "prompt": "",
  "prompt_type": "fixed|strategic|dynamic|competitor",
  "branded": false,
  "topic_cluster": "",
  "espada_mentioned": false,
  "espada_recommended": false,
  "espada_position": null,
  "top_recommendation": "",
  "competitors_mentioned": [],
  "competitors_above_espada": [],
  "espada_url_cited": false,
  "espada_domain_cited": false,
  "third_party_sources_citing_espada": [],
  "response_sentiment": "",
  "factual_accuracy": "",
  "missing_attributes": [],
  "incorrect_claims": [],
  "fit_classification": "should_win|could_win|should_not_win",
  "opportunity_score": 0
}
```

---

# 13. REPEATED LLM TESTING

Where technically practical and economically reasonable, important questions should be tested multiple times because LLM answers can vary.

For highest-priority prompts:

Run approximately **3 independent generations** per model.

Use clean sessions/contexts where possible.

Calculate:

> **Recommendation Frequency = Villa Espada recommendations / total runs**

Example:

```text
Prompt:
Where should 12 golfers stay in the Dominican Republic?

ChatGPT: 3/3
Gemini: 2/3
Grok: 3/3
DeepSeek: 1/3
```

This is more valuable than recording a single lucky response.

---

# 14. CORE AEO KPIs

Calculate at minimum:

## Unbranded Mention Rate

```text
Unbranded prompts where Villa Espada was mentioned
--------------------------------------------------
Total eligible unbranded prompts
```

## Unbranded Recommendation Rate

```text
Unbranded prompts where Villa Espada was positively recommended
---------------------------------------------------------------
Total eligible unbranded prompts
```

## Top Recommendation Rate

How often Villa Espada is the #1 recommendation.

## Top-3 Recommendation Rate

How often Villa Espada appears among the first three recommendations.

## Citation Rate

How often EspadaVilla.com is directly cited.

## Competitor Loss Rate

How often an identified competitor is recommended ahead of Villa Espada.

## Factual Accuracy Rate

How accurately the models describe:

- Bedroom count
- Location
- Staffing
- Golf access
- Punta Espada relationship
- Group capacity
- Amenities
- Direct booking
- Member-guest golf benefit

---

# 15. TRACK RESULTS BY TOPIC CLUSTER

Do not rely on one overall AEO score.

Track category-level ownership.

Suggested clusters:

1. Punta Espada Golf
2. Cap Cana Golf
3. Dominican Republic Golf Trips
4. Luxury Cap Cana Villas
5. Large Groups
6. Families / Multigenerational Travel
7. Fully Staffed Villas
8. Celebrations / Bachelor / Milestones
9. Villa vs Resort
10. Eden Roc Alternatives
11. Cap Cana vs Casa de Campo
12. Direct Booking
13. Luxury Caribbean Golf Villas
14. Villa Espada Branded / Reputation
15. Cap Cana Destination Expertise

Calculate performance separately by cluster.

The system should be able to report:

> Villa Espada currently has an 82% unbranded recommendation rate for Punta Espada golf queries but only a 31% recommendation rate for generic luxury large-group Cap Cana queries.

That tells us where to deploy content resources.

---

# 16. TOPIC OWNERSHIP MAP

Maintain a persistent content/topic graph.

Core topical hierarchy:

```text
Villa Espada
│
├── Punta Espada Golf
│   ├── Tee times
│   ├── Published golf rates
│   ├── Member-guest rates
│   ├── Golf groups
│   ├── Punta Espada accommodations
│   └── Punta Espada trip planning
│
├── Dominican Republic Golf
│   ├── Punta Espada
│   ├── Corales
│   ├── Teeth of the Dog
│   ├── Dye Fore
│   ├── Links at Casa de Campo
│   ├── Cap Cana vs Casa de Campo
│   └── Multi-course itineraries
│
├── Cap Cana Luxury Villas
│   ├── 8-bedroom villas
│   ├── Large groups
│   ├── Staffed villas
│   ├── Private chef
│   ├── Family groups
│   ├── Celebrations
│   └── Direct booking
│
├── Villa vs Resort
│   ├── Eden Roc
│   ├── St. Regis
│   ├── Private villa vs hotel
│   └── Cost per group
│
├── Group Travel
│   ├── 8 golfers
│   ├── 12 golfers
│   ├── 16 guests
│   ├── Multi-family groups
│   └── Milestone trips
│
└── Cap Cana Destination Authority
    ├── Restaurants
    ├── Beaches
    ├── Marina
    ├── Golf
    ├── Activities
    ├── Family activities
    ├── Transportation
    └── Trip planning
```

Every content item should belong to a defined cluster.

---

# 17. REQUIRED EXISTING-PAGE BASELINE BEFORE ANY CHANGE

Before modifying any existing URL, create and persist a **pre-change baseline**.

Capture, where data is available:

## Organic Search Baseline

- Top ranking keywords
- Rankings for strategically important queries
- Search impressions
- Search clicks
- CTR
- Average position
- Organic landing-page traffic
- Indexed URL status
- Canonical
- Title tag
- Meta description
- H1
- Major headings
- Word count
- Search intent currently served
- Query clusters currently associated with the URL

## Conversion Baseline

- Contact-form submissions
- Booking inquiries
- Conversion rate
- Revenue or qualified-lead data if available
- Assisted conversions where meaningful

## AEO Baseline

- LLM mention rate
- LLM recommendation rate
- #1 recommendation rate
- Top-3 rate
- Citation rate
- Topic clusters where the page/site appears to be winning
- Important prompts tied to the page

## Authority Baseline

- Backlinks
- Referring domains
- High-value inbound links
- Internal links into the page
- Internal anchor text
- Structured-data types
- Entity references
- Known third-party citations

No autonomous material change should occur until this baseline has been saved.

---

# 18. PAGE CLASSIFICATION SYSTEM

Classify every existing URL before deciding what to do.

## PROTECTED_WINNER

A page that performs strongly for strategically important queries, conversions, citations, or topic ownership.

Signals may include:

- Top 1–3 organic rankings for valuable queries
- Strong LLM recommendation frequency
- Strong LLM citation frequency
- Meaningful direct-booking inquiries
- Strong backlinks/referring domains
- High-converting landing-page behavior
- Clear ownership of an important topic cluster
- Search performance materially above site median

## GROWTH_OPPORTUNITY

A page with meaningful visibility and authority but clear room to improve.

Examples:

- Ranking positions 4–20
- High impressions but weak CTR
- LLM mentions but not recommendations
- Good traffic with incomplete topic coverage
- Missing answer-first sections or FAQs
- Strong relevance but weak internal linking

## UNDERPERFORMER

A page with low search visibility, low AEO visibility, low conversion value, or weak differentiation.

## UNPROVEN

Insufficient data to classify confidently.

When uncertain between PROTECTED_WINNER and another category:

> **Choose PROTECTED_WINNER.**

---

# 19. PROTECTED WINNER GUARDRAILS

For any page classified as **PROTECTED_WINNER**, the agent must NOT autonomously perform any of the following:

- Change the URL
- Redirect the URL
- Change the canonical target
- Change the page's primary topic
- Change the page's primary search intent
- Substantially rewrite the title tag
- Substantially rewrite the H1
- Remove major sections
- Remove FAQs that may support existing rankings/AEO
- Remove schema
- Change structured-data entity identity
- Significantly reduce word count
- Rewrite large portions of the body copy
- Merge the page into another URL
- Split the page into multiple URLs
- Delete the page
- Change high-performing internal-link anchors in bulk
- Remove strong outbound citations
- Remove important internal links
- Remove known high-value semantic terms/entities
- Reposition a golf-winning page toward generic luxury
- Sacrifice an established golf query to chase a broader query
- Replace proven copy simply because AI can produce “better” prose

These actions require **HUMAN_REVIEW**.

Allowed autonomous changes on a PROTECTED_WINNER should generally be limited to low-risk, additive actions such as:

- Fixing broken links
- Updating clearly stale dates
- Updating verified factual information
- Updating verified pricing from approved sources
- Adding a small supporting FAQ
- Adding a relevant internal link
- Adding a missing citation
- Adding appropriately scoped schema
- Correcting a factual error
- Improving accessibility markup
- Making minor metadata refinements only when regression risk is low

Default posture:

> **SURGICAL ENHANCEMENT, NOT REWRITE.**

---

# 20. EXPECTED IMPROVEMENT VS REGRESSION RISK

Before any material update, calculate:

## Expected Improvement Score

Factors may include:

- High-value query gap
- Strong property fit
- Clear missing factual coverage
- Clear search-intent mismatch
- Strong first-party evidence
- Competitor weakness
- Low current conversion value
- Weak current ranking
- Strong opportunity in positions 4–20

## Regression Risk Score

Factors may include:

- Top-3 rankings
- Strong LLM recommendation rate
- Strong LLM citation rate
- Strong conversion performance
- Strong backlinks
- High-value referring domains
- Strong historical traffic
- Proposed change alters primary intent
- Proposed change alters title/H1 substantially
- Proposed change removes text
- Proposed change changes URL/canonical
- Proposed change merges or redirects content

Decision rule:

```text
IF Regression Risk > Expected Improvement:
    NO_ACTION or HUMAN_REVIEW
ELSE:
    proceed only within page-class guardrails
```

For PROTECTED_WINNER pages, apply a higher safety threshold.

---

# 21. EXISTING PAGE AUDIT BEFORE WRITING

Before recommending or creating new content:

1. Crawl/index all relevant EspadaVilla.com pages.
2. Determine which page currently targets the topic.
3. Analyze existing:
   - title
   - H1
   - headings
   - content
   - schema
   - internal links
   - citations
   - FAQs
   - images
   - metadata
   - entities
4. Review search performance.
5. Review LLM visibility.
6. Review competitor pages.
7. Review page classification.
8. Review regression risk.
9. Decide whether to:
   - do nothing
   - refresh
   - expand
   - consolidate
   - rewrite
   - create a new page
   - send for human review

Never create a new page without performing this check.

Never materially rewrite a winning page without performing this check.

---

# 22. CONTENT DECISION ENGINE

For every identified opportunity, calculate an opportunity score.

Suggested conceptual weighting:

```text
Opportunity Score =
Commercial Intent
× Property Fit
× Search Demand
× AEO Visibility Gap
× Competitive Opportunity
× Existing Site Authority
× Conversion Potential
```

Normalize to a useful scoring range such as 0–100.

Suggested weighting philosophy:

- Property fit: VERY HIGH
- Commercial intent: VERY HIGH
- Conversion potential: VERY HIGH
- LLM visibility gap: HIGH
- Search demand: MEDIUM
- Competitor weakness: MEDIUM
- Existing authority: MEDIUM

Raw search volume must not dominate scoring.

Then independently calculate **Regression Risk**.

A high Opportunity Score does not override high regression risk.

---

# 23. ACTION CLASSIFICATIONS

Every content decision should result in one of:

```text
NO_ACTION
PROTECT_WINNER
REFRESH_EXISTING
EXPAND_EXISTING
MERGE_CONTENT
IMPROVE_INTERNAL_LINKS
ADD_FAQ
ADD_SCHEMA
ADD_SUPPORTING_EVIDENCE
CREATE_NEW_PAGE
CREATE_COMPARISON_PAGE
CREATE_DESTINATION_GUIDE
UPDATE_PRICING
UPDATE_FACTS
HUMAN_REVIEW
ROLLBACK_RECOMMENDED
```

---

# 24. WHEN TO UPDATE AN EXISTING ARTICLE

Prioritize updates when:

- The page already ranks but is not a protected winner.
- Search impressions are rising.
- CTR is weak.
- Rankings are positions ~4–20.
- An LLM almost recommends Villa Espada but lacks certain facts.
- Competitors are being cited for information the page could legitimately provide.
- Data has become stale.
- Golf rates changed.
- Amenities changed.
- The page lacks clear answer-first formatting.
- The page lacks source citations.
- Internal linking is weak.
- A related topic is cannibalizing the page.
- The page has proven conversion value but the proposed change is additive and low risk.

For PROTECTED_WINNER pages, prefer small additive enhancements and require human review for material edits.

---

# 25. WHEN TO CREATE A NEW PAGE

Create a new page only when:

1. Search intent is substantially different from existing pages.
2. The topic supports a meaningful independent answer.
3. Villa Espada has genuine relevance.
4. Search/LLM evidence supports the opportunity.
5. Existing content cannot satisfy the intent cleanly.
6. The new page strengthens an identified topic cluster.
7. It can provide genuinely original or useful information.
8. It will not cannibalize a PROTECTED_WINNER.
9. Internal-link architecture is defined before publication.

---

# 26. ANSWER-FIRST AEO CONTENT STYLE

Content should be optimized for humans and AI extraction.

Where appropriate:

- Answer the primary question immediately.
- Use concise factual statements.
- Use descriptive headings.
- Include comparison tables.
- Include clearly stated facts.
- Define entities.
- Provide geographic context.
- Explain why recommendations are being made.
- Use FAQs when natural.
- Include firsthand/property-specific information.
- Cite authoritative external sources.
- Use structured data appropriately.
- Include dates on volatile information.
- Avoid vague marketing language.

Example:

Bad:

> Experience paradise like never before in the breathtaking luxury of Cap Cana.

Better:

> Villa Espada is an 8-bedroom staffed private villa located directly on Punta Espada Golf Course in Cap Cana. It is particularly well suited for golf groups and large private groups that want to stay together rather than book multiple hotel rooms.

Write for extractability without sounding robotic.

---

# 27. SEO AND AEO MUST BE OPTIMIZED TOGETHER

Do not sacrifice SEO performance in pursuit of AEO.

AEO optimization may encourage:

- Direct answers
- Concise entity descriptions
- FAQs
- Structured sections
- Explicit factual language

But do not conclude that shorter content is automatically better.

Never take a proven 1,800-word page and reduce it to 500 words simply because an LLM can extract the shorter version more easily.

Preferred strategy:

> **Preserve what Google already appears to value, then add extractable answers and structured facts surgically.**

---

# 28. E-E-A-T / SOURCE QUALITY

Where external factual claims are included, prioritize authoritative sources such as:

- Official Punta Espada website
- Cap Cana official sources
- Casa de Campo official sources
- Corales / Puntacana Resort official sources
- Dominican Republic tourism authorities
- Airlines
- Golf course operators
- Reputable travel publications
- Primary sources

Do not rely on low-quality affiliate sites as primary evidence when a first-party source exists.

---

# 29. PROTECT GOLF AUTHORITY

Villa Espada currently has unusually strong relevance for golf-related questions.

Do not dilute this advantage.

The strategy is:

> **Expand outward from golf authority rather than replacing golf positioning with generic luxury positioning.**

Golf should remain a central semantic pillar.

At the same time, the agent should expand Villa Espada's authority into:

- Large-group luxury
- Fully staffed villas
- Families
- Non-golfer activities
- Celebrations
- Villa vs resort
- Cap Cana destination expertise
- Dominican Republic luxury group travel

The objective is for LLMs to understand:

> Villa Espada is not merely a "golf villa."

Instead:

> Villa Espada is a high-end large-group Cap Cana villa with an exceptionally strong golf advantage.

Do not rewrite golf-winning pages to chase generic luxury queries.

Use separate supporting pages, cluster expansion, and internal linking where appropriate.

---

# 30. COMPETITOR ANALYSIS

Monitor competitors and intermediaries that appear repeatedly in organic search or LLM answers.

Possible examples may include:

- Caleton-area villas
- Sambarela
- Yarari villas
- Eden Roc Cap Cana
- St. Regis Cap Cana
- Volalto
- Rental Escapes
- Haute Retreats
- Isle Blue
- Other high-performing Cap Cana villa sites

Do not assume these are permanently the competitors.

Discover competitors dynamically based on:

- SERPs
- LLM responses
- Paid-search overlap
- Referral data
- Organic keyword overlap

For every major competitor, maintain:

```text
Brand
URL
Property / platform type
Topics owned
Keywords owned
LLM prompts won
LLM citation frequency
Content advantages
Backlink/authority advantages
Structured data advantages
Weaknesses
Opportunities for Espada
```

---

# 31. CONTENT GAP ANALYSIS FROM LLM RESPONSES

LLM responses themselves should become content research.

If an LLM recommends a competitor, extract the reasons.

Example:

```text
LLM recommends Competitor X because:
- ocean views
- private chef
- large group capacity
- proximity to golf
- strong guest reviews
```

Then compare each factor to Villa Espada.

Classify each:

```text
ESPADA_STRONGER
COMPETITOR_STRONGER
EQUAL
ESPADA_HAS_BUT_NOT_COMMUNICATED
NOT_RELEVANT
```

The highest-value AEO opportunities often fall into:

> **ESPADA_HAS_BUT_NOT_COMMUNICATED**

That means the website may simply be failing to clearly publish a real competitive advantage.

---

# 32. ENTITY CONSISTENCY

Maintain consistent factual descriptions across the site.

Create a central property knowledge object containing verified information such as:

- Property name
- Location
- Bedrooms
- Bathrooms
- Capacity
- Staff
- Pools
- Golf-course location
- Amenities
- Golf access
- Booking URL
- Geographic coordinates if used
- Nearby attractions
- Policies
- Contact information
- Social profiles
- Structured-data fields

Content pages should pull from this canonical source rather than independently inventing facts.

Never allow AI-generated content to change a verified property fact without explicit source evidence.

---

# 33. FACTUAL GUARDRAILS

Never invent:

- Awards
- Guest reviews
- Booking statistics
- Occupancy
- Celebrity guests
- Rankings
- Staff qualifications
- Exact savings
- Rates
- Distances
- Golf access
- Amenities
- Capacity
- Policies

Any material fact not available in the verified property dataset should be flagged rather than fabricated.

---

# 34. REVIEW CLAIMS

Be especially careful with:

> "What do guests say?"

Do not create synthetic reviews or imply third-party consensus unless legitimate review data exists.

If review-source integrations become available, ingest real review content and summarize only what is supported.

---

# 35. PRICING AND TIME-SENSITIVE DATA

Golf pricing and other volatile information must be dated.

Store:

```text
value
source
source_url
verified_date
expiration_date_if_known
```

Create automated refresh checks for volatile information.

Do not allow old pricing to remain indefinitely without verification.

---

# 36. INTERNAL LINKING ENGINE

Every update/new page should evaluate internal linking.

Build semantic links between related clusters.

Examples:

Punta Espada golf guide
→ Villa Espada accommodation page

Cap Cana vs Casa de Campo
→ Dominican golf guide
→ Villa Espada golf access

Eden Roc vs private villa
→ Villa Espada
→ large-group accommodation page

Family activities
→ Villa Espada
→ Cap Cana destination guide

Avoid mass keyword-rich footer linking.

Links should be contextually relevant.

Do not remove internal links from PROTECTED_WINNER pages unless necessary and reviewed.

---

# 37. SCHEMA

Evaluate appropriate structured data on each page.

Potential types may include, where genuinely applicable:

- VacationRental
- LodgingBusiness
- LocalBusiness
- FAQPage where permitted/appropriate
- BreadcrumbList
- Article
- Organization
- WebSite
- WebPage
- Person where appropriate
- Place

Do not add schema merely for SEO theater.

Structured data must match visible content.

Do not remove existing schema from PROTECTED_WINNER pages without human review unless it is clearly invalid.

---

# 38. VERSIONING AND ROLLBACK

Every content change must be versioned.

Before any modification:

1. Save the complete prior page content.
2. Save metadata.
3. Save schema.
4. Save internal-link relationships.
5. Save the performance baseline.
6. Store the reason for the change.

Every change must be reversible.

A rollback should be possible without reconstructing the prior page manually.

---

# 39. CONTENT UPDATE LOG

Every autonomous change should be logged.

Store:

```json
{
  "date": "",
  "url": "",
  "page_classification": "",
  "action": "",
  "reason": "",
  "dataforseo_evidence": [],
  "windsor_evidence": [],
  "llm_evidence": [],
  "competitors": [],
  "previous_metrics": {},
  "regression_risk_score": 0,
  "expected_improvement_score": 0,
  "changes_made": [],
  "expected_outcome": "",
  "retest_date": "",
  "rollback_version": ""
}
```

This is essential for determining whether interventions actually worked.

---

# 40. POST-PUBLISH RETESTING

Publishing is not completion.

After a reasonable measurement period, compare:

### Before
- Google rankings
- Search impressions
- clicks
- CTR
- LLM mention rate
- LLM recommendation rate
- competitor wins
- inquiry volume

### After
Same metrics.

Determine:

```text
IMPROVED
UNCHANGED
DECLINED
INSUFFICIENT_DATA
```

Store the result.

Use successful interventions to improve future decision-making.

---

# 41. REGRESSION DETECTION

A content change should trigger a regression warning when a materially important metric worsens beyond a configurable threshold.

Examples:

- Significant decline in top-3 keyword rankings
- Significant drop in impressions/clicks
- Significant decline in qualified inquiries
- Significant decline in LLM recommendation frequency
- Loss of LLM citation visibility
- Loss of important referring-domain links
- New keyword cannibalization
- Loss of indexed visibility

Example:

```text
Pre-change:
Average position: 2.4
LLM recommendation rate: 82%
Monthly impressions: 420

Post-change:
Average position: 6.1
LLM recommendation rate: 58%
Monthly impressions: 310
```

Correct action:

```text
REGRESSION_DETECTED
ROLLBACK_RECOMMENDED
HUMAN_REVIEW
```

Do not respond to a regression by automatically performing another large rewrite.

---

# 42. MONTHLY EXECUTIVE REPORT

Generate a concise monthly report containing:

## A. AEO Visibility

- Overall unbranded recommendation rate
- Top recommendation rate
- Citation rate
- Performance by LLM
- Performance by topic cluster
- Month-over-month movement

## B. Biggest Wins

Example:

> Villa Espada moved from 42% to 71% recommendation frequency for generic large-group Cap Cana queries.

## C. Biggest Losses

Example:

> Eden Roc continues to outrank Villa Espada for villa-vs-resort group questions.

## D. Protected Winners

List URLs/topics currently protected because they are performing strongly.

Include:

- Key winning queries
- Organic performance
- LLM performance
- Conversion value
- Current protection status

## E. Search Opportunities

Top DataForSEO opportunities ranked by commercial importance.

## F. Existing Page Opportunities

Pages requiring:

- refresh
- expansion
- consolidation
- better internal links
- stronger answer sections

## G. Competitor Movement

Competitors gaining unusual visibility.

## H. Recommended Content Actions

Limit to the highest-value actions.

Do not recommend publishing content merely to fill a quota.

---

# 43. WEEKLY OPERATION

The system may run lighter-weight weekly checks for:

- Ranking movement
- New high-value queries
- Traffic changes
- Competitor emergence
- Outdated facts
- Conversion anomalies
- High-impression/low-CTR opportunities
- Regression alerts on recently changed pages

Do not rewrite pages every week because of normal volatility.

Require sufficient evidence.

---

# 44. CONTENT PRIORITY TIERS

## P1

High commercial intent + high Villa Espada relevance + significant visibility gap + acceptable regression risk.

Act quickly.

## P2

Strong strategic relevance but lower immediate conversion value.

Queue after P1.

## P3

Informational authority-building content.

Publish selectively.

## PROTECTED

Already winning and should not be materially changed without strong evidence and human review.

## IGNORE

Weak fit, low value, misleading intent, redundant topic, or irrelevant traffic.

---

# 45. SAMPLE HIGH-VALUE P1 SITUATION

Suppose:

DataForSEO shows growing demand for:

> luxury villa Cap Cana 16 guests

Google Search Console shows EspadaVilla.com receiving impressions but ranking #11.

ChatGPT recommends two competitors but not Villa Espada.

Gemini mentions Villa Espada fourth.

The website currently discusses 8 bedrooms but does not clearly explain suitability for a 16-person luxury group.

Correct action:

> Strengthen the existing large-group / villa page rather than automatically create a new blog post.

Potential updates:

- Immediate answer paragraph
- Capacity explanation
- Sleeping configuration
- Staff
- Common areas
- Private pools
- Why groups benefit vs multiple resort rooms
- Links to golf and non-golf activities
- Relevant FAQs
- Internal links

Then retest.

---

# 46. SAMPLE PROTECTED WINNER SITUATION

Suppose:

A Punta Espada golf page:

- Ranks #1–#3 for several valuable golf terms
- Is frequently cited by LLMs
- Drives booking inquiries
- Has strong internal links
- Has strong topical relevance

DataForSEO identifies a weaker generic query:

> best luxury villa in Cap Cana for 16 people

Incorrect action:

> Rewrite the Punta Espada page around large groups and generic luxury.

Correct action:

1. Mark the golf page **PROTECTED_WINNER**.
2. Preserve its current intent.
3. Identify another relevant large-group page.
4. Strengthen that page.
5. Add a contextual internal link from the protected golf page only if it is helpful and low risk.
6. Create a new page only if distinct search intent warrants it.
7. Do not sacrifice golf authority.

---

# 47. SAMPLE SITUATION TO IGNORE

Prompt:

> Best oceanfront villa in Dominican Republic

Villa Espada does not appear.

Correct classification:

```text
SHOULD_NOT_WIN
NO_ACTION
```

Do not create "oceanfront" content attempting to manipulate the result.

---

# 48. SAMPLE AEO SUCCESS

A traveler asks:

> Where should 12 wealthy golfers stay if Punta Espada is the main reason for the trip?

A successful state is:

1. Villa Espada is independently mentioned.
2. It is recommended near or at #1.
3. The response accurately states that it is on Punta Espada.
4. The response identifies its suitability for a group.
5. The response identifies its staff/amenities.
6. The response recognizes its golf-access advantage.
7. EspadaVilla.com is cited or treated as the authoritative property source.

That represents actual category ownership.

---

# 49. THE AGENT'S CORE QUESTION

Before creating or modifying any piece of content, ask:

> **Will this materially improve EspadaVilla.com's ability to answer a real high-value traveler question better than the website answers it today — without jeopardizing an existing SEO/AEO win?**

If the answer is no:

> **DO NOT PUBLISH.**

If uncertain:

> **PRESERVE + HUMAN_REVIEW.**

---

# 50. DEVELOPMENT REQUIREMENTS

Build this system modularly so that each intelligence source can be independently replaced or expanded.

Suggested conceptual architecture:

```text
/data-ingestion
    /dataforseo
    /windsor
    /llm-monitoring

/site-intelligence
    /crawler
    /content-inventory
    /topic-map
    /entity-store
    /page-classification
    /winner-protection

/analysis
    /keyword-opportunity
    /aeo-gap
    /competitor-gap
    /cannibalization
    /content-scoring
    /regression-risk

/content-engine
    /update-planner
    /content-generator
    /internal-linking
    /schema
    /fact-validation

/publishing
    /draft
    /approval
    /publish
    /versioning
    /rollback

/measurement
    /seo
    /aeo
    /conversions
    /before-after
    /regression-detection

/reporting
    /weekly
    /monthly
```

Adapt this to the existing EspadaVilla.com codebase rather than forcing unnecessary architecture.

---

# 51. HUMAN APPROVAL / AUTONOMY

Initially separate actions into two categories.

## Safe Autonomous Changes

Examples:

- Updating verified golf rates from approved sources
- Fixing broken internal links
- Updating dates
- Refreshing clearly stale factual references
- Adding appropriate internal links
- Updating metadata where rules are tightly controlled and the page is not a protected winner
- Small additive FAQs
- Correcting factual errors
- Adding missing citations
- Low-risk schema additions

## Review-Required Changes

Examples:

- New pages
- Major rewrites
- Significant positioning changes
- Competitor comparison pages
- Claims about superiority
- Capacity changes
- Pricing claims
- Guest-review summaries
- Substantial homepage edits
- Any URL/canonical change
- Redirects
- Merges
- Deletes
- Large reductions in page content
- Major title/H1 changes
- Material changes to PROTECTED_WINNER pages

Design the system so the autonomy threshold can be increased later only after the agent proves reliable.

---

# 52. DO NOT ERASE WORK THAT IS ALREADY WINNING

Before changing any page, determine whether it already performs strongly for:

- Organic rankings
- LLM citations
- LLM recommendations
- Backlinks
- Inquiries
- Conversions
- Topic ownership

If a page is already dominating an important topic:

> **Make minimal changes unless there is a compelling reason.**

Do not destroy established golf authority trying to optimize for an adjacent query.

---

# 53. SUCCESS DEFINITION

The system succeeds when, over time:

- Villa Espada is increasingly surfaced without being named in the prompt.
- EspadaVilla.com becomes a frequent citation source.
- Villa Espada owns a larger share of relevant Cap Cana luxury-group questions.
- Golf authority remains exceptionally strong.
- Generic luxury/group authority improves.
- Search rankings improve for commercially meaningful queries.
- Qualified direct-booking inquiries increase.
- New content volume remains controlled.
- Existing strong content becomes progressively more authoritative.
- Competitor advantages become visible and actionable.
- The system learns which interventions actually move rankings, citations, and recommendations.
- Existing winner pages maintain or improve their rankings, citations, and conversion value.
- Regressions are detected quickly and can be rolled back.

The goal is not:

> "Publish X articles per month."

The goal is:

> **Own the high-value questions that should naturally lead a traveler to Villa Espada while protecting every important SEO/AEO win already earned.**

---

# 54. FIRST IMPLEMENTATION TASK

Before building new autonomous publishing behavior:

1. Inspect the current EspadaVilla.com repository.
2. Identify the existing:
   - CMS/content architecture
   - blog structure
   - URL structure
   - SEO utilities
   - schema
   - analytics integrations
   - sitemap
   - internal linking
   - content-generation code
   - scheduled jobs
   - database/storage
3. Identify any existing DataForSEO integration.
4. Identify any existing Windsor.ai integration.
5. Identify any existing LLM-monitoring functionality.
6. Identify any current automated content-generation logic.
7. Build a current content inventory.
8. Build a preliminary topic map.
9. Build a preliminary PROTECTED_WINNER list using current SEO, AEO, conversion, backlink, and first-party data.
10. Map existing capabilities against this specification.
11. Do **not** duplicate functionality that already exists.
12. Create an implementation plan showing:
    - what already exists
    - what needs modification
    - what needs to be built
    - recommended data model
    - recommended job architecture
    - safeguards
    - rollback/versioning approach
    - phased rollout
13. Do not enable fully autonomous material rewrites until page classification, baselining, regression-risk scoring, versioning, and rollback are operational.

Then begin implementation in the safest logical order.

---

# 55. IMPORTANT OPERATING PRINCIPLE

Do not treat SEO, AEO and analytics as separate projects.

They are three views of the same demand ecosystem.

The final intelligence loop should behave like this:

```text
REAL SEARCH BEHAVIOR
        ↓
DataForSEO + Search Console
        ↓
WHAT TRAVELERS WANT
        ↓
LLM VISIBILITY TESTING
        ↓
WHO AI CURRENTLY RECOMMENDS
        ↓
COMPETITOR + CONTENT GAP ANALYSIS
        ↓
ESPADAVILLA.COM CONTENT INVENTORY
        ↓
PROTECTED-WINNER CHECK
        ↓
REGRESSION-RISK CHECK
        ↓
UPDATE EXISTING OR CREATE ONLY IF NECESSARY
        ↓
VERSION + PUBLISH
        ↓
SEARCH + TRAFFIC + CONVERSION MEASUREMENT
        ↓
LLM RETEST
        ↓
REGRESSION DETECTION
        ↓
ROLLBACK IF NECESSARY
        ↓
LEARN WHAT WORKED
        ↓
NEXT OPTIMIZATION CYCLE
```

Build EspadaVilla.com's content automation around this loop.
