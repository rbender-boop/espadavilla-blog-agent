/**
 * GSC connectivity proof — Phase 3 step 1.
 *
 * Run BEFORE wiring anything to a cron. Verifies the service-account +
 * domain-wide-delegation + impersonation chain end-to-end with a LIVE API call:
 *   1. lists the GSC properties the impersonated user can see, then
 *   2. pulls a few sample queries for GSC_SITE_URL.
 *
 * Run: bun --env-file=.env.local run scripts/gsc-check.ts
 *   (or: npx tsx scripts/gsc-check.ts)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { listGscSites, querySearchAnalytics } from '../src/lib/gsc/client';

async function main() {
  const subject = process.env.GSC_IMPERSONATED_SUBJECT ?? '(unset)';
  const site = process.env.GSC_SITE_URL ?? '(unset)';
  console.log(`Impersonating: ${subject}`);
  console.log(`Target site:   ${site}\n`);

  console.log('1) Listing GSC properties…');
  const sites = await listGscSites();
  if (!sites.length) {
    console.log('   ⚠️  No properties returned. Check delegation + that the subject owns a property.');
  }
  for (const s of sites) console.log(`   - ${s.siteUrl}  [${s.permissionLevel}]`);

  console.log('\n2) Pulling sample queries (last 90d, top 10 by impressions)…');
  const rows = await querySearchAnalytics({ rowLimit: 10 });
  if (!rows.length) {
    console.log('   (no rows — property may be new or have no traffic in the window)');
  }
  for (const r of rows) {
    console.log(`   ${r.impressions.toString().padStart(5)} impr | pos ${r.position.toFixed(1).padStart(4)} | ${(r.ctr * 100).toFixed(1)}% | ${r.query}`);
  }

  console.log('\n✅ GSC connectivity OK — delegation + impersonation + env vars all work.');
}

main().catch((e) => {
  console.error('\n❌ GSC check failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
