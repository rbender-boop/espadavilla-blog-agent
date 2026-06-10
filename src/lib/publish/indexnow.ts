/**
 * indexnow.ts — instant URL submission to the IndexNow API on publish.
 *
 * IndexNow feeds Bing's index (which powers ChatGPT search / Copilot citations)
 * and other participating engines — high-value for GEO. Google does not consume
 * IndexNow; Google freshness is handled by the sitemap <lastmod> updates.
 *
 * Protocol: the site must serve a key file at https://<host>/<key>.txt whose
 * body is the key itself. commit-post auto-commits that file to the site repo
 * if it's missing, then POSTs the published URLs after each successful commit.
 *
 * Best-effort by design: a ping failure NEVER fails a publish — it logs and
 * returns ok:false. Key comes from env INDEXNOW_KEY; unset → silently skipped.
 */

import { SITE_ORIGIN } from '../links';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

export function indexNowKey(): string | null {
  const k = process.env.INDEXNOW_KEY?.trim();
  return k && /^[a-zA-Z0-9-]{8,128}$/.test(k) ? k : null;
}

/** Repo path of the IndexNow key file (site root). */
export function indexNowKeyPath(key: string): string {
  return `${key}.txt`;
}

export type IndexNowResult = { ok: boolean; status?: number; skipped?: string };

export async function pingIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = indexNowKey();
  if (!key) return { ok: false, skipped: 'INDEXNOW_KEY not set' };
  const urlList = urls.filter((u) => u.startsWith(SITE_ORIGIN));
  if (urlList.length === 0) return { ok: false, skipped: 'no on-site urls' };

  const host = new URL(SITE_ORIGIN).hostname;
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${SITE_ORIGIN}/${indexNowKeyPath(key)}`,
        urlList,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    // 200 = ok, 202 = accepted (key validation pending) — both fine.
    const ok = res.status === 200 || res.status === 202;
    if (!ok) console.warn(`[indexnow] ping returned HTTP ${res.status}`);
    return { ok, status: res.status };
  } catch (err) {
    console.warn('[indexnow] ping failed (best-effort):', err instanceof Error ? err.message : String(err));
    return { ok: false };
  }
}
