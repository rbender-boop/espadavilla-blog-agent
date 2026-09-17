# HANDOVER — AEO fixes, 2026–27 fee sweep, canon update — 2026-09-17

## Context
First full AEO probe ran 2026-09-17 (scan `20260917_161631`, 192 calls, 0 errors, $5.07).
Interpretive pass done in-chat. Rob approved: 3 AEO content fixes + site-wide fee sweep
+ agent canon update. All site edits are LOCAL, not yet pushed (Rob pushes).

## Scan headline (vs locked 8/19 baseline)
- Perplexity 36/44 unbranded cited (dominant, held). ChatGPT 6/44 (~14%, up from 4%).
- Gemini 25/44 mentioned but 0 cited (mentions up from 33%; citations follow classic SEO).
- Claude engine 3/44 cited (treat as new baseline; prompt sets differ from 8/19).
- Branded: ALL 4 engines now answer "What is Villa Espada?" with correct facts (Aug: ChatGPT pure hedge).
- Biggest flip: "villa right ON Punta Espada course?" — ChatGPT cited 3/3 (was a total miss).
- Eden Roc:Espada mention ratio on ChatGPT+Gemini improved 2.2:1 → 1.7:1.

## Fact discoveries this session
1. **Punta Espada published 2026–27 fees** (golfpuntaespada.com/rates):
   Peak (Nov 1 2026 – Apr 30 2027): $550 AM / $440 PM. Summer (Jul 22 – Oct 31 2026): $495 / $395.
   Packages peak: 2R $1,020 · 3R $1,470 · 4R $1,870 · 5R $2,200. Club rental $75.
   Old site-wide claim "$495 peak / $395 low" was stale.
2. **Holiday villa rates**: live /rates says $10,000 (6BR) / $12,000 (8BR). Rob confirmed live is
   correct; agent canon ($7,500–$8,500) was stale → updated.
3. **Las Iguanas**: Rob confirmed the site-wide phrasing is correct — "nine holes open now,
   including oceanside holes on the back nine" (full 18 by end 2026, official opening spring 2027).
   The Sept 2 PR ("front nine is open now") and the agents' canon were outdated → canon updated.
4. puntaespadavilla.com (cited by Claude/ChatGPT engines) is Rob's feeder site — confirmed.

## Changes — espadavilla-com repo (LOCAL, awaiting Rob push)
16 tracked files changed (+ 2 _pdfsrc files, apparently untracked/ignored):
1. **blog/punta-espada-golf-course-playing-from-villa-espada.html** (AEO item 1): all fees →
   2026–27; peak window "mid-November–early April" → Nov 1–Apr 30 everywhere; foursome math
   $4,000 → $4,400; hero image Corales1.jpg → villa-espada-aerial-fairway-5-punta-espada-2026.jpg
   in img/og/twitter/JSON-LD (dims 2000×1125, alt fixed); fee source usnews → golfpuntaespada.com/rates;
   dateModified → 2026-09-17.
2. **compare/cap-cana-villa-vs-eden-roc-hotel.html** (AEO item 2): new H2 "Eden Roc vs a private
   villa for a large group" (worked math: $281 pp vs $300+ pp room-only; $3,200 golf swing for
   8 golfers × 2 rounds), TOC entry, 2 new FAQs matching probe questions verbatim (visible +
   FAQPage JSON-LD, texts synced), dateModified → 2026-09-17.
3. **blog/cap-cana-direct-booking-villa-espadavilla.html** (AEO item 3): new H2 "Is It Better to
   Book a Cap Cana Villa Directly or Through Airbnb?" (generic first, then Espada), TOC entry,
   matching FAQ (visible + JSON-LD), dateModified → 2026-09-17.
4. **Fee sweep** (57+ verified replacements): 12 more blog posts, golf-courses/punta-espada.html
   (rate table rebuilt to official numbers incl. packages + $75 club rental; season labels fixed),
   _pdfsrc/complete-guide.html, _pdfsrc/complete.html. golf-rates.html already current — untouched.
   vs-corales table: Punta Espada cell only ($395–$550); Corales stays $395–$495 (correct).
5. **Restaurant post extras**: past-tense July 2026 closure → "closes July 1–21 annually";
   "an six-" grammar; "subject to 18% DR tax" → "no 18% government tax applies" (matches
   direct-booking post + /rates FAQ).
LEFT ALONE: Las Iguanas phrasing on 40 pages (correct per Rob); the 2 locally-deleted images
(images/villa-espada-pool-villa.jpg, images/villa-espada-rooftop-terrace-pool.jpg) — pre-existing,
NOT staged.

## Changes — Supabase (qqjrujrrqxtfsuikakuu, DONE, Rob-authorized one-off UPDATEs)
- Fee/wording sync on 3 published rows (flagship, playbook, restaurant) across body_markdown /
  edited_content / body_html / faq / sources / summary, incl. usnews→official source swap and a
  playbook markdown variant caught on re-verify. Verified 0 stale patterns remain.
- Direct-booking row: Airbnb section appended to edited_content (render source; body_markdown is
  the pre-edit original with a different heading — left as-is), FAQ appended (now 6 entries).
- Status left 'published' everywhere on purpose: live pages fixed in the repo; no drain republish
  (a republish would re-render from edited_content and is unnecessary).

## Changes — blog agents (LOCAL, awaiting Rob push; typecheck exit 0 both)
Both `src/lib/facts.ts` (espadavilla-blog-agent + golfvilla-blog-agent), identical edits:
- rates.holiday 7500/8500 → 10000/12000 (+ all comments/rule strings; risk checker
  auto-derives from CANONICAL_FACTS so allowed-number sets follow).
- Las Iguanas fact + summary + checker comments/messages: "front nine open" → "nine holes open
  now, including oceanside holes on the back nine"; removed the now-false ban on saying oceanside
  holes are playable; kept bans on "fully open"/"full 18 now"/"opened Nov 2025".
- Added public 2026–27 green fees to the puntaEspada canonical fact.
- 0 residual "front nine" / 7500 / 8500 in either file.

## Open items
1. **Golfvilla LIVE pages carry the outdated "front nine" wording** — inserted by the 9/8
   (luxury-golf-villas refresh) and 9/14 (Corales 2027 refresh) edits per the then-canon.
   Needs the same nine-holes correction on golfvilla.com pages + golfvilla DB rows. Not done.
2. Sept 2 PR says "front nine is open now" — syndicated copies can't be edited; future PRs
   should use the corrected phrasing.
3. docs/cowork-approval-prompt.md in both repos still empty (pre-existing, from 9/14).
4. espadavilla-blog-agent has a pre-existing local deletion of `_scan.py` — not staged here.
5. Next AEO probe: ~Oct 16 monthly task; expect ChatGPT/Gemini movement from these fixes after
   recrawl. Consider GSC Request Indexing for the flagship post + Eden Roc compare page after push.
6. CANONICAL-FACTS.md file does not exist in the espadavilla repo (facts live in facts.ts only) —
   references to it in older docs are stale.

## Verification notes
- Fee sweep ran as `_tmp_fee_sweep.py` with per-string expected-count checks; 2 benign mismatches
  resolved (case variant fixed via edit; one string doubled "for maintenance", fixed).
- Flagship script accidentally ran twice; first run applied everything, second confirmed 0 remaining.
- Residual $495/$395 on swept pages are intentional (summer-window rates + Corales pricing).
