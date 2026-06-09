/**
 * render-post.ts — turn an approved draft into a golfvilla.com-template HTML file.
 *
 * The shared chrome (GTM, network bar, nav, footer) now comes from
 * ./site-chrome (single source of truth — audit fix #3) so blog posts and the
 * /blog index can never drift apart again. We inject: full SEO meta + canonical
 * (extensionless, no trailing slash), og/twitter, and a SINGLE JSON-LD @graph
 * containing BlogPosting + BreadcrumbList + exactly one FAQPage, all wired to
 * the site's #website / #organization / author @id nodes.
 *
 * Schema discipline (project rule): BlogPosting + exactly one FAQPage. Never
 * VacationRental.
 *
 * Audit fixes implemented here:
 *  #1  Strip <cite> citation tags from body + FAQ before render (defence in depth).
 *  #4  Escape <, >, & in JSON-LD so a "</script>" in content can't break out.
 *  #5  Emit BreadcrumbList (Home → Blog → Post).
 *  #6  Reference the site entity graph (#website / #organization / author @id).
 *  #8  markdownToHtml now renders GitHub-style pipe tables.
 *  #9  BlogPosting carries wordCount / articleSection / keywords / dateModified.
 */

import { SITE_ORIGIN, postUrl } from '../links';
import { gtmHead, gtmBodyNoscript, networkBar, siteNav, mobileMenu, siteFooter } from './site-chrome';

export type RenderInput = {
  slug: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  summary?: string | undefined;            // answer-first lead (GEO) — rendered + JSON-LD abstract
  body_markdown: string;
  faq: Array<{ q: string; a: string }>;
  sources?: Array<{ claim: string; url: string }> | undefined;  // visible references (GEO/trust)
  publishedISO: string;        // YYYY-MM-DD
  modifiedISO?: string | undefined;        // YYYY-MM-DD (defaults to publishedISO) — audit fix #9/#2
  wordCount?: number | undefined;          // audit fix #9
  articleSection?: string | undefined;     // topic cluster — audit fix #9
  keywords?: string[] | undefined;         // primary + secondary — audit fix #9
};

export function renderPostHtml(input: RenderInput): string {
  const url = postUrl(input.slug);
  const title = escapeHtml(input.meta_title);
  const desc = escapeHtml(input.meta_description);
  const h1 = escapeHtml(input.h1);
  // #1 — strip any citation tags the drafter may have left in the body/FAQ.
  const body = stripCitations(input.body_markdown);
  const faq = (input.faq ?? []).map((f) => ({ q: stripCitations(f.q), a: stripCitations(f.a) }));
  const summary = stripCitations(input.summary ?? '');
  // De-duplicate sources by URL; keep only well-formed http(s) links.
  const sources = dedupeSources(input.sources ?? []);
  const bodyHtml = markdownToHtml(body);
  const faqHtml = renderFaqHtml(faq);
  const ogImage = `${SITE_ORIGIN}/images/hero-1.jpg`;
  const modifiedISO = input.modifiedISO && input.modifiedISO >= input.publishedISO ? input.modifiedISO : input.publishedISO;

  // ── JSON-LD @graph: BlogPosting + BreadcrumbList + (one) FAQPage ──────────
  // #6 — author + publisher reference the site entity graph by @id, and the
  // post declares isPartOf the #website node, matching the live site's pattern.
  const blogPosting: Record<string, unknown> = {
    '@type': 'BlogPosting',
    '@id': `${url}#blogposting`,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    headline: input.meta_title,
    description: input.meta_description,
    datePublished: input.publishedISO,
    dateModified: modifiedISO,
    image: ogImage,
    inLanguage: 'en',
    author: { '@id': `${SITE_ORIGIN}/#person-rb` },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    breadcrumb: { '@id': `${url}#breadcrumb` },
  };
  // #9 — enrichment, only when present (never emit empty/guessed fields).
  if (typeof input.wordCount === 'number' && input.wordCount > 0) blogPosting.wordCount = input.wordCount;
  if (summary) blogPosting.abstract = summary;
  if (input.articleSection) blogPosting.articleSection = input.articleSection;
  const kws = (input.keywords ?? []).filter(Boolean);
  if (kws.length) blogPosting.keywords = kws.join(', ');

  const personNode = {
    '@type': 'Person',
    '@id': `${SITE_ORIGIN}/#person-rb`,
    name: 'Robert Bender',
    url: SITE_ORIGIN,
    worksFor: { '@id': `${SITE_ORIGIN}/#organization` },
  };
  const orgNode = {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'Villa Espada',
    url: `${SITE_ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: ogImage },
  };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog` },
      { '@type': 'ListItem', position: 3, name: input.h1, item: url },
    ],
  };

  const graph: Record<string, unknown>[] = [blogPosting, breadcrumb, personNode, orgNode];
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${url}#faqpage`,
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }
  const jsonLd = jsonLdScript({ '@context': 'https://schema.org', '@graph': graph });

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

  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Villa Espada">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="theme-color" content="#C9A84C">

  <link rel="icon" type="image/x-icon" href="/favicon.ico">

${jsonLd}

  <link rel="stylesheet" href="/css/main.css?v=20260608b">
  <style>
    .post-wrap { max-width: 820px; margin: 0 auto; padding: 130px 6vw 80px; }
    .post-breadcrumb { font-size: 0.78rem; letter-spacing: 0.04em; margin-bottom: 28px; color: var(--muted, #777); }
    .post-breadcrumb a { color: var(--muted, #777); text-decoration: none; }
    .post-breadcrumb a:hover { color: var(--gold, #C9A84C); }
    .post-wrap h1 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.12; margin: 0 0 18px; color: var(--navy); }
    .post-meta { font-size: 0.85rem; color: var(--muted, #888); margin-bottom: 36px; }
    .post-wrap h2 { font-size: 1.5rem; margin: 44px 0 14px; color: var(--navy); }
    .post-wrap h3 { font-size: 1.18rem; margin: 30px 0 10px; color: var(--navy); }
    .post-wrap p { line-height: 1.78; margin: 0 0 16px; }
    .post-wrap ul, .post-wrap ol { line-height: 1.8; margin: 0 0 18px; padding-left: 1.3em; }
    .post-wrap a { color: var(--gold, #C9A84C); }
    .post-table { width: 100%; border-collapse: collapse; margin: 8px 0 24px; font-size: 0.95rem; }
    .post-table th, .post-table td { text-align: left; padding: 11px 14px; border-bottom: 1px solid rgba(0,0,0,0.08); vertical-align: top; }
    .post-table th { font-weight: 600; color: var(--navy); background: rgba(0,0,0,0.02); }
    .post-faq { margin-top: 56px; padding-top: 28px; border-top: 2px solid var(--gold, #C9A84C); }
    .post-faq h2 { margin-top: 0; }
    .post-faq h3 { font-size: 1.08rem; margin: 22px 0 6px; }
    .post-cta { margin-top: 48px; padding-top: 28px; border-top: 1px solid rgba(0,0,0,0.1); }
    .post-summary { margin: 0 0 36px; padding: 18px 22px; background: rgba(201,168,76,0.08); border-left: 3px solid var(--gold, #C9A84C); border-radius: 4px; }
    .post-summary p { margin: 0; font-size: 1.06rem; line-height: 1.7; color: var(--navy); }
    .post-sources { margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.1); }
    .post-sources h2 { font-size: 1.2rem; margin: 0 0 12px; }
    .post-sources ul { line-height: 1.7; margin: 0; padding-left: 1.2em; font-size: 0.9rem; word-break: break-word; }
    .post-sources a { color: var(--gold, #C9A84C); }
  </style>
</head>
<body>
${gtmBodyNoscript()}

${networkBar()}

${siteNav()}

${mobileMenu()}

<main class="post-wrap">
  <div class="post-breadcrumb">
    <a href="/">Home</a> &nbsp;›&nbsp; <a href="/blog">Blog</a> &nbsp;›&nbsp; ${h1}
  </div>

  <h1>${h1}</h1>
  <p class="post-meta">Villa Espada · Published ${escapeHtml(formatHumanDate(input.publishedISO))}</p>
${summary ? `\n  <div class="post-summary"><p>${escapeHtml(summary)}</p></div>\n` : ''}
${indent(bodyHtml, 2)}
${faqHtml ? `\n  <section class="post-faq">\n    <h2>Frequently Asked Questions</h2>\n${indent(faqHtml, 4)}\n  </section>\n` : ''}
${sources.length ? `\n  <section class="post-sources">\n    <h2>Sources</h2>\n    <ul>\n${sources.map((s) => `      <li>${renderSourceItem(s)}</li>`).join('\n')}\n    </ul>\n  </section>\n` : ''}
  <div class="post-cta">
    <a href="/contact" class="btn btn-gold">Inquire &amp; Book</a>
    <a href="/rates" class="btn btn-gold" style="margin-left:12px;">View Rates</a>
  </div>
</main>

${siteFooter()}

<script src="/js/main.js?v=20260608b"></script>
</body>
</html>
`;
}

/* ============================================================
 * Citation stripping (audit fix #1)
 * ============================================================
 * The web_search-enabled drafter sometimes emits citation markup —
 * e.g. <cite index="7-1,7-2">…</cite> — inside body_markdown/FAQ text. Left in,
 * it gets HTML-escaped and shows as literal "<cite …>" on the published page.
 * Strip the tags here (keep the inner text). Citations belong in `sources`.
 */
export function stripCitations(s: string): string {
  if (!s) return '';
  return s
    .replace(/<\/?cite\b[^>]*>/gi, '')   // raw tags
    .replace(/&lt;\/?cite\b[^&]*&gt;/gi, '') // pre-escaped tags (defence in depth)
    .trim();
}

/* ============================================================
 * JSON-LD serialisation (audit fix #4)
 * ============================================================ */

function jsonLdScript(obj: unknown): string {
  // Escape <, >, & so a literal "</script>" or "<!--" inside any string value
  // cannot terminate the <script> block or inject markup. JSON.stringify does
  // not escape these, so we do it on the serialised output.
  const safe = JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `  <script type="application/ld+json">\n${safe}\n  </script>`;
}

/* ============================================================
 * FAQ rendering
 * ============================================================ */

function renderFaqHtml(faq: Array<{ q: string; a: string }>): string {
  if (!faq.length) return '';
  return faq
    .map((f) => `<h3>${escapeHtml(f.q)}</h3>\n<p>${escapeHtml(f.a)}</p>`)
    .join('\n');
}

/* ============================================================
 * Sources rendering (visible references — GEO/trust signal)
 * ============================================================
 * Sources are persisted on the draft as { claim, url }. We render them as a
 * visible, linked reference list so AI answer engines and readers can see the
 * provenance of every timely/external claim. Dedupe by URL, http(s) only,
 * capped so a runaway list can't dominate the page.
 */
function dedupeSources(raw: Array<{ claim: string; url: string }>): Array<{ claim: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ claim: string; url: string }> = [];
  for (const s of raw) {
    if (!s || !s.url || !/^https?:\/\//i.test(s.url.trim())) continue;
    const url = s.url.trim();
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ claim: String(s.claim ?? '').trim(), url });
    if (out.length >= 15) break;
  }
  return out;
}

function renderSourceItem(s: { claim: string; url: string }): string {
  const safeHref = sanitizeHref(s.url);
  const host = hostnameOf(s.url);
  const label = s.claim ? escapeHtml(s.claim) : escapeHtml(host);
  const suffix = s.claim && host ? ` <span style="color:var(--muted,#888)">— ${escapeHtml(host)}</span>` : '';
  if (!safeHref) return label; // never emit an unsafe href
  return `<a href="${safeHref}" target="_blank" rel="nofollow noopener">${label}</a>${suffix}`;
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/* ============================================================
 * Minimal, safe markdown → HTML
 * ============================================================
 * Supports: ## / ### headings, paragraphs, unordered (-/*) and ordered (1.)
 * lists, GitHub-style pipe tables (audit fix #8), **bold**, *italic*,
 * [text](url) links, and inline `code`. All text is HTML-escaped before inline
 * formatting; links are restricted to http(s)/relative/mailto URLs.
 */

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  const flushList = (items: string[], ordered: boolean) => {
    if (!items.length) return;
    const tag = ordered ? 'ol' : 'ul';
    out.push(`<${tag}>`);
    for (const it of items) out.push(`  <li>${inline(it)}</li>`);
    out.push(`</${tag}>`);
  };

  while (i < lines.length) {
    const line = (lines[i] ?? '').trimEnd();
    if (line.trim() === '') { i++; continue; }

    // Headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = Math.min(Math.max(h[1]!.length, 2), 3); // clamp to h2/h3 (h1 is the title)
      out.push(`<h${level}>${inline(h[2]!.trim())}</h${level}>`);
      i++;
      continue;
    }

    // Pipe table (audit fix #8): a header row followed by a |---|---| separator.
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator((lines[i + 1] ?? '').trim())) {
      const header = splitTableRow(line);
      i += 2; // consume header + separator
      const rows: string[][] = [];
      while (i < lines.length && isTableRow((lines[i] ?? '').trim())) {
        rows.push(splitTableRow((lines[i] ?? '').trim()));
        i++;
      }
      out.push('<table class="post-table">');
      out.push('  <thead><tr>' + header.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead>');
      if (rows.length) {
        out.push('  <tbody>');
        for (const r of rows) out.push('    <tr>' + header.map((_, ci) => `<td>${inline(r[ci] ?? '')}</td>`).join('') + '</tr>');
        out.push('  </tbody>');
      }
      out.push('</table>');
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      flushList(items, false);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        items.push((lines[i] ?? '').trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      flushList(items, true);
      continue;
    }

    // Paragraph — gather until blank line / structural line
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,6})\s|^[-*]\s|^\d+\.\s/.test((lines[i] ?? '').trim()) &&
      !(isTableRow((lines[i] ?? '').trim()) && isTableSeparator((lines[i + 1] ?? '').trim()))
    ) {
      para.push((lines[i] ?? '').trim());
      i++;
    }
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

/* Table helpers (audit fix #8) */
function isTableRow(line: string): boolean {
  // A row must contain at least one interior pipe and not be a list/heading.
  return /\|/.test(line) && /\S/.test(line.replace(/\|/g, '')) && !/^[-*]\s/.test(line) && !/^#{1,6}\s/.test(line);
}
function isTableSeparator(line: string): boolean {
  // e.g. | --- | :--: | ---: |  (cells of dashes with optional colons)
  if (!/\|/.test(line)) return false;
  return splitTableRow(line).every((c) => /^:?-{1,}:?$/.test(c.replace(/\s/g, '')));
}
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function inline(text: string): string {
  // Escape first, then apply formatting on the escaped string.
  let s = escapeHtml(text);
  // Links [text](url) — allow http(s), site-relative and mailto URLs only.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safe = sanitizeHref(href);
    return safe ? `<a href="${safe}">${label}</a>` : label;
  });
  // Bold then italic.
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  // Inline code.
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

function sanitizeHref(href: string): string | null {
  const h = href.trim();
  if (/^https?:\/\//i.test(h)) return escapeAttr(h);
  if (/^\/[^\s]*$/.test(h)) return escapeAttr(h);            // site-relative
  if (/^mailto:[^\s]+$/i.test(h)) return escapeAttr(h);
  return null;                                                // drop javascript:, etc.
}

/* ============================================================
 * Helpers
 * ============================================================ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '%22').replace(/</g, '%3C').replace(/>/g, '%3E');
}

function indent(html: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return html
    .split('\n')
    .map((l) => (l.length ? pad + l : l))
    .join('\n');
}

function formatHumanDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(d);
}
