/**
 * Local drafter runner — `bun run draft:local` (or npm).
 *
 * Drafts the next queued topic and prints the full post + SEO bundle so Rob can
 * eyeball output before any WhatsApp wiring is exercised. Does NOT send anything.
 *
 * Usage:
 *   bun run draft:local              # next queued topic
 *   bun run draft:local <topic_id>   # a specific topic
 */

import 'dotenv/config';
import { supabase } from '../supabase';
import { generatePostForNextTopic, generatePostForTopic, type TopicRow } from './generate-post';

async function main() {
  const topicId = process.argv[2];
  const saved = topicId
    ? await generatePostForTopic(await loadTopic(topicId))
    : await generatePostForNextTopic();

  if (!saved) {
    console.log('No queued topics to draft. Seed blog_topics or set a topic status=queued.');
    return;
  }

  const { data: draft } = await supabase
    .from('blog_post_drafts')
    .select('*')
    .eq('id', saved.draft_id)
    .single();

  console.log('\n===================== DRAFT =====================');
  console.log(`draft_id:   ${saved.draft_id}`);
  console.log(`topic_id:   ${saved.topic_id}`);
  console.log(`slug:       ${saved.slug}`);
  console.log(`meta_title: ${saved.meta_title} (${saved.meta_title.length} chars)`);
  console.log(`meta_desc:  ${draft?.meta_description} (${(draft?.meta_description ?? '').length} chars)`);
  console.log(`word_count: ${saved.word_count}`);
  console.log(`flagged:    ${saved.flagged}${saved.block_reason ? ` — ${saved.block_reason}` : ''}`);
  if (saved.notes.length) console.log(`notes:      ${saved.notes.join(' | ')}`);
  console.log('\n----- H1 -----\n' + draft?.h1);
  console.log('\n----- BODY (markdown) -----\n' + draft?.body_markdown);
  console.log('\n----- FAQ -----');
  for (const f of (draft?.faq ?? []) as Array<{ q: string; a: string }>) console.log(`Q: ${f.q}\nA: ${f.a}\n`);
  console.log('----- INTERNAL LINKS -----');
  for (const l of (draft?.internal_links ?? []) as Array<{ anchor: string; url: string }>) console.log(`  ${l.anchor} → ${l.url}`);
  console.log('----- SOURCES (web_search) -----');
  for (const s of (draft?.sources ?? []) as Array<{ claim: string; url: string }>) console.log(`  ${s.claim} → ${s.url}`);
  console.log('----- SOCIAL CAPTIONS -----');
  for (const c of (draft?.social_captions ?? []) as string[]) console.log(`  • ${c}`);
  console.log(`----- HASHTAGS -----\n  ${(draft?.hashtags ?? []).join(' ')}`);
  console.log('================================================\n');
}

async function loadTopic(id: string): Promise<TopicRow> {
  const { data, error } = await supabase
    .from('blog_topics')
    .select('id, title, cluster, primary_keyword, secondary_keywords, geo_questions, target_internal_links, notes')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error(`Topic ${id} not found: ${error?.message ?? 'no row'}`);
  return data as TopicRow;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
