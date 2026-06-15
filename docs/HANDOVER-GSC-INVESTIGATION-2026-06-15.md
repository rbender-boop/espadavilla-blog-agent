# GSC Investigation & Fix Handover — 2026-06-15

## Summary

The golfvilla "GSC vars never provisioned" failure pattern does **not** apply to
espadavilla. All three GSC vars were set in Vercel Production on **Jun 9**
(confirmed by screenshot). Two separate issues were found and fixed:

1. **SA key rotation** — the shared service account key had been rotated on
   golfvilla today; espadavilla's Vercel copy was stale.
2. **Filter thresholds too strict** — even with a valid key, default
   `minImpressions: 30` + `maxPosition: 20` returned 0 candidates for a young
   site. Tuning env vars were set and the override mechanism was already wired.

---

## Vercel env vars confirmed (screenshot, Jun 9)

| Var | Scope | Added |
|---|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | Production + Preview | Jun 9 |
| `GSC_IMPERSONATED_SUBJECT` | Production | Jun 9 |
| `GSC_SITE_URL` | Production | Jun 9 |

---

## Root causes found

### 1. SA key rotation (primary blocker on Jun 15)
The shared service account
`search-console-agent@golfvilla-search-console.iam.gserviceaccount.com`
had its key rotated earlier on Jun 15. Golfvilla Supabase confirmed:
- 12:00 UTC — `GSC_SERVICE_ACCOUNT_JSON not set` (initial failure)
- 12:48 UTC — `GSC_SERVICE_ACCOUNT_JSON is not valid base64-encoded JSON`
- 12:52 UTC — **success** (working key set)

Espadavilla's Vercel Production still held the original Jun 9 key.
Vercel does not allow sensitive vars to be read back through the UI, so
the working key was sourced from golfvilla's local `.env.local`
(modified 08:59 today) and pushed via CLI (value never displayed).

### 2. Filter thresholds too strict for a young site
The Jun 11 gsc_topics cron run (first ever) returned:
```
fetched: 218   candidates: 0   inserted: 0
```
Default thresholds in `src/lib/gsc/topic-select.ts`:
- `minImpressions: 30` — too high for espadavilla's traffic level
- `maxPosition: 20` — too shallow (young-site queries land on pages 3–5)

`src/lib/gsc/topic-generator.ts` already has `envSelectOpts()` wired to
read override values from Vercel env vars — no code change needed.

---

## What was done

| Step | Action |
|---|---|
| 1 | Added `GSC_MIN_IMPRESSIONS=5` + `GSC_MAX_POSITION=50` to Vercel Production |
| 2 | Redeployed (`vercel --prod`) |
| 3 | Fired cron → `invalid_grant` confirmed key rotation as secondary blocker |
| 4 | Read working key from golfvilla `.env.local` → pushed to espadavilla Vercel via CLI |
| 5 | Updated espadavilla local `.env.local` with same key |
| 6 | Redeployed again |
| 7 | Fired `gsc-topics` cron → **success** |

---

## Final verified result

```json
{ "ok": true, "fetched": 224, "candidates": 12, "inserted": 12 }
```

12 topics inserted into `blog_topics` (source: `gsc-generator`, priority 300+):

| Title | Cluster |
|---|---|
| Punta Espada Golf Course: Playing From Villa Espada | golf |
| Villa Espada: Staying at Villa Espada | stay |
| Punta Espada Golf Club: Playing From Villa Espada | golf |
| Punta Espada: Playing From Villa Espada | golf |
| How Many Golf Courses In Dominican Republic: What to Know Before You Arrive | logistics |
| Best Golf Dominican Republic: What to Know Before You Arrive | logistics |
| How Much To Play Golf In Dominican Republic: What to Know Before You Arrive | logistics |
| Equestrian And Polo In The Dominican Republic: What to Do From Villa Espada | experience |
| Punta Espada National Park: Playing From Villa Espada | golf |
| Dominican Republic Equestrian And Polo: What to Do From Villa Espada | experience |
| Golf Dominican Republic: What to Know Before You Arrive | logistics |
| Cap Cana Vs Casa De Campo: An Honest Comparison for Your Cap Cana Stay | comparison |

These sit at priority 300+ so the existing seed queue drains first.

---

## Additional work completed this session

### Health check expanded (14 vars)
`src/app/api/health/route.ts` updated to include the three GSC vars.
`/api/health` now reports their presence — key-rotation failures will be
visible on the next health check without needing to fire the cron.
Deployed and verified: all 14 vars `true` in production.

Git commit required:
```
git add src/app/api/health/route.ts
git commit -m "feat: add GSC vars to health check (now 14 vars)"
git push
```

### Weekly post published
Pipeline fired manually (outside normal Monday schedule):
- `draft-weekly-post` → job `ed136c7d-01f8-44f8-844a-f077a6767fb7`
- `blog-pipeline-worker` → all 7 steps: pick_topic → research → draft → enforce → guard → persist → notify
- Rob approved via WhatsApp (EV APPROVE)
- `drain-approved` published automatically

**Live:** https://www.espadavilla.com/blog/caleton-beach-club-cap-cana
"Caleton Beach Club Cap Cana: Eden Roc vs Juanillo Access" — 1,297 words

---

## Current pipeline state (end of session)

| Metric | Value |
|---|---|
| Posts published total | 4 |
| Topics queued | 16 (5 seed + 11 GSC) |
| Topics drafting/pending | 0 |
| GSC topics ever inserted | 12 |
| Next scheduled cron | Monday 12:00 UTC (gsc-topics) |

---

## Open follow-ups

**Golfvilla needs the same filter tuning.** Its Jun 15 cron run returned
`candidates: 0` (`fetched: 35`). Set in golfvilla-blog-agent Vercel Production:
- `GSC_MIN_IMPRESSIONS` = `5`
- `GSC_MAX_POSITION` = `50`

Then redeploy golfvilla and fire its `gsc-topics` cron.

**Key rotation policy.** Both agents share the same SA key. When rotated in GCP,
both Vercel projects need updating. The established pattern: update
golfvilla `.env.local` first, then sync to espadavilla via the CLI pipe approach.

---

## Timeline

| Date/Time (UTC) | Event |
|---|---|
| 2026-06-09 | Agent built + deployed; all GSC vars provisioned to Vercel |
| 2026-06-11 12:00 | First `gsc_topics` cron — success but 0 candidates (filters too strict) |
| 2026-06-11 13:00–13:25 | `draft_weekly_post` + `publish` — 3 posts published from seed |
| 2026-06-15 ~12:52 | Golfvilla SA key rotated/re-set; espadavilla copy goes stale |
| 2026-06-15 13:37 | Investigation fired cron — `invalid_grant` revealed key rotation |
| 2026-06-15 ~13:45 | `GSC_MIN_IMPRESSIONS=5` + `GSC_MAX_POSITION=50` set; key synced from golfvilla; redeployed |
| 2026-06-15 ~13:50 | `gsc-topics` cron — `ok: true, inserted: 12` ✓ |
| 2026-06-15 ~13:49 | Health check expanded to 14 vars; redeployed |
| 2026-06-15 13:54 | Pipeline fired manually — draft created and sent for approval |
| 2026-06-15 13:55 | Rob approved via WhatsApp; post published live |

---

## Files modified

```
C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\.env.local
  (GSC_SERVICE_ACCOUNT_JSON updated to current key)

C:\Users\rbend\Desktop\Claude Projects\espadavilla-blog-agent\src\app\api\health\route.ts
  (GSC_SERVICE_ACCOUNT_JSON, GSC_IMPERSONATED_SUBJECT, GSC_SITE_URL added — now 14 vars)
```

Vercel Production env vars added/updated:
- `GSC_MIN_IMPRESSIONS` (new)
- `GSC_MAX_POSITION` (new)
- `GSC_SERVICE_ACCOUNT_JSON` (updated to current key)
