# Handover — tool_choice fix after Opus 5.5 pin (2026-10-02)

## Cause
Oct 1 monthly drafting failed on both sites: `400 tool_choice: type "tool" and "any" are not supported for this model`.
Commit eadf2cc (2026-09-26) moved drafting from claude-sonnet-4-5-20250929 to claude-opus-5-5, which rejects forced tool_choice.
Oct 1 was the first drafting run after the pin (crons monthly since 9/14).

## Fix (both repos, uncommitted until Rob pushes)
- src/lib/drafting/pipeline.ts: draft call -> tool_choice auto + explicit "call emit_post" instruction + one retry if no tool call.
- src/lib/drafting/humanize.ts: tool_choice auto (it fails soft, so it would have silently stopped humanizing).
- tsc clean both repos. verify-offline: 1 failing check per repo, pre-existing (same result with changes stashed).

## Manual re-run 2026-10-02 (npm run pipeline:local)
- Espadavilla: job 3e7331d8 done. Draft c431429e "Bachelor Party Villas Dominican Republic" pending, 1,515w, guard clean.
  Likely REJECT: overlaps core /occasions/bachelor + /blog/golf-bachelor-party-cap-cana (dedupe guard miss, same pattern as weddings 9/10).
- Golfvilla: topic 1d45f197 (3rd refresh of luxury-golf-villas-vs-resort-blocks) cancelled per Rob.
  Job 03063e20 done. Draft 62c2f7bc "[Refresh] When to Book Punta Cana Golf Villa" sent_for_approval, 1,679w,
  guard FLAGGED: body uses composite $4,900 nightly rate (canon bans composites; should be $4,500 8BR peak + $100/pp for 17-22).
- Golfvilla .env.local has a blank ANTHROPIC_API_KEY (vercel env pull blanks sensitive vars). Re-run used espadavilla's key in-process only. Rob to fill if local runs are needed again. Production unaffected.

## Open
- Rob: push both repos (commands in chat), then review the two drafts.
- Golfvilla queue still holds a Corales refresh (b3290f35) of a post republished 9/14 — refresh-cooldown still not built.

## Later same session — drafts rejected, /occasions/bachelor improved
- Both re-run drafts REJECTED via reject_post, topics retired: espadavilla c431429e (topic 682c3c09), golfvilla 62c2f7bc (topic f4bdc004).
  Evidence (GSC 90d, Jul 4–Oct 2): "bachelor party villas dominican republic" already ranks on /occasions/bachelor (44 impr, pos 13.6);
  golfvilla /blog/when-to-book-punta-cana-golf-villa = 8 impr / 0 clk, no timing queries in GSC.
- espadavilla-com repo is at C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE (not Claude Projects\espadavilla-com).
- occasions/bachelor.html edits (uncommitted until Rob pushes):
  - title/og/twitter: "Bachelor Party Villa Dominican Republic | Cap Cana, Sleeps 22"; new meta description (x3).
  - New section "Where to Have a Bachelor Party in the Dominican Republic" (Bávaro, Sosúa, Casa de Campo, Cap Cana) + TOC entry.
    Sources: rome2rio (Sosúa ~4 mi from POP, ~5h drive from Punta Cana), pujairporttransfers.com (Bávaro 25–40 min / Cap Cana 15–25 min from PUJ),
    casadecampo.com (7,000 acres, group villas for bachelor parties), deeparrival/caribbeanparadisehomes (Casa de Campo ~45–50 min from PUJ, LRM airport).
  - Cost FAQ now has canonical rates from rates.html + facts.ts (8BR $3,000/$4,500/$12,000; 6BR $2,500/$4,000/$10,000; +$100/pp above 16; mins 4/5/7)
    with per-person math ($281 pp at 16, $4,500 + $600 = ~$232 pp at 22). Visible + JSON-LD.
  - New FAQ "Where is the best place in the Dominican Republic for a bachelor party?" (visible + JSON-LD, 8=8, same order, JSON parses).
  - Removed unsourced "most popular" / "best-reviewed" claims. Las Iguanas line corrected to facts.ts (back nine open, front nine ~spring 2027).
  - sitemap.xml lastmod for /occasions/bachelor -> 2026-10-02.
- After deploy: Rob requests indexing in GSC for https://www.espadavilla.com/occasions/bachelor. Recheck the query position at the Nov 1 review.
- Not touched, possible follow-ups: overline "The Caribbean's Best Bachelor Party Villa" (unsourced superlative); "Up to 22 guests across 8 private en-suite bedrooms" FAQ wording.
