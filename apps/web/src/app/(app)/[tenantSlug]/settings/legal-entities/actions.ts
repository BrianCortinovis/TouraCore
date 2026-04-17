'use server'

import { createServerSupabaseClient } from '@touracore/db/server'
import { revalidatePath } from 'next/cache'

export interface CreateLegalEntityInput {
  tenantId: string
  tenantSlug: string
  type: 'private' | 'business' | 'occasionale'
  displayName: string
  fiscalCode: string
  vatNumber?: string | null
  companyName?: string | null
  legalForm?: string | null
  fiscalRegime: string
  sdiRecipientCode?: string | null
  sdiPec?: string | null
  rtDeviceSerial?: string | null
  rtProvider?: string | null
  cinCode?: string | null
  cinRegionCode?: string | null
  addressStreet?: string | null
  addressCity?: string | null
  addressZip?: string | null
  addressProvince?: string | null
  iban?: string | null
  isDefault?: boolean
}

export async function createLegalEntity(input: CreateLegalEntityInput) {
  const supabase = await createServerSupabaseClient()

  // Se is_default=true, demote altri default
  if (input.isDefault) {
    await supabase
      .from('legal_entities')
      .update({ is_default: false })
      .eq('tenant_id', input.tenantId)
  }

  const { data, error } = await supabase
    .from('legal_entities')
    .insert({
      tenant_id: input.tenantId,
      type: input.type,
      display_name: input.displayName,
      fiscal_code: input.fiscalCode.toUpperCase().trim(),
      vat_number: input.vatNumber?.trim() || null,
      company_name: input.companyName?.trim() || null,
      legal_form: input.legalForm || null,
      fiscal_regime: input.fiscalRegime,
      sdi_recipient_code: input.sdiRecipientCode?.trim() || null,
      sdi_pec: input.sdiPec?.trim() || null,
      rt_device_serial: input.rtDeviceSerial?.trim() || null,
      rt_provider: input.rtProvider || null,
      cin_code: input.cinCode?.trim() || null,
      cin_region_code: input.cinRegionCode?.trim() || null,
      address_street: input.addressStreet?.trim() || null,
      address_city: input.addressCity?.trim() || null,
      address_zip: input.addressZip?.trim() || null,
      address_province: input.addressProvince?.toUpperCase().trim() || null,
      iban: input.iban?.trim() || null,
      is_default: input.isDefault ?? false,
      is_active: true,
    })
    .select()
    .single()

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/${input.tenantSlug}/settings/legal-entities`)
  return { success: true as const, data }
}

export interface UpdateLegalEntityInput extends Partial<CreateLegalEntityInput> {
  id: string
  tenantSlug: string
}

export async function updateLegalEntity(input: UpdateLegalEntityInput) {
  const supabase = await createServerSupabaseClient()

  if (input.isDefault) {
    const { data: current } = await supabase
      .from('legal_entities')
      .select('tenant_id')
      .eq('id', input.id)
      .single()
    if (current) {
      await supabase
        .from('legal_entities')
        .update({ is_default: false })
        .eq('tenant_id', current.tenant_id as string)
        .neq('id', input.id)
    }
  }

  const update: Record<string, unknown> = {}
  const map: Record<string, keyof UpdateLegalEntityInput> = {
    display_name: 'displayName',
    fiscal_code: 'fiscalCode',
    vat_number: 'vatNumber',
    company_name: 'companyName',
    legal_form: 'legalForm',
    fiscal_regime: 'fiscalRegime',
    sdi_recipient_code: 'sdiRecipientCode',
    sdi_pec: 'sdiPec',
    rt_device_serial: 'rtDeviceSerial',
    rt_provider: 'rtProvider',
    cin_code: 'cinCode',
    cin_region_code: 'cinRegionCode',
    address_street: 'addressStreet',
    address_city: 'addressCity',
    address_zip: 'addressZip',
    address_province: 'addressProvince',
    iban: 'iban',
    is_default: 'isDefault',
  }
  for (const [dbKey, inputKey] of Object.entries(map)) {
    if (input[inputKey] !== undefined) update[dbKey] = input[inputKey]
  }

  const { error } = await supabase
    .from('legal_entities')
    .update(update)
    .eq('id', input.id)

  if (error) return { success: false as const, error: error.message }
  revalidatePath(`/${input.tenantSlug}/settings/legal-entities`)
  return { success: true as const }
}

export async function deleteLegalEntity(id: string, tenantSlug: string) {
  const supabase = await createServerSupabaseClient()

  const { count } = await supabase
    .from('entities')
    .select('*', { count: 'exact', head: true })
    .eq('legal_entity_id', id)

  if ((count ?? 0) > 0) {
    return {
      success: false as const,
      error: `Impossibile eliminare: ${count} entità collegate. Sposta prima le entità su altro soggetto fiscale.`,
    }
  }

  const { error } = await supabase.from('legal_entities').delete().eq('id', id)
  if (error) return { success: false as const, error: error.message }

  revalidatePath(`/${tenantSlug}/settings/legal-entities`)
  return { success: true as const }
}

export async function assignEntityToLegalEntity(
  entityId: string,
  legalEntityId: string,
  tenantSlug: string,
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('entities')
    .update({ legal_entity_id: legalEntityId })
    .eq('id', entityId)

  if (error) return { success: false as const, error: error.message }

  revalidatePath(`/${tenantSlug}/settings/legal-entities`)
  return { success: true as const }
}
