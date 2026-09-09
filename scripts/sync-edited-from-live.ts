/**
 * sync-edited-from-live.ts — bring the DB source back in line with hand-patched LIVE posts.
 * For each published post whose DB-rendered article text differs from the committed HTML, compute a
 * word-level diff and replay each hunk into the markdown (or FAQ answer) -> write to edited_content
 * (body_markdown untouched). Then drift-check.ts should report the post in sync, and future re-renders
 * will no longer revert the hand patches.
 *   bun run scripts/sync-edited-from-live.ts            # dry run (report only)
 *   bun run scripts/sync-edited-from-live.ts --apply    # write edited_content + faq to Supabase
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
const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.find((a) => a.startsWith('--slug='))?.slice(7);

const tok = (s: string) => s.split(' ').filter(Boolean);

/** LCS word diff -> hunks of {del, ins, ctx} where ctx = up to 3 preceding common tokens. */
function hunks(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  const dp = new Int32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i * (m + 1) + j] = a[i] === b[j] ? dp[(i + 1) * (m + 1) + j + 1]! + 1 : Math.max(dp[(i + 1) * (m + 1) + j]!, dp[i * (m + 1) + j + 1]!);
  const out: { del: string[]; ins: string[]; ctx: string[]; after: string[] }[] = [];
  let i = 0, j = 0; const common: string[] = [];
  let cur: { del: string[]; ins: string[]; ctx: string[]; after: string[] } | null = null;
  const flush = () => { if (cur && (cur.del.length || cur.ins.length)) out.push(cur); cur = null; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      if (cur) { // hunk just ended: following common tokens (from a, until next mismatch)
        let k = i, l = j; while (k < n && l < m && a[k] === b[l] && cur.after.length < 6) { cur.after.push(a[k]!); k++; l++; }
      }
      flush(); common.push(a[i]!); i++; j++; continue;
    }
    if (!cur) cur = { del: [], ins: [], ctx: common.slice(-6), after: [] };
    if (j < m && (i >= n || dp[(i + 1) * (m + 1) + j]! < dp[i * (m + 1) + j + 1]!)) { cur.ins.push(b[j]!); j++; }
    else { cur.del.push(a[i]!); i++; }
  }
  flush(); return out;
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PAD = '[*_`\\[\\]]*';
const seq = (tokens: string[]) => tokens.map((t) => PAD + esc(t) + PAD).join('\\s+');
type Hunk = { del: string[]; ins: string[]; ctx: string[]; after: string[] };
type Edit = { start: number; end: number; text: string };

/** Plan one hunk against the ORIGINAL source, searching only at/after `from` (hunks are in document order). */
function planHunk(src: string, h: Hunk, from: number): Edit | null {
  const region = src.slice(from);
  for (const [nb, na] of [[6, 6], [4, 4], [3, 3], [2, 2], [3, 0], [0, 3], [1, 1], [0, 0]] as const) {
    const B = nb ? seq(h.ctx.slice(-nb)) : ''; const A = na ? seq(h.after.slice(0, na)) : '';
    if (!h.del.length && !B && !A) continue;
    let src_rx: string;
    if (h.del.length) src_rx = `${B ? B + '\\s+' : ''}(${seq(h.del)})${A ? '\\s+' + A : ''}`;
    else if (B && A) src_rx = `${B}(\\s+)${A}`;
    else if (B) src_rx = `${B}()`;
    else src_rx = `()${A}`;
    const ms = [...region.matchAll(new RegExp(src_rx, 'g'))];
    const wide = nb >= 2 && na >= 2;
    if (ms.length === 0 || (!wide && ms.length !== 1)) continue;
    const m = ms[0]!; const g1 = m[1] ?? '';
    const g1Offset = m[0].indexOf(g1);
    const start = from + m.index! + (g1 ? g1Offset : (B && !A ? m[0].length : 0)); const end = start + g1.length;
    if (h.del.length) {
      const lead = g1.match(/^[*_`]+/)?.[0] ?? ''; const tail = g1.match(/[*_`]+$/)?.[0] ?? '';
      return { start, end, text: lead + h.ins.join(' ') + tail };
    }
    if (B && A) return { start, end, text: ' ' + h.ins.join(' ') + ' ' };
    if (B) return { start, end, text: ' ' + h.ins.join(' ') };
    return { start, end, text: h.ins.join(' ') + ' ' };
  }
  return null;
}
function applyEdits(src: string, edits: Edit[]): string {
  const sorted = [...edits].sort((x, y) => y.start - x.start);
  let out = src; for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}
async function main() {
  const { data: drafts, error } = await supabase.from('blog_post_drafts')
    .select('id, topic_id, slug, meta_title, meta_description, h1, summary, body_markdown, edited_content, faq, sources, word_count, published_at')
    .eq('status', 'published');
  if (error) throw error;
  const ids = [...new Set((drafts ?? []).map((d) => d.topic_id).filter(Boolean))] as string[];
  const { data: topics } = ids.length ? await supabase.from('blog_topics').select('id, cluster, primary_keyword, secondary_keywords').in('id', ids) : { data: [] as any[] };
  const topicById = new Map((topics ?? []).map((t: any) => [t.id, t]));
  const render = (d: any, md: string, faq: any[]) => {
    const t: any = d.topic_id ? topicById.get(d.topic_id) : undefined;
    let kw: string[] | undefined = t ? [t.primary_keyword ?? '', ...((t.secondary_keywords as string[]) ?? [])].filter(Boolean) : undefined;
    if (kw && !kw.length) kw = undefined;
    const iso = (d.published_at ? new Date(d.published_at) : new Date()).toISOString().slice(0, 10);
    return renderPostHtml({ slug: d.slug, meta_title: d.meta_title, meta_description: d.meta_description, h1: d.h1, summary: d.summary ?? undefined,
      body_markdown: md, faq, sources: d.sources ?? undefined, publishedISO: iso, modifiedISO: iso, wordCount: d.word_count ?? undefined,
      articleSection: t?.cluster ?? undefined, keywords: kw, image: pickPostImage(d.slug, t?.cluster ?? null) });
  };
  let synced = 0, partial = 0, already = 0;
  for (const d of drafts ?? []) {
    if (ONLY && d.slug !== ONLY) continue;
    const local = join(LOCAL_ROOT, postRepoPath(d.slug).replace(/\//g, '\\'));
    if (!existsSync(local)) continue;
    const live = articleText(readFileSync(local, 'utf8'));
    let md: string = (d.edited_content?.trim() ? d.edited_content : d.body_markdown) ?? '';
    let faq: any[] = JSON.parse(JSON.stringify(d.faq ?? []));
    if (articleText(render(d, md, faq)) === live) { already++; continue; }
    const hs = hunks(tok(articleText(render(d, md, faq))), tok(live));
    const residual: string[] = [];
    const mdEdits: Edit[] = []; const faqEdits = new Map<string, Edit[]>();
    let cursor = 0; const faqCursor = new Map<string, number>();
    for (const h of hs) {
      const e = planHunk(md, h, cursor);
      if (e) { mdEdits.push(e); cursor = Math.max(e.end, e.start + 1); continue; }
      let done = false;
      faq.forEach((f, fi) => { for (const k of ['q', 'a'] as const) { if (done) return; const key = `${fi}:${k}`; const e2 = planHunk(f[k], h, faqCursor.get(key) ?? 0); if (e2) { faqEdits.set(key, [...(faqEdits.get(key) ?? []), e2]); faqCursor.set(key, Math.max(e2.end, e2.start + 1)); done = true; } } });
      if (!done) residual.push(`-[${h.del.join(' ')}] +[${h.ins.join(' ')}]`);
    }
    md = applyEdits(md, mdEdits);
    for (const [key, es] of faqEdits) { const [fiS, k] = key.split(':'); const fi = Number(fiS); faq[+fi][k as 'q' | 'a'] = applyEdits(faq[+fi][k as 'q' | 'a'], es); }
    const ok = articleText(render(d, md, faq)) === live;
    if (!ok) { const rem = hunks(tok(articleText(render(d, md, faq))), tok(live)); rem.slice(0, 3).forEach((h) => residual.push(`STILL -[${h.del.join(' ')}] +[${h.ins.join(' ')}]`)); }
    console.log(`${ok ? 'SYNC ' : 'PART '} ${d.slug}  hunks=${hs.length} residual=${residual.length}`);
    residual.slice(0, 4).forEach((r) => console.log('    ' + r.slice(0, 200)));
    if (ok) synced++; else partial++;
    if (APPLY && ok) {
      const { error: e } = await supabase.from('blog_post_drafts').update({ edited_content: md, faq, updated_at: new Date().toISOString() }).eq('id', d.id);
      if (e) throw e;
    }
  }
  console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'}: already in sync ${already}, fully synced ${synced}, partial (not written) ${partial}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
