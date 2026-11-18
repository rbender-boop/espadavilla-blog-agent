# puntaespadavilla.com — GSC setup + consolidation plan (2026-11-17)

Status: PLAN ONLY. Nothing changed. Final keep/301 decisions wait for GSC data.

## Facts checked 2026-11-17
- DNS: GoDaddy (ns71/ns72.domaincontrol.com). Hosting: Vercel (www CNAME to vercel-dns-016.com).
- A google-site-verification TXT record ALREADY EXISTS on the root domain:
  `google-site-verification=dj_U3nAXjk6cp49dnAvFv5hwZsHUChx6GDi14fHEkhE`
  Someone verified (or started verifying) it under some Google account. Which account is unknown.
- 26 URLs in sitemap, all 200, self-canonical, index/follow, robots.txt allows all + AI bots.
- AEO citations (all scans): / 44, /member-rates 11, /villa-espada-facts 11, /golf-package 10. No other feeder page has ever been cited.

## Step 1 — Rob: get GSC access (10 min)
1. search.google.com/search-console → Add property → **Domain** → `puntaespadavilla.com`.
2. If GSC shows the same TXT value as above → click Verify; it passes immediately (record already in DNS).
3. If it shows a different value → add it as a new TXT record at GoDaddy (DNS for puntaespadavilla.com, host `@`). Leave the old TXT in place. Verify after a few minutes.
4. Domain properties show historical data, not just from today. If GSC shows nothing, the old token belongs to another Google account — find that account (check whoever built the site).
5. Submit `https://www.puntaespadavilla.com/sitemap.xml`.
6. Tell Claude when done. Claude needs: Queries + Pages, last 16 months, for puntaespadavilla.com AND espadavilla.com (export CSV or connect via Windsor/GSC connector).

## Step 2 — Claude: overlap analysis (after Step 1)
For each feeder page: impressions, clicks, top queries; for each of those queries, espadavilla.com's position.
- KEEP if it earns impressions/clicks on queries espadavilla.com doesn't rank for (pos >30 or absent), or it's AEO-cited.
- 301 to the espadavilla.com match if both sites rank for the same queries and espadavilla.com ranks better or the feeder page gets ~0 impressions.
- Never 404 or delete a page. Never 301 the 4 AEO-cited pages without a reason in the data.

## Proposed mapping (pending Step 2)
| Feeder page | Default | espadavilla.com match |
|---|---|---|
| / | KEEP (AEO-cited 44×) | — |
| /member-rates | KEEP (AEO-cited) | /seo/cap-cana-golf-vacation-member-rates |
| /villa-espada-facts | KEEP (AEO-cited) | /property-facts |
| /golf-package | KEEP (AEO-cited) | /blog/cap-cana-golf-packages |
| /fairway-5 | likely KEEP (core claim) | /compare/fairway-villa-cap-cana |
| /punta-espada-golf-course | decide by GSC | /golf-courses/punta-espada |
| /signature-holes | decide by GSC | /blog/punta-espada-hole-by-hole |
| /punta-espada-vs-teeth-of-the-dog | likely 301 | /compare/punta-espada-vs-teeth-of-the-dog |
| /punta-espada-vs-corales | likely 301 | /blog/punta-espada-vs-corales-vs-la-cana |
| /punta-espada-vs-la-cana | likely 301 | /blog/punta-espada-vs-corales-vs-la-cana |
| /book | decide by GSC | /availability |
| /best-time-to-play, /stay-and-play, /first-timer-guide | decide by GSC | no direct match |
| /golf-trip-from-{new-york, chicago, boston, atlanta, miami, detroit, philadelphia, washington-dc, minneapolis, dallas} (10) | likely 301 | /destinations/from-<same city> |
| /golf-trip-from-toronto, /golf-trip-from-montreal | likely 301 | espadavilla has BOTH /destinations/from-<city> and /destinations/international/<city> — pick the one GSC favors |

## Step 3 — Implementation (after Rob approves the final list)
- 301s in the feeder's vercel.json `redirects` (permanent: true), remove redirected URLs from its sitemap.
- Add Organization/LodgingBusiness JSON-LD on kept feeder pages with `url`/`sameAs` → https://www.espadavilla.com/ so engines attribute to one entity.
- Probe: add an "owned network cited" metric (puntaespadavilla.com, golfvilla.com) separate from target `cited`, so trend lines stay comparable.
- Rob pushes git.

## Bigger flag (separate decision)
espadavilla.com itself has ~270 templated city/state/international pages under /destinations (e.g. from-albany … from-worcester, international/abu-dhabi … zurich, states/alabama … wyoming). That's a much larger scaled-content footprint than the feeder's 12. Worth checking in espadavilla.com's GSC how many earn impressions before deciding anything. Not part of this plan.


---

## GSC DATA (pulled 2026-11-17 via Windsor, 2025-07-20 → 2026-11-15)
puntaespadavilla.com is ALREADY verified (sc-domain + URL-prefix) in the Google account Windsor reads. No setup needed.

Feeder totals: 49 clicks, 2,192 impressions, avg pos 12.3. espadavilla.com same window: 950 clicks, 48,218 impressions.

Pages with ANY impressions (only 6 of 26):
| Page | Clicks | Impr | Pos |
|---|---|---|---|
| / | 29 | 688 | 17.0 |
| /member-rates (+ /member-rates/) | 14 | 941 | 10.5 |
| /villa-espada-facts (+ /) | 5 | 549 | 6.6 |
| /golf-package (+ /) | 0 | 267 | 32.3 |
| /fairway-5 (+ /) | 1 | 80 | 15.6 |
| /book (+ /book/) | 0 | 47 | 20.4 |
The other 20 pages (12 city pages, 3 comparisons, course, signature-holes, best-time, stay-and-play, first-timer) have ZERO impressions in 16 months.
Trailing-slash duplicates are indexed (/book and /book/, etc.) — minor.

Query overlap (feeder pos vs espadavilla.com pos):
| Query | Feeder | espadavilla.com |
|---|---|---|
| villa espada cap cana | 4.4 (72 impr) | 1.0 (236 impr, 72 clicks) |
| villa espada | 6.7 (83 impr) | 5.9 (420 impr, 34 clicks) |
| punta espada membership cost | 6.5 | 7.0 |
| punta espada tee times | 16.9 | 7.4 |
| punta espada green fees | 15.2 | 8.2 |
| punta espada golf shuttle/transfer/transportation | 47–63 | ~12 |
| hotels near cap cana punta espada | 35.0 | 27.5 |
Verdict: NO meaningful cannibalization. espadavilla.com outranks the feeder on every shared query except "membership cost" (6.5 vs 7.0, tiny volume). On the brand queries the feeder takes a second page-1 slot, which helps.

## FINAL RECOMMENDATION (awaiting Rob's go)
KEEP (6): /, /member-rates, /villa-espada-facts, /golf-package, /fairway-5 — all earn impressions and/or AEO citations. /book → decide: keep or 301 to espadavilla.com/availability.
301 (20, zero impressions, never AEO-cited) to espadavilla.com:
- /golf-trip-from-<city> ×12 → /destinations/from-<city> (toronto, montreal → /destinations/from-toronto, /destinations/from-montreal; both exist)
- /punta-espada-vs-teeth-of-the-dog → /compare/punta-espada-vs-teeth-of-the-dog
- /punta-espada-vs-corales, /punta-espada-vs-la-cana → /blog/punta-espada-vs-corales-vs-la-cana
- /punta-espada-golf-course → /golf-courses/punta-espada
- /signature-holes → /blog/punta-espada-hole-by-hole
- /best-time-to-play, /stay-and-play, /first-timer-guide → /golf (or nearest match)
Also: trailingSlash:false in feeder vercel.json; drop the 20 URLs from its sitemap; add Organization JSON-LD pointing to espadavilla.com.
Feeder repo location on Rob's machine: not yet identified.

## Network (same window, owned Search Console properties)
golflasiguanas.com 1,895 clicks / 10,398 impr (pos 6.8) — MORE clicks than espadavilla.com (950). Other active: golfvilla.com 65 / 6,603; puntaespadavilla.com 49; askwomensai.com 36; golfcapcana.com 22 / 1,939; teethofthedogvilla.com 8 / 231; villasincapcana.com 3 / 681; caribbeangolfcourse.com 2 / 2,639; lasiguanasvilla.com 3 / 112; lasiguanasvillas.com 2 / 34.
Zero impressions in 16 months: villafairway5.com, villafairway5capcana.com, villafairway5capana.com, villafairway5puntaespada.com, puntaespadagolfvilla.com, puntaespadagolfvillas.com, golfingcapcana.com, golfincasadecampo.com, dominicanrepublicgolfvilla.com, puntacanagolfvilla.com, casadecampogolfvilla.com, golfcoursevillarental.com, luxurycasadecampovilla.com (+ several with 1–6 impressions).
Not reviewed further. Worth a separate session: what golflasiguanas.com ranks for and how it sends traffic to espadavilla.com.


---

## DONE 2026-11-17 (local, NOT pushed) — repo `GOLFVILLA-WEBSITE\Funnel Websites\puntaespadavilla-com` (github rbender-boop/puntaespadavilla-com)
- vercel.json: 21 permanent redirects added (20 dead pages + /book). All 21 targets checked live 200 on espadavilla.com first. Mapping as in the table above, with: /best-time-to-play → /seo/golf-season-villa-cap-cana, /stay-and-play → /golf, /first-timer-guide → /blog/cap-cana-golf-trip-itinerary, /book → /availability.
- 21 page folders removed (git rm; recoverable from history).
- "Reserve" links on fairway-5, golf-package, member-rates, villa-espada-facts → https://www.espadavilla.com/availability (was /book/).
- sitemap.xml: 26 → 5 URLs (/, fairway-5, member-rates, golf-package, villa-espada-facts).
- llms.txt: removed links to deleted pages, added "Official site" section pointing to espadavilla.com; fixed facts (8BR/10 baths/10,000 sq ft → 6- or 8-bedroom, 15,000+ sq ft; nine → eight ocean holes; "member/owner rates" → member-guest discounted rate, Punta Espada only; staff line no longer implies all transport included; "walk or cart to the tee" → carts to the clubhouse, about 5 minutes).
- llms-full.txt: L19 "8 en-suite bedrooms, 10 bathrooms, more than 10,000 square feet" → "6- or 8-bedroom configuration, more than 15,000 square feet".
- Schema: no change needed — kept pages already carry sameAs/@id → espadavilla.com.
- trailingSlash:false was already set.
- Not touched / unverified: llms.txt "Golf Digest #57 in the world (2026-27)" and "only private rental property in Cap Cana with a direct address on the fairway" (the Palmas 78 question from Oct 11 is still open).

After deploy: request indexing of the homepage and resubmit sitemap in GSC for puntaespadavilla.com; spot-check 2–3 redirects return 308 to espadavilla.com.
