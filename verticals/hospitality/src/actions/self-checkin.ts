'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient } from '@touracore/db'
import type { AccessType } from '../types/database'

interface UpsertSelfCheckinData {
  room_id: string
  access_type: AccessType
  access_code?: string | null
  wifi_network?: string | null
  wifi_password?: string | null
  checkin_instructions?: string | null
  checkout_instructions?: string | null
  house_rules?: string | null
  smart_lock_provider?: string | null
  smart_lock_device_id?: string | null
  auto_send?: boolean
  send_hours_before?: number
}

export async function upsertSelfCheckinConfig(orgId: string, data: UpsertSelfCheckinData) {
  if (!orgId) throw new Error('Organization id is required')
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', data.room_id)
    .eq('entity_id', orgId)
    .maybeSingle()

  if (!room) {
    throw new Error('Room not found in this organization')
  }

  const { data: config, error } = await supabase
    .from('self_checkin_configs')
    .upsert({
      entity_id: orgId,
      ...data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'entity_id,room_id' })
    .select()
    .single()

  if (error) throw new Error(`Failed to save self check-in config: ${error.message}`)

  revalidatePath('/self-checkin')
  return config
}

export async function deleteSelfCheckinConfig(orgId: string, roomId: string) {
  await assertCurrentEntityAccess(orgId)
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('self_checkin_configs')
    .delete()
    .eq('entity_id', orgId)
    .eq('room_id', roomId)

  if (error) throw new Error(`Failed to delete self check-in config: ${error.message}`)
  revalidatePath('/self-checkin')
}
