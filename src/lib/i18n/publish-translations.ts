/**
 * publish-translations.ts — ships approved translations of ONE English post in
 * one atomic commit to the site repo:
 *   - <lang>/blog/<slug>.html for every live language (re-rendered from the DB;
 *     these files are pipeline-owned)
 *   - hreflang block patched into the English post (never re-rendered — live
 *     hand-edits on English pages survive)
 *   - /<lang>/blog index pages regenerated; English /blog index patched with
 *     language tabs + hreflang
 *   - sitemap entries; IndexNow ping
 * A post is published once all four languages are settled (approved, published
 * or blocked), or after 2h if one language is stuck, so a backfill doesn't push
 * four separate deploys per post.
 */
import { supabase } from '../supabase';
import { postRepoPath } from '../links';
import { renderPostHtml } from '../publish/render-post';
import { guardContactInfo } from '../publish/contact-info-guard';
import { pickPostImage } from '../publish/blog-images';
import { addUrlToSitemap } from '../publish/update-sitemap';
import { pingIndexNow } from '../publish/indexnow';
import { getFile, commitFiles, type RepoFile } from '../publish/github';
import { TRANSLATION_LANGUAGES, type LangCode } from './languages';
import {
  buildAlternates, buildHreflangBlock, upsertHreflangBlock,
  translatedPostRepoPath, translatedPostUrl, langIndexRepoPath, langIndexUrl,
} from './hreflang';
import { patchEnglishIndex, renderLangIndex, indexAlternates, type IndexPost } from './lang-index';

type TRow = {
  id: string; draft_id: string; lang: LangCode; locale: string; status: string;
  h1: string | null; meta_title: string | null; meta_description: string | null; summary: string | null;
  body_markdown: string | null; faq: Array<{ q: string; a: string }> | null; word_count: number | null;
  published_at: string | null; updated_at: string;
};
type DRow = {
  id: string; slug: string | null; status: string; topic_id: string | null; published_at: string | null;
  sources: Array<{ claim: string; url: string }> | null;
};

export type TPublishResult = { draft_id: string; slug?: string; ok: boolean; published?: string[]; note?: string | undefined };

const UNSETTLED = ['pending', 'translating', 'stale'];
const FORCE_AFTER_MS = 2 * 3600 * 1000;
const T_COLS = 'id, draft_id, lang, locale, status, h1, meta_title, meta_description, summary, body_markdown, faq, word_count, published_at, updated_at';

/** Drafts with approved translations that are ready to ship. */
export async function findReadyDrafts(limit: number): Promise<string[]> {
  const { data: approved } = await supabase.from('blog_post_translations')
    .select('draft_id, updated_at').eq('status', 'approved');
  const ids = [...new Set((approved ?? []).map((r) => r.draft_id as string))];
  if (!ids.length) return [];
  const { data: all } = await supabase.from('blog_post_translations')
    .select('draft_id, lang, status').in('draft_id', ids);
  const now = Date.now();
  const ready: string[] = [];
  for (const id of ids) {
    const rows = (all ?? []).filter((r) => r.draft_id === id);
    const settled = TRANSLATION_LANGUAGES.every((l) => {
      const r = rows.find((x) => x.lang === l.lang);
      return r && !UNSETTLED.includes(r.status);
    });
    const oldest = Math.min(...(approved ?? []).filter((r) => r.draft_id === id).map((r) => new Date(r.updated_at).getTime()));
    if (settled || now - oldest > FORCE_AFTER_MS) ready.push(id);
    if (ready.length >= limit) break;
  }
  return ready;
}

export async function publishReadyTranslations(limit: number): Promise<TPublishResult[]> {
  const out: TPublishResult[] = [];
  for (const id of await findReadyDrafts(limit)) {
    const r = await publishTranslationsForDraft(id);
    out.push(r);
    if (!r.ok) break; // retried next run
  }
  return out;
}

async function block(ids: string[], reason: string): Promise<void> {
  if (!ids.length) return;
  await supabase.from('blog_post_translations')
    .update({ status: 'fact_check_failed', risk_score: 1, block_reason: reason.slice(0, 1000) }).in('id', ids);
}

/** Every live translation per language (for the /<lang>/blog pages). */
async function loadIndexPosts(extra: TRow[], slug: string, englishPublishedAt: string): Promise<Map<LangCode, IndexPost[]>> {
  const { data } = await supabase.from('blog_post_translations')
    .select('lang, meta_title, h1, draft_id, blog_post_drafts!inner(slug, status, published_at)')
    .eq('status', 'published').eq('blog_post_drafts.status', 'published');
  type Row = { lang: LangCode; meta_title: string | null; h1: string | null; blog_post_drafts: { slug: string | null; published_at: string | null } };
  const rows = ((data ?? []) as unknown as Row[]).map((r) => ({
    lang: r.lang, title: r.h1 || r.meta_title || '', slug: r.blog_post_drafts.slug ?? '', at: r.blog_post_drafts.published_at ?? '',
  }));
  // extras first so a fresh title wins the de-dupe; same English date keeps the order stable
  const extras = extra.map((t) => ({ lang: t.lang, title: t.h1 || t.meta_title || '', slug, at: englishPublishedAt }));
  rows.unshift(...extras);
  const map = new Map<LangCode, IndexPost[]>();
  for (const l of TRANSLATION_LANGUAGES) {
    const seen = new Set<string>();
    const posts = rows.filter((r) => r.lang === l.lang && r.slug).sort((a, b) => b.at.localeCompare(a.at))
      .filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)))
      .map((r) => ({ slug: r.slug, title: r.title }));
    if (posts.length) map.set(l.lang, posts);
  }
  return map;
}

export async function publishTranslationsForDraft(draftId: string): Promise<TPublishResult> {
  const { data: d } = await supabase.from('blog_post_drafts')
    .select('id, slug, status, topic_id, published_at, sources').eq('id', draftId).maybeSingle<DRow>();
  const { data: tRows } = await supabase.from('blog_post_translations')
    .select(T_COLS).eq('draft_id', draftId).in('status', ['approved', 'published']);
  const rows = ((tRows ?? []) as TRow[]).sort(
    (a, b) => TRANSLATION_LANGUAGES.findIndex((l) => l.lang === a.lang) - TRANSLATION_LANGUAGES.findIndex((l) => l.lang === b.lang));
  const approved = rows.filter((r) => r.status === 'approved');
  if (!approved.length) return { draft_id: draftId, ok: true, note: 'nothing approved' };

  if (!d || d.status !== 'published' || !d.slug) {
    await block(approved.map((r) => r.id), `English draft not published (status=${d?.status ?? 'missing'})`);
    return { draft_id: draftId, ok: true, note: 'English not published; translations blocked' };
  }
  const slug = d.slug;
  const englishFile = await getFile(postRepoPath(slug));
  if (!englishFile) {
    await block(approved.map((r) => r.id), 'English page not in the site repo (redirected or removed)');
    return { draft_id: draftId, slug, ok: true, note: 'English page missing; translations blocked' };
  }

  let cluster: string | null = null;
  if (d.topic_id) {
    const { data: t } = await supabase.from('blog_topics').select('cluster').eq('id', d.topic_id).maybeSingle<{ cluster: string | null }>();
    cluster = t?.cluster ?? null;
  }
  const publishedISO = (d.published_at ? new Date(d.published_at) : new Date()).toISOString().slice(0, 10);
  const todayISO = new Date().toISOString().slice(0, 10);
  const hero = pickPostImage(slug, cluster);

  // Render every live language; contact-info guard drops a bad one from the set.
  const rendered: Array<{ row: TRow; html: string }> = [];
  const guarded: string[] = [];
  const renderOne = (row: TRow, alternates: ReturnType<typeof buildAlternates>) => renderPostHtml({
    slug, meta_title: row.meta_title ?? '', meta_description: row.meta_description ?? '', h1: row.h1 ?? '',
    summary: row.summary ?? undefined, body_markdown: row.body_markdown ?? '', faq: row.faq ?? [],
    sources: d.sources ?? undefined, publishedISO, modifiedISO: todayISO,
    wordCount: row.word_count ?? undefined, articleSection: cluster ?? undefined, image: hero,
    i18n: { lang: row.lang, locale: row.locale }, alternates,
  });
  const firstPass = buildAlternates(slug, rows.map((r) => ({ lang: r.lang, locale: r.locale })));
  const live: TRow[] = [];
  for (const row of rows) {
    const g = guardContactInfo(renderOne(row, firstPass));
    if (g.blocked) { guarded.push(row.id); continue; }
    live.push(row);
  }
  await block(guarded, 'contact-info guard blocked the rendered page');
  if (!live.some((r) => r.status === 'approved')) return { draft_id: draftId, slug, ok: true, note: 'all approved translations blocked by guard' };

  const alternates = buildAlternates(slug, live.map((r) => ({ lang: r.lang, locale: r.locale })));
  for (const row of live) {
    const g = guardContactInfo(renderOne(row, alternates));
    if (g.blocked) return { draft_id: draftId, slug, ok: false, note: `guard blocked ${row.lang} on second pass: ${g.reason}` };
    rendered.push({ row, html: g.html });
  }

  const files: RepoFile[] = rendered.map((r) => ({ path: translatedPostRepoPath(r.row.lang, slug), content: r.html }));
  const en = upsertHreflangBlock(englishFile.content, buildHreflangBlock(alternates));
  if (en.changed) files.push({ path: postRepoPath(slug), content: en.html });

  // Language index pages + English index tabs/hreflang.
  const liveApproved = live.filter((r) => r.status === 'approved');
  const indexPosts = await loadIndexPosts(live, slug, d.published_at ?? new Date().toISOString());
  const langsWithPosts = [...indexPosts.keys()];
  for (const [lang, posts] of indexPosts) {
    files.push({ path: langIndexRepoPath(lang), content: renderLangIndex(lang, langsWithPosts, posts) });
  }
  const enIndex = await getFile('blog/index.html');
  if (enIndex) {
    const tabbed = patchEnglishIndex(enIndex.content, langsWithPosts);
    const withAlt = upsertHreflangBlock(tabbed.html, buildHreflangBlock(indexAlternates(langsWithPosts)));
    if (withAlt.html !== enIndex.content) files.push({ path: 'blog/index.html', content: withAlt.html });
  }

  // Sitemap: every live translation + each language index.
  const sitemap = await getFile('sitemap.xml');
  const newUrls = liveApproved.map((r) => translatedPostUrl(r.lang, slug));
  if (sitemap) {
    let xml = sitemap.content;
    let changed = false;
    for (const r of live) {
      const s = addUrlToSitemap(xml, { loc: translatedPostUrl(r.lang, slug), lastmod: todayISO, changefreq: 'monthly', priority: '0.5' });
      xml = s.xml; changed = changed || s.changed;
    }
    for (const lang of langsWithPosts) {
      const s = addUrlToSitemap(xml, { loc: langIndexUrl(lang), lastmod: todayISO, changefreq: 'weekly', priority: '0.6' });
      xml = s.xml; changed = changed || s.changed;
    }
    if (changed) files.push({ path: 'sitemap.xml', content: xml });
  }

  try {
    const langs = liveApproved.map((r) => r.lang).join(', ');
    const { commitUrl } = await commitFiles(files, `blog: publish translations (${langs}) of ${slug}`);
    const now = new Date().toISOString();
    for (const r of liveApproved) {
      await supabase.from('blog_post_translations').update({
        status: 'published', committed_path: translatedPostRepoPath(r.lang, slug),
        live_url: translatedPostUrl(r.lang, slug), published_at: r.published_at ?? now,
      }).eq('id', r.id).eq('status', 'approved');
    }
    const indexNow = await pingIndexNow([...newUrls, ...langsWithPosts.map(langIndexUrl)]);
    await supabase.from('blog_agent_runs').insert({
      run_type: 'publish_translations', status: 'success', items_processed: liveApproved.length,
      metadata: { draft_id: draftId, slug, langs, commit_url: commitUrl, files: files.map((f) => f.path), indexnow: indexNow },
      completed_at: now,
    });
    return { draft_id: draftId, slug, ok: true, published: liveApproved.map((r) => r.lang) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from('blog_agent_runs').insert({
      run_type: 'publish_translations', status: 'failure', error_message: msg.slice(0, 500),
      metadata: { draft_id: draftId, slug }, completed_at: new Date().toISOString(),
    });
    return { draft_id: draftId, slug, ok: false, note: msg };
  }
}

