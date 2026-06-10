# Handover — SEO/GEO Audit, Bug Fixes & Enhancements (2026-06-10)

Scope: full review/debug of `espadavilla-blog-agent` plus three SEO/GEO
enhancements, executed across several sessions. This documents everything done
to THIS local folder (the agent repo) and, separately, what was committed to the
LIVE site repo (`rbender-boop/espadavilla-com`).

---

## 1. Git state at time of writing

- Branch `main` is **in sync with `origin/main`** through commit `ca53b86`
  (verified with `git fetch` + `git rev-list --left-right --count`).
- Commits already pushed:
  - `ad1a916` — the 5 bug fixes (pillar map, sitemap lastmod, datePublished, CTAs, length-retry)
  - `634fde5` — llms.txt publish target + IndexNow ping + WhatsApp number fix
  - `ca53b86` — per-post cluster-mapped hero images
- **Only uncommitted change:** `scripts/rerender-published.ts` (brought up to
  parity with the live publish path during the re-render of the two existing posts).

### Push command (covers the one remaining file)
```
cd "C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent"; git add -A; git commit -m "chore(rerender): parity with live publish path (cluster image + llms.txt + summary/sources)"; git push origin main
```

---

## 2. Bug fixes (commit `ad1a916`) — all verified

1. **Dead pillar/internal-linking map** — `src/lib/drafting/overlap-score.ts`
   `PILLAR_BY_CLUSTER` still used golfvilla's cluster slugs + golfvilla money
   pages, so NONE of espadavilla's live clusters (`stay`, `golf`, `experience`,
   `logistics`, `group_occasion`) resolved a pillar. Remapped to real
   espadavilla pages (`/villa`, `/golf`, `/experiences`, `/amenities`, `/faq`,
   `/compare/cap-cana-vs-casa-de-campo`). All 6 targets verified HTTP 200.

2. **Sitemap `<lastmod>` never updated on refresh** — `src/lib/publish/update-sitemap.ts`
   The idempotent insert returned the file unchanged for an existing slug, so the
   Phase-4 refresh loop never signaled freshness. Now updates the `<lastmod>` of
   an existing entry; still idempotent when unchanged; still inserts new URLs.

3. **Refresh reset `datePublished`** — `src/lib/publish/commit-post.ts`
   Refresh drafts are new rows with null `published_at`, so a refreshed page's
   `datePublished` jumped to "today" (date-manipulation signal to Google). Now a
   refresh inherits the original publish date, carries today as `dateModified`,
   persists the inherited date, and the sitemap lastmod uses the modified date.
   Refresh eligibility (`src/lib/gsc/refresh-generator.ts`) re-anchored to the
   later of `published_at`/`updated_at` so a just-refreshed post isn't re-flagged.

4. **CTA buttons 308-redirected** — `src/lib/publish/render-post.ts`
   `/contact.html` and `/rates.html` → 308 → extensionless (verified live).
   Changed CTA hrefs to `/contact` and `/rates`. (Nav/footer chrome still uses
   `.html` because it mirrors the live hand-built template verbatim — that's a
   site-repo change, not this repo.)

5. **Length-retry couldn't retry** — `pipeline.ts` + `generate-post.ts`
   The correction prompt said "return the SAME post corrected" but never showed
   the model its previous draft. Now includes the prior draft so the retry can
   actually shorten/lengthen it.

---

## 3. Enhancement #1 — llms.txt is now a publish target (commit `634fde5`)

- **New file `src/lib/publish/update-llms.ts`** — `upsertLlmsEntry()` surgically
  inserts each published post into a `## Latest Guides` section of llms.txt
  (created on first use, placed after Pillar Guides, before Best Answer Summary),
  bumps `## Last Updated`, and never touches the hand-curated sections. A refresh
  to the same URL updates the existing line in place (no duplicates), including
  URLs already present in Pillar Guides.
- **`src/lib/publish/commit-post.ts`** — fetches `llms.txt` alongside index/
  sitemap and includes the upsert in the single atomic commit.
- 9 offline checks added; also tested against the real downloaded live llms.txt.

## 4. Enhancement #3 — IndexNow ping on publish (commit `634fde5`)

- **New file `src/lib/publish/indexnow.ts`** — `pingIndexNow()` POSTs published
  URLs to api.indexnow.org (feeds Bing → Copilot → ChatGPT-search). Best-effort:
  a failure never fails a publish; result logged to `blog_agent_runs.metadata`.
  Skipped silently if `INDEXNOW_KEY` is unset.
- **`commit-post.ts`** — auto-commits the required `<key>.txt` file to the site
  repo root on first publish (idempotent), then pings after each successful commit.
- **Key:** `INDEXNOW_KEY=3348bc6a409522753cec189cdfca4c19`
  - Written to `.env.local` (gitignored — NOT in the repo).
  - Added to **Vercel production env** (`vercel env add INDEXNOW_KEY production`).
  - Documented (blank) in `.env.example`.

## 5. Enhancement #2 — per-post cluster-mapped hero images (commit `ca53b86`)

- **New file `src/lib/publish/blog-images.ts`** — `pickPostImage(slug, cluster)`
  maps each of the 7 clusters to a pool of REAL site images (22 unique files, all
  verified HTTP 200, all landscape >=1200px, true measured dimensions). Picks
  deterministically by slug so a post and its refreshes always get the same image.
  Unknown/null cluster → safe default (`villa-espada-aerial-fairway-5...`).
- **`src/lib/publish/render-post.ts`** — when an `image` is supplied: emits a
  Google-preferred `ImageObject` (with width/height) in the BlogPosting schema,
  `og:image:width`/`height`/`alt` + `twitter:image`, and a visible
  `<img class="post-hero">` at the top of the body. No image → unchanged legacy
  `hero-1.jpg` behavior (back-compat).
- **`commit-post.ts`** — selects the cluster image (cluster already loaded there)
  and passes it through.
- 11 offline checks added.

---

## 6. Data / canonical-fact fix (commit `634fde5`)

- `src/lib/facts.ts` — WhatsApp number corrected `+1 (734) 755-6357` →
  `+1 (248) 254-3406` to match the live `espadavilla.com/property-facts` (the
  declared source of truth). This feeds every drafter prompt.

## 7. Security cleanup (commit `634fde5`)

- `.env.example` previously contained a REAL GitHub PAT
  (`GITHUB_TOKEN_ESPADAVILLA=github_pat_...`). It was not git-tracked at the time
  so nothing leaked, but it's been blanked. The real value lives only in
  `.env.local` (gitignored) and Vercel env.

## 8. The re-render script (UNCOMMITTED — the one pending file)

- `scripts/rerender-published.ts` — upgraded from the golfvilla-era version to
  full parity with the live publish path: now passes `summary`, `sources`, the
  cluster-mapped `image`, uses `modifiedISO = today` (preserving the original
  `datePublished`), bumps sitemap lastmod, and upserts llms.txt. Used to
  re-render the two existing posts (see §10). This is the only change the push
  will include.

## 9. Verification status

- `npm run typecheck` — clean.
- `scripts/verify-offline.ts` — all checks pass (original suite + 9 llms +
  11 image checks). No network/DB/keys required.
- All 22 mapper image URLs probed live → HTTP 200.
- All 6 pillar pages probed live → HTTP 200.
- Live DB sanity-checked via Supabase MCP (topics, drafts, jobs all healthy).
- Agent deployed to Vercel prod twice during the work; `/api/health` green
  (all 11 env checks true) after each.

---

## 10. Changes made to the LIVE site repo (rbender-boop/espadavilla-com)

These are SEPARATE from this repo — committed directly to the site via the
agent's GitHub client / scripts. Listed here for the record:

- `51903c29` — llms.txt: fixed bathroom count (10 → 9.5, both occurrences) and
  backfilled the two published posts into `## Latest Guides`.
- `abaa27de` — re-rendered `staying-at-villa-espada-day-on-property` with hero
  `villa-espada-exterior-front.jpg` (stay cluster) + ImageObject/og dims.
- `96419966` — re-rendered `tennis-and-padel-cap-cana` with hero
  `11_Establos_aerial_1.jpg` (experience cluster) + ImageObject/og dims.

All three auto-deployed via Vercel and were verified live (post-hero img,
ImageObject, og:image:width all present; datePublished preserved, dateModified
= 2026-06-10).

NOTE: the IndexNow key file `3348bc6a409522753cec189cdfca4c19.txt` will be
auto-committed to the site repo root on the NEXT pipeline publish (not yet
present, by design).

---

## 11. Deployment & timing

- Production runs everything above (deployed from local working tree twice).
- Reminder: deploys used the local tree, so prod was briefly ahead of git;
  after the pending push, repo and prod are fully in sync.
- Next pipeline cron: **Thursday 13:00 UTC** — first run to exercise the full
  new stack end-to-end (cluster image + ImageObject + llms.txt entry + sitemap
  lastmod + IndexNow ping, all in one commit).

## 12. Outstanding / optional (need a go-ahead each; both touch the live site)

1. **Per-slug image override** — if you want a specific photo pinned to a
   specific post (e.g. `rafanadaltenniscenter.jpg` for the tennis post instead of
   the deterministic Establos pick), it's a one-line override map in
   `blog-images.ts`. Not yet implemented.
2. **#2 image discussion was resolved** using the existing gallery; no new
   photography was needed. If higher-res/dedicated blog imagery is added later,
   just drop files in `espadavilla-com/images/` and extend the cluster pools.

## 13. Reminder for the operator

- All commits are yours to push (per your workflow). The push command is in §1.
- SQL was run directly via Supabase MCP during the audit (read-only checks);
  no schema migrations were applied this session.
