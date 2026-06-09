/**
 * Shared auth helpers — constant-time Bearer and shared-secret comparisons.
 *
 * Standard `===`/`!==` on secrets leaks length and early-mismatch position
 * via timing. Use these helpers in every route that compares a secret.
 *
 * - isAuthorizedCron: gates Vercel cron routes against env.CRON_SECRET.
 * - isAuthorizedInboundResolve: gates POST /api/inbound/resolve (the forward
 *   call from the LinkedIn agent's webhook — build spec §6) against
 *   env.INBOUND_RESOLVE_SECRET. Fails closed if the env var is unset.
 */

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Returns true iff the request carries the configured CRON_SECRET as a Bearer. */
export function isAuthorizedCron(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = req.headers.get('authorization') ?? '';
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return false;

  const provided = authHeader.slice(prefix.length);
  return constantTimeEqual(provided, expected);
}

/**
 * Returns true iff the request carries the configured INBOUND_RESOLVE_SECRET.
 * Accepts it as a Bearer token or in an x-inbound-secret header.
 */
export function isAuthorizedInboundResolve(req: Request): boolean {
  const expected = process.env.INBOUND_RESOLVE_SECRET;
  if (!expected) return false;

  const provided =
    req.headers.get('x-inbound-secret') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    '';

  return constantTimeEqual(provided, expected);
}
