/** Reduce a rendered post's HTML to comparable article text (drift detection). Pure. */
export function articleText(html: string): string {
  let h = html.replace(/\r\n/g, '\n');
  for (const name of ['VE-POPULAR-TAGS', 'VE-RELATED-STORIES', 'VE-NEWSLETTER'])
    h = h.replace(new RegExp(`<!-- ${name} START -->[\\s\\S]*?<!-- ${name} END -->`, 'g'), '');
  const m = h.match(/<main[\s\S]*?<\/main>/i); h = m ? m[0] : h;
  h = h.replace(/<div class="post-cta">[\s\S]*?<\/div>/g, '').replace(/<nav class="post-toc"[\s\S]*?<\/nav>/g, '');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  h = h.replace(/<[^>]+>/g, ' ');
  h = h.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"');
  return h.replace(/\s+/g, ' ').trim();
}
/** First point of divergence, for log output. */
export function firstDivergence(a: string, b: string): string {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const s = Math.max(0, i - 60);
  return `  DB   ...${a.slice(s, i + 120)}\n  LIVE ...${b.slice(s, i + 120)}`;
}