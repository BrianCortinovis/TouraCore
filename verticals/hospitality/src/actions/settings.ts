'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import { getEnabledPlatformPropertyTypes } from '../queries/platform-settings'
import type { PropertyType, FiscalRegime, Json } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateOrganizationData {
  name?: string
  type?: PropertyType
  legal_name?: string | null
  vat_number?: string | null
  fiscal_code?: string | null
  rea_number?: string | null
  address?: string | null
  city?: string | null
  province?: string | null
  zip?: string | null
  country?: string
  email?: string | null
  phone?: string | null
  pec?: string | null
  website?: string | null
  logo_url?: string | null
  default_check_in_time?: string
  default_check_out_time?: string
  default_currency?: string
  default_language?: string
  default_vat_rate?: number
  timezone?: string
  tourist_tax_enabled?: boolean
  tourist_tax_config?: Json
  alloggiati_username?: string | null
  alloggiati_password_encrypted?: string | null
  alloggiati_structure_code?: string | null
  istat_structure_code?: string | null
  istat_region?: string | null
  sdi_code?: string
  invoice_prefix?: string
  invoice_next_number?: number
  receipt_prefix?: string
  receipt_next_number?: number
  primary_color?: string
  secondary_color?: string
  cin_code?: string | null
  cin_expiry?: string | null
  cedolare_secca_enabled?: boolean
  cedolare_secca_rate?: number
  fiscal_regime?: FiscalRegime
  has_vat?: boolean
  is_imprenditoriale?: boolean
  max_units?: number | null
  ateco_code?: string | null
  scia_number?: string | null
  scia_date?: string | null
  insurance_policy_number?: string | null
  insurance_expiry?: string | null
  settings?: Json
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeJsonValues(current: unknown, incoming: unknown): unknown {
  if (typeof incoming === 'undefined') return current

  if (isRecord(current) && isRecord(incoming)) {
    const merged: Record<string, unknown> = { ...current }

    Object.entries(incoming).forEach(([key, value]) => {
      merged[key] = mergeJsonValues(current[key], value)
    })

    return merged
  }

  return incoming
}

/**
 * Partially update an organization's settings.
 */
export async function updateOrganization(id: string, data: UpdateOrganizationData) {
  if (!id) throw new Error('Organization id is required')

  const { property: organization, staff } = await getCurrentOrg()
  const currentOrgId = organization?.id

  if (!currentOrgId || !staff) {
    throw new Error('Unauthorized')
  }

  if (id !== currentOrgId) {
    throw new Error('Cannot update another organization')
  }

  if (!['owner', 'manager'].includes(staff.role)) {
    throw new Error('Insufficient permissions')
  }

  if (data.type && data.type !== organization.type) {
    const enabledTypes = await getEnabledPlatformPropertyTypes()
    if (!enabledTypes.includes(data.type)) {
      throw new Error('This property type is currently disabled by platform administration')
    }
  }

  const payload: UpdateOrganizationData = { ...data }

  if (typeof data.settings !== 'undefined') {
    const currentSettings = isRecord(organization.settings) ? organization.settings : {}
    const nextSettings = isRecord(data.settings) ? data.settings : {}
    payload.settings = mergeJsonValues(currentSettings, nextSettings) as Json
  }

  const supabase = await createServerSupabaseClient()

  const { data: updatedOrganization, error } = await supabase
    .from('entities')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update property: ${error.message}`)

  revalidatePath('/settings')
  revalidatePath('/settings/annuncio')
  revalidatePath('/settings/scheda-struttura')
  revalidatePath('/operations')
  revalidatePath('/channel-manager')
  revalidatePath('/book/[orgSlug]', 'page')

  return updatedOrganization
}
