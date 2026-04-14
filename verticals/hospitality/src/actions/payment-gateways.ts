'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireOrgRoles } from '../auth/access'
import {
  saveCredentials,
  deleteCredentials,
  validateCredentials,
  updateValidationStatus,
} from '../stubs/integrations/credentials'
import type { CredentialProvider } from '../stubs/integrations/credentials'
import type { GatewayType, Json } from '../types/database'

// ---------------------------------------------------------------------------
// Credential Management
// ---------------------------------------------------------------------------

function getOctoratePropertyId(credentials: Record<string, unknown>): string | null {
  const entityId = credentials.property_id_external
  return typeof entityId === 'string' && entityId.trim() ? entityId.trim() : null
}

async function syncOctorateChannelConnection(
  organizationId: string,
  credentials: Record<string, unknown>
) {
  const supabase = await createServerSupabaseClient()
  const entityId = getOctoratePropertyId(credentials)

  const { data: existingRows } = await supabase
    .from('channel_connections')
    .select('id')
    .eq('entity_id', organizationId)
    .eq('channel_name', 'octorate')
    .order('updated_at', { ascending: false })
    .limit(1)

  const existingConnection = existingRows?.[0] ?? null
  const payload = {
    credentials: credentials as Json,
    property_id_external: entityId,
    is_active: Boolean(entityId),
    updated_at: new Date().toISOString(),
  }

  if (existingConnection) {
    const { error } = await supabase
      .from('channel_connections')
      .update(payload)
      .eq('id', existingConnection.id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  const { error } = await supabase
    .from('channel_connections')
    .insert({
      entity_id: organizationId,
      channel_name: 'octorate',
      settings: {},
      ...payload,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

async function disableOctorateChannelConnection(organizationId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('channel_connections')
    .update({
      is_active: false,
      property_id_external: null,
      credentials: {},
      updated_at: new Date().toISOString(),
    })
    .eq('entity_id', organizationId)
    .eq('channel_name', 'octorate')

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function saveIntegrationCredentials(
  provider: CredentialProvider,
  credentials: Record<string, unknown>
) {
  const { property } = await requireOrgRoles(['owner', 'manager'])
  const typedCredentials = credentials as never

  // Validate first
  const validation = await validateCredentials(property.id, provider, typedCredentials)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const result = await saveCredentials(property.id, provider, typedCredentials)

  if (result.success) {
    await updateValidationStatus(property.id, provider, 'valid')
    if (provider === 'octorate') {
      const syncResult = await syncOctorateChannelConnection(property.id, credentials)
      if (!syncResult.success) {
        return syncResult
      }
    }
  }

  return result
}

export async function removeIntegrationCredentials(provider: CredentialProvider) {
  const { property } = await requireOrgRoles(['owner', 'manager'])

  const result = await deleteCredentials(property.id, provider)
  if (!result.success) {
    return result
  }

  if (provider === 'octorate') {
    return disableOctorateChannelConnection(property.id)
  }

  return result
}

export async function getIntegrationCredentials() {
  const { property } = await requireOrgRoles(['owner', 'manager'])

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('organization_credentials')
    .select('provider, is_active, validation_status, last_validated_at, updated_at')
    .eq('entity_id', property.id)

  return (data ?? []).map((c) => ({
    provider: c.provider as CredentialProvider,
    is_active: c.is_active,
    validation_status: c.validation_status,
    last_validated_at: c.last_validated_at,
    updated_at: c.updated_at,
  }))
}

// ---------------------------------------------------------------------------
// Payment Gateway Management
// ---------------------------------------------------------------------------

export async function getPaymentGateways() {
  const { property } = await requireOrgRoles(['owner', 'manager'])

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('entity_id', property.id)
    .order('display_order', { ascending: true })

  return data ?? []
}

export async function upsertPaymentGateway(
  gatewayType: GatewayType,
  params: {
    is_enabled: boolean
    display_name?: string
    display_order?: number
    config?: Json
  }
) {
  const { property } = await requireOrgRoles(['owner', 'manager'])

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('payment_gateways')
    .upsert(
      {
        entity_id: property.id,
        gateway_type: gatewayType,
        is_enabled: params.is_enabled,
        display_name: params.display_name || null,
        display_order: params.display_order ?? 0,
        config: params.config ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entity_id,gateway_type' }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function togglePaymentGateway(gatewayType: GatewayType, enabled: boolean) {
  const { property } = await requireOrgRoles(['owner', 'manager'])

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('payment_gateways')
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('entity_id', property.id)
    .eq('gateway_type', gatewayType)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
