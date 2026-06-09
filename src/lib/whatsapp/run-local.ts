/**
 * Local WhatsApp sender — `bun run send:drafts`.
 *
 * Sends all currently-pending, non-flagged drafts to Rob via WhatsApp and logs
 * approval rows. Use after `draft:local` to exercise the real approval loop.
 *
 * Requires UNIPILE_* + SUPABASE_* env vars set in .env.local.
 */

import 'dotenv/config';
import { sendAllPendingDrafts } from './send-draft';

async function main() {
  const results = await sendAllPendingDrafts();
  if (results.length === 0) {
    console.log('No pending (non-flagged) drafts to send.');
    return;
  }
  console.log(`Sent ${results.length} draft(s) for approval:`);
  for (const r of results) {
    console.log(`  draft ${r.draft_id} → approval ${r.approval_id} (chat ${r.unipile_chat_id ?? 'n/a'})`);
  }
  console.log('\nReply "yes" / "no" / or paste an edit in WhatsApp.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
