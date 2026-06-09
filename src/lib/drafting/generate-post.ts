/**
 * Blog drafter — single Claude call, web_search enabled, JSON output contract.
 *
 * Picks the next queued topic (lowest priority), drafts a full SEO post in the
 * golfvilla.com voice grounded in CANONICAL-FACTS + live web_search, enforces
 * SEO length limits, runs the villa-fact + negative-list guards, and persists a
 * 'pending' draft to blog_post_drafts. Mirrors the LinkedIn drafter's retry-on-
 * malformed-JSON discipline and anti-fabrication backstop.
 *
 * Model pinned to claude-sonnet-4-5-20250929 (no version drift).
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase';
import { buildFactsPromptBlock, checkVillaFacts } from '../facts';
import { buildKeywordPromptBlock, checkNegativeList } from '../keywords';
import { buildVoicePromptBlock } from '../niche';
import { getBlogMemoryPromptBlock } from '../voice-memory';
import { resolveMoneyLinks } from '../links';

export const MODEL = 'claude-sonnet-4-5-20250929';
export const MAX_TITLE = 60;
export const MAX_DESC = 155;
export const MIN_WORDS = 1200;
export const MAX_WORDS = 1800;

let _anthropic: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

/* ============================================================
 * TYPES
 * ============================================================ */

export type TopicRow = {
  id: string;
  title: string;
  cluster: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  geo_questions: string[];
  target_internal_links: string[];
  notes: string | null;
  refreshes_draft_id: string | null; // Phase 4: set when this is a content-refresh topic
};

export type GeneratedPost = {
  meta_title: string;
  meta_description: string;
  slug: string;
  h1: string;
  summary: string;
  body_markdown: string;
  faq: Array<{ q: string; a: string }>;
  social_captions: string[];
  hashtags: string[];
  internal_links: Array<{ anchor: string; url: string }>;
  sources: Array<{ claim: string; url: string }>;
  rationale: string;
};

export type SavedDraft = {
  draft_id: string;
  topic_id: string;
  slug: string;
  meta_title: string;
  word_count: number;
  flagged: boolean;
  block_reason: string | null;
  notes: string[];
};

/* ============================================================
 * MAIN
 * ============================================================ */

export async function generatePostForNextTopic(): Promise<SavedDraft | null> {
  const topic = await pickNextTopic();
  if (!topic) {
    console.warn('[generate-post] no queued topics available');
    return null;
  }
  return generatePostForTopic(topic);
}

export async function generatePostForTopic(topic: TopicRow): Promise<SavedDraft> {
  const moneyLinks = resolveMoneyLinks(topic.target_internal_links ?? []);
  const memoryBlock = await getBlogMemoryPromptBlock('post');
  const systemPrompt = buildSystemPrompt(memoryBlock);
  const userPrompt = buildUserPrompt(topic, moneyLinks);

  // Mark topic as drafting (best-effort; don't block on it).
  await supabase.from('blog_topics').update({ status: 'drafting', updated_at: new Date().toISOString() }).eq('id', topic.id);

  const { post, notes } = await draftWithEnforcement(systemPrompt, userPrompt);

  // Anti-fabrication backstops.
  const factVerdict = checkVillaFacts(`${post.h1}\n${post.body_markdown}\n${post.faq.map((f) => `${f.q} ${f.a}`).join('\n')}`);
  const negVerdict = checkNegativeList({
    meta_title: post.meta_title,
    slug: post.slug,
    h1: post.h1,
    body: post.body_markdown,
    keywords: [topic.primary_keyword ?? '', ...(topic.secondary_keywords ?? [])],
  });
  const flagged = factVerdict.flagged || negVerdict.flagged;
  const blockReason = [factVerdict.reason, negVerdict.reason].filter(Boolean).join(' | ') || null;
  if (flagged) console.warn(`[generate-post] GUARD flagged draft: ${blockReason}`);

  const { draft_id, word_count } = await insertPendingDraft({ topicId: topic.id, post, flagged, blockReason });

  return {
    draft_id,
    topic_id: topic.id,
    slug: post.slug,
    meta_title: post.meta_title,
    word_count,
    flagged,
    block_reason: blockReason,
    notes,
  };
}

/**
 * Insert a 'pending' blog_post_drafts row. Shared by the synchronous drafter
 * (above) and the durable pipeline's persist step. Pass an explicit draftId to
 * make the insert idempotent across worker retries (the caller pre-allocates a
 * uuid, so a re-run hits the primary key instead of creating a second draft).
 */
export async function insertPendingDraft(params: {
  topicId: string;
  post: GeneratedPost;
  flagged: boolean;
  blockReason: string | null;
  draftId?: string;
}): Promise<{ draft_id: string; word_count: number }> {
  const { topicId, post, flagged, blockReason, draftId } = params;
  const word_count = countWords(post.body_markdown);
  const row: Record<string, unknown> = {
    topic_id: topicId,
    status: 'pending',
    meta_title: post.meta_title,
    meta_description: post.meta_description,
    slug: post.slug,
    h1: post.h1,
    summary: post.summary,
    body_markdown: post.body_markdown,
    faq: post.faq,
    social_captions: post.social_captions,
    hashtags: post.hashtags,
    word_count,
    internal_links: post.internal_links,
    sources: post.sources,
    risk_score: flagged ? 1.0 : null,
    block_reason: blockReason,
  };
  if (draftId) row.id = draftId;

  const { data: inserted, error } = await supabase
    .from('blog_post_drafts')
    .insert(row)
    .select('id')
    .single();
  if (error || !inserted) throw new Error(`Draft insert failed: ${error?.message ?? 'no row'}`);
  return { draft_id: inserted.id, word_count };
}

/* ============================================================
 * DRAFT + ENFORCE (length limits, one corrective retry)
 * ============================================================ */

async function draftWithEnforcement(
  systemPrompt: string,
  userPrompt: string,
): Promise<{ post: GeneratedPost; notes: string[] }> {
  const notes: string[] = [];
  let post = await callDrafter(systemPrompt, userPrompt);

  const problems = lengthProblems(post);
  if (problems.length > 0) {
    notes.push(`length retry: ${problems.join('; ')}`);
    const corrective = `${userPrompt}\n\n# CORRECTION REQUIRED\nYour previous draft violated these limits: ${problems.join('; ')}. Return the SAME post, corrected: meta_title <= ${MAX_TITLE} chars, meta_description <= ${MAX_DESC} chars, body_markdown ${MIN_WORDS}-${MAX_WORDS} words. Return ONLY the JSON object.`;
    try {
      const retry = await callDrafter(systemPrompt, corrective);
      const retryProblems = lengthProblems(retry);
      if (retryProblems.length < problems.length || retryProblems.length === 0) {
        post = retry;
        notes.push(retryProblems.length === 0 ? 'length fixed on retry' : `length improved on retry (remaining: ${retryProblems.join('; ')})`);
      } else {
        notes.push('retry did not improve length; kept original (saved pending for review)');
      }
    } catch (e) {
      notes.push(`length retry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Hard-trim the metadata as a final safety net so we never persist an
  // over-limit meta_title/description even if the model won't comply.
  if (post.meta_title.length > MAX_TITLE) {
    post.meta_title = post.meta_title.slice(0, MAX_TITLE).trim();
    notes.push('meta_title hard-trimmed to 60 chars');
  }
  if (post.meta_description.length > MAX_DESC) {
    post.meta_description = post.meta_description.slice(0, MAX_DESC).trim();
    notes.push('meta_description hard-trimmed to 155 chars');
  }
  return { post, notes };
}

export function lengthProblems(post: GeneratedPost): string[] {
  const out: string[] = [];
  if (post.meta_title.length > MAX_TITLE) out.push(`meta_title ${post.meta_title.length}>${MAX_TITLE}`);
  if (post.meta_description.length > MAX_DESC) out.push(`meta_description ${post.meta_description.length}>${MAX_DESC}`);
  const wc = countWords(post.body_markdown);
  if (wc < MIN_WORDS) out.push(`word_count ${wc}<${MIN_WORDS}`);
  if (wc > MAX_WORDS) out.push(`word_count ${wc}>${MAX_WORDS}`);
  return out;
}

/* ============================================================
 * CLAUDE CALL (web_search enabled, retry on malformed JSON)
 * ============================================================ */

// Output via FORCED TOOL USE rather than parsing JSON from free text. The
// Anthropic API guarantees a tool call's `input` is valid JSON — so a 1,200+
// word markdown body with newlines is encoded correctly instead of breaking
// JSON.parse (the failure mode of the text-parsing approach). The model runs
// web_search first, then calls emit_post exactly once.
export const POST_TOOL = {
  name: 'emit_post',
  description: 'Return the finished blog post and full SEO bundle. Call this exactly once, AFTER running any web_search you need.',
  input_schema: {
    type: 'object',
    properties: {
      meta_title: { type: 'string', description: '<= 60 chars, includes the primary keyword' },
      meta_description: { type: 'string', description: '<= 155 chars' },
      slug: { type: 'string', description: 'kebab-case, extensionless, no slashes' },
      h1: { type: 'string', description: 'includes the primary keyword' },
      summary: { type: 'string', description: 'ANSWER-FIRST: 2–3 plain sentences (~40–60 words) that directly answer the post\u2019s core question up front, so an AI engine or skimming reader gets the answer immediately. No marketing fluff, no markdown, no links, no <cite> tags.' },
      body_markdown: { type: 'string', description: '1,200–1,800 words; ## H2 sections; [anchor](url) links. PLAIN markdown only — do NOT include <cite> tags or any citation markup; record external facts in "sources" instead.' },
      faq: {
        type: 'array',
        items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'] },
        description: '4–8 Q&A; answer >=2 assigned GEO questions verbatim',
      },
      social_captions: { type: 'array', items: { type: 'string' }, description: 'exactly 5' },
      hashtags: { type: 'array', items: { type: 'string' }, description: 'without the # symbol' },
      internal_links: {
        type: 'array',
        items: { type: 'object', properties: { anchor: { type: 'string' }, url: { type: 'string' } }, required: ['anchor', 'url'] },
      },
      sources: {
        type: 'array',
        items: { type: 'object', properties: { claim: { type: 'string' }, url: { type: 'string' } }, required: ['url'] },
        description: 'every timely/external fact asserted, with its web_search source URL',
      },
      rationale: { type: 'string' },
    },
    required: ['meta_title', 'meta_description', 'slug', 'h1', 'summary', 'body_markdown', 'faq', 'social_captions', 'hashtags', 'internal_links', 'sources', 'rationale'],
  },
};

async function callDrafter(systemPrompt: string, userPrompt: string): Promise<GeneratedPost> {
  // Agentic loop. With web_search enabled, a long turn can return stop_reason
  // 'pause_turn' BEFORE the model reaches emit_post. We must feed the paused
  // assistant turn back and continue — NOT restart (restarting re-runs every
  // search and blows the function's time budget, which killed the first run at
  // 322s). Bounded by MAX_TURNS. max_tokens/max_uses kept modest so a single
  // turn finishes well under the route's 300s limit.
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userPrompt }];
  const MAX_TURNS = 8;
  let nudged = false;
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt,
      messages,
      tools: [
        { type: 'web_search_20250305', name: 'web_search', max_uses: 4 },
        POST_TOOL,
      ] as unknown as Anthropic.Tool[],
    });

    const emit = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_post',
    );
    if (emit) return normalizePost(emit.input as Partial<GeneratedPost>);

    // Carry the turn forward (server-tool search results are already inline).
    messages.push({ role: 'assistant', content: response.content });
    if (response.stop_reason === 'pause_turn' || response.stop_reason === 'tool_use') {
      continue;
    }
    // Ended a turn (end_turn) without emitting — nudge once, then give up.
    if (nudged) {
      console.warn(`[generate-post] no emit_post after nudge (stop_reason=${response.stop_reason})`);
      break;
    }
    messages.push({ role: 'user', content: 'Now call emit_post exactly once with the finished post.' });
    nudged = true;
  }
  throw new Error('Drafter did not emit a post via emit_post');
}

export function normalizePost(p: Partial<GeneratedPost>): GeneratedPost {
  return {
    meta_title: String(p.meta_title ?? '').trim(),
    meta_description: String(p.meta_description ?? '').trim(),
    slug: slugify(String(p.slug ?? p.h1 ?? p.meta_title ?? 'untitled')),
    h1: String(p.h1 ?? p.meta_title ?? '').trim(),
    summary: stripCitations(String(p.summary ?? '')),
    body_markdown: stripCitations(String(p.body_markdown ?? '')),
    faq: Array.isArray(p.faq) ? p.faq.filter((f) => f && f.q && f.a).map((f) => ({ q: stripCitations(String(f.q)), a: stripCitations(String(f.a)) })) : [],
    social_captions: Array.isArray(p.social_captions) ? p.social_captions.map(String) : [],
    hashtags: Array.isArray(p.hashtags) ? p.hashtags.map((h) => String(h).replace(/^#/, '')) : [],
    internal_links: Array.isArray(p.internal_links) ? p.internal_links.filter((l) => l && l.anchor && l.url).map((l) => ({ anchor: String(l.anchor), url: String(l.url) })) : [],
    sources: Array.isArray(p.sources) ? p.sources.filter((s) => s && s.url).map((s) => ({ claim: String(s.claim ?? ''), url: String(s.url) })) : [],
    rationale: String(p.rationale ?? '').trim(),
  };
}

/* ============================================================
 * PROMPTS
 * ============================================================ */

function buildSystemPrompt(memoryBlock: string): string {
  return [
    buildVoicePromptBlock(memoryBlock),
    '',
    buildFactsPromptBlock(),
    '',
    '# STRUCTURE',
    '- Provide a `summary`: 2–3 plain sentences (~40–60 words) that directly answer the post\u2019s core question FIRST, before any hook. This is for AI answer engines and skimmers — lead with the answer, not a wind-up.',
    '- Open the body with a hook (1–2 sentences) that earns the read — a number, a stance, or a planner-useful observation.',
    '- 4–7 H2 sections building a coherent, practical narrative. Use markdown (## H2). Generous white space.',
    '- A clear FAQ of 4–8 Q&A (these become a single FAQPage schema block — answer >=2 of the assigned GEO questions verbatim).',
    '- Weave the provided internal links naturally where relevant, using the EXACT urls given (do not invent URLs).',
    '- Close with a calm, concrete next step linking a money page.',
    '',
    '# OUTPUT CONTRACT (HARD)',
    'First run web_search for any timely facts you need. Then return the post by calling the `emit_post` tool EXACTLY ONCE with all required fields filled. Do NOT write the post as plain text or JSON in your message — the only way to deliver it is the emit_post tool call. body_markdown should contain real markdown (## H2 headings, [anchor](url) links, blank lines between paragraphs); put it in the tool field as normal text — do not escape it yourself. Do NOT put <cite> tags or any citation markup in body_markdown or the FAQ — every external/timely fact goes in the "sources" array with its URL, never inline.',
    '',
    '# GROUNDING (HARD)',
    '- Villa facts: ONLY from the VILLA FACTS block above. Never invent or round a villa figure.',
    '- NEVER invent a nightly rate or per-person price. The ONLY nightly rates you may state — including in any "cost per person", "per night", or "villa math" example — are the canonical ones ($2,500 low / $4,000 peak / $7,500–$8,500 holiday). To show per-person cost, divide a CANONICAL rate by the group size; do NOT make up a number like $3,500.',
    '- Timely/external facts (tournament dates, tourism stats, rankings as of a date, weather, sargassum): you MUST run web_search and put each asserted fact in "sources" with its URL. Do NOT assert a date or statistic from memory.',
    '- If web_search cannot confirm a timely fact, write around it rather than guessing.',
    '- Schema downstream is BlogPosting + exactly one FAQPage. Do not reference VacationRental.',
  ].join('\n');
}

function buildUserPrompt(topic: TopicRow, moneyLinks: Array<{ label: string; url: string }>): string {
  const links = moneyLinks.map((l) => `  - ${l.label}: ${l.url}`).join('\n');
  return [
    `Write one SEO blog post for espadavilla.com (Villa Espada).`,
    '',
    `# TOPIC`,
    `Working title: ${topic.title}`,
    `Cluster: ${topic.cluster ?? 'general'}`,
    topic.notes ? `Editor notes: ${topic.notes}` : '',
    '',
    buildKeywordPromptBlock({
      primary_keyword: topic.primary_keyword,
      secondary_keywords: topic.secondary_keywords ?? [],
      geo_questions: topic.geo_questions ?? [],
      cluster: topic.cluster,
    }),
    '',
    '# INTERNAL LINKS TO USE (exact URLs — use where relevant, do not invent others)',
    links,
    '',
    'Run web_search now for any current facts you need (tournament dates, tourism figures, rankings, course status), then call emit_post with the finished post.',
  ].filter(Boolean).join('\n');
}

/* ============================================================
 * HELPERS
 * ============================================================ */

export async function pickNextTopic(): Promise<TopicRow | null> {
  const { data, error } = await supabase
    .from('blog_topics')
    .select('id, title, cluster, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes, refreshes_draft_id')
    .eq('status', 'queued')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[generate-post] pickNextTopic failed:', error.message);
    return null;
  }
  return (data as TopicRow) ?? null;
}

export function countWords(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

// Strip any web_search citation markup the drafter may have written into the
// body/FAQ (e.g. <cite index="7-1,7-2">…</cite>). Left in, it would render as
// literal "<cite …>" on the published page. Citations belong in `sources`.
// (Audit fix #1 — applied at the source, with a second pass in render-post.)
export function stripCitations(s: string): string {
  return String(s ?? '')
    .replace(/<\/?cite\b[^>]*>/gi, '')
    .replace(/&lt;\/?cite\b[^&]*&gt;/gi, '')
    .trim();
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
