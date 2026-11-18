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
