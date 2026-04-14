'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type { BookingSource } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpsertChannelCommissionData {
  entity_id: string
  channel: BookingSource
  commission_rate: number
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create or update a channel commission rate.
 */
export async function upsertChannelCommission(data: UpsertChannelCommissionData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.channel) throw new Error('channel is required')
  if (data.commission_rate < 0 || data.commission_rate > 100) {
    throw new Error('commission_rate must be between 0 and 100')
  }

  await assertCurrentEntityAccess(data.entity_id)

  const supabase = await createServerSupabaseClient()

  const { data: result, error } = await supabase
    .from('channel_commissions')
    .upsert(
      {
        entity_id: data.entity_id,
        channel: data.channel,
        commission_rate: data.commission_rate,
        notes: data.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'entity_id,channel' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to upsert channel commission: ${error.message}`)

  revalidatePath('/finance')
  revalidatePath('/settings')
  return result
}

/**
 * Bulk update all channel commissions for an organization.
 */
export async function updateAllChannelCommissions(
  organizationId: string,
  commissions: { channel: BookingSource; commission_rate: number; notes?: string | null }[]
) {
  if (!organizationId) throw new Error('entity_id is required')

  await assertCurrentEntityAccess(organizationId)

  const supabase = await createServerSupabaseClient()

  const upsertData = commissions.map((c) => ({
    entity_id: organizationId,
    channel: c.channel,
    commission_rate: c.commission_rate,
    notes: c.notes ?? null,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('channel_commissions')
    .upsert(upsertData, { onConflict: 'entity_id,channel' })

  if (error) throw new Error(`Failed to update channel commissions: ${error.message}`)

  revalidatePath('/finance')
  revalidatePath('/settings')
}

/**
 * Seed default channel commissions for a new organization.
 */
export async function seedDefaultCommissions(organizationId: string) {
  const defaults: { channel: BookingSource; commission_rate: number }[] = [
    { channel: 'direct', commission_rate: 0 },
    { channel: 'booking_com', commission_rate: 15 },
    { channel: 'expedia', commission_rate: 18 },
    { channel: 'airbnb', commission_rate: 3 },
    { channel: 'google', commission_rate: 10 },
    { channel: 'tripadvisor', commission_rate: 12 },
    { channel: 'phone', commission_rate: 0 },
    { channel: 'walk_in', commission_rate: 0 },
    { channel: 'website', commission_rate: 0 },
    { channel: 'email', commission_rate: 0 },
    { channel: 'agency', commission_rate: 10 },
    { channel: 'other', commission_rate: 0 },
  ]

  await updateAllChannelCommissions(organizationId, defaults)
}
