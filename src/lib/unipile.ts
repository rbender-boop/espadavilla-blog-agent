/**
 * Unipile API client — WhatsApp only.
 *
 * This is a deliberately slim port of the LinkedIn agent's unipile.ts. The blog
 * agent uses WhatsApp solely as the approval channel; all LinkedIn machinery
 * (posting, invites, search, DMs, feed) is dropped, and so is the LinkedIn
 * account-safety circuit-breaker — committing to our own repo carries no
 * ToS/anomaly risk (build spec §4).
 *
 * The WhatsApp account is SHARED with the LinkedIn agent (same DSN + API key),
 * differentiated by account_id. Env vars are read lazily (inside functions) so
 * this module is safe to import before dotenv has loaded.
 */

function env(name: string, required = true): string {
  const v = process.env[name];
  if (required && !v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v ?? '';
}

async function unipileFetch<T>(method: string, path: string, body?: unknown): Promise<T> {
  const dsn = env('UNIPILE_DSN');
  const apiKey = env('UNIPILE_API_KEY');

  const headers: Record<string, string> = {
    'X-API-KEY': apiKey,
    'accept': 'application/json',
  };
  if (body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${dsn}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unipile ${method} ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// =========================================
// WHATSAPP — approval channel
// =========================================

/** Unipile uses different ID shapes for create-chat vs send-to-existing-chat */
export type SendMessageResult = {
  object?: string;
  chat_id?: string;
  message_id?: string;
  id?: string;
};

export async function sendWhatsAppToOwner(message: string): Promise<SendMessageResult> {
  const accountId = env('UNIPILE_WHATSAPP_ACCOUNT_ID');
  const ownerNumber = env('UNIPILE_WHATSAPP_OWNER_NUMBER');

  const cleanNumber = ownerNumber.replace(/[^\d]/g, '');
  const attendeeId = `${cleanNumber}@s.whatsapp.net`;

  return unipileFetch<SendMessageResult>('POST', '/api/v1/chats', {
    account_id: accountId,
    attendees_ids: [attendeeId],
    text: message,
  });
}

// =========================================
// HEALTH CHECK
// =========================================

/** Unipile returns connection_params.im.status for messaging providers */
export type UnipileAccount = {
  id: string;
  type: string;
  name?: string;
  sources?: Array<{ id: string; status: string }>;
  connection_params?: {
    im?: { status?: string };
    mail?: { status?: string };
  };
};

export async function listAccounts(): Promise<{ items: UnipileAccount[] }> {
  return unipileFetch<{ items: UnipileAccount[] }>('GET', '/api/v1/accounts');
}

/** Extracts a human-readable status from a Unipile account object */
export function accountStatus(acct: UnipileAccount): string {
  if (acct.sources && acct.sources.length > 0) {
    return acct.sources.map((s) => s.status).join(',');
  }
  return acct.connection_params?.im?.status ?? acct.connection_params?.mail?.status ?? 'unknown';
}

// =========================================
// GENERIC CHAT FETCH — used by webhook self-chat detection (Phase 3)
// =========================================

export type UnipileChatAttendee = {
  id?: string;
  attendee_id?: string;
  provider_id?: string;
  attendee_provider_id?: string;
  name?: string;
};

export type UnipileChat = {
  id: string;
  account_id?: string;
  account_type?: string;       // 'WHATSAPP' | 'LINKEDIN' | etc.
  type?: string | number;
  unread_count?: number;
  updated_at?: string;
  // Unipile's WhatsApp chat response uses root-level `provider_id` for the
  // other participant's phone-style id (e.g. "17347556357@s.whatsapp.net").
  // In self-chat this is the connected account owner's own number. Primary
  // discriminator for self-chat vs friend-chat.
  provider_id?: string;
  attendee_public_identifier?: string;
  attendee_provider_id?: string;
  attendees?: UnipileChatAttendee[];
  attendee_provider_ids?: string[];
};

/**
 * Fetch a single Unipile chat by id. Used by the inbound flow to determine
 * whether a WhatsApp event is from the self-chat or another conversation.
 */
export async function getUnipileChat(chatId: string): Promise<UnipileChat> {
  return unipileFetch<UnipileChat>('GET', `/api/v1/chats/${encodeURIComponent(chatId)}`);
}
