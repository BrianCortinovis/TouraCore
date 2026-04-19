import type { PolicyKey } from '@touracore/compliance';

// URL-friendly slugs → internal PolicyKey
const SLUG_TO_POLICY: Record<string, PolicyKey> = {
  privacy: 'privacy',
  'privacy-policy': 'privacy',
  cookie: 'cookie',
  'cookie-policy': 'cookie',
  cookies: 'cookie',
  terms: 'terms',
  'terms-of-service': 'terms',
  tos: 'terms',
  dpa: 'dpa',
  'data-processing-agreement': 'dpa',
  accessibility: 'accessibility',
  'accessibility-statement': 'accessibility',
};

// Canonical slug per policy (for canonical URL + sitemap)
export const CANONICAL_SLUG: Record<PolicyKey, string> = {
  privacy: 'privacy',
  cookie: 'cookie-policy',
  terms: 'terms',
  dpa: 'dpa',
  accessibility: 'accessibility-statement',
};

export function resolvePolicySlug(slug: string): PolicyKey | null {
  return SLUG_TO_POLICY[slug] ?? null;
}

export function getAllCanonicalSlugs(): string[] {
  return Object.values(CANONICAL_SLUG);
}
