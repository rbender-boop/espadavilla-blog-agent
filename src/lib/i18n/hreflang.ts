/**
 * hreflang helpers. The block is wrapped in markers so it can be upserted into
 * any version of a post (English pages are patched in place, never re-rendered
 * from the DB, so live hand-edits survive) and carried across re-renders by
 * preserve-site-blocks.
 */
import { SITE_ORIGIN, postUrl } from '../links';
import type { LangCode } from './languages';

export type Alternate = { hreflang: string; href: string };

export const HREFLANG_START = '<!-- VE-HREFLANG START -->';
export const HREFLANG_END = '<!-- VE-HREFLANG END -->';

export function translatedPostUrl(lang: LangCode, slug: string): string {
  return `${SITE_ORIGIN}/${lang}/blog/${slug}`;
}
export function translatedPostRepoPath(lang: LangCode, slug: string): string {
  return `${lang}/blog/${slug}.html`;
}
export function langIndexUrl(lang: LangCode): string {
  return `${SITE_ORIGIN}/${lang}/blog`;
}
export function langIndexRepoPath(lang: LangCode): string {
  return `${lang}/blog/index.html`;
}

/** English + every published language + x-default (English). */
export function buildAlternates(slug: string, langs: Array<{ lang: LangCode; locale: string }>): Alternate[] {
  const en = postUrl(slug);
  return [
    { hreflang: 'en', href: en },
    ...langs.map((l) => ({ hreflang: l.locale, href: translatedPostUrl(l.lang, slug) })),
    { hreflang: 'x-default', href: en },
  ];
}

export function buildHreflangBlock(alts: Alternate[]): string {
  const links = alts.map((a) => `  <link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`).join('\n');
  return `  ${HREFLANG_START}\n${links}\n  ${HREFLANG_END}`;
}

/** Replace an existing block, else insert right after the canonical link. */
export function upsertHreflangBlock(html: string, block: string): { html: string; changed: boolean } {
  const i = html.indexOf(HREFLANG_START);
  if (i >= 0) {
    const j = html.indexOf(HREFLANG_END, i);
    if (j < 0) throw new Error('hreflang block start without end');
    // include the leading indentation of the start marker
    let s = i;
    while (s > 0 && (html[s - 1] === ' ' || html[s - 1] === '\t')) s--;
    const next = html.slice(0, s) + block + html.slice(j + HREFLANG_END.length);
    return { html: next, changed: next !== html };
  }
  const m = html.match(/<link rel="canonical"[^>]*>/i);
  if (!m || m.index === undefined) throw new Error('no canonical link to anchor hreflang block');
  const at = m.index + m[0].length;
  return { html: html.slice(0, at) + '\n' + block + html.slice(at), changed: true };
}

export function extractHreflangBlock(html: string): string | null {
  const i = html.indexOf(HREFLANG_START);
  if (i < 0) return null;
  const j = html.indexOf(HREFLANG_END, i);
  return j < 0 ? null : '  ' + html.slice(i, j + HREFLANG_END.length);
}
