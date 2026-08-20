/**
 * aeo-probe.ts — DataForSEO "LLM Responses" AEO probe (TS port of aeo_probe.py).
 *
 * Sends buyer prompts to ChatGPT / Claude / Gemini / Perplexity via DataForSEO
 * and records per answer: MENTIONED (brand named), CITED (espadavilla.com in
 * source annotations), competitor share-of-voice. Persists every sample to
 * Supabase `aeo_snapshots` (service role) AND a local JSONL backup.
 *
 * Charter alignment (EspadaVilla_..._Master_Instructions.md, corrected 2026-08-20):
 * prompt layers = fixed 12 (3 samples each) + strategic 12 (1 sample each);
 * branded vs unbranded tracked separately; per-prompt topic_cluster and
 * fit_classification stored so KPIs compute per cluster, never blended.
 *
 * Credentials: DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD from env (Windows user
 * env vars — set via setx, verified 2026-08-20). Supabase from .env.local.
 *
 * Run: npx tsx scripts/aeo-probe.ts            # full run (~192 calls, ~$6)
 *      npx tsx scripts/aeo-probe.ts --dry      # print plan, no API calls
 *      npx tsx scripts/aeo-probe.ts --engines=chatgpt,gemini --fixed-samples=1
 *      npx tsx scripts/aeo-probe.ts --list-models
 *      npx tsx scripts/aeo-probe.ts --no-db    # skip Supabase writes
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import * as fs from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BASE = 'https://api.dataforseo.com';

// ----------------------------- CONFIG ----------------------------------------

const TARGET_BRANDS = ['villa espada', 'espada villa', 'espadavilla'];
const TARGET_DOMAINS = ['espadavilla.com'];

const COMPETITORS: Record<string, { aliases: string[]; domains: string[] }> = {
  'Casa de Campo':      { aliases: ['casa de campo'],      domains: ['casadecampo.com.do', 'casadecampo.com'] },
  'Eden Roc Cap Cana':  { aliases: ['eden roc'],           domains: ['edenroccapcana.com'] },
  'Sanctuary Cap Cana': { aliases: ['sanctuary cap cana'], domains: ['sanctuarycapcana.com'] },
  'St. Regis Cap Cana': { aliases: ['st. regis', 'st regis'], domains: ['marriott.com'] },
  'Exceptional Villas': { aliases: ['exceptional villas'], domains: ['exceptionalvillas.com'] },
  'Marriott H&V':       { aliases: ['luxury retreats', 'homes & villas'], domains: ['homes-and-villas.marriott.com'] },
};

type Fit = 'should_win' | 'could_win' | 'should_not_win';
type PromptType = 'fixed' | 'strategic' | 'dynamic' | 'competitor';
type PromptDef = { text: string; type: PromptType; branded: boolean; cluster: string; fit: Fit };

// Layer 1 — FIXED benchmarks (charter §6). NEVER reword: longitudinal control group.
// #1–8 are the 2026-08-19 baseline verbatim; #5 uses the charter's "very large group".
const FIXED: PromptDef[] = [
  { text: 'Best luxury villa rentals in Cap Cana with a private chef',              type: 'fixed', branded: false, cluster: 'luxury_cap_cana',        fit: 'should_win' },
  { text: 'Where to stay in Cap Cana for a large group golf trip',                  type: 'fixed', branded: false, cluster: 'cap_cana_golf',          fit: 'should_win' },
  { text: '8-bedroom villa rental in Cap Cana, Dominican Republic',                 type: 'fixed', branded: false, cluster: 'luxury_cap_cana',        fit: 'should_win' },
  { text: 'Is there a villa you can rent right on the Punta Espada golf course?',   type: 'fixed', branded: false, cluster: 'punta_espada_golf',      fit: 'should_win' },
  { text: 'Private villa in Cap Cana for a very large group with full staff',       type: 'fixed', branded: false, cluster: 'large_groups',           fit: 'should_win' },
  { text: 'Best Cap Cana villa for a milestone birthday or bachelor party',         type: 'fixed', branded: false, cluster: 'celebrations',           fit: 'should_win' },
  { text: 'Cap Cana vs Casa de Campo for a luxury golf vacation',                   type: 'fixed', branded: false, cluster: 'capcana_vs_casadecampo', fit: 'could_win' },
  { text: 'What is Villa Espada in Cap Cana?',                                      type: 'fixed', branded: true,  cluster: 'branded_reputation',     fit: 'should_win' },
  { text: 'Best places to stay near Punta Espada golf course',                      type: 'fixed', branded: false, cluster: 'punta_espada_golf',      fit: 'should_win' },
  { text: 'Where should a group of 12 golfers stay in the Dominican Republic?',     type: 'fixed', branded: false, cluster: 'dr_golf_trips',          fit: 'should_win' },
  { text: 'What is the best fully staffed 8-bedroom villa in Cap Cana?',            type: 'fixed', branded: false, cluster: 'staffed_villas',         fit: 'should_win' },
  { text: 'What is the best luxury villa in Cap Cana for a group of 16 people?',    type: 'fixed', branded: false, cluster: 'large_groups',           fit: 'should_win' },
];

// Layer 2 — STRATEGIC (charter §8). May evolve slowly with business priorities.
const STRATEGIC: PromptDef[] = [
  { text: 'Best place to stay for a Punta Espada golf trip',                        type: 'strategic', branded: false, cluster: 'punta_espada_golf',      fit: 'should_win' },
  { text: 'Where can a group stay and get preferred Punta Espada golf access?',     type: 'strategic', branded: false, cluster: 'punta_espada_golf',      fit: 'should_win' },
  { text: 'Eden Roc Cap Cana vs private villa for a large group',                   type: 'strategic', branded: false, cluster: 'eden_roc_alternatives',  fit: 'should_win' },
  { text: 'Should a group stay at Eden Roc or rent a villa in Cap Cana?',           type: 'strategic', branded: false, cluster: 'eden_roc_alternatives',  fit: 'should_win' },
  { text: 'Punta Espada vs Teeth of the Dog for a golf trip',                       type: 'strategic', branded: false, cluster: 'dr_golf_trips',          fit: 'could_win' },
  { text: 'Best Dominican Republic golf vacation for a group',                      type: 'strategic', branded: false, cluster: 'dr_golf_trips',          fit: 'could_win' },
  { text: 'Is it better to book a Cap Cana villa directly or through Airbnb?',      type: 'strategic', branded: false, cluster: 'direct_booking',         fit: 'should_win' },
  { text: 'Best way to book a private Cap Cana villa',                              type: 'strategic', branded: false, cluster: 'direct_booking',         fit: 'should_win' },
  { text: 'Where can 16 adults stay together in Cap Cana?',                         type: 'strategic', branded: false, cluster: 'large_groups',           fit: 'should_win' },
  { text: 'Best private villa for four families traveling together in the Caribbean', type: 'strategic', branded: false, cluster: 'families',             fit: 'could_win' },
  { text: 'Punta Cana vs Cap Cana — where should you stay for a luxury vacation?',  type: 'strategic', branded: false, cluster: 'destination_expertise',  fit: 'could_win' },
  { text: 'Is Villa Espada in Cap Cana worth it — what do guests say?',             type: 'strategic', branded: true,  cluster: 'branded_reputation',     fit: 'should_win' },
];

type EngineCfg = { live: string; models: string; model: string | null; geo: boolean };
const ENGINES: Record<string, EngineCfg> = {
  chatgpt:    { live: '/v3/ai_optimization/chat_gpt/llm_responses/live',   models: '/v3/ai_optimization/chat_gpt/llm_responses/models',   model: 'gpt-4o', geo: true },
  claude:     { live: '/v3/ai_optimization/claude/llm_responses/live',     models: '/v3/ai_optimization/claude/llm_responses/models',     model: null, geo: false },
  gemini:     { live: '/v3/ai_optimization/gemini/llm_responses/live',     models: '/v3/ai_optimization/gemini/llm_responses/models',     model: null, geo: false },
  perplexity: { live: '/v3/ai_optimization/perplexity/llm_responses/live', models: '/v3/ai_optimization/perplexity/llm_responses/models', model: null, geo: true },
};

let WEB_SEARCH = true;
const SEARCH_COUNTRY_ISO = 'US';
const MAX_OUTPUT_TOKENS = 1024;
const REQUEST_TIMEOUT_MS = 130_000;
const RETRIES = 2;

// ----------------------------- HTTP helpers ----------------------------------

function authHeader(): Record<string, string> {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    console.error('Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (Windows user env vars via setx).');
    process.exit(1);
  }
  const token = Buffer.from(`${login}:${password}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request(method: 'GET' | 'POST', path: string, payload?: unknown): Promise<any> {
  const url = BASE + path;
  let lastErr = '';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const init: RequestInit = {
        method,
        headers: authHeader(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      };
      if (method === 'POST') init.body = JSON.stringify(payload);
      const res = await fetch(url, init);
      if ([429, 500, 502, 503].includes(res.status)) {
        lastErr = `HTTP ${res.status}`;
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return await res.json();
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error(`Request to ${path} failed after retries: ${lastErr}`);
}

// ----------------------------- Model discovery -------------------------------

const modelCache: Record<string, string> = {};

function* walkModelNames(obj: any): Generator<[string, boolean]> {
  if (obj && typeof obj === 'object') {
    if (!Array.isArray(obj)) {
      const name = obj.model_name ?? obj.name;
      if (typeof name === 'string') {
        const ws = !!(obj.web_search || obj.web_search_support || obj.supports_web_search);
        yield [name, ws];
      }
      for (const v of Object.values(obj)) yield* walkModelNames(v);
    } else {
      for (const v of obj) yield* walkModelNames(v);
    }
  }
}

async function discoverModel(engine: string): Promise<string> {
  const cached = modelCache[engine];
  if (cached) return cached;
  const cfg = ENGINES[engine];
  if (!cfg) throw new Error(`unknown engine: ${engine}`);
  if (cfg.model) return (modelCache[engine] = cfg.model);
  const data = await request('GET', cfg.models);
  const found = [...walkModelNames(data)];
  const first = found[0];
  if (!first) throw new Error(`[${engine}] no model names found; run --list-models and pin one.`);
  const chosen = found.find(([, ws]) => ws)?.[0] ?? first[0];
  return (modelCache[engine] = chosen);
}

async function listAllModels(): Promise<void> {
  for (const [engine, cfg] of Object.entries(ENGINES)) {
    console.log(`\n=== ${engine} models (${cfg.models}) ===`);
    try {
      const data = await request('GET', cfg.models);
      const names = [...new Set([...walkModelNames(data)].map(([n]) => n))].sort();
      for (const n of names) console.log('  ', n);
      if (!names.length) console.log('   (could not parse names)');
    } catch (e) {
      console.log('   ERROR:', e instanceof Error ? e.message : e);
    }
  }
}

// ----------------------------- Parsing + analysis ----------------------------

type Citation = { title: string | null; url: string };

function registrable(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

function extractAnswerAndCitations(resultItem: any): { answer: string; citations: Citation[] } {
  const textParts: string[] = [];
  const citations: Citation[] = [];
  for (const item of resultItem?.items ?? []) {
    if (item?.type !== 'message') continue;
    for (const sec of item.sections ?? []) {
      if (sec?.type !== 'text') continue;
      if (sec.text) textParts.push(sec.text);
      for (const ann of sec.annotations ?? []) {
        if (ann?.url) citations.push({ title: ann.title ?? null, url: ann.url });
      }
    }
  }
  return { answer: textParts.join('\n'), citations };
}

type Signals = {
  target_cited: boolean;
  target_mentioned: boolean;
  competitors_cited: string[];
  competitors_mentioned: string[];
  cited_domains: string[];
};

function analyze(answerText: string, citations: Citation[]): Signals {
  const text = (answerText || '').toLowerCase();
  const citedDomains = citations.map((c) => registrable(c.url)).filter(Boolean);
  const domainHit = (domains: string[]) =>
    domains.some((d) => citedDomains.some((cd) => cd === d || cd.endsWith('.' + d)));
  const compCited: string[] = [];
  const compMentioned: string[] = [];
  for (const [name, cfg] of Object.entries(COMPETITORS)) {
    if (domainHit(cfg.domains)) compCited.push(name);
    if (cfg.aliases.some((a) => text.includes(a))) compMentioned.push(name);
  }
  return {
    target_cited: domainHit(TARGET_DOMAINS),
    target_mentioned: TARGET_BRANDS.some((b) => text.includes(b)),
    competitors_cited: compCited,
    competitors_mentioned: compMentioned,
    cited_domains: citedDomains,
  };
}

type RunResult = {
  engine: string; model: string; prompt: string; cost: number;
  answer: string; citations: Citation[]; signals: Signals;
};

async function runOne(engine: string, prompt: string): Promise<RunResult> {
  const cfg = ENGINES[engine];
  if (!cfg) throw new Error(`unknown engine: ${engine}`);
  const model = await discoverModel(engine);
  const task: Record<string, unknown> = {
    user_prompt: prompt.slice(0, 500),
    model_name: model,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    web_search: WEB_SEARCH,
    tag: `${engine}|${prompt.slice(0, 40)}`,
  };
  if (WEB_SEARCH && cfg.geo && SEARCH_COUNTRY_ISO) task.web_search_country_iso_code = SEARCH_COUNTRY_ISO;

  const data = await request('POST', cfg.live, [task]);
  if (data?.status_code !== 20000) throw new Error(`API error ${data?.status_code}: ${data?.status_message}`);
  const t = (data.tasks ?? [])[0];
  if (!t || t.status_code !== 20000) throw new Error(`task error: ${t?.status_message ?? 'no task returned'}`);
  const result = (t.result ?? [])[0];
  const { answer, citations } = result ? extractAnswerAndCitations(result) : { answer: '', citations: [] };
  return { engine, model, prompt, cost: Number(t.cost ?? 0), answer, citations, signals: analyze(answer, citations) };
}

// ----------------------------- Supabase persistence --------------------------

function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type SnapshotRow = {
  scan_id: string; engine: string; model: string | null; prompt: string;
  prompt_type: PromptType; branded: boolean; topic_cluster: string;
  fit_classification: Fit; sample_num: number; mentioned: boolean; cited: boolean;
  citations: Citation[]; cited_domains: string[]; competitors_mentioned: string[];
  competitors_cited: string[]; response_text: string; cost: number; error: string | null;
};

// ----------------------------- Main ------------------------------------------

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.split('=').slice(1).join('=');
}
const flag = (name: string) => process.argv.includes(`--${name}`);

async function main(): Promise<void> {
  if (flag('list-models')) return listAllModels();
  if (flag('no-web-search')) WEB_SEARCH = false;

  const engines = (arg('engines') ?? Object.keys(ENGINES).join(','))
    .split(',').map((e) => e.trim()).filter((e) => e in ENGINES);
  const fixedSamples = Number(arg('fixed-samples') ?? 3);
  const strategicSamples = Number(arg('strategic-samples') ?? 1);
  const dry = flag('dry');
  const noDb = flag('no-db');

  const plan: Array<{ def: PromptDef; sample: number }> = [];
  for (const def of FIXED) for (let s = 1; s <= fixedSamples; s++) plan.push({ def, sample: s });
  for (const def of STRATEGIC) for (let s = 1; s <= strategicSamples; s++) plan.push({ def, sample: s });

  const totalCalls = plan.length * engines.length;
  console.log(`Engines: ${engines.join(', ')} | fixed ${FIXED.length}x${fixedSamples} + strategic ${STRATEGIC.length}x${strategicSamples} = ${plan.length} samples/engine = ${totalCalls} calls (~$${(totalCalls * 0.032).toFixed(2)})`);
  if (dry) { for (const p of plan) console.log(`  [${p.def.type}${p.def.branded ? '/branded' : ''}] s${p.sample} ${p.def.text}`); return; }

  const scanId = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
  const rawPath = `aeo_raw_${scanId}.jsonl`;
  const supabase = noDb ? null : getSupabase();
  if (!noDb && !supabase) console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — DB writes skipped (JSONL only).');

  const rows: SnapshotRow[] = [];
  let totalCost = 0;
  const errors: string[] = [];
  const fh = fs.createWriteStream(rawPath, { encoding: 'utf-8' });

  for (const engine of engines) {
    for (const { def, sample } of plan) {
      const label = `${engine.padEnd(11)} | ${def.text.slice(0, 50).padEnd(50)} | s${sample}`;
      let row: SnapshotRow;
      try {
        const rec = await runOne(engine, def.text);
        totalCost += rec.cost;
        row = {
          scan_id: scanId, engine, model: rec.model, prompt: def.text,
          prompt_type: def.type, branded: def.branded, topic_cluster: def.cluster,
          fit_classification: def.fit, sample_num: sample,
          mentioned: rec.signals.target_mentioned, cited: rec.signals.target_cited,
          citations: rec.citations, cited_domains: rec.signals.cited_domains,
          competitors_mentioned: rec.signals.competitors_mentioned,
          competitors_cited: rec.signals.competitors_cited,
          response_text: rec.answer, cost: rec.cost, error: null,
        };
        const tag = (row.cited ? 'CITED ' : '      ') + (row.mentioned ? 'MENTION' : '       ');
        console.log(`${label}  ->  ${tag}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`[${engine}] ${def.text.slice(0, 38)}... -> ${msg}`);
        console.log(`${label}  ->  ERROR: ${msg}`);
        row = {
          scan_id: scanId, engine, model: modelCache[engine] ?? ENGINES[engine]?.model ?? null, prompt: def.text,
          prompt_type: def.type, branded: def.branded, topic_cluster: def.cluster,
          fit_classification: def.fit, sample_num: sample,
          mentioned: false, cited: false, citations: [], cited_domains: [],
          competitors_mentioned: [], competitors_cited: [],
          response_text: '', cost: 0, error: msg.slice(0, 500),
        };
      }
      rows.push(row);
      fh.write(JSON.stringify(row) + '\n');
      await sleep(500);
    }
  }
  fh.end();

  // Persist to Supabase in batches of 50.
  if (supabase) {
    for (let i = 0; i < rows.length; i += 50) {
      const { error } = await supabase.from('aeo_snapshots').insert(rows.slice(i, i + 50));
      if (error) console.error(`⚠️  Supabase insert failed (batch ${i / 50 + 1}): ${error.message}`);
    }
    console.log(`\nPersisted ${rows.length} rows to aeo_snapshots (scan_id=${scanId}).`);
  }

  // Summary — branded and unbranded reported SEPARATELY (charter §7).
  console.log('\n' + '='.repeat(74));
  console.log('SUMMARY per engine (unbranded | branded): cited / mentioned / n');
  console.log('='.repeat(74));
  for (const engine of engines) {
    const er = rows.filter((r) => r.engine === engine && !r.error);
    const fmt = (set: SnapshotRow[]) =>
      `${set.filter((r) => r.cited).length}c/${set.filter((r) => r.mentioned).length}m/${set.length}`;
    const ub = er.filter((r) => !r.branded);
    const br = er.filter((r) => r.branded);
    console.log(`${engine.padEnd(12)} ${String(modelCache[engine] ?? '?').slice(0, 24).padEnd(24)} unbranded ${fmt(ub).padEnd(12)} branded ${fmt(br)}`);
  }

  console.log('\nPer-cluster unbranded mention rate:');
  const clusters = [...new Set(rows.filter((r) => !r.branded).map((r) => r.topic_cluster))];
  for (const cl of clusters.sort()) {
    const set = rows.filter((r) => r.topic_cluster === cl && !r.branded && !r.error);
    const m = set.filter((r) => r.mentioned).length;
    const c = set.filter((r) => r.cited).length;
    console.log(`  ${cl.padEnd(26)} mentioned ${m}/${set.length}  cited ${c}/${set.length}`);
  }

  console.log('\nShare-of-voice (mentions across all samples):');
  const compCounts: Record<string, number> = {};
  for (const r of rows) for (const c of r.competitors_mentioned) compCounts[c] = (compCounts[c] ?? 0) + 1;
  console.log(`  ${'>> Villa Espada (you)'.padEnd(28)} ${rows.filter((r) => r.mentioned).length}`);
  for (const [name, n] of Object.entries(compCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(28)} ${n}`);
  }

  console.log(`\nsamples: ${rows.length}  errors: ${errors.length}  reported cost: $${totalCost.toFixed(4)}`);
  console.log(`raw backup -> ${rawPath}`);
  if (errors.length) {
    console.log('\nErrors (first 5):');
    for (const e of errors.slice(0, 5)) console.log('  ' + e);
    console.log('  If a model name was rejected, run: npx tsx scripts/aeo-probe.ts --list-models');
  }
}

main().catch((e) => {
  console.error('FATAL:', e instanceof Error ? e.message : e);
  process.exit(1);
});
