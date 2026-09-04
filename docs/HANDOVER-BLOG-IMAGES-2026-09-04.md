# HANDOVER - Blog Image Pool: Post-Renovation Aerials (2026-09-04)

Repo: espadavilla-blog-agent
Commit: 13c599c (pushed by Rob)
Status: COMPLETE
Related site handover: GOLFVILLA-WEBSITE\Handovers\HANDOVER-185.md

## What changed
`src/lib/publish/blog-images.ts` — image pool updated to the post-renovation assets that now live in the site repo (`espadavilla-com/images/`):

| Old path | New path | Dims |
|---|---|---|
| `/images/villa-espada-pool-villa.jpg` | `/images/villa-espada-pool-villa-2026.jpg` | 1728x1152 |
| `/images/villa-espada-exterior-front.jpg` (render) | `/images/villa-espada-aerial-fairway-5-punta-espada-2026.jpg` | 2000x1125 |
| `/images/villa-espada-aerial-fairway-5-punta-espada.jpg` (x3, incl. `DEFAULT_IMAGE`) | `/images/villa-espada-aerial-fairway-5-punta-espada-2026.jpg` | 2000x1125 |

Entries were swapped **in place** — array lengths and positions unchanged — so `hashString(slug) % pool.length` resolves to the same slot for every existing post. No post changes which image it gets; the image at that slot is simply the renovated one.

## Why
The site swapped all 417+96 references to these files on 2026-09-03 (espadavilla-com e2fe5c4b). Without this change, the next agent run would have regenerated 9 blog HTML files with the retired architectural render as hero/card image. Old files remain on disk in the site repo, so nothing 404s either way.

## Do not
- Do not re-add `villa-espada-exterior-front.jpg` — it is a pre-renovation architectural render, not a photo.
- Do not reorder or trim the `stay` / `group_occasion` / `comparison` arrays without accepting that every existing post in that cluster may re-roll its image.

## Untracked in this repo
`_scan.py` shows as a deleted temp script (` D`) — pre-existing, safe to include in any future commit or `git checkout -- _scan.py` to restore.
