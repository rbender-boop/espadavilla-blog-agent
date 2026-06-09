# espadavilla-blog-agent -- project-scoped rules (Claude Code)

Autonomous weekly SEO blog agent for espadavilla.com (Villa Espada's OWN booking
site). Drafts a post in the property's host voice, sends it to Rob on WhatsApp for
approval, and on "yes" commits the rendered post + updated blog index + regenerated
sitemap to rbender-boop/espadavilla-com main (Vercel auto-deploys). Cloned from the
working golfvilla-blog-agent; only the content layer + infra targets differ.

## Full build spec (read first)
- `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\BUILD-PLAN.md` (self-contained spec + resolved build-time facts in §11)
- Source engine reference: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
- Villa facts source of truth: `src/lib/facts.ts` (mirrors espadavilla.com/property-facts; identical villa, same Villa Espada)

## Resolved decisions (locked)
- Database: DEDICATED Supabase project (ref qqjrujrrqxtfsuikakuu), separate from golfvilla. All tables prefixed `blog_`. Migrations purely additive.
- WhatsApp: SHARED Unipile account. Inbound has one brain -- the LinkedIn webhook fans out any reply it can't match to this app's POST /api/inbound/resolve, which resolves against blog_approval_messages. Crons staggered to THURSDAY (golfvilla owns Monday) so the two agents never have overlapping pending approvals.
- Publish: straight to `main` of espadavilla-com (the WhatsApp "yes" is the approval gate). No PR.
- Cadence: weekly (Thursday).
- AI model pin: claude-sonnet-4-5-20250929 across all surfaces (no version drift).

## Safety rules
- Supabase: additive SQL (CREATE ... IF NOT EXISTS, ADD COLUMN, INSERT, scoped PK updates) runs without asking. DESTRUCTIVE ops (DROP, TRUNCATE, unscoped DELETE/UPDATE, lossy ALTER, disabling RLS) require an explicit "go" from Rob first -- show the exact SQL, state the blast radius, wait.
- Run all SQL directly via the Supabase MCP -- never hand it back as a code block. Always pass the espadavilla project_id (qqjrujrrqxtfsuikakuu) explicitly.
- The deployed agent commits ONLY to espadavilla-com, ONLY to main, ONLY after a WhatsApp "yes", under a fine-grained token (GITHUB_TOKEN_ESPADAVILLA) scoped to that one repo. Never force-push. Never touch any other repo. One publish per run; idempotent (a draft already 'published' is never re-committed).
- Interactive git pushes are Rob's job -- write the code, hand him the push command. (The autonomous publish path is the only auto-commit, and only post-approval.)
- Fail-open against missing migrations so a partial deploy can't break the draft->approve loop.

## Grounding (HARD)
- Villa facts (rates, config, staff, amenities, location, courses): ONLY from src/lib/facts.ts. Never guess.
- Timely facts (tournament dates, tourism stats, weather, sargassum): ONLY from a live web_search result, stored as sources. Never asserted from model memory.
- Schema: BlogPosting + exactly one FAQPage per post. VacationRental is ineligible.
- Blog URLs/files: cleanUrls -- posts committed as `blog/<slug>.html`, served at `/blog/<slug>` (no .html, no trailing slash). Canonical host www.espadavilla.com. Money links point INWARD (primary CTA: /contact).
- No hard negative-geo guard (that was golfvilla-specific). The steer is SOFT: keep every post anchored to the real Villa Espada + Cap Cana experience; never drift into generic "best Caribbean golf" category content -- that is golfvilla.com's lane and competing for it cannibalizes the sister site.
