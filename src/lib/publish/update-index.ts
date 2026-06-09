/**
 * update-index.ts — maintain the /blog/ listing page.
 *
 * Pure function: existing blog/index.html (or null if it doesn't exist yet) +
 * the new post → updated index HTML.
 *
 * IMPORTANT: espadavilla.com ships a HAND-BUILT blog/index.html (Villa Espada
 * chrome + a <ul> of existing post links). We must NEVER regenerate/replace it —
 * doing so would wipe ~dozens of live posts and the real chrome. So the normal
 * path is a SURGICAL, idempotent insert of one <li> at the top of the existing
 * list (newest first). A full page is generated ONLY if the index file is
 * genuinely absent (it isn't, in production).
 */

import { SITE_ORIGIN } from '../links';
import { gtmHead, gtmBodyNoscript, siteNav, mobileMenu, siteFooter } from './site-chrome';

export type IndexCard = {
  slug: string;
  title: string;
  description: string;
  publishedISO: string;
};

// Matches the opening <ul ...> of the post list IF it is immediately followed by
// a /blog/ <li>. Capturing groups let us splice a new <li> in as the first item.
const LIST_HEAD_RE = /(<ul\b[^>]*>)(\s*<li>\s*<a\s+href="\/blog\/)/i;

export function upsertIndexCard(currentHtml: string | null, card: IndexCard): { html: string; changed: boolean } {
  // No existing index at all → generate a fresh Villa Espada listing page.
  if (!currentHtml || !/href="\/blog\//.test(currentHtml)) {
    return { html: freshIndexPage(card), changed: true };
  }

  // Idempotency: this post is already listed (with or without .html).
  const slug = escapeRegex(card.slug);
  if (new RegExp(`href="/blog/${slug}(?:\\.html)?"`).test(currentHtml)) {
    return { html: currentHtml, changed: false };
  }

  const li = renderListItem(card);

  // Preferred: insert as the first <li> of the existing post list.
  if (LIST_HEAD_RE.test(currentHtml)) {
    const html = currentHtml.replace(LIST_HEAD_RE, (_m, ulOpen: string, liStart: string) => `${ulOpen}\n${li}${liStart}`);
    return { html, changed: true };
  }

  // Fallback: insert right before the first existing /blog/ <li> anywhere.
  const firstLi = currentHtml.search(/<li>\s*<a\s+href="\/blog\//i);
  if (firstLi !== -1) {
    const html = currentHtml.slice(0, firstLi) + li + '\n' + currentHtml.slice(firstLi);
    return { html, changed: true };
  }

  // Could not locate the list — do NOT clobber the page. Leave it unchanged.
  return { html: currentHtml, changed: false };
}

/** One list row in the live index's format: <li><a href="/blog/slug.html">Title</a></li> */
function renderListItem(card: IndexCard): string {
  return `<li><a href="/blog/${escapeAttr(card.slug)}.html">${escapeHtml(card.title)}</a></li>`;
}

/** Full Villa Espada listing page — only used if blog/index.html is absent. */
function freshIndexPage(card: IndexCard): string {
  const url = `${SITE_ORIGIN}/blog`;
  const title = 'Blog &amp; Travel Guides | Villa Espada Cap Cana';
  const desc = 'Expert travel guides to Cap Cana, Punta Espada golf, Dominican Republic luxury villas, beaches, dining and more.';
  return `<!DOCTYPE html>
<html lang="en">
<head>
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
  <meta property="og:site_name" content="Villa Espada">
  <meta property="og:image" content="${SITE_ORIGIN}/images/hero-1.jpg">
  <link rel="stylesheet" href="/css/main.css?v=20260608b">
${gtmHead()}
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
</head>
<body>
${gtmBodyNoscript()}
${siteNav()}
${mobileMenu()}
<div class="page-hero" style="height:35vh;min-height:280px;">
  <div class="page-hero-overlay"></div>
  <div class="page-hero-content"><span class="overline">Expert Travel Guides</span><h1>Blog &amp; Guides</h1></div>
</div>
<div class="breadcrumb"><a href="/index.html">Home</a><span>›</span>Blog</div>
<section style="background:white;padding:70px 0;">
  <div class="container">
    <div class="section-header"><span class="overline">Cap Cana &amp; Dominican Republic</span><h2>Expert Travel Guides</h2><div class="gold-divider"></div></div>
    <ul style="display:flex;flex-direction:column;gap:16px;margin-top:32px;">
${renderListItem(card)}</ul>
  </div>
</section>
${siteFooter()}
<script src="/js/main.js?v=20260608b"></script>
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
