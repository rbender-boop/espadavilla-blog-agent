# HANDOVER 3 — espadavilla.com AEO build: Phases F, G, H, I + J2, J3 — 2026-10-11

Continues `Handovers\HANDOVER 2.md` (decisions canon, tooling notes) and `HANDOVER 1.md` (roadmap).
Edit tools: `Handovers\aeo-tools\` (apply.py, verify.py, text.py, raw.py, peek.py, gen_phaseF/G/H/I.py, footer_press.py).

## Shipped this session
| Commit | Phase | Summary |
|---|---|---|
| f99ffd1d | F | group-villa: short answer, staff table + TOC, 2 probe FAQs, fixed "$4,500 / ~$200" math, fixed shifted 6BR table row. private-chef: new title/H1/meta, short answer, FAQ "best luxury villa rentals in Cap Cana with a private chef", JSON-LD Q1 aligned; title updated on 7 listing pages. bedrooms + property-facts: "6-bedroom up to 16; full 8-bedroom estate up to 22"; "16 couples" → "8 couples". |
| 26f88949 | G | Bing warnings: rates meta shortened; direct-booking title/meta shortened (+DB). |
| (pushed) | H | about + property-facts Cuba disambiguation line; footer Press link on 586 pages; agent `src\lib\publish\site-chrome.ts` footer Press link. |
| NOT PUSHED | I | cap-cana-vs-punta-cana: short answer (+DB body), taxi $11–15 sentence + source removed (+DB), FAQ "Should I stay in Cap Cana or Punta Cana?" (+DB). things-to-do (+DB faq) and cap-cana-with-kids: FAQ "Can four families share Villa Espada?"; kids page title fixed. |

- Bing Webmaster: verified, sitemap OK (236 URLs, crawled 10/9), 8 key URLs + private-chef all "Indexed successfully".
- robots.txt allows GPTBot/OAI-SearchBot/ChatGPT-User/PerplexityBot/ClaudeBot; all 200.
- IndexNow (via bing.com/indexnow) submitted for F, G, H pages. Submit I pages after push.
- GSC Request Indexing done: group-villa, private-chef, bedrooms. Daily quota hit. STILL TO REQUEST: property-facts, about, rates,
  direct-booking, birthday, bachelor, occasions, cap-cana-vs-punta-cana, things-to-do, cap-cana-with-kids.
- J2 done: AEO Review scheduled task (trig_015YKba3tnjz87xqAMtYhLru) prompt updated (TRUNCATED note, corrected Oct baseline, model-pin = model break, 35–60 min, taxi-fare sweep).
- J3 done: project memory overview — ChatGPT is the real gap; Gemini "gap" was a measurement bug.

## Still open
- Push Phase I (command below), then IndexNow + GSC for those 3 URLs.
- H3 sameAs: needs Rob's list of live profile URLs (Instagram, Facebook, TripAdvisor, Airbnb, VRBO, puntaespadavilla.com).
- 32 pages with a different footer have no Press link (sitemap.html, compare/index, destinations/index, villa-de-lujo-cap-cana, 28 under seo/).
- Taxi fares still on: getting-around-cap-cana (DB; $25–35 transfer, ~$30 taxi), getting-to-cap-cana ($30–50 + FAQ), golf-course-cap-cana-transportation playbook ($15–35 shuttle), how-far-is-cap-cana-from-punta-cana. Rob decision #4 says no taxi fares — confirm before stripping.
- bedrooms.html video transcript has old holiday rates ($7,500 / $8,500) — must match the video; Rob decides.
- Pre-existing FAQ schema/visible mismatches: rates (cancellation), bedrooms (1), property-facts (2).
- A3 green-fee summer wording on/after Nov 1. J4 port Gemini-redirect + truncation fixes to golfvilla `scripts\aeo-probe.ts` + backfill. J5 `npx tsx scripts/aeo-probe.ts --dry` before Nov 16.
- Agent repo has uncommitted changes NOT from this session (docs/*, deleted _scan.py).

## Git (Rob)
    cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"
    git add -A
    git commit -m "AEO I: Cap Cana vs Punta Cana answer-first + FAQ, remove taxi fare; four-families FAQ on things-to-do and cap-cana-with-kids"
    git push

## Addendum 2026-10-12
- Phase I pushed by Rob; IndexNow submitted (200).
- Bedrooms video corrected: new narration seg5 (Higgsfield TTS, voice Helena 3c2b83c0…, elevenlabs) + on-screen label $10,000 / $12,000.
  Re-rendered landscape + 9:16 (`Shared Tools\video-pipeline`, spec `specs\video2.json`; old copies saved with _OLD-2026-09-10 / _old suffix).
  Uploaded new YouTube video gV_Tt1GUwv0 (public); old 2RGDetxMxkY set PRIVATE. `youtube-api\upload_results.json` updated.
  Site: video ID swapped on bedrooms.html, cap-cana-videos.html, sitemap.xml; transcript + uploadDate updated. NOT PUSHED yet.
  The 9:16 reel is re-rendered but the Meta ad "Reel 2" (if it uses this video) still shows old rates — Rob to swap creative.
- GSC Page indexing (email): 404 (22 old /states, /international, /from-*.html, /occasions/ — all now 308 → 200) and Redirect error (/golf-courses/) → Validate Fix started 10/12.
  Soft 404: view.espadavilla.com (IIS server, not this site) — Rob to identify. Discovered-not-indexed 7 (new press pages, occasions, itinerary, from-minneapolis) — request indexing.
  Crawled-not-indexed 242 (validation failed 8/22) = mostly thin destinations/from-<city> pages — content-quality decision for Rob (see GOLFVILLA-WEBSITE\PLAN-crawled-not-indexed-expansion.md).
