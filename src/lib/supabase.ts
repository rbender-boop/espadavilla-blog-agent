import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  }
  _client = createClient(url, serviceKey, {
    auth: { persistSession: false },
    // Next.js App Router patches global fetch and caches GET responses by
    // default. supabase-js uses fetch, so reads were served stale — an empty
    // `status=approved` result got cached on an early cron run and every later
    // drain reused it, so approved drafts never published. Force no-store so
    // every query hits PostgREST fresh. (Writes/POSTs were never cached, which
    // is why inserts worked while reads went stale.)
    global: { fetch: (input, init) => fetch(input as RequestInfo, { ...init, cache: 'no-store' }) },
  });
  return _client;
}

/**
 * Lazy proxy — first property access triggers client creation.
 * Lets the module import safely before dotenv has loaded.
 *
 * This points at the DEDICATED blog Supabase project (not the LinkedIn agent's
 * fortisgpt). Every table is blog_*-prefixed; migrations are purely additive.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

// ── Row shapes (mirrors supabase/migrations — see build spec §5) ─────────────
// These are added incrementally as the schema lands in Phase 1. Keeping them
// here gives the drafter/publish layers a single import for types.

export type TopicCluster =
  | 'evergreen'
  | 'tournament'
  | 'tourism'
  | 'luxury_trend'
  | 'comparison'
  | 'seasonal'
  | 'planning';

export type TopicStatus = 'queued' | 'drafting' | 'published' | 'retired';

export type DraftStatus =
  | 'pending'
  | 'sent_for_approval'
  | 'pending_edit_confirmation'
  | 'approved'
  | 'published'
  | 'skipped'
  | 'failed';
