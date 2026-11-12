# HANDOVER 9 — translations unblocked, H7/H8 leftovers closed, AEO scan (2026-11-12)

Follows HANDOVER 8 and docs/HANDOVER-TRANSLATIONS-2026-11-11.md (details of the checker fix are there).

## Done
- **Translations: complete on both sites.** espadavilla 80/80, golfvilla 68/68 published. 48 rows had been blocked:
  37 checker false positives (fixed in translation-check.ts, both repos), 3 real "mid-80s"→"85 °F" drifts (re-translated
  with a new prompt rule), 8 contact-info blocks. Live spot checks: 200, correct lang, 6 hreflang, 0 contact strings.
- **Contact info removed** from 3 English espadavilla posts (birthday, direct-booking, restaurant): DB + live re-render
  (espadavilla-com 8147ff6, 7f0363c, 94f929d). golfvilla: contact strings only in stale body_markdown, not rendered.
- **12-adult rule:** verified done. 0 "11 adults"/"12+ adults" hits on espadavilla-com, golfvilla-com, both blog DBs.
- **H7 static "walk to the first tee" fixes:** already pushed; live clean.
- **H8 item 1 (stale body_markdown, 2 golfvilla posts): closed, no action.** Live and edited_content are correct; the
  renderer uses edited_content. Do NOT overwrite body_markdown: voice refinement learns from body vs edited diffs, and
  the translations trigger would mark those posts stale.
- **Casa de Campo "subject to access" (canon line 99):** fixed in GOLFVILLA-WEBSITE\_gen_pdfs.py (Casa de Campo
  "playable through the villa's access"; Corales "arranged by villa staff, subject to tee times"); golf + family
  itinerary PDFs regenerated, espadavilla-com commit 1d5d15ed. Backup: %TEMP%\_gen_pdfs.py.bak-2026-11-12.

## AEO scan 20261112_172118 (192 rows, 0 errors, same models as Oct 31)
Unbranded mentioned: 77/176 (44%) Oct 31 → 91/176 (52%).
- Claude 19→32 mentioned; espadavilla.com citations 40→84; golfvilla.com 0→35.
- ChatGPT 19→20 mentioned, cited answers 16→13. Gemini 22→23.
- **Perplexity NOT recovered, down again:** mentioned 25 (Oct 25) → 17 → 16; cited answers 35 → 14 → 8;
  espadavilla.com in cited_domains 109 → 43 → 32. Gaining: everythingpuntacana.com 112→127, Marriott (2 domains)
  32→74, isleblue.co 20→31, airbnb.com 18→26. Cause unknown. Next: find which espadavilla.com URLs Perplexity
  stopped citing (compare citations by URL across 20261025_152201 / 20261031_202545 / 20261112_172118) and check
  them against the Oct 29 site-wide sweep. Translations went live 11-11/12, too recent to affect this scan.
- Branded 16/16 mentioned.
- Probe takes ~55 min now (was 35). Launch hidden and poll; DATAFORSEO creds via [Environment]::GetEnvironmentVariable(...,'User').

## Still open (needs Rob)
1. Re-voice 2 YouTube videos (member-guest-rate KU-_3A8cGUo; whats-included-villa-espada) — old $200 / $6,400 / 3 min.
2. Edit KU-_3A8cGUo description in YouTube Studio (same old facts).
3. GSC Request Indexing: /rates, /compare/cap-cana-villa-vs-eden-roc-hotel, /blog/where-to-stay-punta-espada,
   /blog/punta-espada-golf-shuttle-playing-from-villa-espada, /blog/cap-cana-casa-de-campo-golf-base.
   Claude can do it in Rob's "Work Laptop" Chrome on his go.
4. Perplexity investigation (above). Nov 16 scheduled AEO review will pick up this scan.
5. Stray untracked file: espadavilla-blog-agent\translation-check.ts (repo root, unused copy) — safe to delete.

## Older open items (11-01 monthly review, not touched)
Refresh /compare/cap-cana-all-inclusive-vs-villa; refresh picker lane check + ≥20-impression floor; fact-checker
flags negated terms; select the GSC account in Windsor.ai.
