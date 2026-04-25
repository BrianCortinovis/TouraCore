import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'

export const publicEntityLegalSchema = z.object({
  entity_id: z.string(),
  company_name: z.string().nullable(),
  display_name: z.string().nullable(),
  vat_number: z.string().nullable(),
  rea_number: z.string().nullable(),
  address_street: z.string().nullable(),
  address_city: z.string().nullable(),
  address_zip: z.string().nullable(),
  address_province: z.string().nullable(),
  address_country: z.string().nullable(),
  legal_cin_code: z.string().nullable(),
})
export type PublicEntityLegal = z.infer<typeof publicEntityLegalSchema>

/** Fetch legally-public info (VAT, REA, legal address, CIN) for the entity's
 * operating legal_entity. Anon-safe view filters by public_listings.is_public. */
export async function getPublicEntityLegal(
  supabase: SupabaseClient,
  entityId: string
): Promise<PublicEntityLegal | null> {
  const { data, error } = await supabase
    .from('public_entity_legal_view')
    .select(
      'entity_id, company_name, display_name, vat_number, rea_number, address_street, address_city, address_zip, address_province, address_country, legal_cin_code'
    )
    .eq('entity_id', entityId)
    .maybeSingle()
  if (error || !data) return null
  const parsed = publicEntityLegalSchema.safeParse(data)
  return parsed.success ? parsed.data : null
}

export function formatLegalAddress(legal: PublicEntityLegal): string | null {
  const parts = [
    legal.address_street,
    [legal.address_zip, legal.address_city].filter(Boolean).join(' '),
    legal.address_province,
    legal.address_country,
  ].filter((p): p is string => Boolean(p && p.trim()))
  return parts.length > 0 ? parts.join(', ') : null
}
