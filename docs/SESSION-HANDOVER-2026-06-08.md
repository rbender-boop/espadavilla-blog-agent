# Session Handover — 2026-06-08

Audit + 10 surgical fixes to the blog pipeline, plus a live re-render of the one
already-published post. Everything below is **done and verified** unless marked
otherwise.

---

## 1. What was fixed (all in `golfvilla-blog-agent`, pushed to `main`)

| # | Fix | File(s) |
|---|-----|---------|
| 1 | Strip `<cite>` tags so they never render as visible text | `src/lib/drafting/generate-post.ts` (stripCitations + prompt rule), `src/lib/publish/render-post.ts` (defensive strip) |
| 2 | Date consistency — derive `publishedISO` once from `published_at`, reuse everywhere; `dateModified` from `updated_at` | `src/lib/publish/commit-post.ts` |
| 3 | Shared nav/footer/GTM chrome (single source of truth, `/blog` link included) | NEW `src/lib/publish/site-chrome.ts`, consumed by `render-post.ts` + `update-index.ts` |
| 4 | Escape `<>&` in JSON-LD to prevent `</script>` breakout | `src/lib/publish/render-post.ts` |
| 5 | BreadcrumbList schema (Home -> Blog -> Post) | `src/lib/publish/render-post.ts` |
| 6 | BlogPosting wired to real site entity graph (`#website`, `#organization`, author `#rob-bender`) | `src/lib/publish/render-post.ts` |
| 7 | `/blog` index added to `sitemap.xml` (idempotent) | `src/lib/publish/commit-post.ts` |
| 8 | Pipe-table support in markdown -> HTML (`.post-table`) | `src/lib/publish/render-post.ts` |
| 9 | Richer BlogPosting: wordCount, articleSection, keywords, dateModified; author Person + publisher Organization with real `sameAs` (Instagram) + logo `og-golf-villa.jpg` | `src/lib/publish/render-post.ts`, `src/lib/publish/commit-post.ts` |
| 10 | Reader-benefit heading rule (no SEO-scaffolding H2s) | `src/lib/niche.ts` |

Also NEW: `scripts/rerender-published.ts` — re-renders an already-published post
by slug through the real modules (bypasses the idempotency guard). Used to fix
the live Corales post.

Verified before push: `bun run typecheck` (exit 0), `bun run smoke` (all checks
passed), dry-run render (valid JSON-LD @graph, cites stripped, table rendered,
script escaped, `/blog` in nav, UTF-8 intact).

---

## 2. Live post re-render — COMPLETED

- **Slug:** `corales-puntacana-championship-2026-caribbean-golf-villas`
- **DB source** was pre-cleaned (cites stripped, 2 scaffolding headings rewritten,
  `published_at` preserved, word_count 1639) via scoped Supabase SQL.
- **Commit:** https://github.com/rbender-boop/golfvilla-com/commit/11e8e1b7cf79af33c0a511db70b0b39916f1c209
- **Live:** https://www.golfvilla.com/blog/corales-puntacana-championship-2026-caribbean-golf-villas

Verified clean on the committed file: single JSON-LD `@graph`
(BlogPosting + BreadcrumbList + Person + Organization + FAQPage), dates both
`2026-06-08`, `/blog` in nav + mobile menu, breadcrumb links `/blog` (no slash),
no `<cite>` tags, `.post-table` CSS present.

---

## 3. How to re-render a published post (repeatable)

```powershell
cd "C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent"
bun --env-file=.env.local scripts/rerender-published.ts <slug>
```

Success prints `Re-rendered N file(s)`, a `Commit:` URL, and a `Live:` URL.
Vercel auto-deploys `golfvilla-com` in ~1 min.

### Environment gotchas (these cost real time — read before re-running)

1. **`vercel env pull` returns BLANK values for secrets.** Sensitive vars
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_TOKEN_GOLFVILLA`, etc.)
   are write-only in Vercel, so the pulled `.env.local` has the keys but empty
   values. You must paste the real values in by hand.
   - Supabase URL + service_role key: Supabase dashboard -> project
     `genidekhqwsxvsboyrih` -> Settings -> API.
   - `GITHUB_TOKEN_GOLFVILLA`: GitHub fine-grained PAT, **Contents: Read AND
     write** on `rbender-boop/golfvilla-com`. (Read-only -> 403 on commit.)
2. **`GOLFVILLA_REPO` pulls in as `""`** and the code default (`??`) only fires
   on undefined, not empty string. Set it explicitly in `.env.local`:
   `GOLFVILLA_REPO=rbender-boop/golfvilla-com`
3. **bun does not auto-load `.env.local`** in this setup — always pass
   `--env-file=.env.local` (or rename to `.env`, which bun always auto-loads).
4. Editing files via PowerShell `[System.IO.File]` uses .NET's working
   directory, NOT the shell's `cd`. Use **absolute paths** with it.

---

## 4. Key environment facts

- **Agent repo (local):** `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- **Agent repo (GitHub):** `rbender-boop/golfvilla-blog-agent` (branch `main`) - the agent code
- **Live site repo:** `rbender-boop/golfvilla-com` (Vercel auto-deploys; `vercel.json` cleanUrls=true, trailingSlash=false). The blog publish path commits here via the GitHub API.
- **Supabase blog project id:** `genidekhqwsxvsboyrih` (the default-connected Supabase points at the wrong project — always pass this id).
- Runtime: Bun 1.3.13.

---

## 5. Remaining / flagged (NOT done — your call)

- **`.env.local` now holds real secrets in plaintext.** It is gitignored
  (`.env`, `.env.local`, `.env*.local`), so safe from commit, but you may want
  to delete it:
  `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent\.env.local`
- **Homepage `#organization` schema references `/images/golfvilla-logo.png`,
  which does not exist** in the `golfvilla-com` repo. Either add that file or
  repoint the homepage schema to `og-golf-villa.jpg` (what the generator uses).
- **Hand-built money pages self-canonical WITH a trailing slash** while
  `vercel.json` sets `trailingSlash=false` (pre-existing inconsistency on the
  static pages; the generator output is already correct). Separate cleanup.
- **Per-post images** were explicitly out of scope for this pass.

---

*Generated 2026-06-08. Supersedes earlier draft artifacts; the directly-written
local files are the source of truth.*
