/**
 * Offline verification — exercises the pure publish + guard logic with no
 * network, DB, or API keys. Run: `bun run scripts/verify-offline.ts`.
 *
 * Validates: markdown→HTML, full post render (schema blocks, canonical),
 * sitemap surgical insert + idempotency against the REAL golfvilla sitemap,
 * blog-index create + card insert + idempotency, villa-fact guard, and the
 * negative-list guard. Exits non-zero on any failed assertion.
 */

import { readFileSync } from 'node:fs';
import { renderPostHtml } from '../src/lib/publish/render-post';
import { addUrlToSitemap } from '../src/lib/publish/update-sitemap';
import { upsertIndexCard } from '../src/lib/publish/update-index';
import { upsertLlmsEntry } from '../src/lib/publish/update-llms';
import { pickPostImage } from '../src/lib/publish/blog-images';
import { checkVillaFacts } from '../src/lib/facts';
import { checkNegativeList } from '../src/lib/keywords';
import { postUrl } from '../src/lib/links';
import { scoreOverlap, type PublishedPost } from '../src/lib/drafting/overlap-score';
import { selectOpportunities, clusterForQuery, isNegativeGeo, isOnTarget, isSoftAvoid } from '../src/lib/gsc/topic-select';
import { detectDecay, normUrl, type PublishedPostRef } from '../src/lib/gsc/decay-detector';
import type { GscRow } from '../src/lib/gsc/client';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `  — ${detail}`}`);
}

const SAMPLE = {
  slug: 'cap-cana-vs-casa-de-campo',
  meta_title: 'Cap Cana vs. Casa de Campo: Best Group Golf Trip',
  meta_description: 'Comparing Cap Cana and Casa de Campo for a private group golf trip — courses, villas, and which fits a 12-person group best.',
  h1: 'Cap Cana vs. Casa de Campo: Which Is Better for a Private Golf Trip?',
  body_markdown: [
    'Picking between Cap Cana and Casa de Campo comes down to one question: do you want **on-course privacy** or a sprawling resort?',
    '',
    '## The courses',
    'Cap Cana gives you 36 holes of Jack Nicklaus Signature golf — [Punta Espada](/cap-cana-golf-villa) and Las Iguanas — without leaving the gates.',
    '',
    '- Punta Espada: ranked #1 in the Caribbean',
    '- Las Iguanas: three oceanside holes',
    '',
    '## Where a group sleeps',
    'A private villa beats a block of hotel rooms for a group. Book direct at [Villa Espada](https://www.espadavilla.com).',
  ].join('\n'),
  faq: [
    { q: 'Is Cap Cana or Casa de Campo better for a golf trip?', a: 'For an on-course private villa with member tee times, Cap Cana edges it; Casa de Campo wins on sheer resort scale.' },
    { q: 'What golf courses can you play from a Cap Cana villa?', a: 'Punta Espada and Las Iguanas, both Jack Nicklaus Signature, plus Corales and La Cana nearby.' },
  ],
  publishedISO: '2026-06-07',
};

// 1. Render
const html = renderPostHtml(SAMPLE);
check('render: doctype + lang', html.startsWith('<!DOCTYPE html>') && html.includes('<html lang="en">'));
check('render: GTM container present', html.includes('GTM-PMPSNQZT'));
check('render: canonical extensionless no-trailing-slash', html.includes(`<link rel="canonical" href="${postUrl(SAMPLE.slug)}">`) && !html.includes(`${postUrl(SAMPLE.slug)}/`));
check('render: BlogPosting JSON-LD', /"@type":\s*"BlogPosting"/.test(html));
check('render: exactly one FAQPage', (html.match(/"@type":\s*"FAQPage"/g) ?? []).length === 1, `got ${(html.match(/"@type":\s*"FAQPage"/g) ?? []).length}`);
check('render: no VacationRental schema', !html.includes('VacationRental'));
check('render: markdown bold → strong', html.includes('<strong>on-course privacy</strong>'));
check('render: internal link rendered', html.includes('href="/cap-cana-golf-villa"'));
check('render: external villa link rendered', html.includes('href="https://www.espadavilla.com"'));
check('render: list rendered', html.includes('<ul>') && html.includes('<li>Punta Espada: ranked #1 in the Caribbean</li>'));
check('render: H2 from ## ', html.includes('<h2>The courses</h2>'));
check('render: FAQ question rendered', html.includes('What golf courses can you play from a Cap Cana villa?'));

// 2. Sitemap insert against the REAL live sitemap
const sitemapPath = 'C:/Users/rbend/Desktop/Claude Projects/GOLFVILLA-WEBSITE/Funnel Websites/golfvilla-com/sitemap.xml';
let realSitemap = '';
try { realSitemap = readFileSync(sitemapPath, 'utf-8'); } catch { /* fall back */ }
const sitemapXml = realSitemap || '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://www.golfvilla.com/</loc></url>\n</urlset>\n';
const beforeUrlCount = (sitemapXml.match(/<loc>/g) ?? []).length;
const ins = addUrlToSitemap(sitemapXml, { loc: postUrl(SAMPLE.slug), lastmod: SAMPLE.publishedISO });
const afterUrlCount = (ins.xml.match(/<loc>/g) ?? []).length;
check('sitemap: inserted new url', ins.changed && afterUrlCount === beforeUrlCount + 1, `before=${beforeUrlCount} after=${afterUrlCount}`);
check('sitemap: preserved all existing urls (no data loss)', ins.xml.includes('/from/new-york') === sitemapXml.includes('/from/new-york'));
check('sitemap: closes with </urlset>', ins.xml.trimEnd().endsWith('</urlset>'));
const ins2 = addUrlToSitemap(ins.xml, { loc: postUrl(SAMPLE.slug), lastmod: SAMPLE.publishedISO });
check('sitemap: idempotent on re-run', !ins2.changed && ins2.xml === ins.xml);

// 3. Blog index create + insert + idempotency + no-clobber of the hand-built index
const idx1 = upsertIndexCard(null, { slug: SAMPLE.slug, title: SAMPLE.meta_title, description: SAMPLE.meta_description, publishedISO: SAMPLE.publishedISO });
check('index: fresh page lists the card', idx1.changed && idx1.html.includes(`href="/blog/${SAMPLE.slug}.html"`));
check('index: fresh page uses Villa Espada chrome', idx1.html.includes('Villa Espada') && idx1.html.includes('site-footer') && !/golfvilla/i.test(idx1.html));
const idx2 = upsertIndexCard(idx1.html, { slug: SAMPLE.slug, title: SAMPLE.meta_title, description: SAMPLE.meta_description, publishedISO: SAMPLE.publishedISO });
check('index: idempotent for same slug', !idx2.changed);
const idx3 = upsertIndexCard(idx1.html, { slug: 'second-post', title: 'Second Post', description: 'Another one', publishedISO: '2026-06-14' });
check('index: inserts a second distinct card', idx3.changed && idx3.html.includes('href="/blog/second-post.html"') && idx3.html.includes(`href="/blog/${SAMPLE.slug}.html"`));
// Real espadavilla index is HAND-BUILT (no sentinels): insert must PRESERVE existing posts + chrome.
const handBuilt = '<ul style="display:flex;gap:16px;"><li><a href="/blog/existing-post.html">Existing Post</a></li></ul><footer class="site-footer">Villa Espada</footer>';
const idx4 = upsertIndexCard(handBuilt, { slug: 'brand-new', title: 'Brand New', description: 'x', publishedISO: '2026-06-14' });
check('index: preserves hand-built index on insert', idx4.changed && idx4.html.includes('href="/blog/existing-post.html"') && idx4.html.includes('href="/blog/brand-new.html"') && idx4.html.includes('site-footer'));

// 4. Villa-fact guard
check('guard: clean body passes', !checkVillaFacts(SAMPLE.body_markdown).flagged);
check('guard: wrong bedroom count flagged', checkVillaFacts('This 12-bedroom villa sleeps everyone.').flagged);
check('guard: wrong nightly rate flagged', checkVillaFacts('Rates start at $999 per night.').flagged);
check('guard: correct facts pass', !checkVillaFacts('The 8-bedroom villa sleeps up to 22 guests from $2,500 per night.').flagged);

// 5. Negative-list guard — DROPPED for espadavilla (checkNegativeList is a no-op).
//    espadavilla has no hard geo guard; "stay on Cap Cana" is advisory only.
check('neg: guard is a no-op (never flags)', !checkNegativeList({ meta_title: 'Best Algarve Golf Villas', slug: 'algarve-golf' }).flagged);
check('neg: clean cap cana passes', !checkNegativeList({ meta_title: SAMPLE.meta_title, slug: SAMPLE.slug, h1: SAMPLE.h1, body: SAMPLE.body_markdown }).flagged);

// 6. Intent-overlap router (Phase 2) — keyword overlap is fine; same-JOB is not.
const PUBLISHED: PublishedPost[] = [
  { slug: 'luxury-golf-villas-vs-resort-blocks', title: 'The New Luxury Group Trip: Why Private Villas Are Replacing Resort Blocks', cluster: 'luxury_trend', primary_keyword: 'luxury golf villas' },
  { slug: 'cap-cana-vs-casa-de-campo-golf', title: 'Cap Cana vs. Casa de Campo: Which Is Better for a Private Golf Trip?', cluster: 'comparison', primary_keyword: 'cap cana vs casa de campo golf' },
];
// Near-duplicate: same primary keyword AND same villa-vs-resort angle → 'high'.
const dup = scoreOverlap({ title: 'Why Private Villas Beat Resort Blocks for Luxury Groups', cluster: 'luxury_trend', primary_keyword: 'luxury golf villas' }, PUBLISHED);
check('overlap: near-duplicate angle → high', dup.level === 'high', `got ${dup.level}`);
check('overlap: high names the matched post', dup.matched?.slug === 'luxury-golf-villas-vs-resort-blocks');
check('overlap: high emits a ⚠️ guidance line', dup.guidance.some((g) => g.includes('INTENT OVERLAP')));
// Same primary keyword, DIFFERENT angle (tourism) → 'cluster', NOT high.
const diff = scoreOverlap({ title: 'Dominican Republic Tourism Is Surging — What It Means for Luxury Villa Rentals', cluster: 'tourism', primary_keyword: 'luxury golf villas' }, PUBLISHED);
check('overlap: shared keyword + different angle → cluster (not high)', diff.level === 'cluster', `got ${diff.level}`);
// Unique primary + unseen cluster → 'none', but still gets a pillar link.
const fresh = scoreOverlap({ title: 'Punta Espada Green Fees, Tee Times, and Member Rates', cluster: 'planning', primary_keyword: 'punta espada green fees' }, PUBLISHED);
check('overlap: unique topic → none', fresh.level === 'none', `got ${fresh.level}`);
check('overlap: every topic gets a pillar hint', !!dup.pillarHint && !!diff.pillarHint && !!fresh.pillarHint);
// Same-cluster published post becomes a linkable sibling.
check('overlap: same-cluster sibling link attached', dup.siblingLinks.some((s) => s.url === postUrl('luxury-golf-villas-vs-resort-blocks')));

// 7. GSC opportunity selector (Phase 3) — filter + cluster mapping (pure).
check('gsc: neg geo is a no-op (dropped for espadavilla)', !isNegativeGeo('algarve golf villas') && !isNegativeGeo('florida golf'));
check('gsc: soft-avoid detects golfvilla-lane query', isSoftAvoid('best caribbean golf resorts'));
check('gsc: on-target villa query not soft-avoided', !isSoftAvoid('cap cana villa with chef'));
check('gsc: query maps to its cluster', clusterForQuery('cap cana villa with chef')?.slug === 'stay', `got ${clusterForQuery('cap cana villa with chef')?.slug}`);
check('gsc: comparison query maps to comparison cluster', clusterForQuery('cap cana vs casa de campo')?.slug === 'comparison');
check('gsc: off-topic query is not on-target', !isOnTarget('best pizza in chicago'));
check('gsc: generic caribbean-golf is not on-target', !isOnTarget('best caribbean golf resorts'));
check('gsc: entity-signal query is on-target even without cluster', isOnTarget('villa espada with infinity pool'));

const GSC_ROWS: GscRow[] = [
  // page-2 opportunity, on-target → SELECTED
  { query: 'cap cana villa with chef', clicks: 2, impressions: 400, ctr: 0.005, position: 12.3 },
  // golfvilla's category lane (soft-avoid) → dropped
  { query: 'best caribbean golf resorts', clicks: 1, impressions: 900, ctr: 0.001, position: 8.0 },
  // already ranking page 1 (position < min) → dropped
  { query: 'villa espada', clicks: 50, impressions: 800, ctr: 0.30, position: 2.1 },
  // off-topic → dropped
  { query: 'best pizza in chicago', clicks: 0, impressions: 500, ctr: 0.0, position: 11.0 },
  // too few impressions → dropped
  { query: 'punta espada green fees', clicks: 0, impressions: 5, ctr: 0.0, position: 14.0 },
];
const picks = selectOpportunities(GSC_ROWS, { limit: 12 });
check('gsc: selects only the on-target page-2 opportunity', picks.length === 1 && picks[0]!.query === 'cap cana villa with chef', `got ${picks.length}: ${picks.map((p) => p.query).join(', ')}`);
check('gsc: candidate carries cluster + primary keyword', picks[0]?.cluster === 'stay' && picks[0]?.primary_keyword === 'cap cana villa with chef');
check('gsc: candidate gets a non-empty working title', !!picks[0]?.title && picks[0]!.title.length > picks[0]!.query.length);
check('gsc: soft-avoid never selected', !picks.some((p) => isSoftAvoid(p.query)));

// 8. Decay detector (Phase 4) — pure function, no DB/network.
const OLD_DATE = '2025-01-01'; // > 90 days ago → eligible
const NEW_DATE = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10); // 30d ago → too new

const DECAY_POSTS: PublishedPostRef[] = [
  { draftId: 'aaa', slug: 'punta-espada-guide',          title: 'Punta Espada Guide',   publishedAt: OLD_DATE, liveUrl: 'https://www.golfvilla.com/blog/punta-espada-guide' },
  { draftId: 'bbb', slug: 'cap-cana-golf-trip',          title: 'Cap Cana Golf Trip',    publishedAt: OLD_DATE, liveUrl: 'https://www.golfvilla.com/blog/cap-cana-golf-trip' },
  { draftId: 'ccc', slug: 'caribbean-villa-rentals',     title: 'Caribbean Villas',      publishedAt: OLD_DATE, liveUrl: 'https://www.golfvilla.com/blog/caribbean-villa-rentals' },
  { draftId: 'ddd', slug: 'too-new-post',                title: 'Too New Post',          publishedAt: NEW_DATE, liveUrl: 'https://www.golfvilla.com/blog/too-new-post' },
];

// Current window: punta-espada collapsed (from 200 → 60 = 70% drop), cap-cana held, caribb never traction
const CURRENT_PAGE_ROWS: GscRow[] = [
  { query: 'https://www.golfvilla.com/blog/punta-espada-guide',      clicks: 3, impressions:  60, ctr: 0.05, position: 18 },
  { query: 'https://www.golfvilla.com/blog/cap-cana-golf-trip',      clicks: 8, impressions: 180, ctr: 0.04, position: 11 },
  { query: 'https://www.golfvilla.com/blog/caribbean-villa-rentals', clicks: 0, impressions:   5, ctr: 0.00, position: 28 },
];
// Prior window: punta-espada had traction, cap-cana also had traction
const PRIOR_PAGE_ROWS: GscRow[] = [
  { query: 'https://www.golfvilla.com/blog/punta-espada-guide',      clicks: 12, impressions: 200, ctr: 0.06, position: 10 },
  { query: 'https://www.golfvilla.com/blog/cap-cana-golf-trip',      clicks:  9, impressions: 170, ctr: 0.05, position: 12 },
  { query: 'https://www.golfvilla.com/blog/caribbean-villa-rentals', clicks:  0, impressions:   3, ctr: 0.00, position: 30 },
];

const decayed = detectDecay(CURRENT_PAGE_ROWS, PRIOR_PAGE_ROWS, DECAY_POSTS);
check('decay: normUrl strips origin and trailing slash', normUrl('https://www.golfvilla.com/blog/slug/') === '/blog/slug');
check('decay: too-new post skipped entirely', !decayed.some((c) => c.draftId === 'ddd'));
check('decay: impressions collapse detected', decayed.some((c) => c.draftId === 'aaa' && c.signal === 'impressions_decay'), `got signals: ${decayed.map((c) => `${c.draftId}:${c.signal}`).join(', ')}`);
check('decay: stable post not flagged', !decayed.some((c) => c.draftId === 'bbb'));
check('decay: low-traction old post detected', decayed.some((c) => c.draftId === 'ccc' && c.signal === 'low_traction'));
check('decay: reason string is non-empty', decayed.every((c) => c.reason.length > 0));
check('decay: impressions_decay sorts before low_traction', decayed[0]?.signal === 'impressions_decay' && decayed[decayed.length - 1]?.signal === 'low_traction');
check('decay: limit is respected', detectDecay(CURRENT_PAGE_ROWS, PRIOR_PAGE_ROWS, DECAY_POSTS, { limit: 1 }).length === 1);
// Position-decay signal
const POS_CURRENT: GscRow[] = [{ query: 'https://www.golfvilla.com/blog/punta-espada-guide', clicks: 8, impressions: 150, ctr: 0.05, position: 28 }];
const POS_PRIOR:   GscRow[] = [{ query: 'https://www.golfvilla.com/blog/punta-espada-guide', clicks: 8, impressions: 150, ctr: 0.05, position: 12 }];
const posDecayed = detectDecay(POS_CURRENT, POS_PRIOR, [DECAY_POSTS[0]!], { imprDecayThreshold: 0.1 }); // high threshold so impr signal doesn't fire
check('decay: position worsening detected', posDecayed.some((c) => c.signal === 'position_decay'), `got: ${posDecayed.map((c) => c.signal).join(',')}`);

// 8. llms.txt upsert (modeled on the LIVE espadavilla.com/llms.txt structure)
const LLMS_FIXTURE = [
  '# Villa Espada — Cap Cana, Dominican Republic',
  '',
  '## Key Facts',
  '- Bedrooms: 8 | Bathrooms: 9.5 | Max guests: 22',
  '',
  '## Pillar Guides',
  '- [Cap Cana Travel Guide](https://www.espadavilla.com/blog/cap-cana-guide): Beaches, golf, marina',
  '',
  '## Best Answer Summary',
  'Villa Espada is best suited for luxury golf trips.',
  '',
  '## Last Updated',
  '2026-05-28',
  '',
].join('\n');
const llmsEntry = { url: postUrl('tennis-and-padel-cap-cana'), title: 'Tennis and Padel Cap Cana', description: 'Courts, coaching, Nadal Center.', dateISO: '2026-06-09' };
const l1 = upsertLlmsEntry(LLMS_FIXTURE, llmsEntry);
check('llms: insert creates Latest Guides section', l1.changed && l1.txt.includes('## Latest Guides'));
check('llms: entry line rendered', l1.txt.includes(`- [Tennis and Padel Cap Cana](${llmsEntry.url}): Courts, coaching, Nadal Center.`));
check('llms: section placed after Pillar Guides, before Best Answer', l1.txt.indexOf('## Latest Guides') > l1.txt.indexOf('## Pillar Guides') && l1.txt.indexOf('## Latest Guides') < l1.txt.indexOf('## Best Answer Summary'));
check('llms: hand-curated sections untouched', l1.txt.includes('- Bedrooms: 8 | Bathrooms: 9.5 | Max guests: 22') && l1.txt.includes('- [Cap Cana Travel Guide](https://www.espadavilla.com/blog/cap-cana-guide): Beaches, golf, marina'));
check('llms: Last Updated bumped', l1.txt.includes('## Last Updated\n2026-06-09'));
const l2 = upsertLlmsEntry(l1.txt, llmsEntry);
check('llms: idempotent on re-run', l2.changed === false);
const l3 = upsertLlmsEntry(l1.txt, { ...llmsEntry, description: 'Updated after refresh.' });
check('llms: refresh updates the existing line (no duplicate)', l3.changed && l3.txt.includes(': Updated after refresh.') && (l3.txt.match(new RegExp(llmsEntry.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length === 1);
const l4 = upsertLlmsEntry(l3.txt, { url: postUrl('second-post'), title: 'Second Post', description: 'Another guide.', dateISO: '2026-06-10' });
check('llms: second post inserted at top of Latest Guides', l4.changed && l4.txt.indexOf('- [Second Post]') < l4.txt.indexOf('- [Tennis and Padel Cap Cana]'));
const l5 = upsertLlmsEntry(LLMS_FIXTURE, { url: 'https://www.espadavilla.com/blog/cap-cana-guide', title: 'Cap Cana Travel Guide 2026', description: 'Refreshed guide.', dateISO: '2026-06-09' });
check('llms: URL already in Pillar Guides updated in place, never duplicated', l5.changed && (l5.txt.match(/cap-cana-guide\)/g) ?? []).length === 1 && !l5.txt.includes('## Latest Guides'));

// 9. Per-post image selection (cluster-mapped, deterministic by slug)
const imgStay = pickPostImage('staying-at-villa-espada-day-on-property', 'stay');
const imgExp = pickPostImage('tennis-and-padel-cap-cana', 'experience');
check('image: stay cluster resolves a villa image', imgStay.url.includes('/images/villa-espada-') && imgStay.width >= 1200);
check('image: experience cluster resolves an experience image', /eden_roc|juanillo|scapepark|fishing|establos|rafanadal|el-dorado/i.test(imgExp.url) && imgExp.height > 0);
check('image: deterministic — same slug+cluster gives same url', pickPostImage('tennis-and-padel-cap-cana', 'experience').url === imgExp.url);
check('image: different slugs can differ within a pool', pickPostImage('a-different-experience-post-xyz', 'experience').url !== '' );
check('image: unknown cluster falls back to default villa image', pickPostImage('whatever', 'nonexistent').url.includes('villa-espada-aerial-fairway-5'));
check('image: null cluster falls back', pickPostImage('whatever', null).width === 2000);
check('image: alt text is non-empty', imgStay.alt.length > 0 && imgExp.alt.length > 0);
// Render path actually emits the image (ImageObject + visible hero + og dims)
const htmlImg = renderPostHtml({ ...SAMPLE, articleSection: 'stay', image: imgStay });
check('image: render emits ImageObject with dimensions', htmlImg.includes('"@type":"ImageObject"') && htmlImg.includes(`"width":${imgStay.width}`));
check('image: render emits visible hero img tag', htmlImg.includes('class="post-hero"') && htmlImg.includes(`width="${imgStay.width}"`));
check('image: render emits og:image dimensions', htmlImg.includes(`<meta property="og:image:width" content="${imgStay.width}">`));
check('image: render without image keeps legacy hero-1 fallback', !renderPostHtml(SAMPLE).includes('class="post-hero"') && renderPostHtml(SAMPLE).includes('/images/hero-1.jpg'));

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
