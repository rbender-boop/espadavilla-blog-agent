/**
 * translate.ts — turns a PUBLISHED English post into es / fr / de / pt versions
 * (Rob, 2026-11-11: auto-publish, no per-translation review).
 *
 * Flow per (draft, lang):
 *   row → 'translating' → model call → checkTranslation()
 *     pass → 'approved'           (the translation publisher picks it up)
 *     fail → 'fact_check_failed'  (never published; shows in v_translation_status)
 *     error→ 'failed'             (retried after 24h)
 * English edits flip translations to 'stale' (DB trigger), which re-queues them.
 */

import { createHash } from 'node:crypto';
import type Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase';
import { getAnthropic, MODEL } from '../drafting/generate-post';
import { buildFactsPromptBlock } from '../facts';
import { TRANSLATION_LANGUAGES, getLanguage, type LangCode } from './languages';
import { checkTranslation, PROTECTED_TERMS, type TranslationContent } from './translation-check';

type EnglishRow = {
  id: string; slug: string | null; status: string;
  h1: string | null; meta_title: string | null; meta_description: string | null;
  summary: string | null; body_markdown: string | null; edited_content: string | null;
  faq: Array<{ q: string; a: string }> | null; updated_at: string;
};

export type TranslateResult = { draft_id: string; lang: LangCode; status: string; note?: string | undefined };

const RETRY_FAILED_AFTER_MS = 24 * 3600 * 1000;

/** Who the posts are for — the only line that differs between the two repos. */
const SITE_DESC = 'espadavilla.com, the booking site of Villa Espada, a private villa rental on the Punta Espada golf course in Cap Cana, Dominican Republic';

export function englishContent(d: EnglishRow): TranslationContent {
  return {
    h1: d.h1 ?? '',
    meta_title: d.meta_title ?? '',
    meta_description: d.meta_description ?? '',
    summary: d.summary ?? '',
    body_markdown: (d.edited_content?.trim() ? d.edited_content : d.body_markdown) ?? '',
    faq: (d.faq ?? []).filter((f) => f?.q && f?.a),
  };
}

export function contentHash(c: TranslationContent): string {
  return createHash('sha256').update(JSON.stringify(c)).digest('hex');
}

const EMIT_TOOL = {
  name: 'emit_translation',
  description: 'Return the complete translated post. Call this exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      h1: { type: 'string' },
      meta_title: { type: 'string', description: 'Max 60 characters.' },
      meta_description: { type: 'string', description: 'Max 155 characters.' },
      summary: { type: 'string' },
      body_markdown: { type: 'string' },
      faq: {
        type: 'array',
        items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
      },
    },
    required: ['h1', 'meta_title', 'meta_description', 'summary', 'body_markdown', 'faq'],
  },
};

function buildSystem(languageName: string): string {
  return [
    `You translate blog posts for ${SITE_DESC}, from English into ${languageName}.`,
    'Write it the way a native travel writer in that language would: natural, plain, not word-for-word. Use the formal register for addressing the reader.',
    'RULES:',
    '1. Translate everything: h1, meta_title (max 60 characters), meta_description (max 155 characters), summary, body, and every FAQ question and answer.',
    '2. Keep the markdown structure exactly: same headings in the same order, same lists, same tables, same number of FAQ items in the same order.',
    '3. Copy every number exactly: prices, nightly rates, guest counts, bedrooms, minutes, minimum nights, percentages, years, rankings, yardages. Keep the US dollar sign ($) and US dollar amounts as they are; format thousands the way the target language does (e.g. $4.000 or $4 000) but never change the value. Do not convert units or currencies.',
    `4. Keep these names exactly as written, never translated: ${PROTECTED_TERMS.join(', ')}.`,
    '5. Keep every link URL exactly as written. Translate only the visible link text.',
    '6. Add nothing and drop nothing. No new facts, claims, examples, or opinions. If a sentence is awkward, rephrase it, but keep its meaning.',
    '7. The facts below are the canonical villa facts. The English text already matches them; your translation must state the same facts. They are context, not text to insert.',
    '8. Output ONLY via the emit_translation tool. No preamble, no notes.',
    '',
    buildFactsPromptBlock(),
  ].join('\n');
}

async function callModel(en: TranslationContent, languageName: string): Promise<TranslationContent> {
  const stream = getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: 16000,
    system: buildSystem(languageName),
    messages: [{ role: 'user', content: `Translate this post into ${languageName}:\n\n${JSON.stringify(en, null, 2)}` }],
    tools: [EMIT_TOOL] as unknown as Anthropic.Tool[],
    tool_choice: { type: 'auto' }, // claude-opus-5-5 rejects forced tool_choice
  });
  const res = await stream.finalMessage();
  if (res.stop_reason === 'max_tokens') throw new Error('translation hit max_tokens (truncated)');
  const block = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_translation',
  );
  if (!block) throw new Error('model returned no emit_translation call');
  const i = block.input as Partial<TranslationContent>;
  return {
    h1: String(i.h1 ?? '').trim(),
    meta_title: String(i.meta_title ?? '').trim(),
    meta_description: String(i.meta_description ?? '').trim(),
    summary: String(i.summary ?? '').trim(),
    body_markdown: String(i.body_markdown ?? '').trim(),
    faq: Array.isArray(i.faq) ? i.faq.filter((f) => f?.q && f?.a).map((f) => ({ q: String(f.q), a: String(f.a) })) : [],
  };
}

const DRAFT_COLS = 'id, slug, status, h1, meta_title, meta_description, summary, body_markdown, edited_content, faq, updated_at';

export async function translateOne(draftId: string, lang: LangCode): Promise<TranslateResult> {
  const def = getLanguage(lang);
  const { data: d, error } = await supabase.from('blog_post_drafts').select(DRAFT_COLS).eq('id', draftId).single<EnglishRow>();
  if (error || !d) return { draft_id: draftId, lang, status: 'failed', note: `draft not found: ${error?.message}` };
  if (d.status !== 'published') return { draft_id: draftId, lang, status: 'skipped', note: `English status is ${d.status}` };

  const en = englishContent(d);
  const hash = contentHash(en);
  const base = { draft_id: draftId, lang, locale: def.locale, source_hash: hash, source_updated_at: d.updated_at, model: MODEL };

  const { error: claimErr } = await supabase.from('blog_post_translations')
    .upsert({ ...base, status: 'translating', block_reason: null }, { onConflict: 'draft_id,lang' });
  if (claimErr) return { draft_id: draftId, lang, status: 'failed', note: `claim failed: ${claimErr.message}` };

  try {
    const tr = await callModel(en, def.name);
    const verdict = checkTranslation(en, tr);
    const status = verdict.ok ? 'approved' : 'fact_check_failed';
    const wordCount = tr.body_markdown.split(/\s+/).filter(Boolean).length;
    await supabase.from('blog_post_translations').update({
      ...tr, status, word_count: wordCount,
      risk_score: verdict.ok ? 0 : 1,
      block_reason: verdict.ok ? null : verdict.problems.join(' | ').slice(0, 1000),
    }).eq('draft_id', draftId).eq('lang', lang);
    return { draft_id: draftId, lang, status, note: verdict.ok ? undefined : verdict.problems.join(' | ') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from('blog_post_translations').update({ status: 'failed', block_reason: msg.slice(0, 1000) })
      .eq('draft_id', draftId).eq('lang', lang);
    return { draft_id: draftId, lang, status: 'failed', note: msg };
  }
}

/** (draft, lang) pairs that need a translation: missing, pending, stale, a
 *  stuck 'translating' (>30 min), or 'failed' older than 24h. */
export async function findTranslationWork(limit: number): Promise<Array<{ draft_id: string; lang: LangCode }>> {
  const { data: drafts } = await supabase.from('blog_post_drafts')
    .select('id').eq('status', 'published').order('published_at', { ascending: false });
  const ids = (drafts ?? []).map((r) => r.id as string);
  if (!ids.length) return [];
  const { data: rows } = await supabase.from('blog_post_translations')
    .select('draft_id, lang, status, updated_at').in('draft_id', ids);
  const byKey = new Map((rows ?? []).map((r) => [`${r.draft_id}:${r.lang}`, r]));
  const now = Date.now();
  const work: Array<{ draft_id: string; lang: LangCode }> = [];
  for (const id of ids) {
    for (const { lang } of TRANSLATION_LANGUAGES) {
      const r = byKey.get(`${id}:${lang}`);
      const age = r ? now - new Date(r.updated_at).getTime() : 0;
      const due = !r || r.status === 'pending' || r.status === 'stale'
        || (r.status === 'translating' && age > 30 * 60 * 1000)
        || (r.status === 'failed' && age > RETRY_FAILED_AFTER_MS);
      if (due) work.push({ draft_id: id, lang });
      if (work.length >= limit) return work;
    }
  }
  return work;
}

export async function translatePending(limit: number): Promise<TranslateResult[]> {
  const work = await findTranslationWork(limit);
  const results: TranslateResult[] = [];
  for (const w of work) results.push(await translateOne(w.draft_id, w.lang));
  return results;
}
