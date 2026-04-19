import 'server-only'
import { createPublicClient } from '@/lib/supabase-public'
import { BRAND_CONFIG, HQ_VAT, HQ_REA } from '@/config/brand'

export interface TenantLegalInfo {
  legal_name: string
  vat_number: string | null
  fiscal_code: string | null
  rea: string | null
  address: string
  country: string
  source: 'tenant' | 'hq'
}

// Resolve legal entity info for tenant — fallback to HQ config
export async function resolveTenantLegal(
  tenantSlug: string | null | undefined
): Promise<TenantLegalInfo> {
  if (!tenantSlug) return fallbackHQ()

  try {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('tenants')
      .select('name,legal_details,billing_address_line1,billing_city,billing_postal_code,billing_country,country')
      .eq('slug', tenantSlug)
      .single()

    if (error || !data) return fallbackHQ()

    const ld = (data.legal_details ?? {}) as Record<string, unknown>
    const legalName = (ld['legal_name'] as string) ?? data.name
    const vat = (ld['vat_number'] as string) ?? null
    const fc = (ld['fiscal_code'] as string) ?? null
    const rea = (ld['rea'] as string) ?? null

    // Skip tenant record if required fields missing — fallback
    if (!vat && !fc) return fallbackHQ()

    const address = [
      data.billing_address_line1,
      data.billing_city,
      data.billing_postal_code,
      data.billing_country ?? data.country,
    ]
      .filter(Boolean)
      .join(', ')

    return {
      legal_name: legalName,
      vat_number: vat,
      fiscal_code: fc,
      rea,
      address: address || BRAND_CONFIG.established_address,
      country: data.country ?? 'IT',
      source: 'tenant',
    }
  } catch {
    return fallbackHQ()
  }
}

function fallbackHQ(): TenantLegalInfo {
  return {
    legal_name: BRAND_CONFIG.data_controller,
    vat_number: HQ_VAT,
    fiscal_code: null,
    rea: HQ_REA || null,
    address: BRAND_CONFIG.established_address,
    country: 'IT',
    source: 'hq',
  }
}
