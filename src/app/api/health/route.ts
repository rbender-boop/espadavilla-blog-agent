/**
 * Health check — reports which env vars are wired (booleans only, never the
 * values) so a deploy can be sanity-checked without leaking secrets. No auth:
 * it exposes presence, not content.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function present(name: string): boolean {
  const v = process.env[name];
  return typeof v === 'string' && v.length > 0;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'golfvilla-blog-agent',
    time: new Date().toISOString(),
    env: {
      ANTHROPIC_API_KEY: present('ANTHROPIC_API_KEY'),
      SUPABASE_URL: present('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: present('SUPABASE_SERVICE_ROLE_KEY'),
      UNIPILE_API_KEY: present('UNIPILE_API_KEY'),
      UNIPILE_DSN: present('UNIPILE_DSN'),
      UNIPILE_WHATSAPP_ACCOUNT_ID: present('UNIPILE_WHATSAPP_ACCOUNT_ID'),
      UNIPILE_WHATSAPP_OWNER_NUMBER: present('UNIPILE_WHATSAPP_OWNER_NUMBER'),
      INBOUND_RESOLVE_SECRET: present('INBOUND_RESOLVE_SECRET'),
      GITHUB_TOKEN_GOLFVILLA: present('GITHUB_TOKEN_GOLFVILLA'),
      GOLFVILLA_REPO: present('GOLFVILLA_REPO'),
      CRON_SECRET: present('CRON_SECRET'),
    },
  });
}
