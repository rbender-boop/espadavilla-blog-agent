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
 *  3. Rob's personal phone number 734-755-6357 in ANY format, anywhere in the
 *     HTML — visible text, tel: or wa.me hrefs, or JSON-LD (removed 2026-10-18).
 *
 * ALWAYS ALLOWED (never flagged):
 *  - rob@espadavilla.com inside JSON-LD <script> blocks.
 */

export type GuardResult =
  | { blocked: false; html: string; warnings: string[] }
  | { blocked: true; reason: string };

/** Remove all <script type="application/ld+json">…</script> blocks so the
 * remaining HTML can be inspected for visible-content violations only. */
function stripJsonLdBlocks(html: string): string {
  return html.replace(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, '<!--JSONLD_STRIPPED-->');
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

  // Rule 3: Rob's personal cell (734-755-6357) in ANY form, ANYWHERE — visible
  // text, href (tel:, wa.me), or JSON-LD. Removed network-wide 2026-10-18: it drew
  // tee-time calls and bypassed the tracked espadavilla.com/contact form.
  if (/734\D{0,8}755\D{0,8}6357/.test(html)) {
    return {
      blocked: true,
      reason:
        '[contact-info-guard] BLOCKED: Rob\'s personal phone number (734-755-6357) found in the post ' +
        '(any format, including wa.me links, tel: links and JSON-LD). It must not appear in any ' +
        'published post. Use a link to https://www.espadavilla.com/contact instead.',
    };
  }

  return { blocked: false, html, warnings };
}
