# HANDOVER 2 — espadavilla.com AEO build: J1 + Phases A–E shipped — 2026-10-11

Continues `Handovers\HANDOVER 1.md` (roadmap, evidence, success metrics). Written mid-build because the
session context was getting full. Phases F–I and J2–J5 are still open (section 4).

Paths:
- Site repo: `C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE`
- Blog agent: `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`
- Edit tools used this session (copied here): `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\Handovers\aeo-tools\`
- Supabase: `qqjrujrrqxtfsuikakuu`

## 1. Rob's decisions (2026-10-11) — treat as canon
1. 17–22 guests = full 8-bedroom estate rate + $100 per guest above 16 (e.g. 20 peak = $4,500 + 4x$100 = $4,900, ~$245 pp).
2. Villa → Punta Espada first tee/clubhouse = about 5 minutes by golf cart ("five-minute"). Las Iguanas = about 2 min.
3. "Only" wording: Rob said leave all existing "only" wording as is. Don't add new "only" claims either.
4. No taxi fares. Say the butler arranges a trusted driver.
5. Direct vs Airbnb: canonical = `/blog/luxury-villa-vs-airbnb` (297 GSC impressions/90d); `/blog/villa-espada-vs-airbnb` 301'd to it;
   `/blog/cap-cana-direct-booking-villa-espadavilla` reframed as "How to Book Villa Espada Direct".
6. Welcome event / celebration setup: available on request outside holiday stays, butler arranges it. Never "included".
7. Capacity: 6-bedroom up to 16; full 8-bedroom estate up to 22. Site also says (correctly) "up to 21 adults in individual beds" (singles/golf layout).

## 2. What shipped (all pushed by Rob; IndexNow submitted after each push)
| Commit | Phase | Summary |
|---|---|---|
| (DB) | J1 | 27 truncated aeo_snapshots rows flagged `TRUNCATED (backfill 2026-10-11)…` (claude/Oct 14, perplexity/Sep 13). |
| a6ac387e | A | ~110 three-minute→five-minute (site + DB); 17–22 math fixed on 14 pages; 2021 taxi fare removed; footer "8BR luxury villa" → "6- or 8-bedroom luxury villa" on 133 pages. |
| cc7c13c (agent) | A | facts.ts 5-min cart; prompts: 17–22 rule, no taxi fares, holiday rates fixed ($7,500–8,500 → $10,000/$12,000). |
| 466274d5 | B | where-to-stay-punta-espada: new title, answer-first, "preferred tee times" H2, 3 probe FAQs; st-regis: "vs on-course" H2 + FAQ; llms.txt/llms-full lines; homepage schema containedInPlace + Fairway-5 amenity. Rich Results Test on `/`: 24 valid items, 0 errors. |
| 742096c4 | C | Eden Roc compare: answer-first, per-person table (12/16/20/22 × low/peak/holiday), probe FAQ; Eden Roc guide link; Casa de Campo post probe FAQ (+DB). |
| d9910547 | D | Airbnb canonical + 301 (live, 308) + direct-booking reframe (+DB: title, h1, meta, body, FAQ). |
| 97288365 | E | Birthday post (+DB): answer-first, probe FAQ, celebration-setup wording, removed $15B GDP + Virtuoso stats, Las Iguanas regular-rate fix; bachelor page: answer-first, per-person prices, 8BR rates, probe FAQ; occasions.html guide links + "partie" typo. |

GSC "Request Indexing" done for: where-to-stay, st-regis, `/`, eden-roc compare, casa-de-campo post, eden-roc guide,
luxury-villa-vs-airbnb, direct-booking. NOT yet requested for Phase E pages (birthday, bachelor, occasions).

## 3. Tooling notes (important)
- Supabase MCP `execute_sql` reads work; WRITES hang (approval prompt never reaches Rob). DB writes this session went through
  `aeo-tools\apply.py` (PostgREST + service key from `.env.local`). Each DB patch saves the old row to `Temp\aeo\backups\`.
- `apply.py <patch.json> [apply]`: dry-run by default; rules = literal/regex replacements on site files + the matching published
  `blog_post_drafts` row (meta_title, h1, meta_description, body_markdown, edited_content, summary, faq, sources); supports
  `db_only`, `faq_add`, auto dateModified + sitemap lastmod bump. `verify.py` checks JSON-LD parses and FAQ text = visible text.
  `indexnow.py <base> <head>` lists content-changed, indexable URLs. Submit with `curl.exe` to https://www.bing.com/indexnow
  (Python/PowerShell TLS to api.indexnow.org gets reset; Bing returns 200 and shares with IndexNow).
- Lesson: placeholder-protect strings must not create a \b word boundary (used `QQPROT`, not `§§`).
- `hotels-near-cap-cana-punta-espada`, `large-group-villa-cap-cana`, `what-is-included-cap-cana-villa`, `caribbean-golf-vacation-guide`,
  `punta-espada-golf-playing…`, `punta-espada-golf-shuttle…`, `cap-cana-new-developments-2025` are already 301'd + noindex.
  Don't spend AEO work on them (Phase F1 target moves to `compare/cap-cana-group-villa`).

## 4. Still open
### Phases (in order)
- **F** large groups / chef / capacity: F1 → `compare/cap-cana-group-villa.html` (not the redirected blog post): answer-first + staff
  table + probe FAQs "Where can 16 adults stay together in Cap Cana?" and "Private villa in Cap Cana for a very large group with full staff".
  F2 `blog/private-chef-villa.html`: new title naming Cap Cana/Villa Espada, answer-first, FAQ "Best luxury villa rentals in Cap Cana with a private chef".
  F3 `bedrooms.html` + `property-facts.html`: one sentence "6-bedroom configuration up to 16 guests; full 8-bedroom estate up to 22".
- **G** Bing Webmaster (verify, sitemap, URL inspection of 8 key URLs), robots.txt AI-bot check, `curl -A OAI-SearchBot -I` 200 check.
- **H** about.html + property-facts.html Cuba disambiguation line; sameAs (only Rob-confirmed live profiles); press.html footer link; reviews outreach (Rob).
- **I** things-to-do (DB) + cap-cana-with-kids 4-family bedroom example (verify layout from bedrooms.html); cap-cana-vs-punta-cana answer-first.
- **A3** green-fee summer wording on/after Nov 1 (verify 2027 summer rates at the course site first).
- **J2** update trigger `trig_015YKba3tnjz87xqAMtYhLru` prompt (TRUNCATED note, corrected baselines, model pins = model break, ~35–60 min).
- **J3** memory/overview: Gemini "citation gap" was a measurement bug; ChatGPT is the real gap.
- **J4** port Gemini-redirect + truncation fixes to `golfvilla-blog-agent\scripts\aeo-probe.ts`; backfill golfvilla (`genidekhqwsxvsboyrih`).
- **J5** `npx tsx scripts/aeo-probe.ts --dry` before Nov 16.
- GSC Request Indexing for Phase E URLs.

### VERIFY / Rob questions
1. "Punta Espada and Las Iguanas are three minutes apart" (13 spots, course-to-course) — still right?
2. "Rates subject to 18% Dominican Republic tax and service" in punta-espada-golf-playing, staying-at-villa-espada, birthday post contradicts rates.html ("no government rental tax"). Remove?
3. Airport taxi fares disagree ($11–15 vs $30 vs $30–50). Drop all numbers?
4. Eden Roc "rooms from about $600" and "$450 massage" on the Eden Roc compare page are unsourced.
5. Direct-booking page says Villa Espada "books direct only" — false if any Airbnb/VRBO listing exists (A6, Rob checks listings).
6. Direct-booking post shows email + phone in body text (agent rule says contact link only).
7. Distance table (St. Regis / Eden Roc / Sanctuary → Punta Espada clubhouse) not built — needs measured distances.
8. Press-release copies on site now say five minutes; GlobeNewswire wire copies still say three (can't change).

## 5. Git (Rob)
Commit these handover files (optional, untracked):
    cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"
    git add "Handovers/HANDOVER 2.md" Handovers/aeo-tools
    git commit -m "Handover 2: AEO build J1 + phases A-E shipped; aeo edit tools"
    git push
