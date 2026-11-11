/**
 * Local translation runner (backfill + testing). Uses .env.local.
 *   npx tsx scripts/translate-local.ts <draftId> <lang>   one post, one language
 *   npx tsx scripts/translate-local.ts --pending 20       next 20 due pairs
 * Writes to blog_post_translations only. Publishing is a separate step.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { translateOne, translatePending } from '../src/lib/i18n/translate';
import type { LangCode } from '../src/lib/i18n/languages';

async function main() {
  const [a, b] = process.argv.slice(2);
  const results = a === '--pending'
    ? await translatePending(Number(b ?? 4))
    : a && b ? [await translateOne(a, b as LangCode)]
    : (() => { throw new Error('usage: <draftId> <es|fr|de|pt>  |  --pending <n>'); })();
  for (const r of results) console.log(`${r.lang} ${r.draft_id} → ${r.status}${r.note ? `  (${r.note})` : ''}`);
  process.exit(results.every((r) => r.status === 'approved') ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
