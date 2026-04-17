'use server'

import { createServiceRoleClient } from '@touracore/db/server'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listTenantsAction(page = 1, search?: string) {
  const supabase = await createServiceRoleClient()
  const perPage = 20

  let query = supabase
    .from('tenants')
    .select('*', { count: 'exact' })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function listPropertiesAdminAction(page = 1, search?: string) {
  const supabase = await createServiceRoleClient()
  const perPage = 20

  let query = supabase
    .from('entities')
    .select('id, name, slug, kind, is_active, tenant_id, created_at', { count: 'exact' })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (error) return { data: [], count: 0 }
  return { data: data ?? [], count: count ?? 0 }
}

export async function listPortalsAdminAction() {
  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('portals')
    .select('*')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getAdminStatsAction() {
  const supabase = await createServiceRoleClient()

  const [tenants, properties, portals, reservations] = await Promise.all([
    supabase.from('tenants').select('id', { count: 'exact', head: true }),
    supabase.from('entities').select('id', { count: 'exact', head: true }),
    supabase.from('portals').select('id', { count: 'exact', head: true }),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
  ])

  return {
    tenants: tenants.count ?? 0,
    properties: properties.count ?? 0,
    portals: portals.count ?? 0,
    activeReservations: reservations.count ?? 0,
  }
}

export async function togglePropertyActiveAction(id: string, isActive: boolean): Promise<ActionResult> {

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('entities')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function listIcalFeedsAction(entityId: string) {
  const supabase = await createServiceRoleClient()

  const { data } = await supabase
    .from('ical_feeds')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createIcalFeedAction(input: {
  entityId: string
  name: string
  url: string
  direction: 'import' | 'export'
  roomId?: string
  roomTypeId?: string
}): Promise<ActionResult> {

  const supabase = await createServiceRoleClient()

  const { data, error } = await supabase
    .from('ical_feeds')
    .insert({
      entity_id: input.entityId,
      name: input.name,
      url: input.url || '',
      direction: input.direction,
      room_id: input.roomId || null,
      room_type_id: input.roomTypeId || null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function listRoomsForEntityAction(entityId: string) {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('rooms')
    .select('id, room_number, room_type_id, room_types(name)')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .order('room_number')
  return data ?? []
}

export async function deleteIcalFeedAction(id: string): Promise<ActionResult> {

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('ical_feeds').delete().eq('id', id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
