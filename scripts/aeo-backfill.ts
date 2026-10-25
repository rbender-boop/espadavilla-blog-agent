/**
 * Backfill aeo_snapshots from a probe's local JSONL backup.
 * Inserts only rows missing from the DB (matched on engine + prompt + sample_num) for that scan.
 * Run: npx tsx scripts/aeo-backfill.ts --scan=20261025_152201
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import * as fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const scan = process.argv.find((a) => a.startsWith('--scan='))?.split('=')[1];
if (!scan) { console.error('Usage: npx tsx scripts/aeo-backfill.ts --scan=<scan_id>'); process.exit(1); }
const file = `aeo_raw_${scan}.jsonl`;
if (!fs.existsSync(file)) { console.error(`Missing ${file}`); process.exit(1); }

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const key = (r: any) => `${r.engine}|${r.prompt}|${r.sample_num}`;

(async () => {
  const raw = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const { data, error } = await sb.from('aeo_snapshots').select('engine,prompt,sample_num').eq('scan_id', scan);
  if (error) throw new Error(error.message);
  const have = new Set((data ?? []).map(key));
  const missing = raw.filter((r) => !have.has(key(r)));
  console.log(`scan ${scan}: jsonl ${raw.length}, in DB ${have.size}, missing ${missing.length}`);
  let ok = 0;
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: e } = await sb.from('aeo_snapshots').insert(batch);
      if (!e) { ok += batch.length; break; }
      console.error(`batch ${i / 50 + 1} attempt ${attempt} failed: ${e.message}`);
      if (attempt === 3) process.exitCode = 1; else await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  console.log(`inserted ${ok}/${missing.length}`);
})().catch((e) => { console.error('FATAL:', e.message ?? e); process.exit(1); });
