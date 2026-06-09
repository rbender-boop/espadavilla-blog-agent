# START HERE — espadavilla-blog-agent (new Claude project kickoff)

You are a fresh Claude project for the **espadavilla.com** blog agent. This folder starts
nearly empty on purpose — the engine is cloned from the golfvilla agent. Read in this order.

## 1. Primary handover — read first
`C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\docs\BUILD-PLAN.md`
The complete, self-contained spec: goal difference, locked decisions, clone-vs-rewrite
inventory, per-file specs, the 12-step build sequence, env checklist. Execute §5 in order.

## 2. Engine reference — the source agent being cloned
Folder: `C:\Users\rbend\Desktop\Claude Projects\golfvilla-blog-agent`
The working engine + its design docs. Reference (do not re-derive) these golfvilla docs to
understand how the pieces fit before/while cloning:
- `docs\GOLFVILLA-BLOG-AGENT-BUILD-SPEC.md` — original full phased spec
- `docs\HANDOVER-DURABLE-PIPELINE-COMPLETE-2026-06-09.md` — durable job-queue pipeline architecture
- `docs\HANDOVER-PHASE3-GSC-TOPICS-2026-06-09.md` — GSC demand-driven topic generation
- `docs\HANDOVER-PHASE4-REFRESH-DECAY-2026-06-09.md` — refresh/decay loop
- `docs\GSC-SETUP-2026-06-09.md` — GSC auth (service account + domain-wide delegation, reused as-is)
- `CLAUDE.md` — project-scoped rules + safety model (carry these over)

## 3. Key context (so you don't have to re-investigate)
- espadavilla.com and golfvilla.com are the SAME villa (Villa Espada), different funnel
  positions. golfvilla = top-of-funnel category authority funneling OUT to espadavilla.
  espadavilla = the property's OWN booking site; its blog is bottom-of-funnel
  experience/trip-planning content, money pages point INWARD. See BUILD-PLAN §1.
- Only the content layer changes (`niche/keywords/keyword-clusters/links/config`).
  `facts.ts` is identical. The engine (pipeline/jobs/gsc/publish/whatsapp) is reused verbatim.
- Separate Supabase project, separate Vercel project, publish to `rbender-boop/espadavilla-com`,
  GSC property `sc-domain:espadavilla.com`, crons staggered to Thursday.

## 4. Working preferences (same as golfvilla)
- Run SQL directly via Supabase MCP — always pass the NEW project_id explicitly.
- Rob does git pushes himself — hand him the full command.
- Provide full file paths in chat at every handover.
- Keep explanations brief.

Start by reading BUILD-PLAN.md, then confirm prerequisites in §8 before scaffolding.
