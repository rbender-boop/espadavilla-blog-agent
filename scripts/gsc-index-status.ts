// Per-URL Google index status (URL Inspection API) for every espadavilla.com sitemap URL + 90-day page impressions.
// Run: npx tsx scripts/gsc-index-status.ts   (~5-10 s per URL; resumable — rerun to continue after a stall)
// Output: Handovers/aeo-tools/index-status-YYYY-MM-DD.csv. Quota: 2,000 inspections/day.
import { config } from 'dotenv';
config({ path: '.env.local' });
import * as fs from 'fs';
import { JWT } from 'google-auth-library';

const sa = JSON.parse(Buffer.from(process.env.GSC_SERVICE_ACCOUNT_JSON!, 'base64').toString('utf8'));
const jwt = new JWT({ email: sa.client_email, key: sa.private_key, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'], subject: process.env.GSC_IMPERSONATED_SUBJECT });
const SITE = process.env.GSC_SITE_URL!;
const sitemap = fs.readFileSync('C:/Users/rbend/Desktop/Claude Projects/GOLFVILLA-WEBSITE/VILLA-ESPADA-PACKAGE/WEBSITE/sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

async function main() {
  const end = new Date(); const start = new Date(Date.now() - 90 * 864e5);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const sa_ = await jwt.request<any>({ url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, method: 'POST', data: { startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: 5000 }, timeout: 60000 } as any);
  const imp: Record<string, [number, number, number]> = {};
  for (const r of sa_.data.rows ?? []) imp[r.keys[0].replace(/\/$/, '')] = [r.impressions, r.clicks, r.position];
  const OUT=`Handovers/aeo-tools/index-status-${new Date().toISOString().slice(0,10)}.csv`;
  const out = fs.existsSync(OUT) ? fs.readFileSync(OUT,'utf8').split('\n').filter(l=>l && !l.includes('ERROR')) : ['url,coverage,verdict,lastCrawl,googleCanonical,impr90,clicks90,pos'];
  const done = new Set(out.slice(1).map(l=>l.split('","')[0].replace(/^"/,'')));
  let i = 0;
  for (const u of urls) {
    i++;
    if (done.has(u)) continue;
    try {
      const r = await jwt.request<any>({ url: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', method: 'POST', data: { inspectionUrl: u, siteUrl: SITE }, timeout: 30000, retry: false } as any);
      const x = r.data.inspectionResult?.indexStatusResult ?? {};
      const m = imp[u.replace(/\/$/, '')] ?? [0, 0, 0];
      out.push([u, x.coverageState, x.verdict, x.lastCrawlTime ?? '', x.googleCanonical ?? '', m[0], m[1], m[2].toFixed(1)].map((v) => `"${String(v).replace(/"/g, "'")}"`).join(','));
    } catch (e: any) {
      out.push(`"${u}","ERROR ${String(e?.response?.status ?? e?.message).slice(0, 80)}",,,,,,`);
      if (e?.response?.status === 429) { console.log('quota hit at', i); break; }
    }
    console.log(i, u.slice(28)); if (i % 5 === 0) { console.log(i, '/', urls.length); fs.writeFileSync(OUT, out.join('\n')); }
  }
  fs.writeFileSync(OUT, out.join('\n'));
  console.log('DONE', i, 'site', SITE);
}
main().catch((e) => { console.error(e?.response?.data ?? e); process.exit(1); });
