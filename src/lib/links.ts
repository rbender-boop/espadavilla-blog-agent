/**
 * Money-page link resolver for espadavilla.com.
 *
 * espadavilla is the property's OWN booking site, so money links point INWARD to
 * espadavilla.com's own pages (NOT out to another domain — that is golfvilla.com's
 * model). This module holds a known-good map of the stable core money pages
 * (verified live against the espadavilla-com repo + GSC, 2026-06-09), plus a
 * resolver the publish executor refreshes against the fetched sitemap so committed
 * HTML always links live URLs.
 *
 * URL format matches the live site (espadavilla-com/vercel.json): cleanUrls=true,
 * trailingSlash=false → extensionless, no trailing slash. Blog posts are stored
 * in the repo as blog/<slug>.html and served at /blog/<slug>.
 */

export const SITE_ORIGIN = 'https://www.espadavilla.com';
// Kept for engine compatibility. On espadavilla the villa IS the site, so this
// equals SITE_ORIGIN (golfvilla used it to funnel OUT to espadavilla).
export const VILLA_ORIGIN = SITE_ORIGIN;

/** hint (as stored in blog_topics.target_internal_links) → {label, url}. */
export const MONEY_PAGES: Record<string, { label: string; url: string }> = {
  'contact':       { label: 'Check Dates & Inquire',     url: `${SITE_ORIGIN}/contact` },
  'villa':         { label: 'See Villa Espada',          url: `${SITE_ORIGIN}/villa` },
  'rates':         { label: 'Rates & Availability',      url: `${SITE_ORIGIN}/rates` },
  'amenities':     { label: 'Villa Amenities',           url: `${SITE_ORIGIN}/amenities` },
  'experiences':   { label: 'Cap Cana Experiences',      url: `${SITE_ORIGIN}/experiences` },
  'golf':          { label: 'Golf at Villa Espada',      url: `${SITE_ORIGIN}/golf` },
  'punta-espada':  { label: 'Punta Espada Golf Course',  url: `${SITE_ORIGIN}/golf-courses/punta-espada` },
  'gallery':       { label: 'Villa Gallery',             url: `${SITE_ORIGIN}/gallery` },
  'faq':           { label: 'Guest FAQ',                 url: `${SITE_ORIGIN}/faq` },
  'property-facts':{ label: 'Property Facts',            url: `${SITE_ORIGIN}/property-facts` },
  'cap-cana-vs-casa-de-campo': { label: 'Cap Cana vs Casa de Campo', url: `${SITE_ORIGIN}/compare/cap-cana-vs-casa-de-campo` },
};

/** Resolve a topic's target-link hints to real {label,url} pairs. Unknown hints
 *  are dropped (never guessed). Always includes the Contact (primary CTA) + Villa
 *  Espada anchors so every post has an INWARD conversion path. */
export function resolveMoneyLinks(hints: string[]): Array<{ label: string; url: string }> {
  const out = new Map<string, { label: string; url: string }>();
  for (const h of hints) {
    const hit = MONEY_PAGES[h];
    if (hit) out.set(hit.url, hit);
  }
  // Guaranteed conversion anchors (INWARD): contact is the primary CTA.
  out.set(MONEY_PAGES['contact']!.url, MONEY_PAGES['contact']!);
  out.set(MONEY_PAGES['villa']!.url, MONEY_PAGES['villa']!);
  return [...out.values()];
}

/** Canonical post URL for a slug — extensionless, no trailing slash. */
export function postUrl(slug: string): string {
  return `${SITE_ORIGIN}/blog/${slug}`;
}

/** Repo path the post HTML is committed to. espadavilla-com stores blog posts as
 *  FLAT files blog/<slug>.html (cleanUrls serves them at /blog/<slug>). */
export function postRepoPath(slug: string): string {
  return `blog/${slug}.html`;
}
