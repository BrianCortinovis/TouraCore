import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@touracore/api",
    "@touracore/types",
    "@touracore/db",
    "@touracore/config",
    "@touracore/auth",
    "@touracore/tenants",
    "@touracore/roles",
    "@touracore/billing",
    "@touracore/booking",
    "@touracore/pricing",
    "@touracore/portals",
    "@touracore/seo",
    "@touracore/media",
    "@touracore/audit",
    "@touracore/settings",
    "@touracore/notifications",
    "@touracore/agency",
    "@touracore/integrations",
    "@touracore/admin-framework",
    "@touracore/widget",
    "@touracore/security",
    "@touracore/ui",
    "@touracore/hospitality",
    "@touracore/legal",
    "@touracore/agency",
    "@touracore/hospitality-config",
    "@touracore/compliance",
  ],
  // Allow 50MB uploads via server actions (photo pipeline)
  experimental: {
    serverActions: {
      bodySizeLimit: '55mb',
    },
  },
  // R2 public hostnames for remote images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'cdn.touracore.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Security headers (HSTS/CSP/XFO/Referrer/Permissions/CTO) are applied by the
  // middleware via @touracore/security `applySecurityHeaders`. This `headers()`
  // export only adds SEO-specific cache hints + a DNS prefetch nudge for routes
  // the middleware does not customize.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }],
      },
      {
        source: '/s/:tenantSlug/:entitySlug',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ]
  },
};

export default nextConfig;
