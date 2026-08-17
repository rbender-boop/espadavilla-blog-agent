COWORK SCHEDULED-TASK PROMPT — Espadavilla blog post approvals
(paste into a Cowork chat / scheduled task; runs via the Supabase connector,
project qqjrujrrqxtfsuikakuu)

------------------------------------------------------------
Use the Supabase connector (project qqjrujrrqxtfsuikakuu) to run my espadavilla
blog post approvals.

1. Run: select * from v_pending_approvals;
2. For each row show me: the id, cluster/topic_title, meta_title, word_count, and
   the full body_markdown (or edited_content if it's not null — that's a
   previously-saved edit and takes priority over body_markdown). If risk_score is
   >= 1.0, put a "⚠️ FLAGGED" banner above the post with the block_reason before
   showing the content, same as the old WhatsApp warning. Then ask me to approve,
   edit, or reject each one.
3. Act on my answers by running EXACTLY one of these (never UPDATE the table
   directly):
   - Approve as-is:  select approve_post('<id>');
   - Edit & approve: select edit_post('<id>', '<my new text>');
   - Reject:         select reject_post('<id>', '<short reason>');
4. Then report outcomes since yesterday:
   select status, count(*) from blog_post_drafts
   where updated_at > now() - interval '24 hours' group by status;
   Summarize published/failed in one line. If nothing is pending and nothing
   failed, say "all clear."
------------------------------------------------------------

Notes:
- Approving flips the draft to status='approved'; the drain-approved cron (every
  15 min, unchanged — vercel.json "*/15 * * * *") publishes it via a single
  atomic git commit to the espadavilla site repo. IndexNow ping + sitemap/index/
  llms.txt updates happen in that same commit.
- reject_post also returns the post's topic to the queue (status='queued') so the
  topic slot isn't lost — it gets redrafted later.
- edit_post saves your text to edited_content AND approves in one step. The
  publish executor prefers edited_content over body_markdown, so your edit is
  exactly what goes live.
- There is no per-draft image/card to preview: the post's hero image is chosen
  deterministically by slug + cluster at publish time, not stored on the draft.
- Every action is logged to blog_approval_messages (channel='cowork') for audit
  history — the same table the old WhatsApp flow used.
- v_pending_approvals and the three functions are SECURITY DEFINER, pinned
  search_path='', and granted to service_role only (NOT anon/authenticated) — the
  site's public anon key cannot call them. Deliberate deviation from the LinkedIn
  build note ("granted to public"): espadavilla.com is a live public website with
  a public anon key, so granting these to PUBLIC would let anyone read
  unpublished drafts or force-publish/sabotage via /rest/v1/rpc/approve_post etc.
  Cowork's Supabase MCP connection uses elevated project credentials, not the
  anon key, so it is unaffected.
- The awaiting-approval set is pending | sent_for_approval |
  pending_edit_confirmation. Since Cowork skips the (now-disabled) WhatsApp send
  step, most drafts will sit in 'pending' — the view covers all three so nothing
  is missed.
