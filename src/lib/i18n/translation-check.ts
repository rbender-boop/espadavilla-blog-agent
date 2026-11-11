/**
 * Language-agnostic checks run on every translation before it can publish.
 * facts.ts regexes are English-only, so translations are checked AGAINST the
 * English source instead: the English post already passed the canonical-fact
 * gate, so a translation is safe if it carries the same numbers, names, links
 * and structure. Any failure → status 'fact_check_failed', never published.
 */

/** Proper nouns that must appear verbatim in the translation whenever the
 *  English source contains them. */
export const PROTECTED_TERMS = [
  'Villa Espada', 'Punta Espada', 'Las Iguanas', 'Cap Cana', 'Eden Roc',
  'Juanillo', 'Fairway 5', 'Jack Nicklaus', 'GolfWeek', 'Golf Digest',
  'Caleton', 'Casa de Campo', 'Teeth of the Dog', 'Corales', 'La Cana',
  'Scape Park', 'St. Regis', 'Sanctuary',
];

export type TranslationContent = {
  h1: string;
  meta_title: string;
  meta_description: string;
  summary: string;
  body_markdown: string;
  faq: Array<{ q: string; a: string }>;
};

export type CheckResult = { ok: boolean; problems: string[] };

/** Numbers as values: "$4,000", "4.000", "4 000", "15%" → "4000", "15". */
export function extractNumbers(text: string): string[] {
  const out: string[] = [];
  const re = /\d{1,3}(?:[.,\s\u00a0\u202f]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
  for (const m of text.match(re) ?? []) {
    // drop thousands separators (separator followed by exactly 3 digits)
    let n = m.replace(/[.,\s\u00a0\u202f](?=\d{3}(?:\D|$))/g, '');
    n = n.replace(',', '.'); // decimal comma → dot
    out.push(String(Number(n)));
  }
  return out;
}

function urls(text: string): string[] {
  return (text.match(/https?:\/\/[^\s)"'<>\]]+/g) ?? []).map((u) => u.replace(/[.,;:]+$/, ''));
}

function headings(md: string): number {
  return (md.match(/^#{2,6}\s/gm) ?? []).length;
}

function allText(c: TranslationContent): string {
  return [c.h1, c.meta_title, c.meta_description, c.summary, c.body_markdown,
    ...c.faq.flatMap((f) => [f.q, f.a])].join('\n');
}

export function checkTranslation(en: TranslationContent, tr: TranslationContent): CheckResult {
  const problems: string[] = [];
  const enText = allText(en);
  const trText = allText(tr);

  for (const k of ['h1', 'meta_title', 'meta_description', 'body_markdown'] as const) {
    if (!tr[k]?.trim()) problems.push(`missing ${k}`);
  }
  if (en.summary?.trim() && !tr.summary?.trim()) problems.push('missing summary');

  // Structure
  if (tr.faq.length !== en.faq.length) problems.push(`FAQ count ${tr.faq.length} vs English ${en.faq.length}`);
  if (headings(tr.body_markdown) !== headings(en.body_markdown)) {
    problems.push(`heading count ${headings(tr.body_markdown)} vs English ${headings(en.body_markdown)}`);
  }
  const ratio = tr.body_markdown.length / Math.max(1, en.body_markdown.length);
  if (ratio < 0.75 || ratio > 1.6) problems.push(`body length ratio ${ratio.toFixed(2)} (expected 0.75–1.6)`);

  // Numbers: every English number ≥13 (prices, capacity, years, %) must survive;
  // the translation must not introduce numbers ≥13 that English never had.
  // Small numbers are exempt because they are often written as words.
  const enNums = new Set(extractNumbers(enText).filter((n) => Number(n) >= 13));
  const trNums = new Set(extractNumbers(trText).filter((n) => Number(n) >= 13));
  const missing = [...enNums].filter((n) => !trNums.has(n));
  const added = [...trNums].filter((n) => !enNums.has(n));
  if (missing.length) problems.push(`numbers missing: ${missing.slice(0, 10).join(', ')}`);
  if (added.length) problems.push(`numbers not in English: ${added.slice(0, 10).join(', ')}`);

  // Names
  for (const term of PROTECTED_TERMS) {
    if (enText.includes(term) && !trText.includes(term)) problems.push(`name not kept verbatim: ${term}`);
  }

  // Links
  const trUrls = new Set(urls(trText));
  const lost = [...new Set(urls(enText))].filter((u) => !trUrls.has(u));
  if (lost.length) problems.push(`links missing: ${lost.slice(0, 5).join(', ')}`);

  return { ok: problems.length === 0, problems };
}
