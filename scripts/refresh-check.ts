/**
 * scripts/refresh-check.ts — Phase 4 local dry-run.
 *
 * Fetches published posts + GSC page data, runs decay detection, and prints
 * what WOULD be queued as refresh topics. Writes nothing to the DB by default.
 *
 *   npx tsx scripts/refresh-check.ts              # dry-run (default)
 *   npx tsx scripts/refresh-check.ts --write      # insert refresh topics
 *
 * Requires .env.local with GSC_* and SUPABASE_* vars.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { generateRefreshTopics } from '../src/lib/gsc/refresh-generator';

const write = process.argv.includes('--write');

console.log(`\n=== Post Refresh Check (${write ? 'WRITE' : 'DRY RUN'}) ===\n`);

const summary = await generateRefreshTopics({ dryRun: !write });

console.log(`Posts checked:    ${summary.postsChecked}`);
console.log(`Decay detected:   ${summary.decayDetected}`);
console.log(`Already queued:   ${summary.alreadyQueued}`);
console.log(`Inserted:         ${summary.inserted}`);

if (summary.insertedSlugs.length) {
  console.log(`\n${write ? 'Inserted' : 'Would insert'} refresh topics for:`);
  for (const slug of summary.insertedSlugs) console.log(`  - ${slug}`);
}

if (summary.skipped.length) {
  console.log(`\nSkipped:`);
  for (const s of summary.skipped) console.log(`  - ${s.slug}: ${s.reason}`);
}

if (!write && summary.decayDetected === 0) {
  console.log('\nNo decay detected — all published posts are either too young or holding position.');
}
if (!write && summary.decayDetected > 0) {
  console.log('\nRe-run with --write to insert these refresh topics into the queue.');
}
