import { createServerSupabaseClient } from '@touracore/db'
import type { BikeChannelProvider } from '../channels/types'

export interface ChannelConnectionRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  provider: BikeChannelProvider
  provider_product_id: string | null
  provider_supplier_id: string | null
  provider_credentials: Record<string, unknown>
  integration_mode: 'push_pull' | 'webhook' | 'polling' | 'passive'
  sync_enabled: boolean
  commission_rate: number | null
  commission_included_in_price: boolean
  pricing_strategy: 'parity' | 'markup' | 'markdown' | 'custom'
  pricing_adjustment: number
  currency: string
  cutoff_minutes: number
  last_availability_push_at: string | null
  last_booking_pull_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ChannelProductMappingRow {
  id: string
  connection_id: string
  tenant_id: string
  bike_type_id: string
  external_product_id: string
  external_rate_plan_id: string | null
  external_product_name: string | null
  inventory_allocation: number | null
  rate_override: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ChannelInboundBookingRow {
  id: string
  connection_id: string
  tenant_id: string
  provider: string
  external_booking_ref: string
  raw_payload: Record<string, unknown>
  status: 'pending' | 'mapped' | 'converted' | 'failed' | 'cancelled' | 'dedup_skipped'
  reservation_id: string | null
  received_at: string
  processed_at: string | null
  error_message: string | null
}

export interface ChannelSyncLogRow {
  id: number
  connection_id: string | null
  tenant_id: string | null
  operation: string
  direction: 'outbound' | 'inbound' | null
  http_status: number | null
  success: boolean | null
  request_summary: Record<string, unknown> | null
  response_summary: Record<string, unknown> | null
  error_message: string | null
  duration_ms: number | null
  created_at: string
}

export async function listChannelConnections(params: {
  bikeRentalId: string
}): Promise<ChannelConnectionRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_channel_connections')
    .select('*')
    .eq('bike_rental_id', params.bikeRentalId)
    .order('created_at', { ascending: false })
  return (data as ChannelConnectionRow[] | null) ?? []
}

export async function getChannelConnection(params: {
  id: string
}): Promise<ChannelConnectionRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_channel_connections')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  return (data as ChannelConnectionRow | null) ?? null
}

export async function createChannelConnection(params: {
  bikeRentalId: string
  tenantId: string
  provider: BikeChannelProvider
  credentials: Record<string, unknown>
  supplierId?: string
}): Promise<ChannelConnectionRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_channel_connections')
    .insert({
      bike_rental_id: params.bikeRentalId,
      tenant_id: params.tenantId,
      provider: params.provider,
      provider_supplier_id: params.supplierId ?? null,
      provider_credentials: params.credentials,
      sync_enabled: false,
    })
    .select('*')
    .maybeSingle()
  return (data as ChannelConnectionRow | null) ?? null
}

export async function toggleSync(params: { id: string; enabled: boolean }): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('bike_channel_connections')
    .update({ sync_enabled: params.enabled })
    .eq('id', params.id)
  return !error
}

export async function listProductMappings(params: {
  connectionId: string
}): Promise<ChannelProductMappingRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_channel_product_mappings')
    .select('*')
    .eq('connection_id', params.connectionId)
    .order('created_at', { ascending: true })
  return (data as ChannelProductMappingRow[] | null) ?? []
}

export async function listInboundBookings(params: {
  connectionId?: string
  tenantId?: string
  status?: string
  limit?: number
}): Promise<ChannelInboundBookingRow[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('bike_channel_bookings_inbound')
    .select('*')
    .order('received_at', { ascending: false })
  if (params.connectionId) q = q.eq('connection_id', params.connectionId)
  if (params.tenantId) q = q.eq('tenant_id', params.tenantId)
  if (params.status) q = q.eq('status', params.status)
  if (params.limit) q = q.limit(params.limit)
  const { data } = await q
  return (data as ChannelInboundBookingRow[] | null) ?? []
}

export async function listSyncLogs(params: {
  connectionId: string
  limit?: number
}): Promise<ChannelSyncLogRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_channel_sync_logs')
    .select('*')
    .eq('connection_id', params.connectionId)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 100)
  return (data as ChannelSyncLogRow[] | null) ?? []
}

export async function recordSyncLog(params: {
  connectionId: string | null
  tenantId: string | null
  operation: string
  direction: 'outbound' | 'inbound'
  httpStatus?: number
  success: boolean
  requestSummary?: Record<string, unknown>
  responseSummary?: Record<string, unknown>
  errorMessage?: string | null
  durationMs?: number
}): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase.from('bike_channel_sync_logs').insert({
    connection_id: params.connectionId,
    tenant_id: params.tenantId,
    operation: params.operation,
    direction: params.direction,
    http_status: params.httpStatus,
    success: params.success,
    request_summary: params.requestSummary,
    response_summary: params.responseSummary,
    error_message: params.errorMessage,
    duration_ms: params.durationMs,
  })
}
