# HANDOVER 5 — Espadavilla AEO follow-up: where-to-stay distance table, publish path for DB edits, 12-adult rule — 2026-11-07

Continues `Handovers\HANDOVER 4.md`. Review doc: claude.ai Project `claude/aeo-monthly-review-2026-11-07.md` (has "Done 2026-11-07" + "Done (Cowork)").
Rules this session (Rob): never push git — give Rob the command. Run SQL via Supabase MCP with project_id (espadavilla `qqjrujrrqxtfsuikakuu`, golfvilla `genidekhqwsxvsboyrih`). Ask questions as popout options.

## START HERE NEXT SESSION
1. **Rob pushes the where-to-stay commit** (espadavilla-com, local, uncommitted):
   ```
   cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"
   git add blog/where-to-stay-punta-espada.html sitemap.xml
   git commit -m "where-to-stay: Punta Espada distance table, villa-vs-hotel bullets, 3 FAQs + FAQ schema"
   git push origin main
   ```
2. **Publish the 11/07 DB edits (espadavilla).** Each command re-renders from Supabase and commits straight to espadavilla-com main via the GitHub API (Vercel deploys). Run AFTER step 1, then `git pull` in the WEBSITE folder.
   ```
   cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
   npx tsx --env-file=.env.local scripts/rerender-published.ts cap-cana-golf-residences-villa-espada-playbook --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts sargassum-cap-cana --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts punta-espada-restaurant-eden-roc-playing-from-villa-espada --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts staying-at-villa-espada --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts cap-cana-birthday-villa-milestone-celebrations --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts caleton-beach-club-cap-cana --force
   npx tsx --env-file=.env.local scripts/rerender-published.ts how-far-is-cap-cana-from-punta-cana
   cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"; git pull
   ```
   `--force` is safe for those 6: drift check shows only the intended 11/07 edits differ (verified 11/07 with `scripts/diff-live-vs-db.ts --slug=<slug>`). Known loss: restaurant post drops one source line ("Green fees include cart, caddy fee…") the renderer omits. how-far has 0 text drift (meta title only).
3. **Publish the golfvilla DB edits** (local render, then Rob pushes):
   ```
   cd "C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent"
   bun --env-file=.env.local scripts/rerender-local.ts corales-puntacana-championship-2026-caribbean-golf-villas where-can-i-rent-a-villa-with-direct-access-to-a-golf-course luxury-golf-villas-vs-resort-blocks cap-cana-luxury-villa-rentals punta-espada-villa-rentals best-time-golf-trip-cap-cana cap-cana-vs-casa-de-campo-golf
   cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\Funnel Websites\golfvilla-com"
   git --no-pager diff --stat
   ```
   rerender-local has NO drift guard. Review `git diff` for reverted hand patches (e.g. HANDOVER 4's GolfWeek "eight" fix, taxi fares) before Rob runs:
   `git add -A; git commit -m "blog: re-render 7 posts with 11/07 cart-time + Las Iguanas fixes"; git push origin main`
4. **Verify live** after deploys: playbook has the 6BR/8BR table and no "same whether you configure 6 or 8 bedrooms"; sargassum has no "As of late June 2026"; restaurant says "five-minute cart ride"; golfvilla cap-cana-luxury-villa-rentals says Las Iguanas at regular rates; where-to-stay shows the table + 13 FAQs. Then IndexNow + GSC Request Indexing for the changed URLs.
5. **12-adult rule fix (big, Rob-approved plan).** See section below. Then do task 6.

## Corrected rule (Rob, 2026-11-07) — supersedes commits b726cffd / 28fc96a6
**6-bedroom rate covers up to 16 guests with no more than 12 adults; 13 or more adults must book the full 8-bedroom estate.** +$100 per guest per night above 16 is unchanged. Rates unchanged.
Old wording to replace: "no more than 11 adults", "up to 11 adults", "12+ adults must book…", "12 or more adults".
Where it lives (found 11/07, `git grep -E "11 adults|12\+ adults|12 or more adults|more than 11 adults|eleven adults"`):
- espadavilla-com: ~100 lines in 42 files — rates (8), availability (5), occasions (6), compare/cap-cana-group-villa (5), videos/6-or-8-bedrooms (6), llms.txt (5), index (4), property-facts (4), blog/cap-cana-direct-booking (4), bedrooms (3), press-releases.json (3), blog/where-to-stay (3), golf-bachelor-party, private-chef-villa, punta-espada-golf-villa-luxury-group, punta-espada-golf-shuttle (3 each), faq, villa, llms-full, occasions/golf-trips, compare/cap-cana-8-bedroom, compare/cap-cana-vs-st-barts (2 each), plus ~18 single hits (press/*, other blog/compare pages, contact, cap-cana-videos, experiences/los-establos-padel-club, seo/villa-espada-cap-cana-booking).
- golfvilla-com: 83 matching files/lines (run the same git grep there).
- Supabase published drafts — espadavilla: cap-cana-vs-casa-de-campo-comparison, punta-espada-golf-villa-luxury-group, cap-cana-birthday-villa-milestone-celebrations, cap-cana-direct-booking-villa-espadavilla, cap-cana-casa-de-campo-golf-base. golfvilla: corales-puntacana-championship-2026-caribbean-golf-villas, punta-espada-stay-and-play-hotel-vs-villa, punta-cana-golf-packages-villa-vs-resort, where-can-i-rent-a-villa-with-direct-access-to-a-golf-course, luxury-golf-villas-vs-resort-blocks, corporate-golf-retreat-caribbean-villas-vs-hotels. (Fix DB edited_content/faq first, then re-render, so the static HTML and DB agree.)
- Canon: `GOLFVILLA-WEBSITE\CANONICAL-FACTS.md` lines 25 and 163; `GOLFVILLA-WEBSITE\CLAUDE.md` line 20. Also check both agents' `src/lib/facts.ts` riskCheck/occupancy guard and PDFs (rate sheet / summary PDF from b726cffd).
- `/videos/6-or-8-bedrooms`: if the video audio says 11 adults, the transcript text can be fixed but the video can't — Rob to decide.
- Order: canon + facts.ts → DB drafts → static pages → re-render → one commit per repo → Rob pushes → IndexNow.

## Task 6 (deferred)
Add one short line to espadavilla golf-group posts: a 12-golfer group (three foursomes) fits the 6-bedroom setup (allowed under the corrected 12-adult rule). Targets AEO miss "Where should a group of 12 golfers stay in the DR?". Show before/after, save to edited_content only after Rob approves. Do it after the rule fix so it doesn't contradict the live site.

## Done this session
- **where-to-stay** (`GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE\blog\where-to-stay-punta-espada.html`, static, not in the blog DB, not a protected golf winner page): distance table under the intro, "Why a villa on the course is different" bullets, 3 FAQs (visible + FAQPage JSON-LD, 13/13 synced), dateModified + sitemap lastmod 2026-11-07. Diff: 2 files, +46/−3. No build/lint script (static site); JSON-LD parse + div balance checked with `C:\Users\rbend\AppData\Local\Temp\check_wts.py`.
  - Distances (Hotels.com + Expedia "hotels near Punta Espada", straight-line): St. Regis <0.1 mi, Eden Roc 0.5 mi, Sanctuary 1.5 mi, Secrets 2.4 mi. Rob: all are a short golf-cart drive from the course.
- **Live check:** none of the 11/07 DB edits were live (both sites static; edited_content ships only on re-render). Publish steps above.
- **DB merges (Rob OK), espadavilla:** sargassum-cap-cana edited_content + faq now carry the live hand-patches (carts; "butler can arrange a private vehicle, billed separately"; no "included driver"). punta-espada-restaurant-eden-roc… edited_content: "no 18 percent Dominican Republic government tax applies to the villa rental". Without these, a --force re-render would have reverted live fixes.
- Project doc `claude/aeo-monthly-review-2026-11-07.md` updated with "Done (Cowork)".

## Other findings (not actioned)
- Member-guest savings wording differs: where-to-stay says "about $200 less per golfer per round"; property-facts says "about $135 per golfer on a peak-season morning round". Pick one canonical number.
- where-to-stay still carries the old 11-adult wording in 3 places (rates FAQ + body) — part of the rule fix.

## Next AEO scan
- Check whether Perplexity's espadavilla.com citations (43 on Oct 31, down from 109) recovered. If still ~43, investigate what changed Oct 25–31 (Oct 29 site-wide sweep).
- Re-check "Best places to stay near Punta Espada golf course" (0/12) after the where-to-stay page is live and recrawled.
