import type { SubProcessor } from './types';

// Canonical list — sync with /legal/sub-processors page + DPA
export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Database PostgreSQL, Auth, Storage backup',
    country: 'US (EU-US DPF)',
    dpa_url: 'https://supabase.com/legal/dpa',
    transfer_mechanism: 'DPF',
    data_categories: ['account', 'reservations', 'media', 'audit'],
  },
  {
    name: 'Vercel Inc.',
    purpose: 'Edge hosting, CDN, serverless functions',
    country: 'US (EU-US DPF)',
    dpa_url: 'https://vercel.com/legal/dpa',
    transfer_mechanism: 'DPF',
    data_categories: ['request logs', 'analytics'],
  },
  {
    name: 'Cloudflare Inc.',
    purpose: 'R2 object storage per media CMS',
    country: 'US (EU-US DPF)',
    dpa_url: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    transfer_mechanism: 'DPF',
    data_categories: ['media files', 'uploads'],
  },
  {
    name: 'Stripe Payments Europe Ltd.',
    purpose: 'Processing pagamenti, fatturazione',
    country: 'IE (EU)',
    dpa_url: 'https://stripe.com/legal/dpa',
    transfer_mechanism: 'EU',
    data_categories: ['payment tokens', 'billing address', 'transactions'],
  },
  {
    name: 'Resend Inc.',
    purpose: 'Email transazionali + marketing',
    country: 'US (SCC)',
    dpa_url: 'https://resend.com/legal/dpa',
    transfer_mechanism: 'SCC',
    data_categories: ['email', 'message content', 'delivery status'],
  },
  {
    name: 'Twilio Inc.',
    purpose: 'SMS + WhatsApp Business',
    country: 'US (EU-US DPF)',
    dpa_url: 'https://www.twilio.com/legal/data-protection-addendum',
    transfer_mechanism: 'DPF',
    data_categories: ['phone number', 'message content'],
  },
  {
    name: 'Meta Platforms Ireland Ltd.',
    purpose: 'WhatsApp Business Cloud API, Meta Pixel (opt-in)',
    country: 'IE (EU) / US (SCC per trasferimenti)',
    dpa_url: 'https://www.whatsapp.com/legal/business-data-transfer-addendum',
    transfer_mechanism: 'SCC',
    data_categories: ['phone number', 'messaging metadata'],
  },
  {
    name: 'Google Ireland Ltd.',
    purpose: 'Google Analytics 4, Ads (solo con consenso utente)',
    country: 'IE (EU) / US (SCC)',
    dpa_url: 'https://business.safety.google/adsprocessorterms/',
    transfer_mechanism: 'SCC',
    data_categories: ['usage data', 'cookies', 'IP anonimizzato'],
  },
  {
    name: 'Sentry (Functional Software Inc.)',
    purpose: 'Error monitoring + performance tracing',
    country: 'US (SCC)',
    dpa_url: 'https://sentry.io/legal/dpa/',
    transfer_mechanism: 'SCC',
    data_categories: ['error stacks', 'session metadata'],
  },
  {
    name: 'OpenAI Ireland Ltd.',
    purpose: 'AI features opzionali (generation, summarization) — opt-in tenant',
    country: 'IE (EU) / US (SCC)',
    dpa_url: 'https://openai.com/policies/data-processing-addendum/',
    transfer_mechanism: 'SCC',
    data_categories: ['user prompts', 'generated content'],
  },
];

export function getSubProcessors(): SubProcessor[] {
  return SUB_PROCESSORS;
}

export function getSubProcessorsByCategory(category: string): SubProcessor[] {
  return SUB_PROCESSORS.filter((sp) =>
    sp.data_categories.some((c) => c.toLowerCase().includes(category.toLowerCase()))
  );
}
