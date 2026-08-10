# Handover — Humanizer skill install (2026-08-10)

## What was done
- Installed `blader/humanizer` v2.9.1 (33-pattern "Signs of AI writing" editor skill) into the blog-agent repo.
- Location: `.claude/skills/humanizer/SKILL.md` (412 lines, 29,632 bytes, exact byte-match to upstream `main`).
- Source: https://github.com/blader/humanizer (MIT).

## Scope / limitation (important)
- `.claude/` is gitignored here → this is a LOCAL, machine-only install. Not committed, not pushed, does NOT sync to the deployed cron agent.
- Effect: available only in INTERACTIVE Claude Code sessions in this repo (invoke `/humanizer`). Use it for manual polish when reviewing a pending draft.
- It does NOT humanize the autonomous Thursday cron output. That path drafts via `src/lib/drafting/generate-post.ts` (single forced-tool `emit_post` call, model pinned `claude-sonnet-4-5-20250929`).

## Pending decision — automate the humanize pass
To humanize the AUTOMATED posts, add a structure-preserving humanization step after `emit_post` in `generate-post.ts`. Tradeoffs to weigh before building:
- Latency: adds one sequential API call to a pipeline already near the 300s route budget (prior 322s timeout is documented). Mitigate with tight max_tokens / its own turn budget.
- Structure conflict: the humanizer strips `## H2` headings, bold, em dashes. The agent HARD-depends on `## H2` sections + one FAQPage + answer-first `summary`. The pass MUST preserve headings, internal links, the FAQ block, and the length band (1,200–1,800 words), and add no new facts.
- Cost: one extra Sonnet call per run.
- Model pin: keep `claude-sonnet-4-5-20250929` (no version drift).

## Next step
Rob to confirm whether to wire the automated pass (Option A) or keep humanizer as interactive-only. No git push required for the local install (gitignored).

---

## UPDATE — Option A (automated pass) built + verified

Rob approved wiring the automated pass. Done and verified.

### How it works
- Production drafting is the DURABLE pipeline (`pipeline.ts`): the weekly cron only enqueues a job; `blog-pipeline-worker` drains steps pick_topic → research → draft → enforce → guard → persist → notify. So the pass lives in the pipeline, not the sync path.
- New humanization runs INSIDE `enforceStep`, after the body is length-valid and BEFORE `guardStep`, so the fact/negative guards validate the humanized text that actually gets persisted.
- Structure-preserving + fail-open: reverts to the original body if the rewrite drops/alters a `## ` heading, drops any `[](url)` link, falls outside 1,200–1,800 words, returns empty, errors, or is aborted. A bad rewrite can NEVER block a publishable draft.
- Budget-safe: routed through the pipeline's deadline-aware `callModel`, and only attempted when >20s of tick budget remains (else it notes "skipped: insufficient budget" and advances). Cannot blow the Vercel 300s limit.
- Model stays pinned `claude-sonnet-4-5-20250929`. Every run appends a note (e.g. `humanized (1,540→1,505 words)` or a revert reason) into the draft's notes.

### Kill switch
- Set env `HUMANIZE_DRAFTS=false` (Vercel project env) to disable instantly with no code change. Absent/any other value = ON.

### Files
- NEW `src/prompts/humanizer.skill.md` — blader/humanizer v2.9.1, MIT (tracked source of truth for prod; the `.claude/` copy is gitignored and does NOT deploy).
- NEW `src/lib/drafting/humanizer-prompt.ts` — AUTO-GENERATED string constant embedded for serverless (no runtime fs read).
- NEW `scripts/gen-humanizer-prompt.cjs` — regenerate the constant after editing the skill md: `node scripts/gen-humanizer-prompt.cjs`.
- NEW `src/lib/drafting/humanize.ts` — the pass + structure guards.
- MOD `src/lib/drafting/pipeline.ts` — import + humanize block in `enforceStep`.
- Sync path (`generatePostForTopic`) intentionally NOT wired (local-only; avoids a needless circular import). Test the real prod path locally instead.

### Verified
- `npx tsc --noEmit` → clean (exit 0).
- `npm run smoke` (verify-offline) → ALL CHECKS PASSED, incl. `## → H2`, exactly one FAQPage, no VacationRental, fact guards.
- Embedded prompt constant confirmed intact (contains the skill body).

### How to test live locally (uses the durable prod path)
- `npm run pipeline:local` — drafts one post through the real steps; check the draft notes for a `humanized (...)` line. Needs `.env.local` (ANTHROPIC_API_KEY + Supabase).
- To A/B: run once with `HUMANIZE_DRAFTS=false` and once without, compare the body.

### Possible future refinement
- Promote humanize to its own pipeline step (adds `JobStep`, `STEP_ORDER`, `HEAVY_STEPS`, dispatcher case + likely a `blog_agent_jobs.step` migration) so it gets a dedicated budget tick instead of sharing enforce's. Not needed for correctness — current design is fail-open and budget-safe.

### Git (Rob pushes — PowerShell, one per line)
cd 'C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent'
git add -A
git commit -m "feat(drafting): structure-preserving humanizer pass in enforce step (fail-open, HUMANIZE_DRAFTS gate)"
git pull --rebase origin main
git push origin main

Note: `git pull --rebase` before push is mandatory here — the deployed agent commits concurrently.
