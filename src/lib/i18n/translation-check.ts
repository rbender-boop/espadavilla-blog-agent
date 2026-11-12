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

/** Numbers as values: "$4,000", "4.000", "4 000", "15%" → "4000", "15".
 *  A separator group must not run into more digits, so "Q1 2026" stays 1 and 2026
 *  (it used to read as 1202). */
export function extractNumbers(text: string): string[] {
  const out: string[] = [];
  const re = /\d{1,3}(?:[.,\s\u00a0\u202f]\d{3}(?!\d))+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
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

// ---- Number normalization (applied to English and translation alike) ----
// Translators legitimately rewrite some numbers: "2pm" → "14:00 Uhr", "24/7" →
// "rund um die Uhr", "Eighty-three percent" → "83 %", "2008, 2009 and 2010" →
// "2008 bis 2010". Normalize both sides so these compare equal.

const AMPM = '(a\\.?\\s?m\\.?|p\\.?\\s?m\\.?)(?![a-z])';

function to24(h: number, m: string | undefined, pm: boolean): string {
  const H = (h % 12) + (pm ? 12 : 0);
  return `${H}:${m ?? '00'}`;
}

/** "2pm" → "14:00", "1:50 p.m." → "13:50", "2–6 pm" → "14:00–18:00". */
export function timesTo24h(text: string): string {
  const range = new RegExp(`\\b(\\d{1,2})(?::(\\d{2}))?\\s*(?:-|\\u2013|\\u2014|\\/|to|and|or|until)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${AMPM}`, 'gi');
  const single = new RegExp(`\\b(\\d{1,2})(?::(\\d{2}))?\\s*${AMPM}`, 'gi');
  return text
    .replace(range, (_s, h1, m1, h2, m2, ap) => {
      const pm = /p/i.test(ap);
      // "11 to 7 pm": the first time is morning
      const firstPm = pm && Number(h1) % 12 <= Number(h2) % 12;
      return `${to24(Number(h1), m1, firstPm)}\u2013${to24(Number(h2), m2, pm)}`;
    })
    .replace(single, (_s, h, m, ap) => to24(Number(h), m, /p/i.test(ap)));
}

/** "24/7", "24-hour", "24 Stunden", "24 h" → removed (often "around the clock"). */
function dropAroundTheClock(text: string): string {
  return text
    .replace(/\b24\s*h?\s*\/\s*24\b/gi, ' ')          // fr "24 h/24"
    .replace(/\b7\s*(?:j|d|días|dias|tage)?\s*\/\s*7\b/gi, ' ') // "7 j/7", "7/7"
    .replace(/\b24\s*(?:\/\s*7|-?\s*(?:hours?|hrs?|horas?|heures?|stunden|std\.?|h)\b)/gi, ' ');
}

const UNITS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const TEENS: Record<string, number> = { thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** English number words 13–99 → digits ("Eighty-three" → "83"). */
export function englishWordsToDigits(text: string): string {
  return text
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s](one|two|three|four|five|six|seven|eight|nine))?\b/gi,
      (_s, t, u) => String((TENS[t.toLowerCase()] ?? 0) + (u ? (UNITS[u.toLowerCase()] ?? 0) : 0)))
    .replace(/\b(thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/gi, (s) => String(TEENS[s.toLowerCase()] ?? s));
}

/** "2008 bis 2010" / "2008–2010" → adds the years in between (span ≤ 20). */
function expandYearRanges(text: string): string {
  const re = /\b((?:19|20)\d{2})\s*(?:-|\u2013|\u2014|to|through|bis|a|à|al|até|hasta|y|e|et|und|and)\s*((?:19|20)\d{2})\b/gi;
  const extra: string[] = [];
  for (const m of text.matchAll(re)) {
    const a = Number(m[1] ?? 0), b = Number(m[2] ?? 0);
    if (b - a > 1 && b - a <= 20) for (let y = a + 1; y < b; y++) extra.push(String(y));
  }
  return extra.length ? `${text}\n${extra.join(' ')}` : text;
}

export function normalizeForNumbers(text: string, isEnglish: boolean): string {
  let t = timesTo24h(text);
  t = dropAroundTheClock(t);
  if (isEnglish) t = englishWordsToDigits(t);
  return expandYearRanges(t);
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
  // English numbers spelled out as words ("thirty days") are optional: the translation may
  // spell them out too, or use digits.
  const enNums = new Set(extractNumbers(normalizeForNumbers(enText, false)).filter((n) => Number(n) >= 13));
  const enAllowed = new Set(extractNumbers(normalizeForNumbers(enText, true)).filter((n) => Number(n) >= 13));
  const trNums = new Set(extractNumbers(normalizeForNumbers(trText, false)).filter((n) => Number(n) >= 13));
  const missing = [...enNums].filter((n) => !trNums.has(n));
  const added = [...trNums].filter((n) => !enAllowed.has(n));
  if (missing.length) problems.push(`numbers missing: ${missing.slice(0, 10).join(', ')}`);
  if (added.length) problems.push(`numbers not in English: ${added.slice(0, 10).join(', ')}`);

  // Names (German compounds hyphenate them: "Golf-Digest-Liste" keeps the name)
  const dehyphen = (s: string) => s.replace(/[-\u2010\u2011]/g, ' ');
  const trNames = dehyphen(trText);
  for (const term of PROTECTED_TERMS) {
    if (enText.includes(term) && !trNames.includes(dehyphen(term))) problems.push(`name not kept verbatim: ${term}`);
  }

  // Links
  const trUrls = new Set(urls(trText));
  const lost = [...new Set(urls(enText))].filter((u) => !trUrls.has(u));
  if (lost.length) problems.push(`links missing: ${lost.slice(0, 5).join(', ')}`);

  return { ok: problems.length === 0, problems };
}
