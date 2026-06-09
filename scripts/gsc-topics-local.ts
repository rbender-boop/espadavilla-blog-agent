/**
 * GSC topic generator — local runner. Defaults to a DRY RUN (select + dedupe,
 * no insert). Pass --write to actually insert into blog_topics.
 *
 * Run: bun --env-file=.env.local run scripts/gsc-topics-local.ts          (dry run)
 *      bun --env-file=.env.local run scripts/gsc-topics-local.ts --write  (insert)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { generateTopicsFromGsc } from '../src/lib/gsc/topic-generator';

async function main() {
  const write = process.argv.includes('--write');
  console.log(write ? 'MODE: WRITE (will insert)\n' : 'MODE: dry run (no insert — pass --write to insert)\n');

  const summary = await generateTopicsFromGsc({ dryRun: !write });

  console.log(`Fetched ${summary.fetched} GSC rows → ${summary.candidates} on-target candidates.`);
  if (summary.skipped.length) {
    console.log('\nSkipped:');
    for (const s of summary.skipped) console.log(`   - "${s.query}" — ${s.reason}`);
  }
  if (write) {
    console.log(`\nInserted ${summary.inserted} topic(s):`);
    for (const t of summary.insertedTitles) console.log(`   + ${t}`);
  } else {
    console.log(`\n(dry run) would insert ${summary.insertedTitles.length} topic(s):`);
    for (const t of summary.insertedTitles) console.log(`   + ${t}`);
  }
}

main().catch((e) => {
  console.error('\n❌ generator failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
