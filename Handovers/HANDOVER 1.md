# HANDOVER 1 — AEO measurement fixes + full website AEO build roadmap — 2026-10-11

Session: Cowork, 2026-10-11. Scope: espadavilla.com (booking site) AEO visibility.
Repos/paths referenced:
- Blog agent + probe: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- Live site source (espadavilla-com repo checkout): `C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE`
- Supabase: `qqjrujrrqxtfsuikakuu` (espadavilla)
- Monthly review doc (Claude project): `claude/aeo-monthly-review-2026-10-11.md`

Note on location: older handovers live in `docs\HANDOVER-*.md`. Per Rob's standing rule, numbered
handovers now go in `Handovers\` at the repo root, starting with this file.

---

## 0. What was done this session

1. **Manual AEO scan** `20261011_192858`: 192 calls, 0 API errors, $5.16, 35 min.
2. **Oct 16 scheduled review skipped.** Trigger `trig_015YKba3tnjz87xqAMtYhLru` cron was temporarily
   changed to `0 15 16 1-9,11,12 *` (next run 2026-11-16). A self-reminder
   (`trig_014wHz47Czee8UqFE8xSiqDu`, fires 2026-10-17 13:00 UTC) restores it to `0 15 16 * *`.
   If that reminder doesn't fire, restore the cron by hand. Otherwise October will be skipped
   every year.
3. **Fix #9: Gemini citations were never counted** (FIXED in code + DB backfilled). See §1.
4. **Fix #10: Claude/Perplexity truncated answers counted as misses** (FIXED in code. DB flag
   backfill PENDING, see §1.3).
5. **Models pinned** in the probe so engines can't silently change between scans.
6. Test run of the patched probe (claude+gemini, 24 calls, `--no-db`, $1.05): 0 truncations,
   Gemini citations registering. Local test file left behind: `aeo_raw_20261011_201811.jsonl`
   (untracked, safe to delete).

---

## 1. Measurement fixes (#9, #10): details

### 1.1 Root cause #9: Gemini citations
DataForSEO returns Gemini grounding sources as Google redirect URLs
(`https://vertexaisearch.cloud.google.com/grounding-api-redirect/...`). The real domain is in the
annotation `title` field (e.g. `espadavilla.com`). The probe took the domain from the URL host,
so Gemini could never register a citation of espadavilla.com.
Evidence: 44 of 48 Gemini rows in the Oct scan had only vertexaisearch domains. Titles for
"What is Villa Espada" included `espadavilla.com | airbnb.com | vrbo.com | youtube.com`.

Code fix (`scripts\aeo-probe.ts`): new `citationDomain()` uses `title` when the URL host is in
`REDIRECT_HOSTS` and the title looks like a domain. `analyze()` now maps citations through it.

DB backfill (DONE, 96 Gemini rows across both scans): recomputed `cited_domains`, `cited`, and
`competitors_cited` from the stored `citations` jsonb using the same rule.
Result: Gemini unbranded cited **28/44 (Sep) and 24/44 (Oct)**, previously recorded as 0/44.
The "Gemini is a citation gap" conclusion in memory and older handovers was wrong.
It was a measurement bug. The Aug 19 baseline ("Gemini cited 0/24") came from the older
`aeo_probe.py` and probably had the same bug. Not verified; treat it as unreliable.

### 1.2 Root cause #10: truncated answers
`max_output_tokens` was 1024 for every engine. Claude (web-search tool use) and Perplexity
(sonar-reasoning-pro) spend output tokens before writing the answer. At 1024:
- Oct scan: 14 Claude answers were only a preamble, e.g. "I'll search for 8-bedroom villa
  rentals in Cap Cana." The API's reasoning item said "This part of the response was interrupted
  before it finished." A live test at 1024 used 1,189 output tokens and was cut off. At 4096
  the full answer came back and mentioned Villa Espada.
- Sep scan: 13 Perplexity answers had empty text but 15 citations each.
These rows were stored with `error = null` and `mentioned = false`, so they counted as misses.

Code fix (`scripts\aeo-probe.ts`):
- `EngineCfg.maxTokens` per engine: chatgpt 1024, **claude 4096**, gemini 1024, perplexity 1024.
  Perplexity stays at 1024 for comparability; Oct had 0 truncations.
- `isTruncated()`: answer < `MIN_ANSWER_CHARS` (200) OR any section says "interrupted before it
  finished".
- `runOne()` retries once at 2x tokens. If still truncated it throws, and the row is saved with
  `error = 'TRUNCATED: …'`, which KPI queries (`error is null`) already exclude.
- Cost is summed across both attempts.

### 1.3 PENDING: flag the 27 historical truncated rows
This UPDATE timed out 3 times through the Supabase MCP (no locks, no triggers on the table; most
likely an unanswered approval prompt). Run it next session through the Supabase MCP and approve it:

    update aeo_snapshots
    set error = 'TRUNCATED (backfill 2026-10-11): answer < 200 chars at max_output_tokens=1024; excluded from KPIs'
    where error is null
      and length(coalesce(response_text,'')) < 200
      and scan_id in ('20260917_161631','20261011_192858');
    -- expect 27 rows: claude/20261011 = 14, perplexity/20260917 = 13

Verify: `select scan_id, engine, count(*) from aeo_snapshots where error like 'TRUNCATED%' group by 1,2;`

### 1.4 Model pins (new)
Auto-discovery switched Claude from `claude-sonnet-5` (Sep) to `claude-sonnet-5-5` (Oct) without
any notice, so Claude's 4 → 14 jump is partly a model change. Pins now: chatgpt `gpt-4o`,
claude `claude-sonnet-5-5`, gemini `gemini-3.8-flash`, perplexity `sonar-reasoning-pro`.
Changing a pin is allowed. Log it in the monthly review as a "model break".

### 1.5 Git (Rob runs)
    cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
    git add scripts/aeo-probe.ts "Handovers/HANDOVER 1.md"
    git commit -m "AEO probe: count Gemini redirect citations, per-engine max tokens + truncation retry, pin models; add Handover 1"
    git push

---

## 2. Corrected KPIs (truncated answers excluded, Gemini citations fixed)

Unbranded only. n = valid answers (answers ≥ 200 chars, no API error).

| Engine | Sep mentioned | Oct mentioned | Sep cited | Oct cited |
|---|---|---|---|---|
| ChatGPT (gpt-4o) | 6/44 (14%) | 7/44 (16%) | 6/44 | 7/44 |
| Claude | 4/44 (9%) | 14/30 (47%) | 3/44 | 12/30 |
| Gemini | 25/44 (57%) | 24/44 (55%) | 28/44 | 24/44 |
| Perplexity | 22/31 (71%) | 29/44 (66%) | 25/31 | 36/44 |
| **Total** | **57/163 (35%)** | **74/162 (46%)** | 62/163 (38%) | 79/162 (49%) |

How to read it:
- **ChatGPT is the real weak engine** (16%). Every other engine mentions the villa in about half
  or more of its answers. Most of the roadmap targets ChatGPT.
- Claude's jump is partly a model change (see §1.4). Treat Oct as the new Claude baseline.
- Perplexity is flat to slightly down on a valid-answer basis (the earlier "22 → 29" was inflated
  by Sep's empty answers).
- Gemini is strong on mentions and citations. Its September → October dip is noise-level.

Clusters (unbranded, valid answers, mentioned Sep → Oct):
cap_cana_golf 4/10 → 9/12 · large_groups 13/25 → 17/24 · luxury_cap_cana 10/23 → 15/20 ·
staffed_villas 6/10 → 9/10 · eden_roc_alternatives 0/8 → 3/8 · direct_booking 0/8 → 2/8 ·
celebrations 6/12 → 6/12 · **punta_espada_golf 16/32 → 13/30** · dr_golf_trips 2/18 → 0/19 ·
capcana_vs_casadecampo 0/10 → 0/11 · families 0/3 → 0/4 · destination_expertise 0/4 → 0/4.

Share of voice (unbranded mentions, Oct): Eden Roc 91 · Villa Espada 74 · Casa de Campo 36 ·
Sanctuary 33 · St. Regis 25 · Marriott H&V 10.

Branded accuracy (Oct):
- Gemini and Perplexity: correct (Fairway 5, 6-or-8 BR, 16/22 guests).
- Claude: says "8-bedroom" only, and in the test run "sleeping 21 guests" (should be up to 22).
  It also pulls in a TripAdvisor "Villa Espada" guesthouse in Caibarién, **Cuba**, and finds
  no independent guest reviews.
- ChatGPT "What is Villa Espada": vague and generic, no facts.
- Gemini "worth it": says guests "consistently highlight" things in reviews. Claude and
  Perplexity both say no independent reviews exist. Real third-party reviews would settle it.

---

## 3. Ground rules for every task below

1. **Refresh before create.** Every task below edits an existing URL. Create no new pages.
2. **Never fabricate** reviews, awards, distances, or stats. Anything marked VERIFY must be
   confirmed (official source, Google Maps measurement, or Rob) before it goes live.
3. **Lane rule:** generic "best Caribbean / DR golf" content belongs to golfvilla.com. On
   espadavilla.com every answer is about staying at Villa Espada / Cap Cana / Punta Espada.
4. **Facts canon:** "6- or 8-bedroom" (never "8" alone), up to 22 guests, Fairway 5 of Punta
   Espada, Caribbean Sea (never Atlantic), GolfWeek #1 (never Golf Digest as the #1 source),
   member-guest rate is Punta Espada only (Las Iguanas at regular rates), booked via the butler.
   Rates (rates.html): low $2,500 (6BR) / $3,000 (8BR); peak $4,000 / $4,500;
   holiday $10,000 / $12,000; +$100/person/night above 16 guests.
5. **Two kinds of page.** Check which kind before editing:
   - **DB-backed blog posts** (rendered from Supabase `blog_post_drafts`, status 'published').
     Edit BOTH the HTML file in the website repo AND the Supabase row (`edited_content` is the
     render source; also `faq`, `summary`, `body_html` if present). The pattern is the same as
     the 2026-09-17 handover (`docs\HANDOVER-AEO-FIXES-2026-09-17.md`). Don't trigger a drain
     republish; leave status 'published'.
     DB-backed slugs: staying-at-villa-espada-day-on-property, tennis-and-padel-cap-cana,
     equestrian-and-polo-cap-cana, caleton-beach-club-cap-cana, getting-around-cap-cana,
     group-golf-stay-cap-cana-member-rates-tee-times, cap-cana-birthday-villa-milestone-celebrations,
     sargassum-cap-cana, punta-espada-golf-course-playing-from-villa-espada,
     punta-espada-restaurant-eden-roc-playing-from-villa-espada, cap-cana-vs-casa-de-campo-comparison,
     staying-at-villa-espada, golf-course-cap-cana-transportation-villa-espada-playbook,
     cap-cana-vs-punta-cana, how-far-is-cap-cana-from-punta-cana, cap-cana-casa-de-campo-golf-base,
     punta-espada-golf-villa-luxury-group, cap-cana-direct-booking-villa-espadavilla,
     things-to-do-villa-espada-non-golf-family, cap-cana-golf-residences-villa-espada-playbook.
   - **Static core pages** (everything else in the repo): edit the HTML only.
6. **Every edited page:** bump `dateModified` in JSON-LD, keep visible FAQ text and FAQPage
   JSON-LD word-for-word in sync, update `llms-full.txt` if the fact appears there, and keep the
   page in `sitemap.xml` with a new `<lastmod>`.
7. **Answer-first format** (what AI engines quote): put a 40–70 word direct answer right under
   the H1 or the target H2. Name Villa Espada and the concrete facts in the first sentence.
   Add the probe question as an FAQ entry using the probe's exact wording.
8. After each push: submit the changed URLs via IndexNow (key `3348bc6a409522753cec189cdfca4c19`,
   already deployed) and use GSC "Request Indexing" on the top 3 changed URLs.
9. Rob pushes all git. Give him the full commands.

---

## 4. BUILD ROADMAP: website upgrades for AEO

Order = expected AEO value ÷ effort. Each task lists: evidence → files → exact work → verify →
success metric (measured on the Nov 16 scan unless stated).
Site root below = `C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE`.

### PHASE A — Fact hygiene (do first; ~1 hour; prevents engines quoting wrong facts)

**A1. Stale taxi fare (2021)** — DB-backed post
- File: `blog\getting-around-cap-cana.html` lines ~177 and ~238 (both contain "2021"); Supabase
  row slug `getting-around-cap-cana` (`edited_content`, `faq`).
- Current text: "Taxis inside Cap Cana cost around $5 USD per ride as of September 2021".
- Work: replace it with a current, sourced figure. VERIFY with Rob or the villa butler. If there is
  no current figure, delete the price sentence and keep "your villa manager can arrange a trusted
  driver". Don't put a new number in without a source.
- Verify: `Select-String -Path blog\getting-around-cap-cana.html -Pattern '2021'` returns nothing;
  same check on the Supabase row:
  `select count(*) from blog_post_drafts where slug='getting-around-cap-cana' and coalesce(edited_content,body_markdown) ilike '%2021%';` → 0.

**A2. Wrong per-person math** — DB-backed post
- File: `blog\cap-cana-vs-casa-de-campo-comparison.html` + Supabase slug `cap-cana-vs-casa-de-campo-comparison`.
- Current: "At low-season rates starting at $2,500/night for up to 22 guests, Villa Espada runs
  ~$114 per person" and "Peak-season rates start at $4,000/night (~$182/person/night)".
  Both divide the 6BR rate by 22 guests. The base rate covers 16 guests, with +$100/person/night
  above 16.
- **RATE QUESTION FOR ROB, must be answered first:** do groups of 17–22 pay the 8BR rate +
  $100/person (direct-booking post says "guests 17 to 22, in the full estate only") or the 6BR
  rate + $100 (playbook post: "A 20-person group in peak season pays $4,000 plus (4 x $100) =
  $4,400")? These two published posts contradict each other. rates.html only says "+$100 per
  person per night for each guest above 16".
- Correct figures if 17–22 = 8BR + $100 (computed, USD per person per night):

  | Season | 12 guests (6BR) | 16 guests (6BR) | 16 guests (8BR) | 20 guests (8BR) | 22 guests (8BR) |
  |---|---|---|---|---|---|
  | Low | 208 | 156 | 188 | 170 ($3,400/nt) | 164 ($3,600/nt) |
  | Peak | 333 | 250 | 281 | 245 ($4,900/nt) | 232 ($5,100/nt) |
  | Holiday | 833 | 625 | 750 | 620 ($12,400/nt) | 573 ($12,600/nt) |

  If Rob answers "6BR + $100" instead, recompute; don't publish the table above unchanged.
- Then fix the same math wherever it appears. Find it with:
  `Select-String -Path blog\*.html,compare\*.html -Pattern '\$1(14|82)|per person per night|/person/night'`
  Known spots: cap-cana-vs-punta-cana ("$4,000 night divided by 20 guests is $200 per person"),
  cap-cana-golf-residences-villa-espada-playbook ("$4,000 plus (4 x $100) = $4,400"),
  cap-cana-birthday-villa-milestone-celebrations ("20 guests ... $4,000 peak rate ... $1,000 pe[r person]").
- Verify: every per-person number on the site traces to the rate card + surcharge rule.

**A3. Summer green fees expire Nov 1**
- Posts quote "summer rates (July 22 to October 31) $495 morning / $395 afternoon" as current
  (punta-espada-golf-course-playing-from-villa-espada and others swept on 9/17).
- Work (do on or right after Nov 1): change the wording so the summer rate reads as
  "summer 2027 (July 22–Oct 31): rates TBC; 2026 summer rates were $495/$395". Keep peak
  $550/$440 (valid Nov 1 2026–Apr 30 2027). VERIFY 2027 summer rates at
  golfpuntaespada.com/rates before stating them.
- Find: `Select-String -Path blog\*.html,golf-courses\*.html,golf-rates.html,llms-full.txt -Pattern '495'`.
  Sync the DB-backed rows (flagship, playbook, restaurant) the same way as on 9/17.

**A4. Inconsistent cart time to the tee**
- `blog\hotels-near-cap-cana-punta-espada.html` says "three-minute golf-cart ride ... from the first
  tee" (line ~166) AND "five-minute cart ride to the first tee" (line ~175). The flagship post
  says "three-minute cart ride from the front door".
- Work: VERIFY the true time with Rob and use one number everywhere. Find all of them:
  `Select-String -Path *.html,blog\*.html,compare\*.html,llms*.txt -Pattern '(three|five|3|5)-minute'`.

**A5. "8BR luxury villa" in the shared footer (20 pages)**
- The footer brand blurb says "8BR luxury villa on Punta Espada Fairway 5". The canon is
  "6- or 8-bedroom", and this footer is part of why Claude says "8-bedroom" only.
- Work: replace with "6- or 8-bedroom luxury villa on Punta Espada Fairway 5" in all 20 files.
  `Select-String -Path *.html,blog\*.html,compare\*.html,golf-courses\*.html,destinations\*.html,experiences\*.html,occasions\*.html,itineraries\*.html -Pattern '8BR luxury villa'`
  Do it with a python read-modify-write that counts replacements (expected 20). Check the
  blog-agent footer template too, so new posts don't bring it back:
  `Select-String -Path "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\**\*.ts" -Pattern '8BR'`.

**A6. Third-party listings with wrong capacity**
- In the test run Claude said "sleeping 21 guests". That phrase is not on espadavilla.com, so it
  comes from a third-party listing (Airbnb/VRBO/marketplace).
- Work: Rob checks every live listing (Airbnb, VRBO, Marriott H&V if listed, Google Business
  Profile) for capacity, bedrooms, and "Fairway 5". All must say 6 or 8 bedrooms, up to 22 guests.

### PHASE B — Win "where to stay at / near Punta Espada" (TOP PRIORITY; ~half day)

Evidence (Oct scan):
- "Best places to stay near Punta Espada golf course": Villa Espada mentioned **0/12** on
  ChatGPT, Gemini, Perplexity. Perplexity: "The best place to stay near Punta Espada Golf Club is
  The St. Regis Cap Cana Resort — it is directly adjacent to the course ... essentially next to
  Punta Espada." It lists Eden Roc at 0.5–0.7 mi. Gemini: "Eden Roc ... widely considered the
  premier pairing for a Punta Espada trip."
- "Where can a group stay and get preferred Punta Espada golf access?": ChatGPT and Gemini name
  Eden Roc / Sanctuary "golf packages" and "preferential tee times". The member-guest rate
  (~$200/golfer/round saving) never appears.
- Classification: ESPADA_HAS_BUT_NOT_COMMUNICATED. The villa is ON Fairway 5 and has a private
  member-guest rate, but the pages don't say it in the form engines quote.
- The site already has the right URLs. Refresh them; don't create new ones.

**B1. Refresh `blog\where-to-stay-punta-espada.html`** (static core page; dateModified 2026-07-06)
- Title now: "Where to Stay Near Punta Espada: Hotels & Villas (2026)". Keep the URL. Change the
  title to "Where to Stay Near Punta Espada Golf Course (2026–27): Villa vs Hotels".
- Directly under the H1, add an answer-first block (40–70 words). Draft:
  > "The closest place to stay to Punta Espada Golf Course is Villa Espada, a private 6- or
  > 8-bedroom villa on Fairway 5 of the course, about [VERIFY: N]-minute golf-cart ride to the first
  > tee. It sleeps up to 22 guests with a private chef, butler and two golf carts, and every stay
  > includes the Punta Espada member-guest discounted rate (about $200 less per golfer per round).
  > Nearby hotels include the St. Regis Cap Cana, Eden Roc Cap Cana and Sanctuary Cap Cana."
- Add an H2 "Distance to Punta Espada: villa vs hotels" with an honest table:
  property · type · distance to the Punta Espada clubhouse/first tee · golf access terms · group fit.
  Rows: Villa Espada (on Fairway 5), St. Regis Cap Cana, Eden Roc Cap Cana, Sanctuary Cap Cana,
  Secrets/Hyatt Ziva Cap Cana. **VERIFY every distance in Google Maps (driving/cart distance to
  the Punta Espada clubhouse) and write down the method on the page ("distances measured in
  Google Maps, Oct 2026").** Do NOT copy Perplexity's "0.0–0.1 mi" for the St. Regis. If the
  St. Regis really is closer to the clubhouse than Villa Espada, say so and frame Villa Espada as
  "the only private villa ON the course". Accuracy beats spin, and engines check it against
  other sources.
- Add an H2 "How do you get preferred tee times at Punta Espada?". Plain answer: hotel guests
  book at published rates ($550 AM / $440 PM peak 2026–27) or buy hotel golf packages. Villa
  Espada guests get the member-guest discounted rate booked by the butler (Punta Espada only;
  Las Iguanas at regular rates). VERIFY whether Eden Roc / St. Regis packages include discounted
  green fees before saying they don't; if unknown, describe only what Villa Espada offers.
- FAQ: add these three questions with the probe's exact wording (visible FAQ + FAQPage JSON-LD,
  synced). Keep the 7 existing questions.
  1. "Best places to stay near Punta Espada golf course"
     → rephrase as "What are the best places to stay near Punta Espada Golf Course?"
  2. "What is the best place to stay for a Punta Espada golf trip?"
  3. "Where can a group stay and get preferred Punta Espada golf access?"
- Fix the footer "8BR" line (A5). Set dateModified to the edit date.

**B2. Refresh `blog\hotels-near-cap-cana-punta-espada.html`** (static; dateModified 2026-08-16)
- Fix A4 (3 vs 5 minutes).
- Add the same answer-first sentence under the H1. Its first section currently opens with the
  airport distance, which isn't what someone searching "hotels near Punta Espada" is asking.
- Add a link to where-to-stay-punta-espada with anchor text "where to stay near Punta Espada".

**B3. Refresh `blog\st-regis-cap-cana.html`** (static; dateModified 2026-07-08)
- Engines now treat the St. Regis as "the closest". This page is the one place on the site that
  ranks for St. Regis queries.
- Add an H2 "St. Regis vs staying on the Punta Espada course". Factual comparison: St. Regis
  (hotel rooms, resort amenities, published green fees) vs Villa Espada (on Fairway 5, private
  staff, member-guest rate, groups up to 22). Include the verified distance from B1.
- Add an FAQ: "Is the St. Regis Cap Cana close to Punta Espada?" Give a verified distance and
  mention Villa Espada as the on-course option.

**B4. `llms.txt` and `llms-full.txt`** (site root)
- Add one line near the top of each:
  "Closest lodging to Punta Espada Golf Course: Villa Espada sits on Fairway 5, [VERIFY]-minute
  cart ride to the first tee; the only private rental villa on the course."
  Use "only" ONLY if Rob confirms no other rentable villa sits on a Punta Espada fairway.
  Claude's test run listed "Palmas 78 ... on the 7th hole of Punta Espada" on VRBO, which
  suggests another rentable villa is on the course. If that's true, "only" is false.
  Check the flagship post title too ("The Only Private Villa on the Fairway",
  `blog\punta-espada-golf-villa-luxury-group.html`); change it if it isn't accurate.

**B5. Homepage schema** (`index.html`, LodgingBusiness JSON-LD)
- It already has geo, numberOfRooms, maximumAttendeeCapacity, amenityFeature. Add:
  - `"containedInPlace": {"@type":"Place","name":"Cap Cana","address":{...DO}}`
  - an `amenityFeature` entry `{"@type":"LocationFeatureSpecification","name":"Located on Fairway 5 of Punta Espada Golf Course","value":true}`
  - in `nearbyAttractions`, Punta Espada Golf Club with its official URL (golfpuntaespada.com).
- Validate with https://validator.schema.org and Google Rich Results Test before pushing.

Success metric (Nov 16): "Best places to stay near Punta Espada" ≥ 3/12 mentions across
ChatGPT/Gemini/Perplexity (from 0/12). punta_espada_golf cluster back above 16/30.

### PHASE C — Eden Roc vs villa / group economics (~2–3 hours; after A2 is answered)

Evidence: eden_roc_alternatives 0/8 → 3/8. ChatGPT, Claude and Gemini still answer "Eden Roc or
rent a villa?" generically with no named villa. Claude said outright: "the search for Cap Cana
villa rentals failed, so I can't give you current villa pricing." Eden Roc is the #1 competitor
entity (91 mentions vs 74).

**C1. `compare\cap-cana-villa-vs-eden-roc-hotel.html`** (static; updated 2026-09-17 with the
"Eden Roc vs a private villa for a large group" H2 and 2 FAQs)
- Add an answer-first block under the H1 (draft):
  > "For groups of 12 or more, a private villa usually costs less per person than Eden Roc and
  > keeps everyone under one roof. At Villa Espada, 16 guests in peak season pay about $250–$281
  > per person per night [use the A2 table] with a private chef, butler and golf carts included,
  > versus [VERIFY: current Eden Roc suite rate] per room at Eden Roc. Eden Roc is the better
  > fit for couples and small groups who want a hotel's restaurants and services."
- Recheck the "$281 pp vs $300+ pp room-only" math added on 9/17 against the A2 answer.
- Add a "Price per person by group size" table (from A2) with a footnote naming the source
  (rates.html, Oct 2026).
- VERIFY the Eden Roc rate from edenroccapcana.com or a booking site on a stated date, and write
  that date on the page. If it can't be verified, give Villa Espada's numbers only.
- Make sure the two probe questions appear word for word as FAQs:
  "Eden Roc Cap Cana vs private villa for a large group" and
  "Should a group stay at Eden Roc or rent a villa in Cap Cana?" (the 9/17 FAQs may already match;
  check).

**C2. `blog\eden-roc-cap-cana-guide.html`** (static) — add a short "Staying at Eden Roc with a
large group?" section linking to C1. Keep it neutral: this page should help Eden Roc searchers,
not attack Eden Roc.

**C3.** After A2, fix `blog\cap-cana-vs-casa-de-campo-comparison.html` (DB-backed). The
capcana_vs_casadecampo cluster is 0/11 mentions. It's a could_win prompt; the page should first
answer the destination question honestly (Casa de Campo = 3 Dye courses incl. Teeth of the Dog;
Cap Cana = Punta Espada + Las Iguanas), then say where Villa Espada fits.

Success metric: eden_roc_alternatives ≥ 5/8.

### PHASE D — Direct booking (should_win, 2/8) (~1–2 hours)

Evidence: "Is it better to book a Cap Cana villa directly or through Airbnb?" got 0 mentions on
all 4 engines in Oct, even after the 9/17 Airbnb H2 was added.
There are THREE overlapping pages on this intent:
`blog\cap-cana-direct-booking-villa-espadavilla.html` (DB-backed), `blog\luxury-villa-vs-airbnb.html`,
`blog\villa-espada-vs-airbnb.html`. Engines may be splitting signals across them.

- D1. Pick ONE canonical page for "book direct vs Airbnb". Recommendation:
  `cap-cana-direct-booking-villa-espadavilla` (newest, has the FAQ, DB-backed). Check GSC
  impressions for all three first (Windsor.ai `searchconsole`, or the GSC UI, last 90 days).
- D2. On the canonical page, put an answer-first block under the H1 (not just in the H2 halfway
  down): "Booking a Cap Cana villa directly with the owner usually avoids the 14–16% guest
  service fee Airbnb and VRBO add [VERIFY current Airbnb/VRBO fee ranges], gives you direct
  contact with the staff, and lets you confirm inclusions in writing. Villa Espada takes direct
  bookings at espadavilla.com with no booking fee …"
  (The page currently says "Commonly around 15%". Keep or update it, but VERIFY.)
- D3. On the other two pages: either 301 one into the canonical (vercel.json redirect + remove from
  sitemap.xml) or rewrite them to a different, non-overlapping angle and link to the canonical.
  Rob decides. Don't delete without a redirect.
- D4. Add the second probe question as an FAQ: "What is the best way to book a private Cap Cana villa?"

Success metric: direct_booking ≥ 4/8.

### PHASE E — Celebrations: birthday / bachelor (should_win) (~1–2 hours)

Evidence: "Best Cap Cana villa for a milestone birthday or bachelor party": ChatGPT 0/3,
Claude 0/3 (Gemini and Perplexity do mention it, so the content exists but isn't framed for
ChatGPT/Claude).
Pages: `blog\cap-cana-birthday-villa-milestone-celebrations.html` (DB-backed, mod 2026-09-09),
`blog\golf-bachelor-party-cap-cana.html` (static, mod 2026-05-16, among the oldest),
plus the `occasions\` folder and `occasions.html`.

- E1. Birthday post: add an answer-first block naming Villa Espada as a 6- or 8-bedroom staffed
  villa for milestone birthdays (chef-cooked celebration dinner, butler-run setup, up to 22 guests,
  "Welcome Event & Celebration Setup" is listed on rates.html for holiday stays; VERIFY whether
  it's included outside holidays).
  Remove stale macro stats that will date it: "tourism contributes an estimated $15 billion
  impact on GDP as of April 2026" and "Virtuoso projects trips over $50,000 will rise 35 percent
  for the 2026 to 2027 season". They add nothing for a guest and expire.
  Fix the "$4,000 peak rate ... 20 guests" math per A2. Sync Supabase.
- E2. Bachelor page: refresh (5 months old). Answer-first block for "golf bachelor party villa in
  Cap Cana", the member-guest golf rate, group-of-12/16 per-person math from A2, and a sample
  3-day golf schedule (Punta Espada ×2 + Las Iguanas ×1). Bump dateModified.
- E3. Add the probe question verbatim as an FAQ on BOTH pages:
  "What is the best Cap Cana villa for a milestone birthday or bachelor party?"
- E4. Cross-link the two pages, and link both from `occasions.html`.

Success metric: celebrations ≥ 8/12.

### PHASE F — Large groups, full staff, private chef (~2 hours)

Evidence:
- "Private villa in Cap Cana for a very large group with full staff": ChatGPT 0/3, Claude 0/3.
- "Best luxury villa rentals in Cap Cana with a private chef": ChatGPT 0/3.
- "Where can 16 adults stay together in Cap Cana?": Claude 0/1.
Pages: `blog\large-group-villa-cap-cana.html` (static, mod **2026-05-16**, the oldest key page),
`blog\private-chef-villa.html` (static, mod 2026-07-08; title is generic "What It's Like to Have a
Private Chef at Your Villa" and doesn't name Cap Cana or Villa Espada), `blog\what-is-included-cap-cana-villa.html`.

- F1. `large-group-villa-cap-cana.html`: answer-first block: "Villa Espada sleeps up to 22 guests
  in one private estate (6- or 8-bedroom configuration, 9 full and 2 half baths, 15,000+ sq ft),
  with a full staff included: private chef, personal butler/villa manager, daily maid service,
  private airport transfers and two 6-person golf carts." Add a staff table (role → what they
  do → included or extra). Add the probe questions as FAQs: "Where can 16 adults stay together
  in Cap Cana?" and "What is the best private villa in Cap Cana for a very large group with full
  staff?" Add the per-person table from A2. Bump dateModified (it's 5 months old).
- F2. `private-chef-villa.html`: change the title to "Private Chef Villa in Cap Cana: How Villa
  Espada's In-House Chef Works". Add an answer-first block naming Villa Espada, what the chef does
  (menus, groceries billed at cost + 15% service, no restaurant markup; about $50–$75 per person
  per day for food, from the direct-booking post; VERIFY it's current). Add the FAQ
  "What are the best luxury villa rentals in Cap Cana with a private chef?"
- F3. `bedrooms.html` / `property-facts.html`: make sure both state the capacity rule plainly in
  one sentence: "6-bedroom configuration up to 16 guests; full 8-bedroom estate up to 22 guests"
  (VERIFY with Rob; this is how Perplexity phrases it, and it should match the site word for word).

Success metric: large_groups ≥ 19/24; luxury_cap_cana ChatGPT ≥ 1/3 on the private-chef prompt.

### PHASE G — ChatGPT-specific: the weakest engine (16%) (~1–2 hours + waiting)

Evidence: ChatGPT (gpt-4o with web search via DataForSEO) mentions the villa in 7/44 unbranded
answers, against 47–66% on the other three engines. Its "What is Villa Espada?" answer is generic
with no facts, so it isn't retrieving espadavilla.com pages well.
Working assumption (not verified here): ChatGPT's web search leans heavily on Bing's index, so
Bing indexing of the key pages is the first thing to check.

- G1. Bing Webmaster Tools (bing.com/webmasters): confirm espadavilla.com is verified. If it
  isn't, verify it (import from GSC is fastest). Submit `https://www.espadavilla.com/sitemap.xml`.
- G2. In Bing URL Inspection, check that these are indexed: `/`, `/rates`, `/property-facts`,
  `/faq`, `/blog/where-to-stay-punta-espada`, `/blog/large-group-villa-cap-cana`,
  `/compare/cap-cana-villa-vs-eden-roc-hotel`, `/blog/cap-cana-direct-booking-villa-espadavilla`.
  Request indexing for any that aren't. Record the result in the next handover.
- G3. IndexNow is already live (key file at site root). After every push in Phases A–F, submit
  the changed URLs:
      $body = @{ host='www.espadavilla.com'; key='3348bc6a409522753cec189cdfca4c19';
        keyLocation='https://www.espadavilla.com/3348bc6a409522753cec189cdfca4c19.txt';
        urlList=@('https://www.espadavilla.com/blog/where-to-stay-punta-espada') } | ConvertTo-Json
      Invoke-RestMethod -Method Post -Uri 'https://api.indexnow.org/indexnow' -ContentType 'application/json' -Body $body
  (Add every changed URL to urlList. Check the host matches the canonical www/non-www form used in sitemap.xml.)
- G4. `robots.txt`: confirm it does NOT block `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`,
  `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Bingbot`. Read it; change it only if something
  is blocked.
- G5. Check Vercel/Cloudflare bot protection isn't serving those crawlers a challenge page
  (Vercel firewall / attack mode). Test: `curl -A "OAI-SearchBot" -I https://www.espadavilla.com/`
  should return 200, not 403/429.

Success metric: ChatGPT unbranded mentions ≥ 10/44.

### PHASE H — Entity + independent reviews (ongoing; Rob-led)

Evidence: Claude and Perplexity both say there are no independent guest reviews. Claude mixes
in a TripAdvisor "Villa Espada" guesthouse in Caibarién, Cuba. Gemini claims guest reviews exist.
Third-party reviews are the main thing that would make "worth it" answers confident.

- H1. Real reviews only. Ask past guests (from the leads/booking records) to post on the Google
  Business Profile (kgmid /g/11npbfm9tr is already in sameAs) and, if listed, TripAdvisor /
  Airbnb / VRBO. A short email after checkout with direct review links. **Never write, buy or
  stage reviews.** Don't add AggregateRating schema until there are real reviews on a public
  platform to point to.
- H2. Disambiguation: add one line to `about.html` and `property-facts.html`:
  "Villa Espada is a private villa on Fairway 5 of Punta Espada Golf Course in Cap Cana,
  Dominican Republic. It is not affiliated with the Villa Espada guesthouse in Caibarién, Cuba."
- H3. `sameAs` in the homepage LodgingBusiness / Organization JSON-LD currently has YouTube,
  WhatsApp and the Google kgmid. Add every official profile that exists and that Rob controls:
  Instagram, Facebook, TripAdvisor, Airbnb, VRBO listing URLs, plus puntaespadavilla.com
  (Rob's feeder site). Only real, live URLs.
- H4. Press page: the PR pickups (GlobeNewswire, EIN, Pinion/ACCESS) are already on
  `press.html` via the monthly sweep. Make sure `press.html` is linked from the footer
  (third-party mentions help engines trust the entity).

Success metric: branded "worth it" answers on Claude/Perplexity cite at least one independent
review source by the Dec scan.

### PHASE I — Lower priority (could_win; do after A–H)

- I1. Families: "Best private villa for four families traveling together in the Caribbean" 0/4.
  "Caribbean" is golfvilla's category lane. On espadavilla, only refresh
  `blog\things-to-do-villa-espada-non-golf-family.html` (DB-backed, 0 GSC impressions) and
  `blog\cap-cana-with-kids.html` with a bedroom-allocation example for 4 families (e.g. 4 × 2-bedroom
  pairs in the 8BR estate). VERIFY the bedroom layout from bedrooms.html.
- I2. "Punta Cana vs Cap Cana: where should you stay" 0/4: `blog\cap-cana-vs-punta-cana.html`
  (DB-backed) needs an answer-first block. Also fix its "$4,000 night divided by 20 guests"
  math (A2).
- I3. "Group of 12 golfers in the DR" / "Punta Espada vs Teeth of the Dog": Casa de Campo wins on
  golf concentration, and Perplexity already cites golfvilla.com there. This is golfvilla's lane.
  NO espadavilla content. Leave it to the golfvilla agent.

### PHASE J — Measurement & process follow-ups

- J1. Run the §1.3 backfill UPDATE (27 rows) and approve it.
- J2. Update the monthly review prompt (trigger `trig_015YKba3tnjz87xqAMtYhLru`, via `update_trigger`):
  (a) KPI SQL must also exclude `error like 'TRUNCATED%'` (already covered by `error is null`; add a
  line saying so); (b) replace the locked "Gemini cited 0/24" baseline with the corrected
  Sep/Oct numbers from §2 and note the Aug 19 baseline is unreliable for Gemini; (c) note that
  model pins live in `scripts\aeo-probe.ts` and any pin change is a model break; (d) fix
  "15–30 minutes" to "~35–60 minutes".
- J3. Fix memory/overview note: "ChatGPT/Gemini are citation gaps". Gemini was a measurement
  bug; ChatGPT is the real gap.
- J4. Golfvilla probe (`golfvilla-blog-agent\scripts\aeo-probe.ts`) almost certainly has the same
  two bugs (same code lineage). Port both fixes there and backfill golfvilla
  (`genidekhqwsxvsboyrih`) Gemini rows with the same SQL as §1.1. Check the file first;
  don't assume.
- J5. Optional: before the Nov scan, run `npx tsx scripts/aeo-probe.ts --dry` to confirm the plan
  prints and the pins are in effect.

---

## 5. Execution order (checklist)

| # | Task | Site file(s) | DB sync? | Needs Rob? |
|---|---|---|---|---|
| 1 | J1 backfill UPDATE | — | yes (aeo_snapshots) | approve prompt |
| 2 | A2 rate rule question | — | — | **YES: answer first** |
| 3 | A4 cart minutes (3 vs 5) | hotels-near…, others | — | **YES: confirm** |
| 4 | B4 "only villa on the course" claim | flagship + llms | yes (flagship) | **YES: confirm** |
| 5 | A1, A5, A6 | getting-around, footer ×20, OTA listings | A1 yes | A6 Rob |
| 6 | Phase B (B1–B5) | where-to-stay, hotels-near, st-regis, llms, index | no (static) | distances VERIFY |
| 7 | A2 math sweep + Phase C | casa-de-campo, eden-roc compare, playbook, birthday, punta-cana | yes (4 rows) | — |
| 8 | Phase D | direct-booking + 2 Airbnb pages | yes (1 row) | redirect choice |
| 9 | Phase E, F | birthday, bachelor, large-group, private-chef, property-facts | birthday yes | — |
| 10 | Phase G | Bing WMT, robots, IndexNow | — | Bing login |
| 11 | Phase H | about, property-facts, index sameAs | — | reviews outreach |
| 12 | A3 summer fees | fee pages | yes (3 rows) | on/after Nov 1 |
| 13 | J2–J5 | trigger prompt, golfvilla probe | golfvilla | — |

Website git (Rob runs, after each batch):

    cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"
    git status
    git add -A blog compare index.html about.html property-facts.html bedrooms.html faq.html llms.txt llms-full.txt sitemap.xml
    git commit -m "AEO refresh: <phase letter> — <short description>"
    git pull --rebase
    git push

(Check `git status` before `git add -A`: the 9/17 handover notes 2 pre-existing local image
deletions in `images\` that must NOT be staged. The add list above deliberately leaves out `images`.)

---

## 6. Open questions for Rob (blocking items marked ★)

1. ★ 17–22 guests: priced off the 8BR rate + $100/person, or the 6BR rate + $100? (A2)
2. ★ Cart time from the villa to the Punta Espada first tee: 3 or 5 minutes? (A4)
3. ★ Is Villa Espada the ONLY rentable villa on a Punta Espada fairway? (Claude's test answer cited
   "Palmas 78 ... on the 7th hole" on VRBO.) (B4)
4. Current taxi fare inside Cap Cana, or drop the number? (A1)
5. Which page is canonical for "book direct vs Airbnb", and should the other two redirect? (D1/D3)
6. Is "Welcome Event & Celebration Setup" included outside holiday stays? (E1)
7. Is the 6BR = up to 16 / 8BR = up to 22 capacity split exact? (F3)

---

## 7. Scheduled items touching this work

- 2026-10-17 13:00 UTC: reminder restores the AEO review cron (`trig_014wHz47Czee8UqFE8xSiqDu`).
- 2026-11-01: Blog Editorial monthly run (`trig_0179EPTYJGfRj4fyDxfhzc9d`).
- 2026-11-16 15:00 UTC: next Espadavilla AEO Review (first scan with all fixes). Compare against
  §2 using valid-answer denominators.
