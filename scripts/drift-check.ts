/**
 * drift-check.ts - READ-ONLY. Renders every published post from Supabase the way rerender-published.ts
 * would, then compares the article TEXT against the committed HTML in the local site checkout. Reports posts
 * whose live copy carries hand patches never written back to edited_content (HANDOVER-197/198 failure mode),
 * so a re-render would silently revert them. Exit 2 if any drift.
 *   bun run scripts/drift-check.ts [--verbose]      LOCAL_SITE_ROOT=<path> overrides the local checkout.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { supabase } from '../src/lib/supabase';
import { renderPostHtml } from '../src/lib/publish/render-post';
import { pickPostImage } from '../src/lib/publish/blog-images';
import { postRepoPath } from '../src/lib/links';
import { articleText, firstDivergence } from '../src/lib/publish/article-text';

const LOCAL_ROOT = process.env.LOCAL_SITE_ROOT
  ?? 'C:\\Users\\rbend\\Desktop\\Claude Projects\\GOLFVILLA-WEBSITE\\VILLA-ESPADA-PACKAGE\\WEBSITE';
const VERBOSE = process.argv.includes('--verbose');

async function main() {
  const { data: drafts, error } = await supabase.from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, meta_description, h1, summary, body_markdown, edited_content, faq, sources, word_count, published_at')
    .eq('status', 'published').order('published_at', { ascending: true });
  if (error) throw error;
  const ids = [...new Set((drafts ?? []).map((d) => d.topic_id).filter(Boolean))] as string[];
  const { data: topics } = ids.length
    ? await supabase.from('blog_topics').select('id, cluster, primary_keyword, secondary_keywords').in('id', ids)
    : { data: [] as any[] };
  const topicById = new Map((topics ?? []).map((t: any) => [t.id, t]));
  let same = 0; const drifted: string[] = []; const missing: string[] = []; let usingEdited = 0;
  for (const d of drafts ?? []) {
    const local = join(LOCAL_ROOT, postRepoPath(d.slug).replace(/\//g, '\\'));
    if (!existsSync(local)) { missing.push(d.slug); continue; }
    const t: any = d.topic_id ? topicById.get(d.topic_id) : undefined;
    let kw: string[] | undefined = t ? [t.primary_keyword ?? '', ...((t.secondary_keywords as string[]) ?? [])].filter(Boolean) : undefined;
    if (kw && !kw.length) kw = undefined;
    const md = (d.edited_content?.trim() ? d.edited_content : d.body_markdown) ?? '';
    if (d.edited_content?.trim()) usingEdited++;
    const iso = (d.published_at ? new Date(d.published_at) : new Date()).toISOString().slice(0, 10);
    const rendered = renderPostHtml({ slug: d.slug, meta_title: d.meta_title, meta_description: d.meta_description, h1: d.h1,
      summary: d.summary ?? undefined, body_markdown: md, faq: d.faq ?? [], sources: d.sources ?? undefined, publishedISO: iso, modifiedISO: iso,
      wordCount: d.word_count ?? undefined, articleSection: t?.cluster ?? undefined, keywords: kw, image: pickPostImage(d.slug, t?.cluster ?? null) });
    const a = articleText(rendered); const b = articleText(readFileSync(local, 'utf8'));
    if (a === b) { same++; continue; }
    drifted.push(d.slug);
    if (VERBOSE) console.log(`\nDRIFT ${d.slug}\n${firstDivergence(a, b)}`);
  }
  console.log(`\npublished posts: ${(drafts ?? []).length}   in sync: ${same}   DRIFTED: ${drifted.length}   no local file: ${missing.length}   using edited_content: ${usingEdited}`);
  if (drifted.length) { console.log('drifted (a re-render would change the live article text):'); drifted.forEach((s) => console.log('  ' + s)); }
  if (missing.length) { console.log('no local file:'); missing.forEach((s) => console.log('  ' + s)); }
  process.exit(drifted.length ? 2 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });