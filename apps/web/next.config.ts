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
    ],
  },
};

export default nextConfig;
