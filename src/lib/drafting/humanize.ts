/**
 * Structure-preserving humanization pass (blader/humanizer skill, embedded).
 *
 * Runs after the draft is length-valid and BEFORE the fact/negative guards, so
 * the guards validate the text that is actually persisted. Rewrites only the
 * prose of body_markdown to strip AI tells, under hard constraints: H2
 * headings, links, the word-count band, and voice are preserved and NO new
 * facts are introduced.
 *
 * Fail-open in every failure mode — a missing, empty, aborted, or structurally
 * invalid rewrite always falls back to the original body, so humanization can
 * never block a publishable draft. Gate with env HUMANIZE_DRAFTS=false.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { MODEL, MIN_WORDS, MAX_WORDS, countWords } from './generate-post';
import { HUMANIZER_SKILL } from './humanizer-prompt';

export type HumanizeOutcome = { body: string; applied: boolean; note: string };

/** A model-call function supplied by the caller so each path controls its own
 *  budget: the durable pipeline passes a deadline-aware call, the sync path a
 *  plain call with a request timeout. */
export type HumanizeCall = (
  params: Anthropic.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Message>;

const HUMANIZE_TOOL = {
  name: 'emit_humanized',
  description: 'Return the fully rewritten markdown body. Call exactly once.',
  input_schema: {
    type: 'object',
    properties: {
      body_markdown: {
        type: 'string',
        description: 'The rewritten markdown body: same ## headings and same [anchor](url) links as the source, no new facts.',
      },
    },
    required: ['body_markdown'],
  },
};

function h2Count(md: string): number {
  return (md.match(/^##\s+/gm) ?? []).length;
}

function linkUrls(md: string): string[] {
  const out: string[] = [];
  const re = /\]\(([^)\s]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) out.push((m[1] ?? '').trim());
  return out;
}

function buildSystem(): string {
  return HUMANIZER_SKILL + '\n\n' + [
    '# PIPELINE CONSTRAINTS (these OVERRIDE any conflicting style rule in the skill above)',
    'You are humanizing the BODY of a published SEO blog post for a luxury villa brand. Apply the pattern fixes to the prose only, within these hard limits:',
    '1. PRESERVE every "## " H2 heading exactly — same text, same order, and the same number of headings. Never add, remove, rename, reorder, or change the case of a heading. Treat "## " headings as answer-engine structure, not style to be cut.',
    '2. PRESERVE every markdown link [anchor](url) — keep every URL verbatim and present. Never drop, add, or alter a URL.',
    `3. KEEP the body between ${MIN_WORDS} and ${MAX_WORDS} words.`,
    '4. ADD NO new facts: no names, numbers, dates, rates, prices, statistics, rankings, quotes, or citations that are not already in the source text. When in doubt, keep the plain wording. (The skill\u2019s no-fabrication rule, applied strictly.)',
    '5. Stay in the SAME voice and point of view as the source. Do not invent first-person anecdotes or personal experiences the author did not write.',
    '6. You are given only the body — there is no FAQ here to touch.',
    '7. Output ONLY the rewritten body via the emit_humanized tool: real markdown, no preamble, no commentary, no <cite> tags.',
  ].join('\n');
}

export async function humanizeBody(body: string, call: HumanizeCall): Promise<HumanizeOutcome> {
  if (process.env.HUMANIZE_DRAFTS === 'false') return { body, applied: false, note: 'humanize disabled (HUMANIZE_DRAFTS=false)' };
  if (!body || countWords(body) < 200) return { body, applied: false, note: 'humanize skipped: body too short' };

  const origH2 = h2Count(body);
  const origUrls = new Set(linkUrls(body));

  try {
    const res = await call({
      model: MODEL,
      max_tokens: 4000,
      system: buildSystem(),
      messages: [{
        role: 'user',
        content: 'Humanize this blog body. Keep every heading and link, add no facts, stay in the same voice:\n\n' + body,
      }],
      tools: [HUMANIZE_TOOL] as unknown as Anthropic.Tool[],
      tool_choice: { type: 'tool', name: 'emit_humanized' },
    });

    const block = res.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === 'emit_humanized',
    );
    const next = block ? String((block.input as { body_markdown?: unknown }).body_markdown ?? '').trim() : '';
    if (!next) return { body, applied: false, note: 'humanize skipped: no usable output' };

    // Structure guards — any violation falls back to the original body.
    const wc = countWords(next);
    if (wc < MIN_WORDS || wc > MAX_WORDS) return { body, applied: false, note: `humanize reverted: word_count ${wc} outside ${MIN_WORDS}-${MAX_WORDS}` };
    const newH2 = h2Count(next);
    if (newH2 !== origH2) return { body, applied: false, note: `humanize reverted: H2 count ${newH2} != ${origH2}` };
    for (const u of origUrls) if (!next.includes(u)) return { body, applied: false, note: `humanize reverted: dropped link ${u}` };

    return { body: next, applied: true, note: `humanized (${countWords(body)}\u2192${wc} words)` };
  } catch (e) {
    return { body, applied: false, note: `humanize error (kept original): ${e instanceof Error ? e.message : String(e)}` };
  }
}
