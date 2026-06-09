/**
 * Blog drafting pipeline — the durable, checkpointed alternative to the single
 * long synchronous drafter. Each step is bounded and resumable; the worker runs
 * them under a wall-clock budget and yields (checkpointing to blog_agent_jobs)
 * before any platform timeout. Research is split from writing so the variable-
 * length web_search work is isolated in its own step.
 *
 *   pick_topic → research → draft → enforce → guard → persist → notify → done
 */

import type Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase';
import {
  getAnthropic,
  MODEL,
  MAX_TITLE,
  MAX_DESC,
  MIN_WORDS,
  MAX_WORDS,
  POST_TOOL,
  normalizePost,
  lengthProblems,
  insertPendingDraft,
  pickNextTopic,
  type GeneratedPost,
  type TopicRow,
} from './generate-post';
import { buildFactsPromptBlock, checkVillaFacts } from '../facts';
import { buildKeywordPromptBlock, checkNegativeList } from '../keywords';
import { buildVoicePromptBlock } from '../niche';
import { getBlogMemoryPromptBlock } from '../voice-memory';
import { resolveMoneyLinks } from '../links';
import { analyzeIntentOverlap } from './overlap';
import type { OverlapResult } from './overlap-score';
import { sendDraftForApproval } from '../whatsapp/send-draft';
import { sendWhatsAppToOwner } from '../unipile';
import type { JobRow, JobStep } from '../jobs/job-store';

export type StepResult =
  | { kind: 'advance'; next: JobStep; state?: Record<string, unknown>; topic_id?: string; draft_id?: string; note?: string }
  | { kind: 'done'; state?: Record<string, unknown>; note?: string };

/** Steps that make an LLM call — the worker only starts one with enough budget left. */
export const HEAVY_STEPS: ReadonlySet<JobStep> = new Set(['research', 'draft', 'enforce']);

/** Canonical step order (pure — also asserted by the offline smoke test). */
export const STEP_ORDER: JobStep[] = ['pick_topic', 'research', 'draft', 'enforce', 'guard', 'persist', 'notify', 'done'];

type ResearchBrief = { facts: Array<{ claim: string; url: string; as_of?: string }>; notes?: string };

/* ============================================================
 * Deadline-aware model call
 * ============================================================ */

/**
 * One non-streaming model call, aborted before the worker's deadline so a hung
 * call can never blow the budget. maxRetries is kept low — the job-level retry
 * across ticks is the real resilience layer, not blind SDK retries.
 */
async function callModel(
  params: Anthropic.MessageCreateParamsNonStreaming,
  deadlineMs: number,
): Promise<Anthropic.Message> {
  const remaining = deadlineMs - Date.now();
  const timeout = Math.max(5_000, Math.min(remaining - 5_000, 180_000));
  const signal = AbortSignal.timeout(timeout);
  return getAnthropic().messages.create(params, { signal, maxRetries: 1 });
}

function toolInput(msg: Anthropic.Message, name: string): Record<string, unknown> | null {
  const block = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === name,
  );
  return block ? (block.input as Record<string, unknown>) : null;
}

/* ============================================================
 * Dispatcher
 * ============================================================ */

export async function runStep(job: JobRow, deadlineMs: number): Promise<StepResult> {
  switch (job.step) {
    case 'pick_topic': return pickTopicStep(job);
    case 'research':   return researchStep(job, deadlineMs);
    case 'draft':      return draftStep(job, deadlineMs);
    case 'enforce':    return enforceStep(job, deadlineMs);
    case 'guard':      return guardStep(job);
    case 'persist':    return persistStep(job);
    case 'notify':     return notifyStep(job);
    default:           return { kind: 'done' };
  }
}

/* ============================================================
 * Steps
 * ============================================================ */

async function pickTopicStep(_job: JobRow): Promise<StepResult> {
  const topic = await pickNextTopic();
  if (!topic) return { kind: 'done', state: { note: 'no queued topics', drafted: false } };

  // Intent-overlap router (advisory): decide how this post relates to what's
  // already published, attach the cluster pillar + sibling links, and carry the
  // result forward so the draft can differentiate and the guard can warn on a
  // genuine near-duplicate. Keyword/entity overlap is never penalized here.
  const overlap = await analyzeIntentOverlap({
    title: topic.title,
    cluster: topic.cluster,
    primary_keyword: topic.primary_keyword,
  });

  const hints = [...(topic.target_internal_links ?? [])];
  if (overlap.pillarHint && !hints.includes(overlap.pillarHint)) hints.push(overlap.pillarHint);
  const moneyLinks = resolveMoneyLinks(hints);
  // Append sibling blog URLs (real published pages) so this post links into its cluster.
  for (const sib of overlap.siblingLinks) {
    if (!moneyLinks.some((l) => l.url === sib.url)) moneyLinks.push({ label: sib.anchor, url: sib.url });
  }

  // Phase 4: if this is a refresh topic, load the original published draft so
  // the research and draft steps can focus on what has changed.
  let refreshContext: Record<string, unknown> | null = null;
  let forceSlug: string | undefined;
  if (topic.refreshes_draft_id) {
    const { data: orig } = await supabase
      .from('blog_post_drafts')
      .select('id, slug, h1, body_markdown, published_at')
      .eq('id', topic.refreshes_draft_id)
      .maybeSingle();
    if (orig) {
      refreshContext = {
        originalDraftId: orig.id,
        slug:            orig.slug,
        h1:              orig.h1,
        body_markdown:   orig.body_markdown,
        published_at:    orig.published_at,
      };
      forceSlug = orig.slug as string;
    }
  }

  await supabase
    .from('blog_topics')
    .update({ status: 'drafting', updated_at: new Date().toISOString() })
    .eq('id', topic.id);
  return {
    kind: 'advance',
    next: 'research',
    topic_id: topic.id,
    state: {
      topic,
      moneyLinks,
      overlap,
      ...(refreshContext ? { refreshContext } : {}),
      ...(forceSlug ? { forceSlug } : {}),
    },
  };
}

async function researchStep(job: JobRow, deadline: number): Promise<StepResult> {
  const topic = job.state.topic as TopicRow;
  const refreshContext = job.state.refreshContext as Record<string, unknown> | undefined;
  const system = buildResearchSystemPrompt();
  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: buildResearchUserPrompt(topic, refreshContext),
  }];
  const MAX_TURNS = 6;
  let nudged = false;
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const res = await callModel(
      {
        model: MODEL,
        max_tokens: 4000,
        system,
        messages,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }, RESEARCH_TOOL] as unknown as Anthropic.Tool[],
      },
      deadline,
    );
    const emitted = toolInput(res, 'emit_research');
    if (emitted) return { kind: 'advance', next: 'draft', state: { research: normalizeBrief(emitted) } };

    messages.push({ role: 'assistant', content: res.content });
    if (res.stop_reason === 'pause_turn' || res.stop_reason === 'tool_use') continue;
    if (nudged) break;
    messages.push({ role: 'user', content: 'Now call emit_research exactly once with the facts you gathered.' });
    nudged = true;
  }
  throw new Error('research step produced no brief');
}

async function draftStep(job: JobRow, deadline: number): Promise<StepResult> {
  const post = await generateDraft(job, deadline);
  return { kind: 'advance', next: 'enforce', state: { post, notes: [] } };
}

async function enforceStep(job: JobRow, deadline: number): Promise<StepResult> {
  let post = job.state.post as GeneratedPost;
  const notes = [...((job.state.notes as string[]) ?? [])];
  const problems = lengthProblems(post);

  if (problems.length > 0) {
    notes.push(`length retry: ${problems.join('; ')}`);
    try {
      const correction =
        `\n\n# CORRECTION REQUIRED\nYour previous draft violated these limits: ${problems.join('; ')}. ` +
        `Return the SAME post, corrected: meta_title <= ${MAX_TITLE} chars, meta_description <= ${MAX_DESC} chars, ` +
        `body_markdown ${MIN_WORDS}-${MAX_WORDS} words. Call emit_post exactly once.`;
      const retry = await generateDraft(job, deadline, correction);
      const retryProblems = lengthProblems(retry);
      if (retryProblems.length === 0 || retryProblems.length < problems.length) {
        post = retry;
        notes.push(retryProblems.length === 0 ? 'length fixed on retry' : `length improved (remaining: ${retryProblems.join('; ')})`);
      } else {
        notes.push('retry did not improve length; kept original (saved pending for review)');
      }
    } catch (e) {
      notes.push(`length retry failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Final safety net — never persist over-limit metadata even if the model won't comply.
  if (post.meta_title.length > MAX_TITLE) {
    post = { ...post, meta_title: post.meta_title.slice(0, MAX_TITLE).trim() };
    notes.push('meta_title hard-trimmed to 60 chars');
  }
  if (post.meta_description.length > MAX_DESC) {
    post = { ...post, meta_description: post.meta_description.slice(0, MAX_DESC).trim() };
    notes.push('meta_description hard-trimmed to 155 chars');
  }
  return { kind: 'advance', next: 'guard', state: { post, notes } };
}

/** Single forced-emit generation given the cached research brief — no web_search, predictable latency. */
async function generateDraft(job: JobRow, deadline: number, correction = ''): Promise<GeneratedPost> {
  const topic = job.state.topic as TopicRow;
  const moneyLinks = (job.state.moneyLinks as Array<{ label: string; url: string }>) ?? [];
  const research = (job.state.research as ResearchBrief) ?? { facts: [] };
  const overlap = job.state.overlap as OverlapResult | undefined;
  const refreshContext = job.state.refreshContext as Record<string, unknown> | undefined;
  const memoryBlock = await getBlogMemoryPromptBlock('post');
  const system = buildDraftSystemPrompt(memoryBlock);
  const user = buildDraftUserPrompt(topic, moneyLinks, research, overlap, refreshContext) + correction;

  const res = await callModel(
    {
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [{ role: 'user', content: user }],
      tools: [POST_TOOL] as unknown as Anthropic.Tool[],
      tool_choice: { type: 'tool', name: 'emit_post' },
    },
    deadline,
  );
  const emitted = toolInput(res, 'emit_post');
  if (!emitted) throw new Error('draft step produced no post');
  return normalizePost(emitted as Partial<GeneratedPost>);
}

function guardStep(job: JobRow): StepResult {
  const post = job.state.post as GeneratedPost;
  const topic = job.state.topic as TopicRow;
  const factVerdict = checkVillaFacts(`${post.h1}\n${post.body_markdown}\n${post.faq.map((f) => `${f.q} ${f.a}`).join('\n')}`);
  const negVerdict = checkNegativeList({
    meta_title: post.meta_title,
    slug: post.slug,
    h1: post.h1,
    body: post.body_markdown,
    keywords: [topic.primary_keyword ?? '', ...(topic.secondary_keywords ?? [])],
  });
  // A genuine near-duplicate (router level 'high') routes through the SAME
  // approval flow as fact/negative flags, so the WhatsApp message warns Rob to
  // consider a refresh instead of publishing. Never strands — he can approve anyway.
  const overlap = job.state.overlap as OverlapResult | undefined;
  const overlapReason =
    overlap?.level === 'high' && overlap.matched
      ? `Intent overlap — closely matches published "${overlap.matched.title}" (/blog/${overlap.matched.slug}); consider refreshing that post instead of publishing a near-duplicate`
      : null;
  const flagged = factVerdict.flagged || negVerdict.flagged || !!overlapReason;
  const blockReason = [factVerdict.reason, negVerdict.reason, overlapReason].filter(Boolean).join(' | ') || null;
  if (flagged) console.warn(`[pipeline] GUARD flagged draft: ${blockReason}`);
  // Pre-allocate the draft id so persist is idempotent across worker retries.
  const draftId = (job.state.draftId as string) ?? crypto.randomUUID();
  return { kind: 'advance', next: 'persist', state: { flagged, blockReason, draftId } };
}

async function persistStep(job: JobRow): Promise<StepResult> {
  const topic = job.state.topic as TopicRow;
  const rawPost = job.state.post as GeneratedPost;
  const flagged = !!job.state.flagged;
  const blockReason = (job.state.blockReason as string | null) ?? null;
  const draftId = job.state.draftId as string;

  // Phase 4: force the refresh to publish to the same slug as the original post.
  const forceSlug = job.state.forceSlug as string | undefined;
  const post: GeneratedPost = forceSlug ? { ...rawPost, slug: forceSlug } : rawPost;

  // Idempotent: a prior tick may have inserted then crashed before checkpointing.
  const { data: existing } = await supabase.from('blog_post_drafts').select('id').eq('id', draftId).maybeSingle();
  if (existing) return { kind: 'advance', next: 'notify', draft_id: draftId };

  const { draft_id } = await insertPendingDraft({ topicId: topic.id, post, flagged, blockReason, draftId });
  return { kind: 'advance', next: 'notify', draft_id };
}

async function notifyStep(job: JobRow): Promise<StepResult> {
  const draftId = job.draft_id ?? (job.state.draftId as string);
  const flagged = !!job.state.flagged;

  // Clean AND flagged drafts both go through the SAME approve/reject/edit flow so
  // Rob can always act on them. Flagged drafts carry a ⚠️ warning + the block
  // reason (see formatDraftMessage) so he reviews before approving — instead of
  // being stranded in 'pending' with no approval row and no way to reply or edit.
  // Idempotent: sendDraftForApproval requires status 'pending', so a re-run after
  // a successful send is a no-op (the draft is already 'sent_for_approval').
  const { data: draft } = await supabase.from('blog_post_drafts').select('status').eq('id', draftId).maybeSingle();
  if (draft?.status === 'pending') {
    await sendDraftForApproval(draftId);
    return { kind: 'done', state: { drafted: true, sent: true, flagged, draft_id: draftId } };
  }
  return { kind: 'done', state: { drafted: true, sent: draft?.status === 'sent_for_approval', flagged, draft_id: draftId, note: `draft status=${draft?.status ?? 'missing'}` } };
}

async function safelyNotify(message: string): Promise<void> {
  try { await sendWhatsAppToOwner(message); } catch (err) { console.error('[pipeline] notify failed:', err); }
}
void safelyNotify; // retained for ad-hoc operator notices; not on the happy path

/* ============================================================
 * Research tool + prompts
 * ============================================================ */

const RESEARCH_TOOL = {
  name: 'emit_research',
  description: 'Return the timely/external facts you verified via web_search, each with its source URL. Call exactly once when research is complete.',
  input_schema: {
    type: 'object',
    properties: {
      facts: {
        type: 'array',
        description: 'Each timely/external fact the writer will need, with a web_search source URL. Keep to what the topic actually requires (aim <= 12).',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string', description: 'the fact, stated plainly' },
            url: { type: 'string', description: 'the web_search source URL that supports it' },
            as_of: { type: 'string', description: 'the date this is current as of, if it matters' },
          },
          required: ['claim', 'url'],
        },
      },
      notes: { type: 'string', description: 'anything the writer should know — e.g. a fact that could NOT be confirmed and must be written around' },
    },
    required: ['facts'],
  },
};

function buildResearchSystemPrompt(): string {
  return [
    'You are a RESEARCHER for golfvilla.com blog posts, not the writer. Your only job is to gather the timely, external facts a single SEO post on the given topic will need, and verify each with web_search.',
    '',
    '# WHAT TO GATHER',
    '- Only timely/external facts: tournament dates, tourism statistics, course rankings (as of a date), course open/closed status, travel/visa notes, weather or sargassum conditions — whatever THIS topic requires.',
    '- Do NOT gather or assert villa-specific figures (bedrooms, capacity, nightly rates). Those come from a separate trusted source the writer already has.',
    '- Run web_search for each fact. If a fact cannot be confirmed, do not guess — record it in "notes" so the writer can write around it.',
    '',
    '# OUTPUT',
    'When done, call emit_research EXACTLY ONCE. Every fact must carry the source URL you found it at. Do not write any prose blog content.',
  ].join('\n');
}

function buildResearchUserPrompt(topic: TopicRow, refreshContext?: Record<string, unknown>): string {
  const isRefresh = !!refreshContext;
  const origPublishedAt = refreshContext?.published_at as string | undefined;
  return [
    isRefresh
      ? `Research what has CHANGED since this post was last published, for a content refresh.`
      : `Research the current external facts needed for a golfvilla.com post.`,
    '',
    `# TOPIC`,
    `Working title: ${topic.title.replace(/^\[Refresh\]\s*/i, '')}`,
    `Cluster: ${topic.cluster ?? 'general'}`,
    topic.primary_keyword ? `Primary keyword: ${topic.primary_keyword}` : '',
    (topic.secondary_keywords ?? []).length ? `Secondary: ${(topic.secondary_keywords ?? []).join(', ')}` : '',
    (topic.geo_questions ?? []).length ? `Questions readers ask: ${(topic.geo_questions ?? []).join(' | ')}` : '',
    topic.notes ? `Editor notes: ${topic.notes}` : '',
    ...(isRefresh && origPublishedAt
      ? ['', `# REFRESH CONTEXT`, `This post was originally published on ${origPublishedAt.slice(0, 10)}. Focus your web_search on facts that may have changed since that date: updated rankings, new tournament results, current tourism statistics, course condition changes, new travel advisories, or other developments relevant to the topic.`]
      : []),
    '',
    'Run web_search now, then call emit_research once with the verified facts and their source URLs.',
  ].filter(Boolean).join('\n');
}

function buildDraftSystemPrompt(memoryBlock: string): string {
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
    'Deliver the post by calling the `emit_post` tool EXACTLY ONCE with all required fields filled. body_markdown should contain real markdown (## H2 headings, [anchor](url) links, blank lines between paragraphs). Do NOT put <cite> tags or any citation markup in body_markdown or the FAQ — every external/timely fact goes in the "sources" array with its URL.',
    '',
    '# GROUNDING (HARD)',
    '- You have NO web access here. Do not assert any timely/external fact that is not in the RESEARCHED FACTS block in the user message.',
    '- Villa facts: ONLY from the VILLA FACTS block above. Never invent or round a villa figure.',
    '- NEVER invent a nightly rate or per-person price. The ONLY nightly rates you may state — including in any "cost per person", "per night", or "villa math" example — are the canonical ones ($2,500 low / $4,000 peak / $7,500–$8,500 holiday). To show per-person cost, divide a CANONICAL rate by the group size; do NOT make up a number like $3,500.',
    '- For every researched fact you use, copy it into "sources" with the URL provided. If the facts block lacks something you wanted, write around it rather than guessing.',
    '- Schema downstream is BlogPosting + exactly one FAQPage. Do not reference VacationRental.',
  ].join('\n');
}

function buildDraftUserPrompt(
  topic: TopicRow,
  moneyLinks: Array<{ label: string; url: string }>,
  research: ResearchBrief,
  overlap?: OverlapResult,
  refreshContext?: Record<string, unknown>,
): string {
  const links = moneyLinks.map((l) => `  - ${l.label}: ${l.url}`).join('\n');
  const facts = (research.facts ?? []).length
    ? research.facts.map((f) => `  - ${f.claim}${f.as_of ? ` (as of ${f.as_of})` : ''} [${f.url}]`).join('\n')
    : '  (none gathered — do not assert any timely external fact)';
  const cleanTitle = topic.title.replace(/^\[Refresh\]\s*/i, '');
  const isRefresh = !!refreshContext;
  const origSlug = refreshContext?.slug as string | undefined;
  const origBody = refreshContext?.body_markdown as string | undefined;
  return [
    isRefresh
      ? `Rewrite and update this golfvilla.com blog post to make it current, accurate, and competitive.`
      : `Write one SEO blog post for golfvilla.com.`,
    '',
    `# TOPIC`,
    `Working title: ${cleanTitle}`,
    `Cluster: ${topic.cluster ?? 'general'}`,
    topic.notes ? `Editor notes: ${topic.notes}` : '',
    '',
    buildKeywordPromptBlock({
      primary_keyword: topic.primary_keyword,
      secondary_keywords: topic.secondary_keywords ?? [],
      geo_questions: topic.geo_questions ?? [],
      cluster: topic.cluster,
    }),
    ...(overlap?.guidance?.length ? ['', '# CLUSTER & DIFFERENTIATION (HARD)', ...overlap.guidance] : []),
    '',
    '# RESEARCHED FACTS (the ONLY timely/external facts you may assert — each already has its source URL)',
    facts,
    research.notes ? `\nResearcher notes: ${research.notes}` : '',
    '',
    '# INTERNAL LINKS TO USE (exact URLs — use where relevant, do not invent others)',
    links,
    ...(isRefresh && origSlug
      ? [
          '',
          '# REFRESH INSTRUCTIONS (HARD)',
          `- This is a content refresh. Use the EXACT same slug: ${origSlug}`,
          '- Preserve what is still accurate in the original; update everything that is stale.',
          '- Improve structure, depth, and keyword coverage where the original was weak.',
          '- The refreshed post should be substantially better and more current than the original.',
          origBody ? `\n# ORIGINAL POST BODY (for reference — update, do not copy verbatim)\n${origBody.slice(0, 4000)}${origBody.length > 4000 ? '\n[... truncated for length ...]' : ''}` : '',
        ]
      : []),
    '',
    'Write the post now and call emit_post exactly once.',
  ].filter(Boolean).join('\n');
}

function normalizeBrief(input: Record<string, unknown>): ResearchBrief {
  const rawFacts = Array.isArray(input.facts) ? input.facts : [];
  const facts = rawFacts
    .filter((f): f is Record<string, unknown> => !!f && typeof f === 'object')
    .filter((f) => f.url)
    .map((f) => ({ claim: String(f.claim ?? ''), url: String(f.url), ...(f.as_of ? { as_of: String(f.as_of) } : {}) }));
  return { facts, ...(input.notes ? { notes: String(input.notes) } : {}) };
}
