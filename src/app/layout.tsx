/**
 * Root layout — minimal. Most routes (cron, webhooks, inbound) are API
 * handlers and never render HTML. A dashboard subtree can be added later.
 */
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Villa Espada Blog Agent',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b3d2e" />
      </head>
      <body style={{ margin: 0, background: '#fafafa', color: '#1d1d1f' }}>{children}</body>
    </html>
  );
}
