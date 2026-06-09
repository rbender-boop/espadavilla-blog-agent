/**
 * rerender-published.ts — re-render an ALREADY-PUBLISHED post and re-commit it
 * to golfvilla-com, using the exact same render modules as the live publish
 * path (single source of truth — no hand-edited HTML).
 *
 * Why this exists: the normal publish executor (commit-post.ts) is idempotent —
 * a 'published' draft is never re-committed. When the render template changes
 * (e.g. the audit fixes: <cite> stripping, BreadcrumbList, entity graph, tables,
 * /blog in sitemap), existing posts need a one-off re-render. This script does
 * exactly that for a single slug, deliberately bypassing the guard.
 *
 * The published date is preserved from published_at (never shifts); dateModified
 * comes from updated_at. Run it, review the diff on golfvilla-com, done.
 *
 *   bun run scripts/rerender-published.ts <slug>
 *   bun run scripts/rerender-published.ts corales-puntacana-championship-2026-caribbean-golf-villas
 */

import { supabase } from '../src/lib/supabase';
import { postUrl, postRepoPath, SITE_ORIGIN } from '../src/lib/links';
import { renderPostHtml } from '../src/lib/publish/render-post';
import { upsertIndexCard } from '../src/lib/publish/update-index';
import { addUrlToSitemap } from '../src/lib/publish/update-sitemap';
import { getFile, commitFiles, type RepoFile } from '../src/lib/publish/github';

const SITEMAP_PATH = 'sitemap.xml';
const INDEX_PATH = 'blog/index.html';

/** Escape a string for safe use inside a RegExp (standard MDN escape). */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: bun run scripts/rerender-published.ts <slug>');
    process.exit(1);
  }

  const { data: draft, error } = await supabase
    .from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, meta_description, h1, body_markdown, edited_content, faq, word_count, published_at, updated_at, live_url')
    .eq('slug', slug)
    .single();

  if (error || !draft) throw new Error(`draft not found for slug "${slug}": ${error?.message ?? 'no row'}`);
  if (!draft.meta_title || !draft.meta_description || !draft.h1) throw new Error('draft missing required fields');

  const url = postUrl(slug);
  const repoPath = postRepoPath(slug);
  const publishedISO = (draft.published_at ? new Date(draft.published_at) : new Date()).toISOString().slice(0, 10);
  const modifiedISO = (draft.updated_at ? new Date(draft.updated_at) : new Date()).toISOString().slice(0, 10);

  let articleSection: string | undefined;
  let keywords: string[] | undefined;
  if (draft.topic_id) {
    const { data: topic } = await supabase
      .from('blog_topics')
      .select('cluster, primary_keyword, secondary_keywords')
      .eq('id', draft.topic_id)
      .maybeSingle();
    if (topic) {
      articleSection = topic.cluster ?? undefined;
      keywords = [topic.primary_keyword ?? '', ...((topic.secondary_keywords as string[]) ?? [])].filter(Boolean);
      if (!keywords.length) keywords = undefined;
    }
  }

  const bodyMarkdown = (draft.edited_content?.trim() ? draft.edited_content : draft.body_markdown) ?? '';

  const postHtml = renderPostHtml({
    slug,
    meta_title: draft.meta_title,
    meta_description: draft.meta_description,
    h1: draft.h1,
    body_markdown: bodyMarkdown,
    faq: draft.faq ?? [],
    publishedISO,
    modifiedISO,
    wordCount: draft.word_count ?? undefined,
    articleSection,
    keywords,
  });

  const [indexFile, sitemapFile] = await Promise.all([getFile(INDEX_PATH), getFile(SITEMAP_PATH)]);
  const files: RepoFile[] = [{ path: repoPath, content: postHtml }];

  // Re-render the index card: remove an existing (possibly stale-dated) card for
  // this slug first, then re-insert with the canonical published date.
  let indexHtml = indexFile?.content ?? null;
  if (indexHtml) {
    const safeSlug = escapeRegExp(slug);
    indexHtml = indexHtml.replace(
      new RegExp(`\\s*<a class="blog-card" href="/blog/${safeSlug}"[\\s\\S]*?</a>`),
      '',
    );
  }
  const indexResult = upsertIndexCard(indexHtml, {
    slug,
    title: draft.meta_title,
    description: draft.meta_description,
    publishedISO,
  });
  if (indexResult.changed || !indexFile) files.push({ path: INDEX_PATH, content: indexResult.html });

  if (sitemapFile) {
    let xml = sitemapFile.content;
    let changed = false;
    const a = addUrlToSitemap(xml, { loc: url, lastmod: publishedISO, changefreq: 'monthly', priority: '0.6' });
    xml = a.xml; changed = changed || a.changed;
    const b = addUrlToSitemap(xml, { loc: `${SITE_ORIGIN}/blog`, lastmod: publishedISO, changefreq: 'weekly', priority: '0.7' });
    xml = b.xml; changed = changed || b.changed;
    if (changed) files.push({ path: SITEMAP_PATH, content: xml });
  }

  const { commitUrl } = await commitFiles(files, `blog: re-render "${draft.meta_title}" (${slug}) — audit fixes`);
  console.log(`Re-rendered ${files.length} file(s) for ${slug}`);
  console.log(`Commit: ${commitUrl}`);
  console.log(`Live: ${url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
