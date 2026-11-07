# HANDOVER 6 — 12-adult rule rollout + 11/07 publish (2026-11-07, Cowork on ROB2026LAPTOP)

Continues HANDOVER 5. Rules: never push git (give Rob commands, PowerShell, one per line, `git pull --rebase` before push). SQL via Supabase MCP (espadavilla `qqjrujrrqxtfsuikakuu`, golfvilla `genidekhqwsxvsboyrih`). Questions as popout options. Edit with scripts, review with `git diff --stat` + sample hunks.

Rule (Rob 11/07): **"6-bedroom rate covers up to 16 guests with no more than 12 adults; 13 or more adults must book the full 8-bedroom estate."**

## START HERE
1. Confirm Rob ran the commands in "Commands given to Rob" (below) in that order; if a `rerender-published.ts` call exited 3 (drift guard), run `npx tsx --env-file=.env.local scripts/diff-live-vs-db.ts --slug=<slug>` and merge live hand-patches into the DB before `--force`.
2. Verify live (HANDOVER 5 step 4 list) PLUS: espadavilla /rates captions say "up to 12 adults · … required for 13+ adults"; /compare/cap-cana-villa-vs-eden-roc-hotel table rows "12 adults (6-bedroom) $208/$333/$833" and "13 adults … $231/$346/$923"; /blog/cap-cana-casa-de-campo-golf-base says $4,000 / $333 / $2,000; golfvilla /golf-trip-cost-calculator switches at 13 golfers (`g>=13`).
3. IndexNow + GSC Request Indexing for changed URLs (list: `git show --stat HEAD` in each site repo + the re-rendered slugs).
4. Task 2e (not started): PDFs (rate sheet / bedroom guide / summary PDF; built in b726cffd) and `/videos/6-or-8-bedrooms` — page text already fixed by the script; check whether the video audio/captions say "11 adults". PDFs can't be text-patched by the script (binary, `git grep -I` skips them) — find their source (HTML/MD in repo?) and regenerate, or report to Rob.
5. Task 3 (task 6 of H5): 12-golfer / three-foursome line on espadavilla golf-group posts (6-bedroom setup). Show before/after; save to edited_content only after Rob approves. Note the Casa de Campo base post already now shows 12 adults in the 6-bedroom.
6. Task 4: member-guest savings. **DECIDED (Rob 11/07): $135 per golfer on a peak-season morning round is canonical** ($395 member-guest vs $550). Scope found 11/07: 12 espadavilla-com files still use $200 savings wording (blog/best-golf-caribbean, cap-cana-golf-guide, cap-cana-guide, golf-bachelor-party-cap-cana, las-iguanas-golf-course-cap-cana, punta-espada-golf-shuttle-…, where-to-stay-punta-espada, + 5 more: `git grep -l -I -E '\$200 (less |per golfer|per round|savings|a round)|saves? (roughly |about |approximately )?\$200|\$200 (off|discount)'`); golfvilla-com 0; espadavilla DB 0. Rewrite each in context (any multiplied totals like "$3,200 swing" must be recomputed with $135), bump dates, show Rob a diff sample, then commit commands. CANONICAL-FACTS.md line 163 history already says $135 (peak AM $395 vs $550) and "retired ~$200/round"; where-to-stay page says "about $200". Fix whichever is non-canonical across both sites + DB.

## Done this session
- **golfvilla 11/07 render reviewed** before the rule work: only intended cart-time/Las Iguanas edits + dates; no reverted hand patches.
- **Decision:** publish 11/07 edits and adult fixes in one render per post (not two rounds).
- **Canon (2a):** `GOLFVILLA-WEBSITE\CANONICAL-FACTS.md` ADULT LIMIT rewritten (line 25) + "Last updated 2026-11-07" entry (line 163); `GOLFVILLA-WEBSITE\CLAUDE.md` line 20. Not a git repo — nothing to commit.
- **facts.ts (both agents):** adult rule added to the CANONICAL_FACTS comment and the drafting prompt's Bedrooms rule; new riskCheck guard flags "11 adults", "12+ adults", "12 or more adults", "more than 11 adults" (regex tested; new wording passes). Both import cleanly (tsx/bun). Uncommitted in both agent repos.
- **DB (2b), edited_content + body_markdown + faq, published rows:** espadavilla 5 posts, golfvilla 6 posts. Mechanical: "no more than 11 adults"→12, "12 or more adults"→13. Content change: espadavilla `cap-cana-casa-de-campo-golf-base` example now 12 adults in the 6-bedroom at $4,000 → ~$333/pp/night, ~$2,000/pp/week (was 8BR $4,500 / $375 / $2,250). Post-check: 0 retired-wording rows on both projects.
- **Pre-existing math errors fixed (golfvilla DB):** `punta-espada-villa-rentals` (22 guests low: $3,600/night, 4 nights, ~$655/pp, ~$164/night; peak: $5,100/night, $25,500, ~$1,159/pp, ~$232/night) and `best-time-golf-trip-cap-cana` (peak 22: $5,100 / $25,500 / ~$1,159) — both had put 22 guests at the $4,000 6BR rate.
- **Static sites (2c)** via `C:\Users\rbend\AppData\Local\Temp\fix_static_adults.py`: espadavilla 38 files (+138/−138), golfvilla 77 files; 11 DB-backed post files skipped (re-render handles them). FAQ visible-vs-JSON-LD sync unchanged in every file. dateModified + sitemap lastmod → 2026-11-07 (4 espadavilla blog pages are noindex and correctly not in the sitemap; golfvilla SEO-files/* likewise).
  - Hand rewrites: espadavilla `blog/caribbean-golf-vacation-guide` (12 adults → 6BR $4,000, $333/night, $1,667/5 nights), `blog/golf-bachelor-party-cap-cana` (12 guests $333 in 6BR), `blog/punta-espada-golf-shuttle-…` ("A 12-adult group fits the 6-bedroom … $2,500 … ~$208"), `compare/cap-cana-villa-vs-eden-roc-hotel` table rows, `blog/hotels-near-cap-cana-punta-espada` ($208 for 12 adults in 6BR), `blog/private-villa-vs-all-inclusive-resort` table (12 adults $208; plus pre-existing errors: peak 22 $205→$232, holiday 22 $386→$573); golfvilla `golf-trip-cost-calculator` `g>=12`→`g>=13`.
- **golfvilla re-render (local):** 10 posts rendered into golfvilla-com (11/07 list + adult posts); 90 files total uncommitted there. Posts changed only by SQL keep their old dateModified (renderer reads the row date) — cosmetic.

## Noticed, not actioned
- espadavilla `blog/hotels-near-cap-cana-punta-espada` says "a short walk from the clubhouse" and "butler who also serves as the dedicated villa manager" — check vs canon (clubhouse = 5 min by cart).
- Next AEO scan: Perplexity espadavilla.com citations (43 on Oct 31) — see H5.

## Commands given to Rob (run in this order)
A. espadavilla-com static (push BEFORE the API re-renders): `git add -u` (tracked files only; avoids the stray .mp4), commit, `git pull --rebase`, push.
B. espadavilla re-renders: the 7 from H5 + 4 adult-rule slugs (cap-cana-vs-casa-de-campo-comparison, punta-espada-golf-villa-luxury-group, cap-cana-direct-booking-villa-espadavilla, cap-cana-casa-de-campo-golf-base). Drift check on the 4 (11/07) showed only the adult-rule blocks differ → `--force` safe. Then `git pull --rebase` in WEBSITE.
C. golfvilla-com: `git add -u`, commit, pull --rebase, push (90 files: 10 re-rendered posts + 77 static + index/sitemap/feed).
D. Agent repos: facts.ts in both; espadavilla-blog-agent also Handovers 5 + 6.
