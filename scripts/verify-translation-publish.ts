/** Offline checks for the translation publisher pieces (no network, no DB). */
import { readFileSync } from 'node:fs';
import { renderPostHtml as renderNew, type RenderInput } from '../src/lib/publish/render-post';
import { buildAlternates, buildHreflangBlock, upsertHreflangBlock } from '../src/lib/i18n/hreflang';
import { patchEnglishIndex, renderLangIndex } from '../src/lib/i18n/lang-index';
import { preserveSiteBlocks } from '../src/lib/publish/preserve-site-blocks';

let fail = 0;
const t = (name: string, cond: boolean) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`); if (!cond) fail++; };

const base: RenderInput = {
  slug: 'sargassum-cap-cana', meta_title: 'Sargassum & Cap Cana', meta_description: 'Desc', h1: 'Sargassum in Cap Cana',
  summary: 'Summary', body_markdown: '## One\ntext\n## Two\ntext\n## Three\n[r](https://www.espadavilla.com/rates)',
  faq: [{ q: 'Q?', a: 'A.' }], sources: [{ claim: 'c', url: 'https://example.com' }], publishedISO: '2026-07-06', modifiedISO: '2026-11-09',
  wordCount: 100, articleSection: 'logistics', keywords: ['a'], image: { url: 'https://www.espadavilla.com/images/x.webp', width: 1200, height: 675, alt: 'alt' },
};

const alts = buildAlternates('sargassum-cap-cana', [{ lang: 'es', locale: 'es-419' }, { lang: 'de', locale: 'de-DE' }]);
const es = renderNew({ ...base, i18n: { lang: 'es', locale: 'es-419' }, alternates: alts });
t('es: html lang', es.includes('<html lang="es-419">'));
t('es: canonical /es/blog', es.includes('<link rel="canonical" href="https://www.espadavilla.com/es/blog/sargassum-cap-cana">'));
t('es: hreflang es-419 + x-default', es.includes('hreflang="es-419"') && es.includes('hreflang="x-default" href="https://www.espadavilla.com/blog/sargassum-cap-cana"'));
t('es: inLanguage', es.includes('"inLanguage":"es-419"'));
t('es: og:locale es_LA', es.includes('content="es_LA"'));
t('es: breadcrumb to /es/blog', es.includes('<a href="/es/blog">Blog</a>') && es.includes('Inicio'));
t('es: localized FAQ heading + date', es.includes('Preguntas frecuentes') && es.includes('6 de julio de 2026'));

const enLive = readFileSync('C:/Users/rbend/Desktop/Claude Projects/GOLFVILLA-WEBSITE/VILLA-ESPADA-PACKAGE/WEBSITE/blog/sargassum-cap-cana.html', 'utf8');
const p1 = upsertHreflangBlock(enLive, buildHreflangBlock(alts));
const p2 = upsertHreflangBlock(p1.html, buildHreflangBlock(alts));
t('English live page: hreflang inserted', p1.changed && p1.html.includes('hreflang="de-DE"'));
t('English live page: idempotent', !p2.changed);
t('English live page: only head changed', p1.html.replace(/\s*<!-- VE-HREFLANG START -->[\s\S]*?<!-- VE-HREFLANG END -->/, '') === enLive);
const fresh = renderNew(base);
const carried = preserveSiteBlocks(p1.html, fresh);
t('re-render keeps hreflang block', carried.html.includes('<!-- VE-HREFLANG START -->') && carried.carried.includes('VE-HREFLANG'));

const idx = readFileSync('C:/Users/rbend/Desktop/Claude Projects/GOLFVILLA-WEBSITE/VILLA-ESPADA-PACKAGE/WEBSITE/blog/index.html', 'utf8');
const i1 = patchEnglishIndex(idx, ['es', 'fr']);
const i2 = patchEnglishIndex(i1.html, ['es', 'fr', 'de', 'pt']);
t('English index: tabs inserted after breadcrumb', /<div class="breadcrumb">[\s\S]*?<\/div>\n<!-- VE-LANG-TABS START -->/.test(i1.html));
t('English index: tabs replaced not duplicated', (i2.html.match(/VE-LANG-TABS START/g) ?? []).length === 1 && i2.html.includes('Português'));
const li = renderLangIndex('fr', ['es', 'fr'], [{ slug: 'sargassum-cap-cana', title: 'Les sargasses à Cap Cana' }]);
t('fr index: lang, canonical, list, active tab', li.includes('<html lang="fr-FR">') && li.includes('href="https://www.espadavilla.com/fr/blog"') && li.includes('/fr/blog/sargassum-cap-cana') && li.includes('aria-current="page"'));
process.exit(fail ? 1 : 0);
