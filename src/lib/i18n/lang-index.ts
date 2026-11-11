/**
 * Blog index pages per language + the language tabs.
 * - /<lang>/blog (repo <lang>/blog/index.html) is OWNED by the pipeline:
 *   regenerated in full from the DB on every translation publish.
 * - The English /blog index is hand-built, so it is only PATCHED: a marked
 *   tabs block after the breadcrumb, and a marked hreflang block in <head>.
 */
import { SITE_ORIGIN } from '../links';
import { gtmHead, gtmBodyNoscript, siteNav, mobileMenu, siteFooter } from '../publish/site-chrome';
import { TRANSLATION_LANGUAGES, type LangCode } from './languages';
import { UI } from './ui-strings';
import { buildHreflangBlock, langIndexUrl, type Alternate } from './hreflang';

export const TABS_START = '<!-- VE-LANG-TABS START -->';
export const TABS_END = '<!-- VE-LANG-TABS END -->';

export type IndexPost = { slug: string; title: string };

export function indexAlternates(langs: LangCode[]): Alternate[] {
  return [
    { hreflang: 'en', href: `${SITE_ORIGIN}/blog` },
    ...TRANSLATION_LANGUAGES.filter((l) => langs.includes(l.lang)).map((l) => ({ hreflang: l.locale, href: langIndexUrl(l.lang) })),
    { hreflang: 'x-default', href: `${SITE_ORIGIN}/blog` },
  ];
}

/** Tabs: English + every language that has published posts. */
export function renderTabs(current: 'en' | LangCode, langs: LangCode[]): string {
  const tab = (href: string, label: string, hreflang: string, active: boolean) =>
    `<a href="${href}" hreflang="${hreflang}" lang="${hreflang}"${active ? ' aria-current="page"' : ''} style="display:inline-block;padding:8px 16px;border:1px solid ${active ? 'var(--navy,#0a1628)' : '#d8d2c4'};border-radius:20px;text-decoration:none;font-size:0.85rem;letter-spacing:0.04em;${active ? 'background:var(--navy,#0a1628);color:#fff;' : 'color:var(--navy,#0a1628);background:#fff;'}">${label}</a>`;
  const items = [tab('/blog', 'English', 'en', current === 'en')];
  for (const l of TRANSLATION_LANGUAGES) {
    if (langs.includes(l.lang)) items.push(tab(`/${l.lang}/blog`, l.label, l.locale, current === l.lang));
  }
  return `${TABS_START}\n<nav class="lang-tabs" aria-label="${UI[current].languages}" style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:22px 6vw 0;background:#fff;">\n  ${items.join('\n  ')}\n</nav>\n${TABS_END}`;
}

/** Patch the hand-built English index: tabs after the breadcrumb + hreflang. */
export function patchEnglishIndex(html: string, langs: LangCode[]): { html: string; changed: boolean } {
  let next = html;
  const tabs = renderTabs('en', langs);
  const i = next.indexOf(TABS_START);
  if (i >= 0) {
    const j = next.indexOf(TABS_END, i);
    next = next.slice(0, i) + tabs + next.slice(j + TABS_END.length);
  } else {
    // espadavilla: after the breadcrumb; golfvilla (no breadcrumb): after the first <h1>
    const m = next.match(/<div class="breadcrumb">[\s\S]*?<\/div>/) ?? next.match(/<h1[^>]*>[\s\S]*?<\/h1>/);
    if (!m || m.index === undefined) throw new Error('English blog index: no breadcrumb or h1 anchor found');
    const at = m.index + m[0].length;
    next = next.slice(0, at) + '\n' + tabs + next.slice(at);
  }
  return { html: next, changed: next !== html };
}

/** Full /<lang>/blog page, newest first. */
export function renderLangIndex(lang: LangCode, langs: LangCode[], posts: IndexPost[]): string {
  const def = TRANSLATION_LANGUAGES.find((l) => l.lang === lang)!;
  const ui = UI[lang];
  const url = langIndexUrl(lang);
  const title = esc(`${ui.indexTitle} | Villa Espada Cap Cana`);
  const desc = esc(ui.indexDesc);
  const list = posts.map((p) => `      <li><a href="/${lang}/blog/${encodeURI(p.slug)}">${esc(p.title)}</a></li>`).join('\n');
  return `<!DOCTYPE html>
<html lang="${def.locale}">
<head>
${gtmHead()}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
${buildHreflangBlock(indexAlternates(langs))}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Villa Espada">
  <meta property="og:image" content="${SITE_ORIGIN}/images/hero-1.jpg">
  <link rel="stylesheet" href="/css/main.css?v=20261031">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
</head>
<body>
${gtmBodyNoscript()}
${siteNav()}
${mobileMenu()}
<div class="page-hero" style="height:35vh;min-height:280px;">
  <div class="page-hero-overlay"></div>
  <div class="page-hero-content"><span class="overline">${esc(ui.indexOverline)}</span><h1>${esc(ui.indexH1)}</h1></div>
</div>
<div class="breadcrumb"><a href="/">${esc(ui.home)}</a><span>›</span>${esc(ui.blog)}</div>
${renderTabs(lang, langs)}
<section style="background:white;padding:50px 0 70px;">
  <div class="container">
    <div class="section-header"><span class="overline">Cap Cana &amp; Dominican Republic</span><h2>${esc(ui.indexH2)}</h2><div class="gold-divider"></div></div>
    <ul style="display:flex;flex-direction:column;gap:16px;list-style:none;padding:0;margin-top:32px;">
${list}
    </ul>
  </div>
</section>
${siteFooter()}
<script src="/js/main.js?v=20260915"></script>
</body>
</html>
`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
