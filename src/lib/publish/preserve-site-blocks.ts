/**
 * preserve-site-blocks.ts — carry site-side injected blocks forward across a re-render.
 *
 * The site build script (GOLFVILLA-WEBSITE\_ve_blog_build.py) injects two blocks into each
 * published post AFTER the agent commits it:
 *   <!-- VE-POPULAR-TAGS START --> ... <!-- VE-POPULAR-TAGS END -->
 *   <!-- VE-RELATED-STORIES START --> ... <!-- VE-RELATED-STORIES END -->
 * The render template does not produce them, so a bare re-render silently strips them
 * (HANDOVER-198, 2026-09-09). This helper lifts the blocks out of the previously committed
 * HTML and re-inserts them into the freshly rendered HTML at the same anchor the site script
 * uses (the dark "Explore" section, else the footer). Pure function, no I/O.
 */
const BLOCKS = ['VE-POPULAR-TAGS', 'VE-RELATED-STORIES', 'VE-NEWSLETTER'] as const;
const EXPLORE_ANCHOR = '<section style="background:#0a1628;padding:48px 0;">';
const FOOTER_ANCHOR = '<footer class="site-footer">';

function extract(html: string, name: string): string | null {
  const start = `<!-- ${name} START -->`;
  const end = `<!-- ${name} END -->`;
  const i = html.indexOf(start);
  if (i < 0) return null;
  const j = html.indexOf(end, i);
  if (j < 0) return null;
  return html.slice(i, j + end.length);
}

export function preserveSiteBlocks(previousHtml: string | null | undefined, freshHtml: string): { html: string; carried: string[] } {
  if (!previousHtml) return { html: freshHtml, carried: [] };
  let html = freshHtml;
  const carried: string[] = [];
  let bundle = '';
  for (const name of BLOCKS) {
    if (html.includes(`<!-- ${name} START -->`)) continue; // template already emits it
    const block = extract(previousHtml, name);
    if (!block) continue;
    bundle += '\n' + block + '\n';
    carried.push(name);
  }
  if (!bundle) return { html, carried };
  if (html.split(EXPLORE_ANCHOR).length === 2) {
    html = html.replace(EXPLORE_ANCHOR, bundle + EXPLORE_ANCHOR);
  } else if (html.includes(FOOTER_ANCHOR)) {
    html = html.replace(FOOTER_ANCHOR, bundle + FOOTER_ANCHOR);
  } else {
    throw new Error('preserveSiteBlocks: no insertion anchor found in rendered HTML');
  }
  return { html, carried };
}