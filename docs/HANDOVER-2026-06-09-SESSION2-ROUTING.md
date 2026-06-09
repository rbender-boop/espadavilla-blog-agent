# HANDOVER — Espadavilla Blog Agent: incident, fixes, and next builds (2026-06-09, session 2)

## TL;DR
The espadavilla blog agent is LIVE and the full draft pipeline works end-to-end
(enqueue → research → draft → guard → notify → WhatsApp). During the first real
e2e test we hit TWO issues:

1. **Approval misroute (root cause = shared WhatsApp thread + step 11 not live).**
   A bare "yes" meant for the blog was consumed by the LinkedIn agent, which
   published its own pending CRE post. Blog was NOT published by that "yes".
2. **Publish blocked on GitHub token.** When we published the blog directly via
   the resolver, the commit failed: `git.getRef heads/main → 404`. The Vercel
   `GITHUB_TOKEN_ESPADAVILLA` value can't access `rbender-boop/espadavilla-com`.

Blog draft `83d97494-b723-46eb-acc3-9240205f763e` is currently `approved` and
will auto-publish on the next `drain-approved` sweep ONCE the token is fixed.

---

## IMMEDIATE TODO (Rob — Vercel, do first)
- Fix **`GITHUB_TOKEN_ESPADAVILLA`** in the espadavilla-blog-agent Vercel project
  (Production). It must be a fine-grained PAT with **Contents: Read & Write** on
  `rbender-boop/espadavilla-com`, not expired. `ESPADAVILLA_REPO` is already
  correct (`rbender-boop/espadavilla-com`).
- After updating: redeploy is NOT required for env (crons read env at runtime),
  but the next `drain-approved` (every 15 min) will publish draft `83d97494`.
  To publish immediately, Claude can:
  `GET https://espadavilla-blog-agent.vercel.app/api/cron/drain-approved`
  with header `Authorization: Bearer <CRON_SECRET>`.
- Verify the published post: draft → `published`, `live_url` set, and the blog
  index gained ONE `<li>` without losing the existing ~26 (the update-index fix).

## SECRETS / IDS (from espadavilla .env.local — do NOT commit)
- Supabase project_id: `qqjrujrrqxtfsuikakuu` (use Supabase MCP with this id)
- CRON_SECRET: in `.env.local` line 28
- INBOUND_RESOLVE_SECRET (espadavilla): `.env.local` line 19
- Prod base URL: `https://espadavilla-blog-agent.vercel.app`
- Repos: agent = `C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent`;
  LinkedIn agent = `C:\Users\rbend\Desktop\Claude Projects\LinkendIN Agent`;
  live site repo = `rbender-boop/espadavilla-com` (branch `main`).

---

## WHAT WAS DONE THIS SESSION (committed-ready; Rob pushes)

### A. Step 11 — LinkedIn agent fan-out to a 2nd blog (espadavilla)
File edited: `LinkendIN Agent\src\lib\blog-forward.ts` (committed locally by Rob).
- Now supports TWO blog targets via per-target env pairs:
  - golfvilla:   `BLOG_RESOLVE_URL` + `INBOUND_RESOLVE_SECRET`
  - espadavilla: `BLOG_RESOLVE_URL_ESPADAVILLA` + `BLOG_RESOLVE_SECRET_ESPADAVILLA`
- `getBlogPendingSentAt()` returns freshest pending across targets;
  `forwardToBlogResolver()` forwards freshest-first, stops at first match.
- Caller `LinkendIN Agent\src\app\api\webhooks\unipile\route.ts` UNCHANGED.
- **OPEN: it is NOT confirmed that the two espadavilla env vars are set in the
  LinkedIn agent's Vercel + redeployed.** If not, the LinkedIn agent cannot see
  espadavilla blog pendings → this is part of why the misroute happened.
  - `BLOG_RESOLVE_URL_ESPADAVILLA` = `https://espadavilla-blog-agent.vercel.app/api/inbound/resolve`
  - `BLOG_RESOLVE_SECRET_ESPADAVILLA` = espadavilla `INBOUND_RESOLVE_SECRET` (.env.local line 19)
  - Redeploy LinkedIn agent: `cd "...\LinkendIN Agent"; vercel --prod --yes --scope robert-benders-projects`

### B. Repointed golfvilla → espadavilla branding (7 files in espadavilla agent)
Typecheck clean, smoke ALL PASS, sample render = 0 golfvilla hits. Files:
- `src\lib\publish\site-chrome.ts` — Villa Espada nav/footer/GTM (`GTM-PMPSNQZT`); networkBar() now no-op
- `src\lib\publish\render-post.ts` — og:site_name, Org/Person schema, og image (hero-1.jpg), css/js `?v=20260608b`, CTA → /contact.html + /rates.html, byline
- `src\lib\publish\update-index.ts` — **now inserts a <li> into the existing hand-built index** (idempotent, newest-first); only generates a fresh page if blog/index.html is absent. Prevents clobbering the ~26 live posts.
- `src\lib\drafting\pipeline.ts` + `src\lib\drafting\generate-post.ts` — prompt strings → espadavilla.com (Villa Espada)
- `src\lib\whatsapp\send-draft.ts` — approval footer says "publish to espadavilla.com"
- `src\lib\voice\refine-from-edits.ts` — voice-learning prompt repointed
- `scripts\verify-offline.ts` — updated index fixtures + GTM-ID assertion to new contract; added "preserves hand-built index" check
Git (Rob pushes): `cd "...\espadavilla-blog-agent"; git add -A; git commit -m "publish: repoint chrome+prompts to espadavilla; index inserts into existing listing"` — STATUS: Rob said "i pushed" earlier this session.

### C. Deploys done this session
- espadavilla-blog-agent redeployed to prod (picked up B).
- Supabase env (SUPABASE_SERVICE_ROLE_KEY) was wrong on Vercel earlier; Rob fixed + redeployed; enqueue then worked.

---

## THE NEXT BUILD — deterministic keyword routing (the main task for session 2)

### Why
Three sources share ONE WhatsApp self-chat (LinkedIn agent + golfvilla blog +
espadavilla blog). A bare `yes`/`no` is ambiguous when 2+ approvals are pending;
the current freshest-approval-wins heuristic silently misroutes (it just
published the wrong thing). Rob's call: replace guessing with explicit keywords.

### Design (agreed)
- Per-source keyword prefixes on replies:
  - `li yes` / `li no`            → LinkedIn post
  - `ev yes` / `ev no` / `ev edit: <text>` → espadavilla blog
  - `gv yes` / `gv no` / `gv edit: <text>` → golfvilla blog
- **Fallback rule (the safety win):**
  - exactly ONE thing pending → bare `yes`/`no` still accepted (stay effortless).
  - 2+ pending AND reply has no keyword → router replies "which? ev / li / gv"
    and executes NOTHING.
- **Self-documenting messages:** each approval message states its own keyword in
  the footer (blog: "Reply `ev yes` / `ev no`"; LinkedIn: "Reply `li yes`").

### Where the work lands
- **LinkedIn agent (LIVE — edit carefully, read first):**
  - `src\app\api\webhooks\unipile\route.ts` → `handleWhatsAppReply`: add keyword
    parser, deterministic routing, ambiguity-clarification reply. Strip the
    keyword before forwarding the normalized command downstream.
  - LinkedIn agent's own approval-message template: add `li` instruction.
  - `src\lib\blog-forward.ts`: forwarding may carry an explicit target hint
    (`ev`/`gv`) instead of freshest-first guessing.
- **Blog agents (both):** `src\lib\whatsapp\send-draft.ts` footer → `ev`/`gv`
  instructions. Resolvers (`/api/inbound/resolve`) likely need no change (router
  forwards normalized `yes`/`no`/edit), but confirm.
- NOTE: keywords sit ON TOP of step 11 — the LinkedIn agent must still be told
  about blog pendings (env + redeploy) for routing to reach the blogs at all.

### First steps in session 2
1. Read `LinkendIN Agent\src\app\api\webhooks\unipile\route.ts` IN FULL
   (esp. `handleWhatsAppReply`, `getLinkedInPendingSentAt`, the no-match path).
2. Spec the parser + fallback, confirm with Rob, then edit (it's the live agent).
3. Update the three `send-draft.ts` footers.
4. Confirm step 11 env is actually live in the LinkedIn agent Vercel.

---

## INCIDENT RECORD (for reference)
- Blog draft sent for approval 19:32 UTC. Rob replied `yes` 3:33 PM local.
- "yes" routed to LinkedIn agent → published CRE post (Unipile post id
  7470196395510157312). **Rob has decided that LinkedIn post STAYS UP.**
- Blog NOT published by that yes (confirmed: status stayed sent_for_approval).
- We then published the blog directly via resolver POST {chat_id:null,text:"yes"}
  + x-inbound-secret → matched/approved, but commit failed on GitHub token 404.
- Draft now `approved`, awaiting token fix → drain-approved.

## USER PREFERENCES (carry into session 2)
- Keep explanations brief. Run SQL directly via Supabase MCP (project_id above).
- Send full filepaths in chat for every handover.
- Rob does ALL git pushes himself — give him the exact command.
- Claude may deploy (vercel) and run SQL, but NEVER enters secrets/tokens into
  Vercel fields — Rob does that.
