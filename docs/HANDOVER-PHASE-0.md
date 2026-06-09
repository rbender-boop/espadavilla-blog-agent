# Phase 0 — Scaffold — HANDOVER

**Status:** ✅ Complete. Typecheck clean, `next build` green (4 routes).
**Date:** 2026-06-07

---

## What this phase delivered

A buildable Next.js 14 (App Router) skeleton modeled on the working LinkedIn
agent, with the proven client patterns ported and all LinkedIn-relationship
machinery stripped (per build spec §4 "DROP entirely").

### Files created

| File | Purpose |
|------|---------|
| `package.json` | Deps: Next 14, React 18, `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@octokit/rest` (Phase 4 publish). Scripts: `dev`, `build`, `typecheck`, `draft:local`, `send:drafts`, `smoke`. **bun**, not npm. |
| `tsconfig.json` | Strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `@/*` path alias. Copied from LinkedIn agent. |
| `next.config.mjs` | Conservative security headers (HSTS, nosniff, frame-deny). |
| `next-env.d.ts` | Next type refs (do not edit). |
| `.gitignore` | Ignores `.env*`, `node_modules`, `.next`, `.vercel`, `*.tsbuildinfo`, `.claude/`. |
| `.env.example` | Full env contract — see "Credentials" below. |
| `src/lib/supabase.ts` | Lazy-proxied service-role client → **dedicated blog project**. Exports `TopicCluster`/`TopicStatus`/`DraftStatus` enums for Phase 1. |
| `src/lib/unipile.ts` | **WhatsApp-only** Unipile client: `sendWhatsAppToOwner`, `listAccounts`/`accountStatus` (health), `getUnipileChat` (Phase 3 self-chat gate). Circuit-breaker dropped — no ToS risk committing to our own repo. |
| `src/lib/auth-utils.ts` | Constant-time `isAuthorizedCron` + `isAuthorizedInboundResolve` (gates the §6 forward call). |
| `src/app/layout.tsx` | Minimal root layout. |
| `src/app/page.tsx` | Landing page with health link. |
| `src/app/api/health/route.ts` | Reports env-var *presence* (booleans, never values) for deploy sanity-checks. |

### Verification run
- `bun install` → 64 packages, lockfile written.
- `bunx tsc --noEmit` → exit 0.
- `bunx next build` → ✓ compiled, 4 routes (`/`, `/_not-found`, `/api/health`, not-found).

---

## Decisions carried in (from spec §14 / project CLAUDE.md)
1. **Supabase** — RESOLVED: dedicated blog project (not fortisgpt). Created in Phase 1.
2. **WhatsApp/Unipile** — RESOLVED: shared account, no extra cost. Inbound forwarded from the LinkedIn webhook to `POST /api/inbound/resolve` (built Phase 3).
4. **Publish target** — RESOLVED: straight to `main` of golfvilla-com; the WhatsApp "yes" is the gate.
5. **Cadence** — weekly to start (configurable).

## ⚠️ Credentials still needed from Rob (no wiring happened this phase)
- **DECISION 3 — GitHub token:** a **fine-grained PAT with write access scoped to ONLY `rbender-boop/golfvilla-com`** (or a GitHub App installed on just that repo). Do NOT use an account-wide classic token. Store as `GITHUB_TOKEN_GOLFVILLA`. Needed before Phase 4.
- Dedicated blog Supabase project URL + service-role key (Phase 1).
- The shared `UNIPILE_*` values + `UNIPILE_WHATSAPP_ACCOUNT_ID` (copy from the LinkedIn agent's env).
- `INBOUND_RESOLVE_SECRET` — generate one random string, set it **identically** here and in the LinkedIn agent (Phase 3).

> Note: spec §11 lists `OWNER_WHATSAPP`; the ported code uses `UNIPILE_WHATSAPP_OWNER_NUMBER` to match the LinkedIn agent verbatim. `.env.example` reflects the code.

---

## Local dev
```
cp .env.example .env.local   # then fill in
bun install
bun run dev                  # http://localhost:3000  → /api/health
```

## Push command (Rob runs this — interactive pushes stay your job)
```
cd "C:/Users/rbend/Desktop/Claude Projects/golfvilla-blog-agent"
git add -A
git commit -m "Phase 0: scaffold Next.js 14 + Supabase/Unipile/auth clients"
git push origin main
```
(This is the **agent's own repo** `golfvilla-blog-agent` — NOT the golfvilla-com money site.)

---

## Next: Phase 1 — Data + topics
Migrations for all `blog_*` tables via the Supabase MCP (against the new dedicated
project), seed `blog_topics` with the §9 starter 10, and load `CANONICAL-FACTS.md`
into a module. First action: create the dedicated Supabase project and capture its
URL + service-role key.
