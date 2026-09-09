/**
 * _diffshow.ts (TEMP) — print sentence-level differences between the DB-rendered article text
 * and the committed live HTML, so residual hunks can be hand-patched.
 *   bun run scripts/_diffshow.ts --slug=<slug>
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { supabase } from '../src/lib/supabase';
import { renderPostHtml } from '../src/lib/publish/render-post';
import { pickPostImage } from '../src/lib/publish/blog-images';
import { postRepoPath } from '../src/lib/links';
import { articleText } from '../src/lib/publish/article-text';

const LOCAL_ROOT = process.env.LOCAL_SITE_ROOT
  ?? 'C:\\Users\\rbend\\Desktop\\Claude Projects\\GOLFVILLA-WEBSITE\\VILLA-ESPADA-PACKAGE\\WEBSITE';
const ONLY = process.argv.find((a) => a.startsWith('--slug='))?.slice(7);
if (!ONLY) { console.error('need --slug='); process.exit(1); }

const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

async function main() {
  const { data: drafts, error } = await supabase.from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, meta_description, h1, summary, body_markdown, edited_content, faq, sources, word_count, published_at')
    .eq('status', 'published').eq('slug', ONLY);
  if (error) throw error;
  const d: any = (drafts ?? [])[0];
  if (!d) { console.error('no published draft'); process.exit(1); }
  const { data: topics } = d.topic_id
    ? await supabase.from('blog_topics').select('id, cluster, primary_keyword, secondary_keywords').eq('id', d.topic_id)
    : { data: [] as any[] };
  const t: any = (topics ?? [])[0];
  let kw: string[] | undefined = t ? [t.primary_keyword ?? '', ...((t.secondary_keywords as string[]) ?? [])].filter(Boolean) : undefined;
  if (kw && !kw.length) kw = undefined;
  const iso = (d.published_at ? new Date(d.published_at) : new Date()).toISOString().slice(0, 10);
  const md: string = (d.edited_content?.trim() ? d.edited_content : d.body_markdown) ?? '';
  const faq: any[] = d.faq ?? [];
  const html = renderPostHtml({ slug: d.slug, meta_title: d.meta_title, meta_description: d.meta_description, h1: d.h1,
    summary: d.summary ?? undefined, body_markdown: md, faq, sources: d.sources ?? undefined, publishedISO: iso, modifiedISO: iso,
    wordCount: d.word_count ?? undefined, articleSection: t?.cluster ?? undefined, keywords: kw, image: pickPostImage(d.slug, t?.cluster ?? null) });

  const local = join(LOCAL_ROOT, postRepoPath(d.slug).replace(/\//g, '\\'));
  if (!existsSync(local)) { console.error('no local file ' + local); process.exit(1); }
  const A = sentences(articleText(html));
  const B = sentences(articleText(readFileSync(local, 'utf8')));
  const setB = new Set(B), setA = new Set(A);
  console.log(`source uses: ${d.edited_content?.trim() ? 'edited_content' : 'body_markdown'}   id=${d.id}`);
  console.log(`DB sentences ${A.length} / live sentences ${B.length}\n`);
  let n = 0;
  A.forEach((s, i) => { if (!setB.has(s)) { console.log(`DB   [${i}] ${s}`); n++; } });
  console.log('');
  B.forEach((s, i) => { if (!setA.has(s)) { console.log(`LIVE [${i}] ${s}`); n++; } });
  console.log(`\ndiffering sentences: ${n}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
