/**
 * One-off (Rob, 2026-11-11): Cap Cana is 30,000 acres. Patch the live English
 * pages in place (no DB re-render, so hand edits survive): "6,200-acre" /
 * "6,200 acres" → 30,000, and drop the Sources <li> that quotes a third-party
 * 6,200 figure. One atomic commit. Dry run unless --commit.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getFile, commitFiles, type RepoFile } from '../src/lib/publish/github';

const SLUGS = ['staying-at-villa-espada', 'cap-cana-vs-casa-de-campo-comparison', 'cap-cana-golf-residences-villa-espada-playbook'];

(async () => {
  const files: RepoFile[] = [];
  for (const slug of SLUGS) {
    const path = `blog/${slug}.html`;
    const f = await getFile(path);
    if (!f) throw new Error(`missing ${path}`);
    let html = f.content.replace(/\s*<li>(?:(?!<\/li>)[\s\S])*?6,200(?:(?!<\/li>)[\s\S])*?<\/li>/g, (li) =>
      /post-sources|target="_blank"/.test(li) ? '' : li);
    html = html.replace(/6,200-acre/g, '30,000-acre').replace(/6,200 acres/g, '30,000 acres');
    const left = (html.match(/6,200/g) ?? []).length;
    console.log(`${slug}: ${(f.content.match(/6,200/g) ?? []).length} → ${left} occurrences of 6,200`);
    if (left) throw new Error(`${slug}: unexpected 6,200 left — not committing`);
    files.push({ path, content: html });
  }
  if (!process.argv.includes('--commit')) { console.log('dry run OK'); return; }
  const { commitUrl } = await commitFiles(files, 'blog: Cap Cana is 30,000 acres (was 6,200) on 3 posts');
  console.log('committed', commitUrl);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
