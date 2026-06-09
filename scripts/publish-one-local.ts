/**
 * One-off local publisher — runs the REAL publishApprovedDraft against the live
 * DB + repo, bypassing the (currently broken) prod drain. Usage:
 *   npx tsx scripts/publish-one-local.ts <draftId>
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { publishApprovedDraft } from '../src/lib/publish/commit-post';

async function main() {
  const draftId = process.argv[2];
  if (!draftId) throw new Error('usage: tsx scripts/publish-one-local.ts <draftId>');
  console.log('SUPABASE_URL=', process.env.SUPABASE_URL);
  console.log('REPO=', process.env.ESPADAVILLA_REPO);
  console.log('publishing draft', draftId, '...');
  const r = await publishApprovedDraft(draftId);
  console.log('RESULT=', JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
