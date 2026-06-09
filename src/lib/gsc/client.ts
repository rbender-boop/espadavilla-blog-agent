/**
 * Google Search Console API client — Phase 3.
 *
 * Auth model (see docs/GSC-SETUP-2026-06-09.md): a service account using
 * DOMAIN-WIDE DELEGATION to IMPERSONATE a Workspace user who owns the GSC
 * properties. The GSC UI silently rejects service-account emails as property
 * users, so the SA must act AS rbender@fortisnetlease.com via `subject`.
 *
 * Lean on purpose: uses `google-auth-library` (JWT) for signing + a thin REST
 * call via the client's own `.request()` — no heavyweight `googleapis` package.
 *
 * Env (all set in Vercel Production + .env.local):
 *   GSC_SERVICE_ACCOUNT_JSON  — base64 of the SA key JSON (secret)
 *   GSC_IMPERSONATED_SUBJECT  — Workspace user to impersonate (e.g. rbender@fortisnetlease.com)
 *   GSC_SITE_URL              — e.g. sc-domain:golfvilla.com
 */

import { JWT } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const API = 'https://searchconsole.googleapis.com/webmasters/v3';

type ServiceAccountKey = { client_email: string; private_key: string };

/** Decode + validate the base64 service-account key from env. */
function loadServiceAccount(): ServiceAccountKey {
  const b64 = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!b64) throw new Error('GSC_SERVICE_ACCOUNT_JSON not set');
  let json: Partial<ServiceAccountKey>;
  try {
    json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  } catch {
    throw new Error('GSC_SERVICE_ACCOUNT_JSON is not valid base64-encoded JSON');
  }
  if (!json.client_email || !json.private_key) {
    throw new Error('GSC service-account JSON missing client_email / private_key');
  }
  return { client_email: json.client_email, private_key: json.private_key };
}

let _client: JWT | null = null;

/** Build (once) the impersonating JWT client. Without `subject` the SA has no GSC access. */
function getJwt(): JWT {
  if (_client) return _client;
  const sa = loadServiceAccount();
  const subject = process.env.GSC_IMPERSONATED_SUBJECT;
  if (!subject) {
    throw new Error('GSC_IMPERSONATED_SUBJECT not set — the SA must impersonate a property owner');
  }
  _client = new JWT({ email: sa.client_email, key: sa.private_key, scopes: [SCOPE], subject });
  return _client;
}

export type GscSite = { siteUrl: string; permissionLevel: string };

/** List the GSC properties the impersonated user can see. Proves delegation works. */
export async function listGscSites(): Promise<GscSite[]> {
  const res = await getJwt().request<{ siteEntry?: GscSite[] }>({ url: `${API}/sites` });
  return res.data.siteEntry ?? [];
}

export type GscRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchAnalyticsOpts = {
  siteUrl?: string;       // defaults to GSC_SITE_URL
  startDate?: string;     // YYYY-MM-DD; default 90d ago
  endDate?: string;       // YYYY-MM-DD; default today
  rowLimit?: number;      // default 250
  dimensions?: string[];  // default ['query']
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

type RawRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

/** Query the Search Analytics API. Default: top queries over the last 90 days. */
export async function querySearchAnalytics(opts: SearchAnalyticsOpts = {}): Promise<GscRow[]> {
  const siteUrl = opts.siteUrl ?? process.env.GSC_SITE_URL;
  if (!siteUrl) throw new Error('GSC_SITE_URL not set and no siteUrl passed');
  const body = {
    startDate: opts.startDate ?? isoDaysAgo(90),
    endDate: opts.endDate ?? isoDaysAgo(0),
    dimensions: opts.dimensions ?? ['query'],
    rowLimit: opts.rowLimit ?? 250,
  };
  const res = await getJwt().request<{ rows?: RawRow[] }>({
    url: `${API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    method: 'POST',
    data: body,
  });
  return (res.data.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? '',
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}
