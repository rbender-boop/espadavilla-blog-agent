# HANDOVER 11 — AEO 11-16 fixes (2026-11-16)

Follows `claude/aeo-monthly-review-2026-11-16.md`. Live-checked first: the report's carry-overs (sargassum Sources, playbook FAQ, golfvilla 3->5 min, golfvilla $232/$245) were already live; the report was stale.

## Done
1. **/compare/cap-cana-villa-vs-eden-roc-hotel** (espadavilla-com, local, NOT committed)
   - Cost cell: "Group of 16 at peak: about $280" -> "Villa Espada, group of 16 at peak: about $281" (the cell Claude quotes unnamed).
   - Staff cell: "driver - included" -> "airport transfers included, and the butler arranges a driver for other trips" (facts.ts wording).
   - "Choose the villa if" -> "Choose Villa Espada if".
   - New H2 "Eden Roc Founders Villa vs Villa Espada" + 8-row table + source note; TOC entry; new FAQ (visible + JSON-LD, 7/7 in sync, JSON parses, divs balance). Founders data from Villas of Distinction / Isle Blue / Rental Escapes listings (11 BR, 22 guests, some say 24; chef/butler/housekeeper; transfers). Founders price deliberately left out (listing rates vary by bedrooms used).
   - dateModified + sitemap lastmod -> 2026-11-16.
2. **Member-guest saving figure**: both blog DBs and both static repos already say $135. Only $200 left in espadavilla-com: `videos/villa-espada-tour.html` (JSON-LD transcript + visible transcript) — the video narration itself says $200, so not changed. Press release ($200, "driver included") is off-site.
3. **punta-espada-golf-course-playing-from-villa-espada** (DB 63e6d960): summer $495/$395 removed from 2 of 3 body mentions (kept in the fee paragraph; FAQ unchanged). DB also takes "spring 2027; no official date announced)" (live has a stray space). diff-live-vs-db: only intended diffs.
4. **punta-espada-golf-villa-luxury-group** (DB 0f7ed17c): new section "Twelve Golfers: Three Foursomes in the 6-Bedroom Setup" before Rates (6BR $4,000 peak ≈ $333 pp; up to 8 golfers/day at member-guest rate, third foursome at regular rate — per facts.ts L51); new FAQ (6 total); FAQ "villa manager" -> "villa's butler". diff-live-vs-db: only intended diffs.

## To run (Rob)
- Re-render the 2 posts (commits to espadavilla-com main via API = live).
- Commit/push the compare page + sitemap.

## Open
- Site-wide "driver included" (llms.txt L18, compare/cap-cana-villa-vs-st-regis, luxury-villa-cap-cana-with-staff, seo/luxury-villa-cap-cana-full-staff meta, etc.) conflicts with facts.ts. Needs Rob's ruling.
- Video transcript $200 vs canonical $135.
- es/fr/de/pt translations of the 2 re-rendered posts will still have the old text until the translation job re-runs.
- Las Iguanas: punta-espada-golf-course post says "back nine open now ... front nine expected spring 2027"; the 09-14 golfvilla fix said front nine open, back nine under construction. Not changed — needs a canonical answer.

## Round 2 (same day, after Rob's answers)
Rob ruled: driver NOT included beyond the airport transfer (butler arranges, billed separately); video transcript -> $135; Las Iguanas = back nine (oceanside) open, front nine coming.

- **Driver, site-wide (espadavilla-com, local, not committed):** 78 files. Staff lists "chef, butler, maids, driver" -> "airport transfers"; 38 destination pages "private chauffeur for airport transfers and day trips" -> transfers included + butler arranges a driver for day trips, billed separately; golf-course pages "N min by private chauffeur" -> "by car" and chauffeur sentences -> butler-arranged driver; legacy blog villa-espada-punta-cana-golf-courses-guide "villa's private van and driver" removed; llms.txt staff line; rates "Private Driver/Transport" -> "Private Airport Transfers"; seo/luxury-villa-cap-cana-full-staff title "Chef, Butler, Maid, Driver" -> "... Transfers". Airport-pickup driver lines left as is (correct). JSON-LD parses on all 78.
- **Equestrian post:** DB edited_content/body_markdown + 4 blog_post_translations rows + es/fr/de/pt static files: "(included in every stay)" private transport -> driver arranged by the butler, billed separately. English static file fixed too.
- **Video:** videos/villa-espada-tour.html transcript $200 -> "$135 below the published green fee on a peak-season morning round" (2).
- **facts.ts (both agents):** transport rule now says billed separately; never list a driver as included staff or a villa van for day trips.
- **Las Iguanas:** already consistent everywhere (facts.ts, site, both DBs). No change.
- golfvilla-com: driver mentions are all airport pickups — no change.
- Off-site still wrong: press release ($200, driver included).
