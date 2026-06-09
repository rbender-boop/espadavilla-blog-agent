/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions default to same-origin; do NOT allow '*' here — that
  // disables CSRF protection for every form on the dashboard.
  reactStrictMode: true,
  poweredByHeader: false,

  // Conservative security headers for the dashboard surface. Skipping strict CSP
  // here — Next.js inline runtime scripts require a script-src 'self' 'unsafe-inline'
  // workaround that defeats the policy; leaving CSP for a dedicated pass.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
export default nextConfig;
