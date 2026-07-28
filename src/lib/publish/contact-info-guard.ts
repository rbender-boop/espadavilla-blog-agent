/**
 * contact-info-guard.ts — pre-publish contact-info off-ramp validator.
 *
 * Checks the final rendered HTML for banned contact-info patterns before any
 * commit. Rules from HANDOVER-109 / CANONICAL-FACTS:
 *
 * AUTO-FIX (apply silently, log warning):
 *  A. Any mailto: link → rewrite href to /contact (defence-in-depth; template
 *     should already emit clean HTML, but catches model-generated body links).
 *
 * HARD BLOCK (fail the publish, revert claim to 'approved' for retry):
 *  1. reservations@espadavilla.com — dead address, must not exist anywhere.
 *  2. rob@espadavilla.com outside <script type="application/ld+json"> — email
 *     is only valid in schema; never in visible body, footer, or CTA text.
 *  3. tel: link containing the banned phone number 7347556357.
 *  4. Raw phone number 7347556357 in visible text outside href/script context.
 *
 * ALWAYS ALLOWED (never flagged):
 *  - https://wa.me/17347556357  (WhatsApp CTA — preferred gated channel).
 *  - rob@espadavilla.com inside JSON-LD <script> blocks.
 *  - Phone in href="https://wa.me/..." or inside ld+json blocks.
 */

export type GuardResult =
  | { blocked: false; html: string; warnings: string[] }
  | { blocked: true; reason: string };

/** Remove all <script type="application/ld+json">…</script> blocks so the
 * remaining HTML can be inspected for visible-content violations only. */
function stripJsonLdBlocks(html: string): string {
  return html.replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, '<!--JSONLD_STRIPPED-->');
}

/** Remove href="…" attribute values so phone numbers inside wa.me/tel: hrefs
 * are not counted as visible body text. Keeps the link's anchor text intact. */
function stripHrefValues(html: string): string {
  return html.replace(/\bhref="[^"]*"/gi, 'href="STRIPPED"');
}

export function guardContactInfo(rawHtml: string): GuardResult {
  let html = rawHtml;
  const warnings: string[] = [];

  // ── AUTO-FIX: mailto: links ───────────────────────────────────────────────
  if (/href="mailto:[^"]+"/i.test(html)) {
    const count = (html.match(/href="mailto:[^"]+"/gi) ?? []).length;
    html = html.replace(/href="mailto:[^"]+"/gi, 'href="/contact"');
    warnings.push(`[contact-info-guard] auto-fixed ${count} mailto: href(s) → /contact`);
  }

  // ── HARD BLOCK checks (strip ld+json first for all) ───────────────────────
  const visibleHtml = stripJsonLdBlocks(html);

  // Rule 1: dead reservations@ address.
  if (/reservations@espadavilla\.com/i.test(visibleHtml)) {
    return {
      blocked: true,
      reason:
        '[contact-info-guard] BLOCKED: reservations@espadavilla.com found outside JSON-LD. ' +
        'This is a dead address — it must never appear anywhere in a published post. ' +
        'Fix the draft body/template and re-approve.',
    };
  }

  // Rule 2: rob@espadavilla.com visible outside ld+json.
  if (/rob@espadavilla\.com/i.test(visibleHtml)) {
    return {
      blocked: true,
      reason:
        '[contact-info-guard] BLOCKED: rob@espadavilla.com found in visible HTML outside JSON-LD. ' +
        'Email must only appear in <script type="application/ld+json"> schema — never in body copy, ' +
        'footer, or CTAs. Edit the draft to replace the email with a /contact link and re-approve.',
    };
  }

  // Rule 3: tel: link with the banned phone number.
  if (/href="tel:\+?1?7347556357"/i.test(html)) {
    return {
      blocked: true,
      reason:
        '[contact-info-guard] BLOCKED: tel:+17347556357 link found. Phone tel: links are not ' +
        'permitted — use the WhatsApp CTA (https://wa.me/17347556357) or /contact link instead.',
    };
  }

  // Rule 4: raw phone number in visible text outside href attributes and ld+json.
  // Strip href values first so wa.me/17347556357 in an anchor's href is not flagged.
  const strippedForPhone = stripHrefValues(visibleHtml);
  if (/(?<!\d)7347556357(?!\d)/.test(strippedForPhone)) {
    return {
      blocked: true,
      reason:
        '[contact-info-guard] BLOCKED: raw phone number 7347556357 found in visible HTML outside ' +
        'href/schema context. Phone numbers in body copy are not permitted — use the WhatsApp CTA ' +
        'or /contact link instead.',
    };
  }

  return { blocked: false, html, warnings };
}
