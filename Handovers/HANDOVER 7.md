# HANDOVER 7 — finishing HANDOVER 6 (2026-11-08, chat on ROB2026LAPTOP)

Continues HANDOVER 6. Same rules (SQL via Supabase MCP; Rob pushes git; questions as options).

## Done
1. **H6 commands A–D:** all confirmed pushed (espadavilla-com 1e7ddac0 + 11 re-renders 56ff51a0..4809e260; golfvilla-com 7e12e95; agents 0c54037 / 8e2f812).
2. **Live verify:** 13/16 clean. Leftovers were in the `sources` column only → DB fixed (not live until re-render):
   - caleton-beach-club-cap-cana: removed the $50 Eden Roc day-pass and $20–25 Juanillo gate citations.
   - staying-at-villa-espada: "53% … June 2026" citation → "the United States is the DR's largest source of international visitors".
   - birthday "20 events in 2026" source line left (dated citation, accurate as attributed).
3. **IndexNow:** api.indexnow.org is unreachable from this laptop (connection reset) → the agents' re-render pings likely failed. Resubmitted via https://www.bing.com/indexnow (HTTP 200): 34 espadavilla static URLs, 11 espadavilla re-rendered posts, 86 golfvilla URLs. PowerShell 5 ConvertTo-Json wraps Get-Content strings as {value:…} → Bing 400; use Python for pings.
4. **Canon:** GOLFVILLA-WEBSITE\CANONICAL-FACTS.md line 20 → Punta Espada clubhouse = 5 min by cart (OWNER-CONFIRMED 2026-11-07, supersedes 3 min).
5. **PDF generators fixed + all 6 PDFs regenerated** (gen_site_pdfs.py, _gen_complete_guide.py, _gen_pdfs.py in GOLFVILLA-WEBSITE): 12/13 adults; $135 per golfer on a peak morning round ($395 flat, $415 with caddie, vs public $550); $4,320 for 8 golfers × 4 rounds (was $6,400); public fee $550 (was $395–$495); Punta Espada 5 min; Las Iguanas 2 min and "back nine open; front nine expected around spring 2027" (was "open front nine", "end of 2026"). Text-verified: 0 stale strings. "$200/day" left on purpose (chef fee on villas without a chef).
   - **Complete guide:** generator only builds 10 pages; the live PDF had 13 (The Estate, Living & Dining, Bedrooms & Baths were added outside the generator, and their HTML is gone). Fix: those 3 pages saved to `_pdfsrc\cg_photo_pages.pdf` (gitignored, keep it!) and the generator now splices them in after pages 2/3/4 with footers renumbered 01–13.
   - Pre-edit copies of the 3 generators + CANONICAL-FACTS.md are in C:\Users\rbend\AppData\Local\Temp\.
6. **Video /videos/6-or-8-bedrooms:** clean (voiceover and YouTube description never state an adult limit).
7. **Task 4 ($135):** 12 espadavilla-com files + sitemap.xml rewritten in context; dateModified/sitemap lastmod → 2026-11-08. Recomputed totals: foursome × 4 rounds $3,200 → $2,160; 8 × 4 $6,400 → $4,320. Also fixed golf-bachelor-party "12 adults … $375" → "12 adults in the 6-bedroom … $333". Both blog DBs: 0 $200-savings claims (golfvilla's "$6,400" hit is hotel lodging math, correct).

## Open — needs Rob
- **Two YouTube videos still SAY the old facts in the voiceover:** punta-espada-member-guest-rate (KU-_3A8cGUo: "approximately two hundred dollars", "sixty-four hundred", "about three minutes") and whats-included-villa-espada ("two hundred dollars per golfer"). On-page transcripts left as-is (they match the audio). Needs new voiceover/video; YouTube description of KU-_3A8cGUo also says $200 / three minutes / "nine holes open" — edit in YouTube Studio.
- **Task 3 (12-golfer line):** proposed for `group-golf-stay-cap-cana-member-rates-tee-times` (after the "For larger groups—12 or more golfers" paragraph); not saved. Same post has pre-existing errors: Las Iguanas "play 18 … within four hours" (only the back nine is open) and "36 Nicklaus holes" (18 + 9 open) — fix in the same edit once approved; typo "reboks".
- Re-render caleton + staying-at (commands below).
- GSC Request Indexing (manual): /rates, /compare/cap-cana-villa-vs-eden-roc-hotel, /blog/where-to-stay-punta-espada, /blog/punta-espada-golf-shuttle-playing-from-villa-espada, /blog/cap-cana-casa-de-campo-golf-base.
- Noticed (H6, still open): hotels-near-cap-cana-punta-espada "short walk from the clubhouse"; Casa de Campo "subject to access" in _gen_pdfs.py golf itinerary vs canon line 99.

## Commands (PowerShell, in order)
cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"
git add -u
git commit -m "Member-guest savings $135 (peak AM, $395 vs $550); PDFs regenerated: 12-adult rule, 5-min clubhouse, Las Iguanas back nine"
git pull --rebase
git push
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
npx tsx --env-file=.env.local scripts/rerender-published.ts caleton-beach-club-cap-cana
npx tsx --env-file=.env.local scripts/rerender-published.ts staying-at-villa-espada
git add Handovers/"HANDOVER 7.md"
git commit -m "Handover 7"
git pull --rebase
git push
cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"
git pull --rebase


## Addendum — 2026-11-08 afternoon (after Rob pushed cbe87f7c + Handover 7)
- Rob's re-render commands did not commit (drift guard). Ran them with --force after a drift check showed only the intended source-line diffs: caleton 208fe626, staying-at 6a56ef97.
- **Task 3 DONE** — group-golf-stay-cap-cana-member-rates-tee-times: added the 12-golfer / three-foursome paragraph; fixed Las Iguanas "play 18 … four hours" → back nine, ~2 hours; "36 Nicklaus holes" → "two Nicklaus courses" (H2, body, meta description); "member-guest … access to 36 Nicklaus holes" → member-guest at Punta Espada + regular rate at Las Iguanas; caddie sentence (member-guest $395 excludes the $20 caddie; the published fee includes it); typo "reboks". Merged live hand-patches (Las Iguanas sentence + its source line) into the DB first.
- golf-course-cap-cana-transportation-villa-espada-playbook: "Golf is included at the member-guest rate, but you'll pay greens fees, caddy fees and cart fees" → billed separately, $395 (cart + tax included) + $20 caddie, Las Iguanas regular rates. Merged live Las Iguanas hand-patches; dropped the "PUJ has no public bus" source (already gone from live); source "first nine holes (the back nine)".
- caleton FAQ: removed the unverified "$20-$25" gate fee.
- Live commits: 335cb720, f662938e, 9b416c95, 5665b12e, 573f3db3, fc3956a3. Verified live; IndexNow (Bing) 200.
- Note: the published Punta Espada fee DOES include the caddie (only the member-guest $395 excludes it). Don't "fix" citations saying "published rates include … caddy fee".
- **Static "walk to the first tee" fixes (uncommitted, Rob to push):** espadavilla-com hotels-near-cap-cana-punta-espada ("short walk from the clubhouse"), best-caribbean-golf-resorts, best-golf-courses-dominican-republic, cap-cana-golf-guide, punta-espada-vs-corales-vs-la-cana, compare/index, golf-courses/punta-espada, villa → "about five minutes by golf cart"; dateModified + sitemap lastmod 2026-11-08. golfvilla-com index.html ("walk to the first tee in your socks").
- After Rob pushes: IndexNow those 9 URLs via bing.com/indexnow (api.indexnow.org blocked from this laptop).
- Commit message tip: use single quotes in PowerShell when the message contains $.

## Still open
- Re-voice the 2 videos (member-guest-rate KU-_3A8cGUo; whats-included) + edit KU-_3A8cGUo description in YouTube Studio.
- GSC Request Indexing (manual).
- Casa de Campo "subject to access" in _gen_pdfs.py golf itinerary vs canon line 99 (not changed).
