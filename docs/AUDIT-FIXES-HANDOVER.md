# Blog Agent — Audit Fixes Handover

**Date:** 2026-06-08
**Scope:** 10 fixes to the autonomous blog generator so the audited defects can't recur. Per-post images were intentionally excluded.
**Verified (in the real project):** `bun run typecheck` → 0 errors (with `exactOptionalPropertyTypes`); `bun run smoke` → ALL CHECKS PASSED; plus a dry-run render of a representative post asserting valid JSON-LD (`JSON.parse` of the `@graph`), citation stripping, table rendering, `</script>` escaping, schema wiring, and UTF-8 encoding (no mojibake).

---

## What changed (by file)

| File | Status | Fixes |
|---|---|---|
| `src/lib/publish/site-chrome.ts` | **new** | #3 — single source of truth for GTM / nav (with `/blog` link) / footer |
| `src/lib/publish/render-post.ts` | rewritten | #1 cite-strip · #4 JSON-LD escaping · #5 BreadcrumbList · #6 entity graph · #8 tables · #9 schema fields + author/publisher `sameAs` · #3 shared chrome |
| `src/lib/publish/update-index.ts` | rewritten | #3 — index consumes shared chrome (nav now has `/blog`) |
| `src/lib/publish/commit-post.ts` | edited | #2 stable date from `published_at` + `dateModified` from `updated_at` · #7 `/blog` in sitemap · #9 passes `wordCount`/`articleSection`/`keywords` |
| `src/lib/drafting/generate-post.ts` | edited | #1 strip `<cite>` in `normalizePost` + prompt rule (citations only in `sources`) |
| `src/lib/niche.ts` | edited | #10 reader-benefit H2 rule (no SEO scaffolding headings) |
| `scripts/rerender-published.ts` | **new** | one-off re-render of an already-published post through the real modules |

**Unchanged:** `src/lib/links.ts`, `src/lib/publish/update-sitemap.ts`.

---

## The 10 fixes

1. **`<cite>` tags showed as literal text in the post body.** The web-search drafter emitted `<cite index="…">…</cite>` into `body_markdown`; `escapeHtml` turned it into visible markup. Now stripped at the source (`normalizePost`), again defensively at render (`stripCitations`), and the drafter is told never to inline citations.
2. **Date disagreed across post / index / sitemap.** Each publish run minted its own `new Date()`, so a retry could split the date (the live post showed June 8 on the page, June 7 on the card/sitemap). The published date is now derived once from `published_at` and reused on every render; `dateModified` comes from `updated_at`. Re-renders never shift the date.
3. **Nav/footer drift.** Chrome was hardcoded separately in the renderer and the index, and both lagged the live site (no `/blog` link). Extracted to `site-chrome.ts` — one place to edit, and the two generated surfaces can't diverge again.
4. **JSON-LD `</script>` breakout risk.** `JSON.stringify` doesn't escape `<`. The serialized JSON-LD now escapes `<`, `>`, `&` to `\uXXXX` (parses identically, can't break out — confirmed by round-trip `JSON.parse`).
5. **No `BreadcrumbList` schema.** Added Home → Blog → Post.
6. **`BlogPosting` not in the site entity graph.** Now references `https://www.golfvilla.com/#website` and `#organization` (verified to exist on the live homepage) and an author `#rob-bender` Person node. The inline publisher `Organization` mirrors the homepage node exactly — same `@id`, `name`, `sameAs`, and a logo that points to an image that actually exists (`og-golf-villa.jpg`).
7. **`/blog` index missing from `sitemap.xml`.** Now added idempotently on every publish.
8. **No table support.** `markdownToHtml` renders GitHub-style pipe tables as `<table class="post-table">` for the Villa-vs-Resort / Face-Off pillars.
9. **Thin `BlogPosting` + missing author URL.** Added `wordCount`, `articleSection` (topic cluster), `keywords` (primary+secondary), maintainable `dateModified`, and a real, verified `sameAs` on both the author Person and the publisher Organization: `https://www.instagram.com/golfvillapuntaespada` (taken from the live golfvilla.com homepage `#organization` node — not fabricated). The author Person also declares `worksFor` the Organization.
10. **SEO scaffolding leaked into reader-facing H2s.** Voice rule added so headings name reader benefit, not the keyword being targeted.

### Money-site note (not in scope, flagged for follow-up)
The live golfvilla.com homepage `#organization` schema declares its logo as `/images/golfvilla-logo.png`, but that file does **not** exist in the `golfvilla-com` repo (only `og-golf-villa.jpg` is present). The blog post publisher logo correctly uses the existing `og-golf-villa.jpg`; consider either adding `golfvilla-logo.png` to the money site or pointing the homepage `#organization.logo` at the existing image.

### Not counted (pre-existing, separate)
The hand-built money pages self-canonical *with* a trailing slash while `vercel.json` is `trailingSlash:false`. The generator's output is already correct (no trailing slash), so this is a money-site cleanup, not one of these 10.

---

## Live post remediation (the one already-published post)

Slug: `corales-puntacana-championship-2026-caribbean-golf-villas`

The stored draft source has already been cleaned in the DB (citation tags stripped; the two scaffolding headings rewritten to reader-value framing). The published date is preserved. To push these fixes — plus breadcrumb/schema/nav/table improvements — onto the live page, re-render it through the real modules:

```
bun run scripts/rerender-published.ts corales-puntacana-championship-2026-caribbean-golf-villas
```

That commits the corrected post + index card (with the canonical date) + sitemap entries to `golfvilla-com` and Vercel redeploys. This is the WhatsApp-gated publish path, so running the script yourself is the deliberate approval step.

---

## Verification log

```
bun run typecheck  -> exit 0 (no errors)
bun run smoke      -> ALL CHECKS PASSED
dry-run render     -> ld+json parses; @graph: BlogPosting, BreadcrumbList, Person, Organization, FAQPage
                      author.sameAs + publisher.sameAs = instagram.com/golfvillapuntaespada
                      <cite> stripped; pipe table rendered; </script> escaped; /blog in nav; UTF-8 intact
```
