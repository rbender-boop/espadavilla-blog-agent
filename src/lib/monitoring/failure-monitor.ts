/**
 * failure-monitor.ts — hourly digest of unnotified agent failures.
 *
 * Queries blog_agent_runs for status='failure' rows in the last 2h where
 * error_notified_at IS NULL, sends one WhatsApp digest, then marks them
 * notified. If the WhatsApp send fails, rows stay unnotified so next hour
 * retries (no lost alerts). A successful monitor run never appears in its own
 * query, so there's no self-amplifying loop.
 */

import { supabase } from '../supabase';
import { sendWhatsAppToOwner } from '../unipile';
import { APP_BASE_URL } from '../config';

export type FailureRow = { id: string; run_type: string | null; started_at: string; error_message: string | null };

const QUERY_WINDOW_HOURS = 2;
const MAX_IN_DIGEST = 10;
const MAX_ERR_CHARS = 240;

export async function fetchUnnotifiedFailures(): Promise<FailureRow[]> {
  const cutoff = new Date(Date.now() - QUERY_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('blog_agent_runs')
    .select('id, run_type, started_at, error_message')
    .eq('status', 'failure')
    .is('error_notified_at', null)
    .gte('started_at', cutoff)
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(`fetchUnnotifiedFailures: ${error.message}`);
  return (data ?? []) as FailureRow[];
}

function formatTimestampEt(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(new Date(iso));
}

/** Pure function — build the digest body. */
export function formatFailureDigest(failures: FailureRow[], dashboardUrl: string = APP_BASE_URL): string {
  if (failures.length === 0) return '';
  const lines: string[] = [];
  lines.push(`🚨 ${failures.length === 1 ? '1 blog-agent failure' : `${failures.length} blog-agent failures`} — last ${QUERY_WINDOW_HOURS}h`);
  lines.push('');
  for (const f of failures.slice(0, MAX_IN_DIGEST)) {
    lines.push(`[${formatTimestampEt(f.started_at)}] ${f.run_type ?? 'unknown'}`);
    const msg = (f.error_message ?? '(no error_message recorded)').trim();
    lines.push(`  ${msg.length > MAX_ERR_CHARS ? msg.slice(0, MAX_ERR_CHARS) + '…' : msg}`);
    lines.push('');
  }
  const hidden = failures.length - Math.min(failures.length, MAX_IN_DIGEST);
  if (hidden > 0) { lines.push(`… and ${hidden} more.`); lines.push(''); }
  lines.push(`Logs: ${dashboardUrl}`);
  return lines.join('\n');
}

export async function markAsNotified(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('blog_agent_runs')
    .update({ error_notified_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw new Error(`markAsNotified: ${error.message}`);
}

export type MonitorResult = { failures_found: number; notified: number; whatsapp_sent: boolean };

export async function runFailureMonitor(): Promise<MonitorResult> {
  const failures = await fetchUnnotifiedFailures();
  if (failures.length === 0) return { failures_found: 0, notified: 0, whatsapp_sent: false };

  try {
    await sendWhatsAppToOwner(formatFailureDigest(failures));
  } catch (err) {
    throw new Error(`failure-monitor WhatsApp send failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  await markAsNotified(failures.map((f) => f.id));
  return { failures_found: failures.length, notified: failures.length, whatsapp_sent: true };
}
