# Espadavilla AEO Review — 2026-11-17 (interactive, fresh probe)

## Scan
`20261117_230735`: 192 rows, 0 errors, 0 empty answers, $6.41, ~60 min. Prior: `20261112_172118`.
Models unchanged: gpt-5, claude-sonnet-5-5, gemini-3.8-flash, sonar-reasoning-pro.
9 ChatGPT answers hit max_output_tokens=1024 on the first try; the retries succeeded (no empty rows stored).
GSC is still from the 2026-11-01 sync, so the refresh sweep is unchanged from 11-16.

## Unbranded KPIs (mentioned / cited, n=44 each)
| Engine | Nov 12 | Nov 17 |
|---|---|---|
| ChatGPT | 20 / 13 | 18 / 13 |
| Claude | 32 / 25 | 31 / 27 |
| Gemini | 23 / 29 | 21 / 27 |
| Perplexity | 16 / 8 | 20 / 2 |
| Total mentioned | 91/176 (52%) | 90/176 (51%) |

Flat overall. Branded: 16/16 mentioned.

Clusters (Nov 12 → Nov 17): staffed_villas 10→12/12 · luxury_cap_cana 17→20/24 · celebrations 9→10/12 · punta_espada_golf 19→19/32 · cap_cana_golf 11→10/12 · large_groups 22→17/28 · capcana_vs_casadecampo 2→0/12 · direct_booking 0→1/8 · dr_golf_trips 1→1/20 · eden_roc_alternatives 0→0/8 · families 0/4 · destination_expertise 0/4.

## Share of voice (unbranded mentions, Nov 17 / Nov 12)
Eden Roc 104 / 93 · Villa Espada 90 / 91 · Sanctuary 34 / 29 · Casa de Campo 34 / 36 · St. Regis 30 / 31 · Marriott H&V 4 / 9 · Exceptional Villas 2 / 2. Gap to Eden Roc widened from 2 to 14 (Eden Roc up, we're flat).

## Perplexity — third straight drop in citations of espadavilla.com
Answers citing espadavilla.com (all prompts): Oct 31 18 → Nov 12 12 → Nov 17 6. Citation entries 80 → 53 → 32.
Total citations per scan are steady (~900–980), so Perplexity is still searching; it's picking other sources:
everythingpuntacana.com 109, villascaribbean.com 66 (new in top 8), casadecampo.com.do 57, marriott.com 48, hauteretreats.com 48, vrbo.com 47, capcana.com 46 (new), isleblue.co 36.
The drop is spread across pages (/golf 4→0, /golf-courses/punta-espada 2→0, /press, /occasions, /amenities), not one URL. /availability holds at 5.
Mentions are up (16→20), so Perplexity names the villa more but credits other sites for it.
Cause not known. To find out: check whether Perplexity can still fetch espadavilla.com (server logs / Vercel for PerplexityBot hits since Oct 25), and whether the Oct 29 site-wide sweep changed anything those pages relied on.

## puntaespadavilla.com — Rob's own feeder site (confirmed 11-17)
26 pages (home, fairway-5, member-rates, golf-package, book, course pages, 12 "golf-trip-from-<city>" pages, 3 course comparisons, villa-espada-facts), ~900–1,300 words each, self-canonical, index/follow, links to espadavilla.com (/, /rates, /golf, /contact). Facts match canon (6BR/8BR rates, GolfWeek #1 eight years); no 3-minute, $200 or driver claims.
AEO: answers citing it — Oct 31 13, Nov 12 8, Nov 17 7. In 26 of those 28 answers the engine also named Villa Espada; in 20 it also cited espadavilla.com. It supports the brand, it is not taking espadavilla.com's citations (both fell together on Perplexity).
The probe counts it as a non-target domain, so its citations don't show in our "cited" numbers.
SEO overlap with espadavilla.com: unknown — needs GSC for puntaespadavilla.com.
Risk: 12 near-identical city pages on a second domain, alongside espadavilla.com's own /destinations city pages = doorway/scaled-content pattern.

## Branded accuracy (16 answers)
- ChatGPT "What is Villa Espada?": now correct in 3/3 (Fairway 5, 6- or 8-bedroom, up to 16/22, staffed, cites /property-facts). Was generic filler on every scan since August. Biggest win of the scan.
- Claude: 4/4 say the member-guest rate saves "roughly $200 per golfer per round". Canonical is $135. espadavilla.com source has no $200 savings line, so it comes from off-site (the press release seen 11-16). Fix = update or supersede the press release, not the site.
- Perplexity: 1/4 says "about three minutes by golf cart from the first tee". Canonical is 5. espadavilla.com still says 3 minutes to the clubhouse in two places (see below).
- Gemini: "6 to 8 bedrooms", "up to 20+" / "16+" guests — vague, not wrong.
- No Cuba/Caibarién confusion. No driver-included claims this scan.

## Site fixes found (espadavilla-com local source)
Clubhouse still "3 minutes" (canonical 5):
- `GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE\experiences\cap-cana-events.html` — "three minutes by golf cart from the clubhouse"
- `GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE\experiences.html` — "put the Punta Espada clubhouse 3 minutes from the front door"
(Course-to-course "three minutes apart" lines left alone, per the 11-07 decision.)

Las Iguanas status conflicts in my notes: `blog\cap-cana-golf-trip-itinerary.html` says the back nine is open now; the 9/14 review recorded "front nine open, oceanside back nine under construction". Needs Rob's answer before touching it.

## Should-win misses
- Eden Roc vs villa (2 prompts): 0/8, third scan at zero. Every engine names only Eden Roc. Still ESPADA_HAS_BUT_NOT_COMMUNICATED. The 11-16 rec (name Villa Espada in /compare/cap-cana-villa-vs-eden-roc-hotel's per-person line) — I have not verified whether it was done.
- Group of 12 golfers: 1/12. Casa de Campo 12/12. The "three foursomes in the 6-bedroom" section (11-16 rec 3) is still missing.
- Best places near Punta Espada: 3/12 → 4/12. Claude 3/3 (distance table). ChatGPT, Gemini, Perplexity still list St. Regis / Eden Roc / Sanctuary.
- Direct booking: 1/8 (Claude). Generic channel answers elsewhere.
- Could-win (Casa de Campo, Teeth of the Dog, Punta Cana vs Cap Cana, families): 0. Low priority.

## Recommendations (max 3, nothing executed)
1. Find out why Perplexity stopped citing espadavilla.com (3 scans down, 18 → 6 answers): check PerplexityBot access since Oct 25 and the Oct 29 sweep. Identify puntaespadavilla.com.
2. Fix the two "3 minutes to the clubhouse" lines (cap-cana-events.html, experiences.html) and re-render the pending 11-07/11-09 edits so engines stop picking up old facts.
3. Do the Eden Roc compare page update (name Villa Espada in the quoted per-person line). Third straight 0/8.

## Summary
Flat scan: 51% unbranded mention rate (52% on Nov 12). Biggest win: ChatGPT now describes Villa Espada correctly when asked directly, for the first time. Biggest loss: Perplexity citations of espadavilla.com fell for the third scan in a row (18 → 12 → 6 answers). The feeder site puntaespadavilla.com fell with it, so it isn't the cause. Eden Roc's lead in share of voice widened to 14.


---

## Perplexity investigation — 2026-11-17 (evening)

### Ruled out (evidence)
- Edge blocking: Vercel firewall "Not configured", Bot Protection Off, AI Bots Allow, Attack Mode Off (`vercel firewall status`).
- Crawl access: PerplexityBot last 30 days (Vercel keeps 30): 398 requests — 381×200, 16×308, 1×404. It crawls the pages that lost citations (/ 28, /golf-courses/punta-espada 10, /golf 9, /golf-rates 14, /rates 11). Weekly rate steady (~90–100/week).
- User-agent handling: PerplexityBot and Perplexity-User UAs get 200 + full page on /, /golf, /golf-courses/punta-espada, /availability. robots.txt allows PerplexityBot.

### Observed
- Perplexity-User (live fetch while answering): 0 requests in 30 days. ChatGPT-User 110, Claude-User 99 in the same window. No pre-Oct-19 data to compare.
- Perplexity cites Villa Espada's own press releases (AP News, Business Insider, EIN Presswire, PRWeb, Murray Journal syndications) in place of espadavilla.com:

| Scan | Answers citing espadavilla.com | citing a Villa Espada press release | either | of 48 |
|---|---|---|---|---|
| Oct 25 | 39 | 21 | 40 | 48 |
| Oct 31 | 18 | 20 | 24 | 48 |
| Nov 12 | 12 | 22 | 23 | 48 |
| Nov 17 | 6 | 23 | 23 | 48 |

- Reading: one real step down between Oct 25 and Oct 31 (40 → 24 answers citing any owned content). Since then the total is flat (23–24); espadavilla.com is being swapped out for the press-release syndications on the same answers.
- Flagship prompt "villa right on Punta Espada": espadavilla.com 3→0; now cites apnews.com ×6, einpresswire, businessinsider, provaltur, Marriott H&V.

### Unknown
- Why Oct 25 → Oct 31 dropped. The Oct 29 site-wide sweep is in that window — timing only, no evidence it's the cause.
- Why Perplexity prefers the syndicated releases over the site (likely domain authority, but that's not verifiable from our side).

### Next steps (not done)
1. Diff the espadavilla-com commits Oct 25–31 for the pages Perplexity cited most on Oct 25 (homepage, /compare/best-villas-cap-cana, summary PDF) — look for removed text/sections.
2. Audit the syndicated press releases for wrong facts, since engines now quote them (Claude's "$200 per golfer" figure; canonical $135).
3. Next probe: track "owned incl. press" citations as their own metric.

### Step 1 result — Oct 25–31 commit diff (done 2026-11-17)
Compared espadavilla-com at b8665993 (last commit before the Oct 25 scan) vs ba11510e (last before the Oct 31 scan) on the pages Perplexity cited most on Oct 25 (/ 22→10→4, /villa 9→9→4, summary PDF 9→1→0, /compare/best-villas-cap-cana 6→0, /compare/luxury-villa-cap-cana-with-staff 4→0, /compare/cap-cana-8-bedroom 5→3→1).
- Only 26 lines changed across those files: member-guest wording ($200 savings → $135; "~$200 Golf Savings" stat → "$395 Flat Member-Guest Rate"), date stamps, sitemap lastmod, llms.txt lines. No sections removed.
- best-villas-cap-cana and luxury-villa-with-staff: unchanged in the window (first touched by f4756515, after the Oct 31 scan).
- Summary PDF: not changed in the window (changed 11-05 and 11-08, after).
- 10-29 blog re-renders: JSON-LD reformatted; punta-espada-golf-villa-luxury-group word count 1,899 → 1,975 (nothing removed).
- All these URLs return 200 today, no X-Robots-Tag; robots.txt unchanged.
Verdict: no site change in the window explains the Oct 25 → Oct 31 drop. Cause is on Perplexity's side (selection/index) and not observable from here.


---

## Live-site check — 2026-11-17 (late)
Checked live (cache-busted) before changing anything. Already live, no action needed:
- golfvilla 22/20-guest pricing ($5,100 ≈ $232 pp; $4,900 ≈ $245 pp) on all 9 slugs + vs-resort-blocks + packages.
- espadavilla sargassum (no June 2026 status), playbook (no "same rate for 6 or 8 bedrooms").
- Clubhouse "3 minutes" lines: cap-cana-events and /experiences now say about 5 minutes.
- Eden Roc compare page names Villa Espada in the per-person lines ($281 for 16, $232 for 22).
- 12 golfers / three foursomes section live on punta-espada-golf-villa-luxury-group.
- Las Iguanas: every checked page says back nine open, front nine ~spring 2027.

Fixed this session (one real error):
- golfvilla `punta-cana-golf-villas`: "The first nine holes are currently open for members only, but Villa Espada guests play at member-guest discounted rates" → "Villa Espada guests can book Las Iguanas at the course's regular rates; the member-guest discount applies at Punta Espada only." Updated in DB body_markdown (edited_content is empty for this post) and in local golfvilla-com blog\punta-cana-golf-villas\index.html. Pushed by Rob (golfvilla-com commit 98b75f9); verified live 2026-11-17: old text gone, new text present.

## Status after this session
All items from the 11-16 and 11-17 recommendation lists are done and live, except:
- Press-release "$200 per golfer" figure (canonical $135). Off-site; needs a new or corrected release.
- Perplexity citation drop: investigated, cause is on Perplexity's side, no action available. Watch on the next scan; consider tracking "owned incl. press releases" as its own metric in the probe.
- puntaespadavilla.com 12 city pages: doorway-content risk, decision deferred until GSC data for that domain is available.
Next AEO scan: compare Eden Roc alternatives (0/8), group of 12 golfers (1/12) and Perplexity citations against this scan, since the related page changes are now live.

Course-to-course "three-minute" lines left alone per the 11-07 decision.
Live-check scripts and output (reusable): Handovers\livecheck-2026-11-17.ps1, Handovers\livecheck2-2026-11-17.ps1 (+ .txt results).
