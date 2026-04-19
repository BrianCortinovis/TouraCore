import type { PolicyVars } from '@touracore/compliance';

// Brand config — env override NEXT_PUBLIC_BRAND_* in production
// Defaults are baseline for development/demo
export const BRAND_CONFIG: PolicyVars = {
  brand: process.env['NEXT_PUBLIC_BRAND_NAME'] ?? 'TouraCore',
  data_controller:
    process.env['NEXT_PUBLIC_DATA_CONTROLLER'] ?? 'TouraCore S.r.l.',
  established_address:
    process.env['NEXT_PUBLIC_ESTABLISHED_ADDRESS'] ??
    'Via Example 1, 20100 Milano, Italia',
  contact_email:
    process.env['NEXT_PUBLIC_CONTACT_EMAIL'] ?? 'info@touracore.com',
  dpo_email: process.env['NEXT_PUBLIC_DPO_EMAIL'] ?? 'dpo@touracore.com',
  last_updated: process.env['NEXT_PUBLIC_POLICY_LAST_UPDATED'] ?? '2026-04-19',
};

export const HQ_VAT = process.env['NEXT_PUBLIC_HQ_VAT'] ?? 'P.IVA 00000000000';
export const HQ_REA = process.env['NEXT_PUBLIC_HQ_REA'] ?? '';
