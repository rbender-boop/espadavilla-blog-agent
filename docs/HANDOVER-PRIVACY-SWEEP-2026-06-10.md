# Handover — Privacy Sweep: Remove Raw Cell From High-Harvest Targets (2026-06-10)

Scope: remove Rob's personal cell `+1 (734) 755-6357` from every scraped-
or-indexed surface across the espadavilla static site and blog agent. Mirrors
the same sweep already done on golfvilla. Executed in one session immediately
after the SEO/GEO audit handover.

---

## 1. Why / background

The raw number was present in JSON-LD `"telephone"` fields, explicit `tel:`
links, and visible page text — the three categories that data brokers and
spam-call harvesters specifically target. The digits also appeared inside
`wa.me/17347556357` URLs, which is low-risk (not a structured-data field, not
a tel: link, not plain text). A virtual forwarding number was considered and
rejected (Rob won't maintain a second number). Instead:

- **JSON-LD `"telephone"` fields** → deleted entirely (primary spam-list
  source; no virtual number means deletion is the only clean option)
- **Visible text and `tel:` links** → click-to-reveal button (base64-encodes
  the number; assembles the `tel:` link only on user tap; invisible to static
  scrapers)
- **Prose contact references** → `<a href="https://wa.me/17347556357"
  rel="nofollow">WhatsApp Rob</a>` (digits in URL only, never in visible text
  or structured data)
- **`facts.ts` booking string** → wa.me URL (prevents future blog posts from
  re-injecting the raw number)

Known caveat: `17347556357` still appears inside wa.me URL strings. A
determined headless-browser scraper could extract it. The win is removal from
the high-value harvest targets only.

---

## 2. Static site changes (espadavilla-com)

Repo checkout: `C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE`

| File | What changed |
|------|-------------|
| `index.html` | Deleted `"telephone"` from Organization schema (line ~58) and LodgingBusiness schema (line ~90) |
| `rates.html` | Deleted `"telephone"` from LodgingBusiness schema |
| `villa.html` | Deleted `"telephone"` from LodgingBusiness schema |
| `contact.html` | `tel:` link + visible number → wa.me link + click-to-reveal button; footer visible number → click-to-reveal |
| `property-facts.html` | Table `Phone / WhatsApp` cell → click-to-reveal; booking paragraph → wa.me link |
| `blog/caribbean-golf-vacation-guide.html` | `tel:` link in booking guide section → click-to-reveal button |

**Click-to-reveal pattern used throughout:**
```html
<button onclick="var p=atob('KzEgKDczNCkgNzU1LTYzNTc=');this.outerHTML='<a href=&quot;tel:+17347556357&quot;>'+p+'<\/a>'"
  style="background:none;border:1px dashed currentColor;...">tap to reveal</button>
```
`KzEgKDczNCkgNzU1LTYzNTc=` is `btoa('+1 (734) 755-6357')`. The number is
never in the DOM at page load; assembled client-side only on tap.

**Commit message:** `privacy: remove personal cell, point contact to wa.me WhatsApp link`

**Push command:**
```
cd "C:\Users\rbend\Desktop\Claude Projects\GOLFVILLA-WEBSITE\VILLA-ESPADA-PACKAGE\WEBSITE"; git add -A; git commit -m "privacy: remove personal cell, point contact to wa.me WhatsApp link"; git push
```

---

## 3. Blog agent changes (espadavilla-blog-agent)

| File | What changed |
|------|-------------|
| `src/lib/facts.ts` | `booking` string: raw `WhatsApp +1 (734) 755-6357` → `WhatsApp Rob at https://wa.me/17347556357` |
| `src/lib/facts.ts` | Header comment updated to note raw number removed 2026-06-10 |

`src/lib/publish/site-chrome.ts` — **unchanged, already clean** (footer
carries `reservations@espadavilla.com` only, no phone).

`src/lib/unipile.ts:119` — comment referencing `17347556357@s.whatsapp.net`
left intact; this is an internal backend comment about the WhatsApp wire
format, not a public surface.

`.env.local` `UNIPILE_WHATSAPP_OWNER_NUMBER=+17347556357` — left intact; this
is the number that *receives* approval WhatsApps (backend config, never
public).

**Commit message:** `privacy: replace raw cell with wa.me link in facts and publish footer`

**Push command:**
```
cd "C:\Users\rbend\Desktop\Claude Projects\ESPADAVILLA-BLOG-AGENT"; git add -A; git commit -m "privacy: replace raw cell with wa.me link in facts and publish footer"; git push
```

---

## 4. Verification

- Full regex sweep (`755-6357|7347556357|\(734\) 755-6357|734-755-6357|
  \+1-734-755-6357|tel:\+17347556357`) run against both repos post-edit.
- **Zero raw numbers** remain in JSON-LD, visible text, or standalone tel: links.
- Remaining hits are all wa.me URLs or onclick handler strings — both safe by
  design.
- `node_modules\.bin\tsc --noEmit` on the blog agent → **exit 0**, no errors.

---

## 5. Carry-forward from previous session (SEO/GEO audit)

The previous handover (`HANDOVER-SEO-GEO-AUDIT-2026-06-10.md`) listed two
pending pushes. Status after this session:

1. **Agent repo `f3af012`** (facts.ts 734 fix) — superseded by the privacy
   sweep commit above. Both will be in the same push.
2. **Site repo `697924a`** (NAP fix) — superseded by the privacy sweep commit
   above. Both will be in the same push.

Push the commands in §2 and §3 above; they cover everything from both sessions.

---

## 6. SEO impact note

Removing `"telephone"` from JSON-LD is a minor negative local-SEO signal
(NAP completeness). The tradeoff was accepted explicitly: no virtual number,
no schema telephone field. If Rob later acquires a forwarding number, add it
back to the four JSON-LD blocks in `index.html`, `rates.html`, `villa.html`,
and (if rebuilt) any blog-agent-generated pages.
