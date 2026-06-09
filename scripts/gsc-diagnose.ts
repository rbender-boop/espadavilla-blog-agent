/**
 * GSC recon — prints the on-target query landscape (after negative-geo filter),
 * sorted by impressions, with cluster + position, IGNORING the page-2 band. Use
 * it to tune selectOpportunities thresholds to where the property actually sits.
 *
 * Run: bun --env-file=.env.local run scripts/gsc-diagnose.ts
 *      npx tsx scripts/gsc-diagnose.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { querySearchAnalytics } from '../src/lib/gsc/client';
import { isNegativeGeo, isOnTarget, clusterForQuery } from '../src/lib/gsc/topic-select';

async function main() {
  const rows = await querySearchAnalytics({ rowLimit: 500 });
  const onTarget = rows
    .filter((r) => !isNegativeGeo(r.query) && isOnTarget(r.query))
    .sort((a, b) => b.impressions - a.impressions);

  console.log(`Fetched ${rows.length} rows; ${onTarget.length} on-target (non-negative).\n`);
  console.log('impr  pos    ctr%   cluster        query');
  for (const r of onTarget) {
    const cl = clusterForQuery(r.query)?.slug ?? '(entity)';
    console.log(
      `${r.impressions.toString().padStart(4)}  ${r.position.toFixed(1).padStart(5)}  ${(r.ctr * 100).toFixed(1).padStart(4)}  ${cl.padEnd(13)}  ${r.query}`,
    );
  }
}

main().catch((e) => {
  console.error('❌ diagnose failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
