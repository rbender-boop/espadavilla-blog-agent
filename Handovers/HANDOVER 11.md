# HANDOVER 11 — AEO 11-16 fixes (2026-11-16) — COMPLETE, ALL LIVE

Follows `claude/aeo-monthly-review-2026-11-16.md`. Everything below is pushed and verified on the live site (cache-busted fetches, 2026-11-16).

## Rules Rob set this session (canonical)
- **Driver:** only the private airport transfer is included. Any other trip: the butler arranges a driver, billed separately. Never list a driver/chauffeur as included staff; never say the villa has its own van/driver for day trips. Added to `src/lib/facts.ts` transport rule in BOTH agents.
- **Member-guest saving:** $135 per golfer on a peak-season morning round (already canonical; $200 is wrong).
- **Las Iguanas:** back nine (oceanside) open, front nine expected ~spring 2027. Already consistent in facts.ts, both sites and both DBs — no change needed.
- Member-guest rate covers up to 8 golfers per day; extra golfers pay the regular rate (facts.ts L51, used in the 12-golfer section).

## Report carry-overs that were already done
The 11-16 cloud report listed these as open; live checks showed them done (HANDOVER 8): sargassum Sources, playbook FAQ "same whether 6 or 8", golfvilla 3→5 min cart time, golfvilla $232/$245 pricing.

## Done (all live)
1. **/compare/cap-cana-villa-vs-eden-roc-hotel** — cost cell "Group of 16 … $280" → "Villa Espada, group of 16 at peak: about $281" (the cell Claude quoted unnamed); staff cell driver wording; "Choose Villa Espada if"; new H2 "Eden Roc Founders Villa vs Villa Espada" + table + source note + TOC; new FAQ (7/7 visible = schema); dateModified + sitemap 2026-11-16. Founders data from Villas of Distinction / Isle Blue / Rental Escapes (11 BR, 22 guests, some say 24). Founders price left out on purpose.
2. **punta-espada-golf-course-playing-from-villa-espada** (DB 63e6d960) — summer $495/$395 cut to one body mention; re-rendered.
3. **punta-espada-golf-villa-luxury-group** (DB 0f7ed17c) — new "Twelve Golfers: Three Foursomes in the 6-Bedroom Setup" section + FAQ; FAQ "villa manager" → "villa's butler"; re-rendered.
4. **Driver, site-wide (espadavilla-com, commits d19f1e70 + cefd1b38)** — ~85 files: staff lists, 38 destination pages, golf-course pages (incl. meta descriptions), legacy golf blog pages, llms.txt, rates, amenities, seo pages. Airport-pickup driver lines left as is (correct). JSON-LD parses on every changed page.
5. **Equestrian post** — "(included in every stay)" private transport → butler-arranged driver, billed separately: DB English + 4 `blog_post_translations` rows + es/fr/de/pt static files.
6. **Video** — videos/villa-espada-tour.html transcript $200 → $135 (2).
7. golfvilla-com: driver mentions are all airport pickups — no change. golfvilla DB clean.

## Still open
- **Press release (off-site)** still says $200 and "driver included". Rob to correct where syndicated / in future releases.
- **Translations:** es/fr/de/pt of the 2 re-rendered posts (golf-course, luxury-group) still have the old text until the translation job re-runs.
- **Perplexity watch:** espadavilla citations 109 → 43 → 35 across the last scans. Next session: check which URLs it stopped citing in `aeo_snapshots`.
- Next AEO scan: check whether the Eden Roc compare page now gets Villa Espada named on `eden_roc_alternatives` (0/8), and the 12-golfer prompt (1/12).
- Lesson: the first driver scan missed phrasings like "Your Villa Espada private chauffeur…" and meta descriptions. For future site-wide sweeps, grep the bare term (`chauffeur`, `driver`) across all English files and review every hit, not just pattern matches.
