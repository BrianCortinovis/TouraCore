export const SUPPORTED_LOCALES = ['it', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const POLICY_KEYS = ['privacy', 'cookie', 'terms', 'dpa', 'accessibility'] as const;
export type PolicyKey = (typeof POLICY_KEYS)[number];

export interface PolicyVars {
  brand: string;
  data_controller: string;
  established_address: string;
  contact_email: string;
  dpo_email: string;
  last_updated: string; // ISO date YYYY-MM-DD
  policy_version?: string; // auto-injected by renderPolicy
}

export interface RenderedPolicy {
  policy: PolicyKey;
  locale: Locale;
  title: string;
  markdown: string;
  html: string;
  version: string;
  frontmatter: Record<string, string>;
}

export interface SubProcessor {
  name: string;
  purpose: string;
  country: string;
  dpa_url: string;
  transfer_mechanism?: 'DPF' | 'SCC' | 'EU';
  data_categories: string[];
}
