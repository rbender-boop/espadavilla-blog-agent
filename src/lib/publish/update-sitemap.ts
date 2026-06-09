/**
 * update-sitemap.ts — add a blog post URL to golfvilla.com/sitemap.xml.
 *
 * IMPORTANT DEVIATION FROM THE SPEC, AND WHY:
 * The spec says "port golfvilla's sitemap generator (script-regenerated)." In
 * reality the repo's generate_sitemap.py is STALE — it only emits ~10 core
 * pages + SEO-Files, while the live sitemap.xml hand-maintains ~70 URLs
 * (including all /from/* origin pages). Regenerating from that script would
 * DELETE ~60 live URLs. So this does a surgical, idempotent INSERT of the new
 * <url> block immediately before </urlset>, preserving everything else —
 * matching the file's real maintenance pattern. URLs are extensionless, no
 * trailing slash (matching the live file).
 *
 * Pure function: current XML in → new XML out. Idempotent: if the loc already
 * exists, the input is returned unchanged.
 */

export function addUrlToSitemap(
  currentXml: string,
  opts: { loc: string; lastmod: string; changefreq?: string; priority?: string },
): { xml: string; changed: boolean } {
  const { loc, lastmod, changefreq = 'monthly', priority = '0.6' } = opts;

  // Idempotency: already present (exact loc match).
  if (new RegExp(`<loc>\\s*${escapeRegex(loc)}\\s*</loc>`).test(currentXml)) {
    return { xml: currentXml, changed: false };
  }

  const block = [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
    '',
  ].join('\n');

  const closeIdx = currentXml.lastIndexOf('</urlset>');
  if (closeIdx === -1) {
    // Malformed/empty sitemap — fail loud rather than silently corrupt.
    throw new Error('update-sitemap: no </urlset> found in current sitemap.xml');
  }

  const xml = currentXml.slice(0, closeIdx) + block + currentXml.slice(closeIdx);
  return { xml, changed: true };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
