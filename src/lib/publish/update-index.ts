/**
 * update-index.ts — maintain the /blog/ listing page.
 *
 * Pure function: existing blog/index.html (or null if it doesn't exist yet) +
 * the new post → updated index HTML. The card list lives between sentinel
 * comments so inserts are surgical and idempotent (a slug already present is a
 * no-op). Newest card is inserted first. If the file doesn't exist, a full
 * listing page is generated from the SHARED golfvilla.com chrome
 * (./site-chrome — audit fix #3), so the index nav/footer always match the
 * posts and the live site (including the /blog nav link).
 */

import { SITE_ORIGIN } from '../links';
import { gtmHead, gtmBodyNoscript, networkBar, siteNav, mobileMenu, siteFooter } from './site-chrome';

const CARDS_START = '<!-- BLOG-CARDS:START -->';
const CARDS_END = '<!-- BLOG-CARDS:END -->';

export type IndexCard = {
  slug: string;
  title: string;
  description: string;
  publishedISO: string;
};

export function upsertIndexCard(currentHtml: string | null, card: IndexCard): { html: string; changed: boolean } {
  const html = currentHtml && currentHtml.includes(CARDS_START) ? currentHtml : freshIndexPage();

  // Idempotency: card for this slug already present.
  if (new RegExp(`href="/blog/${escapeRegex(card.slug)}"`).test(html)) {
    return { html, changed: false };
  }

  const cardHtml = renderCard(card);
  const startIdx = html.indexOf(CARDS_START) + CARDS_START.length;
  const next = html.slice(0, startIdx) + '\n' + cardHtml + html.slice(startIdx);
  return { html: next, changed: true };
}

function renderCard(card: IndexCard): string {
  return [
    '      <a class="blog-card" href="/blog/' + escapeAttr(card.slug) + '">',
    `        <span class="blog-card-date">${escapeHtml(formatHumanDate(card.publishedISO))}</span>`,
    `        <h2 class="blog-card-title">${escapeHtml(card.title)}</h2>`,
    `        <p class="blog-card-desc">${escapeHtml(card.description)}</p>`,
    '        <span class="blog-card-cta">Read more →</span>',
    '      </a>',
  ].join('\n');
}

function freshIndexPage(): string {
  const url = `${SITE_ORIGIN}/blog`;
  const title = 'Golf Villa Blog — Cap Cana &amp; Caribbean Golf Travel | GolfVilla.com';
  const desc = 'Golf-travel intelligence for groups planning luxury private golf trips to Cap Cana, Punta Espada, and the Caribbean.';
  return `<!DOCTYPE html>
<html lang="en">
<head>
${gtmHead()}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="GolfVilla.com">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="stylesheet" href="/css/main.css?v=1">
  <style>
    .blog-wrap { max-width: 920px; margin: 0 auto; padding: 130px 6vw 80px; }
    .blog-wrap h1 { font-size: clamp(2rem, 4vw, 3rem); color: var(--navy); margin: 0 0 10px; }
    .blog-lede { font-size: 1.1rem; color: var(--muted, #555); margin-bottom: 40px; line-height: 1.7; }
    .blog-list { display: grid; gap: 22px; }
    .blog-card { display: block; padding: 24px 26px; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s; }
    .blog-card:hover { border-color: var(--gold, #C9A84C); box-shadow: 0 6px 22px rgba(0,0,0,0.06); }
    .blog-card-date { font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted, #999); }
    .blog-card-title { font-size: 1.3rem; margin: 6px 0 8px; color: var(--navy); line-height: 1.25; }
    .blog-card-desc { line-height: 1.65; margin: 0 0 12px; color: var(--muted, #555); }
    .blog-card-cta { font-size: 0.9rem; color: var(--gold, #C9A84C); font-weight: 600; }
  </style>
</head>
<body>
${gtmBodyNoscript()}

${networkBar()}

${siteNav()}

${mobileMenu()}

<main class="blog-wrap">
  <h1>Golf Villa Blog</h1>
  <p class="blog-lede">Golf-travel intelligence for groups planning luxury private golf trips — Cap Cana, Punta Espada, and the wider Caribbean.</p>
  <div class="blog-list">
      ${CARDS_START}
      ${CARDS_END}
  </div>
</main>

${siteFooter()}

<script src="/js/main.js?v=1"></script>
</body>
</html>
`;
}

/* helpers */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');
}
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
}
