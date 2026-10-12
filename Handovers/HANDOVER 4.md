# HANDOVER 4 — espadavilla.com AEO/SEO: J phase cleanup, index audit, video watch pages — 2026-10-12

Continues `Handovers\HANDOVER 3.md` (and its 10/12 addendum). Decisions canon stays in HANDOVER 2.
Edit tools: `Handovers\aeo-tools\` (verify.py now ignores inline tags, so no more false FAQ misses).

## START HERE NEXT SESSION
1. **GSC Request Indexing** (quota was exhausted 10/12; ~10/day via UI, Chrome "Work Laptop", espadavilla.com property):
   - Priority 1 (unindexed, have impressions or are hubs): /seo/villa-espada-price, /occasions/honeymoon, /occasions, /press/villa-espada-direct-booking-launch (URL unknown to Google), /press/villa-espada-family-trip, /press/villa-espada-golf-trip, /press/villa-espada-vs-resort, /itineraries/mother-daughter-4-night, /blog/cap-cana-drone-photos, /blog/cap-cana-itinerary-7-days
   - Priority 2 (new video watch pages): /videos/villa-espada-tour, /videos/whats-included-villa-espada, /videos/6-or-8-bedrooms, /videos/punta-cana-airport-to-villa-espada, /videos/punta-espada-member-guest-rate, /videos/villa-espada-renovation-tour, /videos/cap-cana-aerial-tour
   - Priority 3 (unindexed from-city pages, crawled May–Jul before upgrades): from-columbus, from-kansas-city, from-louisville, from-memphis, from-miami, from-minneapolis, from-naples, from-new-orleans, from-palm-beach, from-philadelphia, from-portland, from-richmond, from-scottsdale, from-seattle, from-st-louis
   - Priority 4 (indexed, content changed): rates, bedrooms, property-facts, getting-to-cap-cana, getting-around-cap-cana
2. After Google recrawls /videos/*: GSC > Videos > "Video isn't on a watch page" > **Validate Fix**.
3. In 2–3 weeks: `npx tsx scripts/gsc-index-status.ts` (in espadavilla-blog-agent) and compare to the 10/12 baseline below.

## Baseline 2026-10-12 (URL Inspection API, all sitemap URLs)
- 210 / 235 sitemap URLs indexed (89%). 17 crawled-not-indexed, 7 discovered-not-indexed, 1 unknown.
- Full CSV: `Handovers\aeo-tools\index-status-2026-10-12.csv` (coverage, last crawl, canonical, 90-day impressions/clicks/position).
- GSC "926 not indexed / 242 crawled-not-indexed" is mostly old/redirected/noindexed URLs outside the sitemap — not a problem.
- The July `GOLFVILLA-WEBSITE\PLAN-crawled-not-indexed-expansion.md` is mostly executed already (no indexable page under 939 words except a few blog/press pages; nearly all have FAQs). Decision: re-crawl, not rewrite.

## Shipped this session (all deployed READY on Vercel, verified live)
| Repo | Commit | What |
|---|---|---|
| espadavilla-com | 7bec24da (+ db862e5 retrigger) | Press link on last 32 footers (sitemap.html, villa-de-lujo, compare/destinations/seo indexes, 27 seo pages); 23 FAQ schema answers made verbatim to visible text (rates, bedrooms, property-facts, compare/index, occasions x5, itinerary, 2 blog); taxi/shuttle fares removed from 5 posts (+dateModified, sitemap lastmod); Organization `logo` → logo-villa-espada.png (1462x1483) and one `sameAs` list on 24 pages + #lodging |
| espadavilla-com | 79ece139 | 7 video watch pages `/videos/*` (video is main content, VideoObject + transcript + breadcrumb, `max-video-preview:-1`); "Watch with full transcript" links on villa, amenities, bedrooms, destinations, golf-rates, renovation + hub cap-cana-videos; sitemap (+7 URLs with video:video, 242 total); llms.txt "Videos" section. Generator: `GOLFVILLA-WEBSITE\_gen_watch_pages.py` (re-run `apply` if a host VideoObject changes) |
| golfvilla-com | f635fc6 | GolfWeek streak "11/18 consecutive years" → "eight" (3 pages) |
| golfvilla-blog-agent | fc228d6 (+94e30ca) | J4: aeo-probe.ts — models pinned (gpt-4o, claude-sonnet-5-5, gemini-3.8-flash, sonar-reasoning-pro), Gemini redirect citations counted via title, per-engine maxTokens (Claude 4096), truncation retry at 2x then error='TRUNCATED…' (empty-text guard kept). facts.ts: new riskCheck + grounding rule — no taxi/shuttle/Uber fares |
| espadavilla-blog-agent | 7456fee, 6e62c39 | facts.ts same taxi-fare guard; verify.py inline-tag fix; new `scripts/gsc-index-status.ts` (resumable URL Inspection per sitemap URL) |

- `sameAs` now: YouTube @espadavillacapcana, https://www.puntaespadavilla.com/ (same villa, separate site), Google KG /g/11npbfm9tr, wa.me. OTA links deliberately left out (site says no third-party platform).
- IndexNow: 45 changed URLs submitted after 7bec24da, plus 15 (watch pages + host pages) after 79ece139 — both HTTP 200.
- J5 done for golfvilla (`--dry` OK). Espadavilla `--dry` also ran OK 10/12.

## Database changes (run directly via Supabase MCP)
- golfvilla `genidekhqwsxvsboyrih`:
  - Gemini backfill (all 144 Gemini rows): cited_domains/cited/competitors_cited recomputed from citations. Unbranded Gemini cited: Aug 3/44, Sep 8/44, Oct 7/44 (was 0). Sister espadavilla.com cited 14–16/44 per scan. Backup: table `aeo_snapshots_gemini_bak_20261012`.
  - Truncation flag: 65 rows (<200 chars) set error='TRUNCATED (backfill 2026-10-12)…' — perplexity Aug 20 + Sep 22, claude Oct 23. KPIs (error is null) now exclude them.
  - Blog drafts: removed stale "#35 in the world (Golf Digest)" from 6 published posts; "11 consecutive years" → "eight" in 3. Residual = 0.
- espadavilla `qqjrujrrqxtfsuikakuu`: taxi fares removed from getting-around (body/edited/faq), golf-transportation playbook and how-far (body + sources entry); "#35" → "#57 on Golf Digest's World's 100 Greatest (2026-27)" in 3 published posts. Residual = 0. (J1 truncation flag was already applied earlier.)
- Note: plain `UPDATE … WHERE` via Supabase MCP timed out twice on golfvilla; the `WITH t AS (SELECT id …) UPDATE … FROM t` form ran fine.

## Findings / decisions
- view.espadavilla.com = CNAME → x.gmtrack.net (GMass email click-tracking domain). Not a website. Leave the DNS record; ignore the GSC soft 404; do not Validate Fix it.
- Taxi fares: Rob decision applied site-wide (no numbers; "the butler arranges a trusted driver"). rates.html hotel-comparison "airport transfer ~$100–150 per couple" left as is (hotel cost comparison, not a fare).
- Golf facts canon (CANONICAL-FACTS.md line 79): GolfWeek #1 Caribbean & Mexico "for eight consecutive years"; Golf Digest #57 (2026-27). Agents' riskCheck already blocks "#35".
- getting-to-cap-cana FAQs still name airlines on from-dallas etc. (pre-existing, conflicts with canon "no airline names") — not touched; decide later.

## Still open (needs Rob)
- Instagram / Facebook / TripAdvisor profile URLs for `sameAs` (could not verify any).
- Meta ad "Reel 2": if it uses the old bedrooms video, it still shows old holiday rates — swap creative.
- Agent repos have uncommitted changes from earlier sessions (espadavilla: docs/*, deleted _scan.py; golfvilla: docs/HANDOVER-OPERATIONS.md, docs/cowork-approval-prompt.md, docs/HANDOVER-CANON-LAS-IGUANAS-2026-09-17.md, scripts/retire-bachelor-local.mjs) — commit or discard?

## Upcoming
- Nov 1: A3 green-fee summer wording.
- Before Nov 16: monthly AEO scan (both probes now patched; first golfvilla run with pinned models = model break vs Sep, note it in the review).

## Process notes
- Rob now wants Claude to run git commit/push itself (Windows PowerShell via Windows-MCP), then check Vercel deploy state right after.
- Before pushing either agent: run full `tsc --noEmit -p .` (strict, exactOptionalPropertyTypes) — a scripts/ file broke the espadavilla-blog-agent build once this session.
- Vercel `git_info_fail` is transient: retrigger with an empty commit.
- VM git shows CRLF noise; use Windows git for real diff stats (core.autocrlf=true there).
