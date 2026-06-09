/**
 * refine-from-edits.ts — blog voice-learning loop (Phase 6).
 *
 * Weekly, analyses Rob's edits over the last LOOKBACK_DAYS: for each published/
 * edited draft where edited_content differs meaningfully from body_markdown,
 * builds a diff corpus and asks Claude to extract concrete, repeating editing
 * patterns. New patterns are written to blog_voice_memories, which the drafter
 * injects into its system prompt — so Rob's edits teach the voice over time.
 *
 * Model pinned to claude-sonnet-4-5-20250929 (no version drift).
 * Fail-soft: any failure logs and returns a benign result; never throws into
 * the cron in a way that loses the run.
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../supabase';
import { insertVoiceMemory, retrieveVoiceMemories } from '../voice-memory';

const MODEL = 'claude-sonnet-4-5-20250929';
const LOOKBACK_DAYS = 30;
const CORPUS_CAP = 30;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY required');
  _client = new Anthropic({ apiKey: key });
  return _client;
}

type DiffRow = { original: string; edited: string };

function isMeaningfulDiff(a: string, b: string): boolean {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta || !tb || ta === tb) return false;
  const diffLen = Math.abs(ta.length - tb.length);
  if (diffLen < 20 && diffLen / Math.max(ta.length, 1) < 0.03) return false;
  return true;
}

async function collectDiffs(): Promise<DiffRow[]> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('blog_post_drafts')
    .select('body_markdown, edited_content, created_at')
    .not('edited_content', 'is', null)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(50);

  const diffs: DiffRow[] = [];
  for (const r of data ?? []) {
    const original = (r.body_markdown as string) ?? '';
    const edited = (r.edited_content as string) ?? '';
    if (isMeaningfulDiff(original, edited)) diffs.push({ original, edited });
  }
  return diffs.slice(0, CORPUS_CAP);
}

const ANALYSIS_SYSTEM = `You analyse a corpus of AI-written golf-travel blog drafts for golfvilla.com and the human edits Rob Bender made to them.

Identify CONCRETE, repeating, actionable patterns in how Rob edits the drafts. Good patterns:
  - "Rob cuts the opening hook to one sentence"
  - "Rob removes the word 'nestled' and other hype adjectives"
  - "Rob adds the exact nightly rate when discussing cost"
  - "Rob shortens FAQ answers to 2 sentences"
Bad (too vague): "Rob makes it shorter", "Rob improves clarity".

Return ONLY valid JSON (no markdown fences, no preamble):
{ "patterns": [ { "pattern": "<concrete instruction the drafter should follow next time>" } ], "summary": "<2-sentence trend>" }

If fewer than 3 meaningful edits OR no concrete repeating patterns, return:
{ "patterns": [], "summary": "insufficient edit signal in lookback window" }`;

type AnalysisResult = { patterns: Array<{ pattern: string }>; summary: string };

async function analyseDiffs(diffs: DiffRow[]): Promise<AnalysisResult> {
  if (diffs.length < 3) return { patterns: [], summary: `insufficient edit signal (${diffs.length} diffs in ${LOOKBACK_DAYS}d)` };

  const corpus = diffs
    .map((d, i) => `--- DRAFT ${i + 1} ---\nBEFORE:\n${d.original.slice(0, 4000)}\n\nAFTER (Rob's edit):\n${d.edited.slice(0, 4000)}`)
    .join('\n\n');

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: ANALYSIS_SYSTEM,
    messages: [{ role: 'user', content: `Edit corpus (${diffs.length} diffs):\n\n${corpus}\n\nReturn ONLY the JSON.` }],
  });
  const txt = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/, '');
  try {
    const parsed = JSON.parse(txt) as AnalysisResult;
    return { patterns: Array.isArray(parsed.patterns) ? parsed.patterns.filter((p) => p && p.pattern) : [], summary: parsed.summary ?? '' };
  } catch {
    return { patterns: [], summary: 'analysis returned unparseable JSON' };
  }
}

export type RefineResult = { diffs_collected: number; patterns_found: number; memories_added: number; summary: string };

export async function refineVoiceFromEdits(): Promise<RefineResult> {
  const diffs = await collectDiffs();
  const analysis = await analyseDiffs(diffs);

  let added = 0;
  if (analysis.patterns.length > 0) {
    const existing = new Set((await retrieveVoiceMemories('post')).map((m) => m.memory_text.trim().toLowerCase()));
    for (const p of analysis.patterns) {
      const text = p.pattern.trim();
      if (!text || existing.has(text.toLowerCase())) continue;
      await insertVoiceMemory({ memory_text: text, scope: 'post', source_type: 'edit_learning' });
      existing.add(text.toLowerCase());
      added++;
    }
  }

  return { diffs_collected: diffs.length, patterns_found: analysis.patterns.length, memories_added: added, summary: analysis.summary };
}
