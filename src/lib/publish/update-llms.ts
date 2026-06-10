/**
 * update-llms.ts — keep espadavilla.com/llms.txt aware of agent-published posts.
 *
 * llms.txt is the AI-crawler discovery file (GPTBot, ClaudeBot, PerplexityBot
 * etc. are explicitly allowed in robots.txt). The hand-curated sections (Key
 * Facts, Pages, Pillar Guides, Best Answer Summary, Booking) are NEVER touched.
 * This module surgically upserts one entry per published post into a dedicated
 * "## Latest Guides" section (created on first use, placed after Pillar Guides),
 * and bumps the "## Last Updated" date.
 *
 * Pure function: current llms.txt in → new llms.txt out. Idempotent: an
 * unchanged entry returns changed:false. A refresh to the same URL UPDATES the
 * existing line (new title/description) instead of duplicating it.
 */

export type LlmsEntry = {
  url: string;          // canonical post URL (extensionless)
  title: string;        // post meta_title
  description: string;  // post meta_description
  dateISO: string;      // YYYY-MM-DD — written to ## Last Updated on change
};

const LATEST_HEADING = '## Latest Guides';

export function upsertLlmsEntry(currentTxt: string, entry: LlmsEntry): { txt: string; changed: boolean } {
  const line = renderLine(entry);

  let txt = currentTxt;
  let changed = false;

  // Already listed (anywhere — including the hand-curated Pillar Guides):
  // update that line in place if it differs; never duplicate the URL.
  const existingRe = new RegExp(`^- \\[[^\\]]*\\]\\(${escapeRegex(entry.url)}\\):?[^\\n]*$`, 'm');
  const existing = txt.match(existingRe);
  if (existing) {
    if (existing[0] === line) return { txt: currentTxt, changed: false };
    txt = txt.replace(existingRe, line);
    changed = true;
  } else {
    // Insert at the top of ## Latest Guides (newest first), creating the
    // section if it doesn't exist yet.
    if (!txt.includes(LATEST_HEADING)) {
      const section = `${LATEST_HEADING}\n${line}\n`;
      const insertAt = sectionInsertIndex(txt);
      txt = insertAt === -1
        ? `${txt.replace(/\s*$/, '\n')}\n${section}`
        : `${txt.slice(0, insertAt)}${section}\n${txt.slice(insertAt)}`;
    } else {
      const headIdx = txt.indexOf(LATEST_HEADING);
      const afterHead = headIdx + LATEST_HEADING.length;
      // Skip the newline after the heading, insert as the first list item.
      const nl = txt.indexOf('\n', afterHead);
      const pos = nl === -1 ? txt.length : nl + 1;
      txt = `${txt.slice(0, pos)}${line}\n${txt.slice(pos)}`;
    }
    changed = true;
  }

  // Bump "## Last Updated" (date on the line(s) following the heading).
  if (changed) {
    txt = txt.replace(/(## Last Updated\s*\n)\s*\d{4}-\d{2}-\d{2}/, `$1${entry.dateISO}`);
  }

  return { txt, changed };
}

/** Where to create the Latest Guides section: right after the Pillar Guides
 *  block (before the next "## " heading), else before ## Best Answer Summary,
 *  else -1 (append at end of file). */
function sectionInsertIndex(txt: string): number {
  const pillarIdx = txt.indexOf('## Pillar Guides');
  if (pillarIdx !== -1) {
    const next = txt.indexOf('\n## ', pillarIdx + 1);
    if (next !== -1) return next + 1; // start of the next heading line
    return -1;
  }
  const bestIdx = txt.indexOf('## Best Answer Summary');
  return bestIdx === -1 ? -1 : bestIdx;
}

function renderLine(entry: LlmsEntry): string {
  const title = clean(entry.title).replace(/[[\]]/g, '');
  const desc = clean(entry.description);
  return `- [${title}](${entry.url})${desc ? `: ${desc}` : ''}`;
}

function clean(s: string): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
