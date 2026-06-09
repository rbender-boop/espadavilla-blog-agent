/**
 * Runtime config — values that may change without code edits. Cadence lives in
 * vercel.json (cron schedule); these are the knobs the app code reads.
 */

/** Hours a draft can sit unanswered before auto-skip (spec §10: 72h). */
export const STALE_DRAFT_HOURS = Number(process.env.STALE_DRAFT_HOURS ?? 72);

/** Public base URL for links in failure digests etc. */
export const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://espadavilla-blog-agent.vercel.app';
